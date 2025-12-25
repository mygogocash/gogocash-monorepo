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
}

export const UserSchema = SchemaFactory.createForClass(User);
