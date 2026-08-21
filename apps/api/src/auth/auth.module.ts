import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Module,
  Patch,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import type { Response } from 'express';
import type { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { ActivityModule, ActivityService } from '../activity/activity.module';
import { CurrentUser, UserAuthGuard } from '../common/auth';
import type { UserPrincipal } from '../common/auth';
import { serializeUser } from '../common/serialize';
import { User, UserSchema } from '../schemas';
import type { UserDocument } from '../schemas';
import { UsersModule, UsersService } from '../users/users.module';

class RegisterDto {
  @IsString() @MinLength(2) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}
class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}
class ProfileDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() currentPassword?: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
}

@Injectable()
class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    private readonly userService: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly activity: ActivityService,
  ) {}

  private async token(user: UserDocument): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, email: user.email, kind: 'user' } satisfies UserPrincipal,
      { secret: this.config.getOrThrow<string>('JWT_SECRET'), expiresIn: '7d' },
    );
  }

  async register(dto: RegisterDto) {
    try {
      const user = await this.users.create({
        name: dto.name,
        email: dto.email.toLowerCase(),
        password: await bcrypt.hash(dto.password, 12),
      });
      await this.activity.log(user._id, 'user', 'user.registered');
      return {
        user: serializeUser(await this.userService.publicById(user.id)),
        token: await this.token(user),
      };
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000)
        throw new ConflictException('Email already registered');
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.users
      .findOne({ email: dto.email.toLowerCase() })
      .select('+password');
    if (
      !user ||
      user.status !== 'active' ||
      !(await bcrypt.compare(dto.password, user.password))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    user.lastLoginAt = new Date();
    await user.save();
    await this.activity.log(user._id, 'user', 'user.logged_in');
    return {
      user: serializeUser(await this.userService.publicById(user.id)),
      token: await this.token(user),
    };
  }

  async updateProfile(userId: string, dto: ProfileDto) {
    const user = await this.users.findById(userId).select('+password');
    if (!user) throw new UnauthorizedException('Authentication required');
    if (dto.password) {
      if (
        !dto.currentPassword ||
        !(await bcrypt.compare(dto.currentPassword, user.password))
      ) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      user.password = await bcrypt.hash(dto.password, 12);
    }
    if (dto.name) user.name = dto.name;
    if (dto.email) user.email = dto.email.toLowerCase();
    try {
      await user.save();
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000)
        throw new ConflictException('Email already registered');
      throw error;
    }
    return serializeUser(await this.userService.publicById(user.id));
  }
}

@Controller('auth')
class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}
  private setCookie(response: Response, token: string) {
    response.cookie('taskflow_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
  @Post('register') async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto);
    this.setCookie(res, result.token);
    return { user: result.user };
  }
  @Post('login') @HttpCode(200) async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    this.setCookie(res, result.token);
    return { user: result.user };
  }
  @Post('logout') @HttpCode(200) logout(
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('taskflow_token', { path: '/' });
    return { success: true };
  }
  @Get('me') @UseGuards(UserAuthGuard) async me(
    @CurrentUser() user: UserPrincipal,
  ) {
    return serializeUser(await this.users.publicById(user.sub));
  }
  @Patch('profile') @UseGuards(UserAuthGuard) profile(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: ProfileDto,
  ) {
    return this.auth.updateProfile(user.sub, dto);
  }
}

@Module({
  imports: [
    JwtModule.register({}),
    UsersModule,
    ActivityModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserAuthGuard],
  exports: [JwtModule, UserAuthGuard, MongooseModule],
})
export class AuthModule {}
