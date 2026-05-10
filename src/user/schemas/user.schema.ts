import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: false, unique: false, default: '' })
  address: string;

  @Prop({ required: false, unique: false, default: '' })
  id_crossmint: string;

  @Prop({ required: true, unique: true })
  id_firebase: string;

  @Prop()
  email: string;

  @Prop()
  username: string;

  @Prop()
  id_twitter: string;

  @Prop({ default: 'Thailand' })
  country: string;

  @Prop()
  privilege: string; // e.g. standard, premium

  @Prop()
  mobile: string;

  @Prop()
  birthdate: string;

  @Prop()
  gender: string;

  @Prop()
  provider: string;

  @Prop({ default: false })
  disabled: boolean;

  @Prop()
  id_telegram: string;

  @Prop()
  id_line: string;

  @Prop({ default: false })
  email_verified: boolean;

  @Prop({ default: '' })
  id_card: string;

  @Prop({ default: '' })
  passport: string;

  @Prop({ default: '' })
  legal_address: string;

  @Prop({ default: '' })
  state: string;

  @Prop({ default: '' })
  city: string;

  @Prop({ default: '' })
  zip: string;

  @Prop({ default: '' })
  email_mcb: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
