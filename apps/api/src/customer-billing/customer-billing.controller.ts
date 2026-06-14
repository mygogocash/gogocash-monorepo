import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { CustomerBillingService } from './customer-billing.service';
import { CreateBillingPortalDto } from './dto/create-billing-portal.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Controller('customer-billing')
export class CustomerBillingController {
  constructor(
    private readonly customerBillingService: CustomerBillingService,
  ) {}

  @Post('checkout')
  @UseGuards(FirebaseAuthGuard)
  createCheckoutSession(
    @Req() req: Request,
    @Body() body: CreateCheckoutSessionDto,
  ) {
    return this.customerBillingService.createCheckoutSession(
      getAuthenticatedUserId(req),
      body,
    );
  }

  @Post('portal')
  @UseGuards(FirebaseAuthGuard)
  createBillingPortalSession(
    @Req() req: Request,
    @Body() body: CreateBillingPortalDto,
  ) {
    return this.customerBillingService.createBillingPortalSession(
      getAuthenticatedUserId(req),
      body,
    );
  }

  @Get('subscription')
  @UseGuards(FirebaseAuthGuard)
  getSubscriptionStatus(@Req() req: Request) {
    return this.customerBillingService.getSubscriptionStatus(
      getAuthenticatedUserId(req),
    );
  }
}

function getAuthenticatedUserId(req: Request): string {
  const user = req.user as { sub?: string; userId?: string } | undefined;
  const userId = user?.sub ?? user?.userId;
  if (!userId) {
    throw new UnauthorizedException('Missing authenticated user');
  }

  return userId;
}
