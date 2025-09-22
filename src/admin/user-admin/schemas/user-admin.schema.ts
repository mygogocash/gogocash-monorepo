import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserAdminDocument = HydratedDocument<UserAdmin>;

@Schema({ timestamps: true })
export class UserAdmin {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  email: string;
}

export const UserAdminSchema = SchemaFactory.createForClass(UserAdmin);
