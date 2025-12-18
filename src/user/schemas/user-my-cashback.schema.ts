/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserMyCashbackDocument = HydratedDocument<UserMyCashback>;

@Schema({ timestamps: true })
export class Balance {
  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

@Schema({ _id: false })
export class Flags {
  @Prop({ default: false })
  hasRequestTNGDToken: boolean;

  @Prop({ default: false })
  isRedirectedFromBrowser: boolean;
}

@Schema({ _id: false })
export class Metadata {
  @Prop({ default: null })
  currentLanguage: string;

  @Prop({ default: 0 })
  firstTimeBonusAmount: number;

  @Prop({ default: false })
  gotFirstTimeBonus: boolean;

  @Prop({ default: false })
  joinedStairSequenceBonus: boolean;

  @Prop({ default: null })
  joinedStairSequenceBonusAt: Date;

  @Prop({ default: false })
  joinedVipBonus: boolean;

  @Prop({ default: null })
  joinedVipBonusAt: Date;
}

@Schema({ timestamps: true })
export class UserMyCashback {
  @Prop({ required: true, unique: true, index: true })
  buyerId: string;

  @Prop({ required: true })
  buyerToken: string;

  @Prop({ index: true })
  phoneNumber: string;

  @Prop({ lowercase: true, index: true })
  email: string;

  @Prop({ type: Types.ObjectId, ref: 'Publisher' })
  publisherId: Types.ObjectId;

  @Prop({ type: [Balance], default: [] })
  balance: Balance[];

  @Prop({ default: false })
  binded: boolean;

  @Prop({ default: '' })
  firstName: string;

  @Prop({ default: '' })
  lastName: string;

  @Prop({ default: '' })
  facebookIdentity: string;

  @Prop({ default: '' })
  instagramIdentity: string;

  @Prop({ default: '' })
  twitterIdentity: string;

  @Prop({ default: '' })
  lineIdentity: string;

  @Prop({ type: Metadata, default: {} })
  metadata: Metadata;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: '' })
  address: string;

  @Prop({ default: '' })
  city: string;

  @Prop({ default: '' })
  zipCode: string;

  @Prop({ default: false })
  banned: boolean;

  @Prop({ default: '' })
  bannedNote: string;

  @Prop({ default: '' })
  note: string;

  @Prop({ enum: ['M', 'F', 'O', ''], default: '' })
  gender: string;

  @Prop({ default: 0 })
  creditScoreType: number;

  @Prop({ default: false })
  isReSeller: boolean;

  @Prop({ default: null })
  dateOfBirth: Date;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: false })
  phoneNumberVerified: boolean;

  @Prop({ type: Flags, default: {} })
  flags: Flags;

  @Prop({ default: null })
  pictureProfile: string;

  @Prop({ default: null })
  withdrawalPassword: string;
}

export const UserMyCashbackSchema = SchemaFactory.createForClass(UserMyCashback);
