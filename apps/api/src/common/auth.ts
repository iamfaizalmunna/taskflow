import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import type { Request } from 'express';
import type { Model } from 'mongoose';
import { Admin, User } from '../schemas';
import type { AdminDocument, UserDocument } from '../schemas';

export interface UserPrincipal {
  sub: string;
  email: string;
  kind: 'user';
}
export interface AdminPrincipal {
  sub: string;
  username: string;
  role: 'admin';
  kind: 'admin';
}
export type AuthRequest = Request & {
  user?: UserPrincipal;
  admin?: AdminPrincipal;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthRequest>().user,
);
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthRequest>().admin,
);

@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.taskflow_token as string | undefined;
    if (!token) throw new UnauthorizedException('Authentication required');
    try {
      const payload = await this.jwt.verifyAsync<UserPrincipal>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      if (payload.kind !== 'user') throw new Error('Invalid token');
      const user = await this.users
        .findById(payload.sub)
        .select('status')
        .lean();
      if (!user || user.status === 'disabled') throw new Error('Inactive user');
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectModel(Admin.name) private readonly admins: Model<AdminDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.taskflow_admin_token as string | undefined;
    if (!token)
      throw new UnauthorizedException('Admin authentication required');
    try {
      const payload = await this.jwt.verifyAsync<AdminPrincipal>(token, {
        secret: this.config.getOrThrow<string>('ADMIN_JWT_SECRET'),
      });
      if (payload.kind !== 'admin' || payload.role !== 'admin')
        throw new Error('Invalid token');
      if (!(await this.admins.exists({ _id: payload.sub })))
        throw new Error('Unknown admin');
      request.admin = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired admin session');
    }
  }
}
