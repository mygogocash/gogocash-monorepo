import { BadRequestException } from '@nestjs/common';

import type {
  CommerceOrderStatus,
  CommercePaymentStatus,
} from './schemas/order.schema';

export type OrderStatusSnapshot = {
  status: CommerceOrderStatus;
  payment_status: CommercePaymentStatus;
};

export function validateAdminOrderStatusTransition(
  current: OrderStatusSnapshot,
  next: Exclude<CommerceOrderStatus, 'pending_payment' | 'paid'>,
): void {
  switch (next) {
    case 'processing':
      if (current.payment_status !== 'paid' || current.status !== 'paid') {
        throw new BadRequestException(
          'Only paid orders can move to processing',
        );
      }
      return;
    case 'fulfilled':
      if (
        current.payment_status !== 'paid' ||
        !['paid', 'processing'].includes(current.status)
      ) {
        throw new BadRequestException(
          'Only paid or processing orders can be fulfilled',
        );
      }
      return;
    case 'cancelled':
      if (
        current.status !== 'pending_payment' ||
        !['unpaid', 'pending', 'failed'].includes(current.payment_status)
      ) {
        throw new BadRequestException(
          'Only unpaid pending orders can be cancelled',
        );
      }
      return;
    case 'refunded':
      if (
        current.payment_status !== 'paid' ||
        !['paid', 'processing', 'fulfilled'].includes(current.status)
      ) {
        throw new BadRequestException('Only paid orders can be refunded');
      }
      return;
    default: {
      const exhaustive: never = next;
      throw new BadRequestException(`Unsupported status transition: ${exhaustive}`);
    }
  }
}
