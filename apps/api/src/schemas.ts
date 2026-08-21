import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;
  @Prop({ required: true, select: false }) password!: string;
  @Prop({ enum: ['active', 'disabled'], default: 'active' }) status!:
    'active' | 'disabled';
  @Prop() lastLoginAt?: Date;
}
export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

@Schema({ timestamps: true })
export class Admin {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  username!: string;
  @Prop({ required: true, select: false }) password!: string;
  @Prop({ enum: ['admin'], default: 'admin' }) role!: 'admin';
}
export type AdminDocument = HydratedDocument<Admin>;
export const AdminSchema = SchemaFactory.createForClass(Admin);

@Schema({ timestamps: true })
export class Group {
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ default: '#6366f1' }) color!: string;
  @Prop({ default: 0 }) order!: number;
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;
}
export type GroupDocument = HydratedDocument<Group>;
export const GroupSchema = SchemaFactory.createForClass(Group);

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true, trim: true }) title!: string;
  @Prop({ default: '' }) description!: string;
  @Prop({ default: false, index: true }) completed!: boolean;
  @Prop({ enum: ['low', 'medium', 'high'], default: 'medium' }) priority!:
    'low' | 'medium' | 'high';
  @Prop() dueDate?: Date;
  @Prop() reminderAt?: Date;
  @Prop() reminderFiredAt?: Date;
  @Prop({ type: Types.ObjectId, ref: Group.name, default: null })
  groupId?: Types.ObjectId | null;
  @Prop({ default: 0 }) order!: number;
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;
  @Prop() completedAt?: Date;
}
export type TaskDocument = HydratedDocument<Task>;
export const TaskSchema = SchemaFactory.createForClass(Task);

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ type: Types.ObjectId, ref: User.name, default: null, index: true })
  userId?: Types.ObjectId | null;
  @Prop({ enum: ['user', 'admin'], required: true }) actor!: 'user' | 'admin';
  @Prop({ required: true }) action!: string;
  @Prop({ type: Object, default: {} }) meta!: Record<string, unknown>;
}
export type ActivityLogDocument = HydratedDocument<ActivityLog>;
export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
