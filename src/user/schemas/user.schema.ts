import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ required: true, unique: false })
  address: string;

  @Prop({ required: true, unique: true })
  id_crossmint: string;

  @Prop()
  email: string;

  @Prop()
  username: string;

  @Prop()
  id_twitter: string;

  @Prop()
  country: string;

  @Prop()
  privilege: string; // e.g. standard, premium
}

export const UserSchema = SchemaFactory.createForClass(User);
