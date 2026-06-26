import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';

import {
  COMMERCE_PAYMENT_PROVIDER,
  CommercePaymentProvider,
  CommerceWebhookEvent,
} from './providers/commerce-payment.provider';
import {
  CreateCheckoutSessionDto,
  UpsertCartItemDto,
  UpdateOrderStatusDto,
} from './dto/catalog.dto';
import { Cart } from './schemas/cart.schema';
import { CatalogProduct } from './schemas/catalog-product.schema';
import { CommerceOrder } from './schemas/order.schema';
import { InventoryReservation } from './schemas/inventory-reservation.schema';
import { PaymentAttempt } from './schemas/payment-attempt.schema';
import { buildCheckoutRedirectUrls } from './commerce-checkout-urls';
import { validateAdminOrderStatusTransition } from './commerce-order-status';

const PENDING_PAYMENT_STATUSES = ['pending', 'unpaid'] as const;

type ReservationItem = {
  product_id: Types.ObjectId;
  variant_sku: string;
  quantity: number;
};

@Injectable()
export class CommerceService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
    @InjectModel(CatalogProduct.name)
    private readonly productModel: Model<CatalogProduct>,
    @InjectModel(CommerceOrder.name)
    private readonly orderModel: Model<CommerceOrder>,
    @InjectModel(InventoryReservation.name)
    private readonly reservationModel: Model<InventoryReservation>,
    @InjectModel(PaymentAttempt.name)
    private readonly paymentAttemptModel: Model<PaymentAttempt>,
    @Inject(COMMERCE_PAYMENT_PROVIDER)
    private readonly paymentProvider: CommercePaymentProvider,
  ) {}

  getCart(userId: string) {
    return this.getOrCreateActiveCart(userId);
  }

  async upsertCartItem(userId: string, dto: UpsertCartItemDto) {
    const product = await this.productModel
      .findOne(this.publishedProductFilter({ _id: dto.product_id }))
      .lean()
      .exec();
    if (!product) throw new NotFoundException('Product not found');

    const variant = product.variants?.find(
      (v) => v.sku === dto.variant_sku && v.active,
    ) || {
      sku: product.default_sku,
      price_amount: product.price_amount,
      currency: product.currency,
      inventory_quantity: product.inventory_quantity,
      reserved_quantity: product.reserved_quantity,
      image_url: product.images?.[0],
    };
    if (variant.sku !== dto.variant_sku)
      throw new BadRequestException('Product variant not found');

    const available = Math.max(
      0,
      (variant.inventory_quantity ?? 0) - (variant.reserved_quantity ?? 0),
    );
    if (available < dto.quantity) {
      throw new BadRequestException('Insufficient inventory');
    }

    const cart = await this.getOrCreateActiveCart(userId);
    const item = {
      product_id: new Types.ObjectId(dto.product_id),
      variant_sku: dto.variant_sku,
      quantity: dto.quantity,
      unit_amount: variant.price_amount,
      currency: variant.currency.toUpperCase(),
      title: product.title,
      image_url: variant.image_url || product.images?.[0],
    };
    const nextItems = cart.items.filter(
      (cartItem) =>
        String(cartItem.product_id) !== dto.product_id ||
        cartItem.variant_sku !== dto.variant_sku,
    );
    nextItems.push(item);
    const subtotal = nextItems.reduce(
      (sum, cartItem) => sum + cartItem.unit_amount * cartItem.quantity,
      0,
    );

    return this.cartModel
      .findByIdAndUpdate(
        cart._id,
        {
          items: nextItems,
          currency: item.currency,
          subtotal_amount: subtotal,
        },
        { new: true },
      )
      .lean()
      .exec();
  }

  async removeCartItem(userId: string, productId: string, variantSku: string) {
    const cart = await this.getOrCreateActiveCart(userId);
    const nextItems = cart.items.filter(
      (item) =>
        String(item.product_id) !== productId ||
        item.variant_sku !== variantSku,
    );
    const subtotal = nextItems.reduce(
      (sum, item) => sum + item.unit_amount * item.quantity,
      0,
    );
    return this.cartModel
      .findByIdAndUpdate(
        cart._id,
        { items: nextItems, subtotal_amount: subtotal },
        { new: true },
      )
      .lean()
      .exec();
  }

  async createCheckoutSession(
    userId: string,
    dto: CreateCheckoutSessionDto,
    idempotencyKey?: string,
  ) {
    if (!idempotencyKey)
      throw new BadRequestException('Idempotency-Key header is required');

    const ownAttempt = await this.paymentAttemptModel
      .findOne({ idempotency_key: idempotencyKey, user_id: userId })
      .lean()
      .exec();
    if (ownAttempt?.checkout_url) {
      return {
        order_id: String(ownAttempt.order_id),
        checkout_url: ownAttempt.checkout_url,
        provider: ownAttempt.provider,
        reused: true,
      };
    }

    const foreignAttempt = await this.paymentAttemptModel
      .findOne({ idempotency_key: idempotencyKey, user_id: { $ne: userId } })
      .lean()
      .exec();
    if (foreignAttempt) {
      throw new ConflictException(
        'Idempotency key already used by another user',
      );
    }

    const reusedPending = await this.findReusablePendingCheckout(userId);
    if (reusedPending) return reusedPending;

    const pendingCount = await this.orderModel.countDocuments({
      user_id: userId,
      status: 'pending_payment',
      payment_status: { $in: [...PENDING_PAYMENT_STATUSES] },
    });
    if (pendingCount > 0) {
      throw new BadRequestException(
        'Complete or wait for your pending checkout before starting another',
      );
    }

    const cart = await this.getOrCreateActiveCart(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const order = await this.orderModel.create({
      order_number: this.createOrderNumber(),
      user_id: userId,
      items: cart.items,
      currency: cart.currency,
      subtotal_amount: cart.subtotal_amount,
      total_amount: cart.subtotal_amount,
      payment_status: 'pending',
      shipping_address: dto.shipping_address || {},
    });

    await this.reserveInventory(
      order._id as Types.ObjectId,
      userId,
      cart.items,
    );

    const { successUrl, cancelUrl } = buildCheckoutRedirectUrls(
      String(order._id),
    );
    const checkout = await this.paymentProvider.createCheckoutSession({
      orderId: String(order._id),
      orderNumber: order.order_number,
      userId,
      amount: order.total_amount,
      currency: order.currency,
      successUrl,
      cancelUrl,
      idempotencyKey,
      lineItems: cart.items.map((item) => ({
        name: item.title,
        quantity: item.quantity,
        unitAmount: item.unit_amount,
        currency: item.currency,
      })),
    });

    await Promise.all([
      this.orderModel
        .findByIdAndUpdate(order._id, {
          checkout_session_id: checkout.providerSessionId,
        })
        .exec(),
      this.paymentAttemptModel.create({
        order_id: order._id,
        user_id: userId,
        provider: checkout.provider,
        provider_session_id: checkout.providerSessionId,
        checkout_url: checkout.checkoutUrl,
        idempotency_key: idempotencyKey,
        amount: order.total_amount,
        currency: order.currency,
        status: 'pending',
      }),
    ]);

    return {
      order_id: String(order._id),
      order_number: order.order_number,
      checkout_url: checkout.checkoutUrl,
      provider: checkout.provider,
      reused: false,
    };
  }

  listCustomerOrders(userId: string) {
    return this.orderModel
      .find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
  }

  listAdminOrders(query: { status?: string; limit?: number } = {}) {
    const filter: Record<string, string> = {};
    if (query.status) filter.status = query.status;
    return this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(query.limit || 50, 100))
      .lean()
      .exec();
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid order id');

    const order = await this.orderModel.findById(id).lean().exec();
    if (!order) throw new NotFoundException('Order not found');

    validateAdminOrderStatusTransition(
      { status: order.status, payment_status: order.payment_status },
      dto.status as 'processing' | 'fulfilled' | 'cancelled' | 'refunded',
    );

    if (dto.status === 'cancelled') {
      await this.releasePendingOrderInventory(order._id as Types.ObjectId);
    }
    if (dto.status === 'refunded') {
      await this.restoreInventoryForRefund(order);
      await this.paymentAttemptModel
        .updateMany(
          {
            order_id: order._id,
            status: { $in: ['created', 'pending', 'succeeded'] },
          },
          { status: 'refunded' },
        )
        .exec();
    }

    const patch: Record<string, unknown> = {
      status: dto.status,
      admin_note: dto.admin_note,
    };
    if (dto.status === 'fulfilled') patch.fulfilled_at = new Date();
    if (dto.status === 'refunded') patch.payment_status = 'refunded';
    if (dto.status === 'cancelled') patch.payment_status = 'failed';

    const updated = await this.orderModel
      .findByIdAndUpdate(id, patch, { new: true })
      .lean()
      .exec();
    if (!updated) throw new NotFoundException('Order not found');
    return updated;
  }

  async handleWebhook(payload: unknown, signature?: string) {
    const event = await this.paymentProvider.parseWebhook(payload, signature);
    if (!event.providerSessionId) {
      return { received: true, ignored: true };
    }

    const attempt = await this.paymentAttemptModel
      .findOne({ provider_session_id: event.providerSessionId })
      .exec();
    if (!attempt) {
      return { received: true, ignored: true };
    }
    if (attempt.provider_event_ids.includes(event.id)) {
      return { received: true, duplicate: true };
    }

    attempt.provider_event_ids.push(event.id);
    await this.applyPaymentEvent(attempt, event);
    await attempt.save();
    return { received: true };
  }

  private async applyPaymentEvent(
    attempt: PaymentAttempt,
    event: CommerceWebhookEvent,
  ) {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'payment_intent.succeeded'
    ) {
      attempt.status = 'succeeded';
      const committedReservations = await this.transitionActiveReservations(
        attempt.order_id,
        'committed',
      );
      await this.commitReservedInventory(committedReservations);
      await Promise.all([
        this.orderModel.findByIdAndUpdate(attempt.order_id, {
          status: 'paid',
          payment_status: 'paid',
          paid_at: new Date(),
        }),
      ]);
      const order = await this.orderModel
        .findById(attempt.order_id)
        .lean()
        .exec();
      if (order)
        await this.cartModel.updateMany(
          { user_id: order.user_id, status: 'active' },
          { status: 'converted' },
        );
      return;
    }

    if (
      event.type === 'checkout.session.expired' ||
      event.type === 'payment_intent.payment_failed'
    ) {
      attempt.status =
        event.type === 'checkout.session.expired' ? 'expired' : 'failed';
      const releasedReservations = await this.transitionActiveReservations(
        attempt.order_id,
        'released',
      );
      await this.releaseReservedInventory(releasedReservations);
      await Promise.all([
        this.orderModel.findByIdAndUpdate(attempt.order_id, {
          status: 'cancelled',
          payment_status: 'failed',
        }),
      ]);
    }
  }

  private async findReusablePendingCheckout(userId: string) {
    const pendingOrder = await this.orderModel
      .findOne({
        user_id: userId,
        status: 'pending_payment',
        payment_status: { $in: [...PENDING_PAYMENT_STATUSES] },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    if (!pendingOrder) return null;

    const attempt = await this.paymentAttemptModel
      .findOne({
        order_id: pendingOrder._id,
        user_id: userId,
        status: { $in: ['created', 'pending'] },
        checkout_url: { $exists: true, $ne: '' },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    if (!attempt?.checkout_url) return null;

    return {
      order_id: String(pendingOrder._id),
      order_number: pendingOrder.order_number,
      checkout_url: attempt.checkout_url,
      provider: attempt.provider,
      reused: true,
    };
  }

  private async releasePendingOrderInventory(orderId: Types.ObjectId) {
    const releasedReservations = await this.transitionActiveReservations(
      orderId,
      'released',
    );
    await this.releaseReservedInventory(releasedReservations);
  }

  private async restoreInventoryForRefund(order: {
    _id: Types.ObjectId;
    payment_status: CommerceOrder['payment_status'];
    items: ReservationItem[];
  }) {
    if (order.payment_status === 'paid') {
      await this.restoreCommittedInventory(order.items);
      return;
    }

    await this.releasePendingOrderInventory(order._id as Types.ObjectId);
  }

  private async restoreCommittedInventory(items: ReservationItem[]) {
    await Promise.all(
      items.map(async (item) => {
        const variantResult = await this.productModel
          .updateOne(
            { _id: item.product_id, 'variants.sku': item.variant_sku },
            { $inc: { 'variants.$.inventory_quantity': item.quantity } },
          )
          .exec();
        if (variantResult.modifiedCount > 0) return;

        await this.productModel
          .updateOne(
            { _id: item.product_id, default_sku: item.variant_sku },
            { $inc: { inventory_quantity: item.quantity } },
          )
          .exec();
      }),
    );
  }

  private async getOrCreateActiveCart(userId: string) {
    const existing = await this.cartModel
      .findOne({ user_id: userId, status: 'active' })
      .lean()
      .exec();
    if (existing) return existing;
    return this.cartModel.create({
      user_id: userId,
      items: [],
      subtotal_amount: 0,
      currency: 'THB',
    });
  }

  private async reserveInventory(
    orderId: Types.ObjectId,
    userId: string,
    items: ReservationItem[],
  ) {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const reservedItems: ReservationItem[] = [];
    const reservations = items.map((item) => ({
      product_id: item.product_id,
      order_id: orderId,
      user_id: userId,
      variant_sku: item.variant_sku,
      quantity: item.quantity,
      expires_at: expiresAt,
    }));

    try {
      for (const item of items) {
        await this.reserveItemInventory(item);
        reservedItems.push(item);
      }
      await this.reservationModel.insertMany(reservations);
    } catch (error) {
      await this.releaseReservedInventory(reservedItems);
      throw error;
    }
  }

  private async reserveItemInventory(item: ReservationItem) {
    const variantResult = await this.productModel
      .updateOne(this.availableVariantFilter(item), {
        $inc: { 'variants.$.reserved_quantity': item.quantity },
      })
      .exec();
    if (variantResult.modifiedCount > 0) return;

    const defaultResult = await this.productModel
      .updateOne(this.availableDefaultSkuFilter(item), {
        $inc: { reserved_quantity: item.quantity },
      })
      .exec();
    if (defaultResult.modifiedCount > 0) return;

    throw new BadRequestException('Insufficient inventory');
  }

  private async transitionActiveReservations(
    orderId: Types.ObjectId,
    status: 'committed' | 'released',
  ): Promise<ReservationItem[]> {
    const reservations: ReservationItem[] = [];

    while (true) {
      const reservation = await this.reservationModel
        .findOneAndUpdate(
          { order_id: orderId, status: 'active' },
          { status },
          { new: false },
        )
        .lean()
        .exec();
      if (!reservation) return reservations;
      reservations.push({
        product_id: reservation.product_id as Types.ObjectId,
        variant_sku: reservation.variant_sku,
        quantity: reservation.quantity,
      });
    }
  }

  private async commitReservedInventory(items: ReservationItem[]) {
    await Promise.all(
      items.map(async (item) => {
        const variantResult = await this.productModel
          .updateOne(
            { _id: item.product_id, 'variants.sku': item.variant_sku },
            {
              $inc: {
                'variants.$.inventory_quantity': -item.quantity,
                'variants.$.reserved_quantity': -item.quantity,
              },
            },
          )
          .exec();
        if (variantResult.modifiedCount > 0) return;

        await this.productModel
          .updateOne(
            { _id: item.product_id, default_sku: item.variant_sku },
            {
              $inc: {
                inventory_quantity: -item.quantity,
                reserved_quantity: -item.quantity,
              },
            },
          )
          .exec();
      }),
    );
  }

  private async releaseReservedInventory(items: ReservationItem[]) {
    await Promise.all(
      items.map(async (item) => {
        const variantResult = await this.productModel
          .updateOne(
            { _id: item.product_id, 'variants.sku': item.variant_sku },
            { $inc: { 'variants.$.reserved_quantity': -item.quantity } },
          )
          .exec();
        if (variantResult.modifiedCount > 0) return;

        await this.productModel
          .updateOne(
            { _id: item.product_id, default_sku: item.variant_sku },
            { $inc: { reserved_quantity: -item.quantity } },
          )
          .exec();
      }),
    );
  }

  private availableVariantFilter(item: ReservationItem) {
    return {
      ...this.publishedProductFilter({
        _id: item.product_id,
        variants: { $elemMatch: { sku: item.variant_sku, active: true } },
      }),
      $expr: {
        $gte: [
          {
            $let: {
              vars: {
                variant: {
                  $first: {
                    $filter: {
                      input: '$variants',
                      as: 'variant',
                      cond: {
                        $and: [
                          { $eq: ['$$variant.sku', item.variant_sku] },
                          { $eq: ['$$variant.active', true] },
                        ],
                      },
                    },
                  },
                },
              },
              in: {
                $subtract: [
                  { $ifNull: ['$$variant.inventory_quantity', 0] },
                  { $ifNull: ['$$variant.reserved_quantity', 0] },
                ],
              },
            },
          },
          item.quantity,
        ],
      },
    } as QueryFilter<CatalogProduct>;
  }

  private availableDefaultSkuFilter(item: ReservationItem) {
    return {
      ...this.publishedProductFilter({
        _id: item.product_id,
        default_sku: item.variant_sku,
        variants: {
          $not: { $elemMatch: { sku: item.variant_sku, active: true } },
        },
      }),
      $expr: {
        $gte: [
          {
            $subtract: [
              { $ifNull: ['$inventory_quantity', 0] },
              { $ifNull: ['$reserved_quantity', 0] },
            ],
          },
          item.quantity,
        ],
      },
    } as QueryFilter<CatalogProduct>;
  }

  private publishedProductFilter(
    filter: QueryFilter<CatalogProduct> = {},
  ): QueryFilter<CatalogProduct> {
    const now = new Date();
    return {
      ...filter,
      status: 'published',
      $and: [
        {
          $or: [
            { scheduled_start_at: { $exists: false } },
            { scheduled_start_at: { $lte: now } },
          ],
        },
        {
          $or: [
            { scheduled_end_at: { $exists: false } },
            { scheduled_end_at: { $gte: now } },
          ],
        },
      ],
    };
  }

  private createOrderNumber() {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `GGC-${Date.now()}-${suffix}`;
  }
}
