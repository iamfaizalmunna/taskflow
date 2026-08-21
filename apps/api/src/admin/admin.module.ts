import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import type { Response } from 'express';
import type { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { ActivityModule, ActivityService } from '../activity/activity.module';
import { AdminAuthGuard, CurrentAdmin } from '../common/auth';
import type { AdminPrincipal } from '../common/auth';
import { definedFields, userScope } from '../common/ids';
import {
  serializeActivity,
  serializeAdmin,
  serializeGroup,
  serializeTask,
  serializeUser,
} from '../common/serialize';
import {
  ActivityLog,
  ActivityLogSchema,
  Admin,
  AdminSchema,
  Group,
  GroupSchema,
  Task,
  TaskSchema,
  User,
  UserSchema,
} from '../schemas';
import type {
  ActivityLogDocument,
  AdminDocument,
  GroupDocument,
  TaskDocument,
  UserDocument,
} from '../schemas';

class AdminLoginDto {
  @IsString() username!: string;
  @IsString() password!: string;
}
class CreateUserDto {
  @IsString() @MinLength(2) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsOptional() @IsIn(['active', 'disabled']) status?: 'active' | 'disabled';
}
class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsIn(['active', 'disabled']) status?: 'active' | 'disabled';
  @IsOptional()
  @IsBoolean()
  @Transform(({ value, obj }) => {
    if (typeof value === 'boolean') {
      obj.status = value ? 'active' : 'disabled';
    }
    return value;
  })
  isActive?: boolean;
}
class PasswordDto {
  @IsString() @MinLength(8) password!: string;
}

@Injectable()
class AdminService {
  constructor(
    @InjectModel(Admin.name) private readonly admins: Model<AdminDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Task.name) private readonly tasks: Model<TaskDocument>,
    @InjectModel(Group.name) private readonly groups: Model<GroupDocument>,
    @InjectModel(ActivityLog.name)
    private readonly logs: Model<ActivityLogDocument>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly activity: ActivityService,
  ) {}
  async login(dto: AdminLoginDto) {
    const username = dto.username.trim().toLowerCase();
    if (username.includes('@')) {
      throw new UnauthorizedException(
        'CRM is for admins only. Users sign in at /login with their email.',
      );
    }
    const admin = await this.admins
      .findOne({ username })
      .select('+password');
    if (!admin || !(await bcrypt.compare(dto.password, admin.password))) {
      throw new UnauthorizedException('Invalid username or password');
    }
    return {
      admin: serializeAdmin(admin),
      token: await this.jwt.signAsync(
        {
          sub: admin.id,
          username: admin.username,
          role: 'admin',
          kind: 'admin',
        } satisfies AdminPrincipal,
        {
          secret: this.config.getOrThrow<string>('ADMIN_JWT_SECRET'),
          expiresIn: '12h',
        },
      ),
    };
  }
  async me(id: string) {
    const admin = await this.admins.findById(id).lean();
    if (!admin) throw new NotFoundException('Admin not found');
    return serializeAdmin(admin);
  }
  async listUsers(search?: string) {
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};
    const users = await this.users.find(query).sort({ createdAt: -1 }).lean();
    const ids = users.map((user) => user._id);
    const [taskCounts, groupCounts] = await Promise.all([
      this.tasks.aggregate<{ _id: unknown; n: number }>([
        { $match: { userId: { $in: ids } } },
        { $group: { _id: '$userId', n: { $sum: 1 } } },
      ]),
      this.groups.aggregate<{ _id: unknown; n: number }>([
        { $match: { userId: { $in: ids } } },
        { $group: { _id: '$userId', n: { $sum: 1 } } },
      ]),
    ]);
    const taskMap = new Map(taskCounts.map((row) => [String(row._id), row.n]));
    const groupMap = new Map(
      groupCounts.map((row) => [String(row._id), row.n]),
    );
    return users.map((user) => ({
      ...serializeUser(user),
      taskCount: taskMap.get(String(user._id)) ?? 0,
      groupCount: groupMap.get(String(user._id)) ?? 0,
    }));
  }
  async createUser(dto: CreateUserDto) {
    try {
      const user = await this.users.create({
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        password: await bcrypt.hash(dto.password.trim(), 12),
        status: dto.status ?? 'active',
      });
      await this.activity.log(user._id, 'admin', 'admin.user_created');
      return serializeUser(user);
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000)
        throw new ConflictException('Email already registered');
      throw error;
    }
  }
  async userDetail(id: string) {
    const user = await this.users.findById(id).lean();
    if (!user) throw new NotFoundException('User not found');
    const [tasks, groups, recentActivity] = await Promise.all([
      this.tasks
        .find({ userId: userScope(id) })
        .sort({ createdAt: -1 })
        .lean(),
      this.groups
        .find({ userId: userScope(id) })
        .sort({ order: 1 })
        .lean(),
      this.logs.find({ userId: id }).sort({ createdAt: -1 }).limit(25).lean(),
    ]);
    return {
      ...serializeUser(user),
      tasks: tasks.map(serializeTask),
      groups: groups.map(serializeGroup),
      activity: recentActivity.map(serializeActivity),
    };
  }
  async updateUser(id: string, dto: UpdateUserDto, adminId: string) {
    try {
      const user = await this.users.findByIdAndUpdate(
        id,
        {
          ...definedFields(dto),
          ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
        },
        { new: true },
      );
      if (!user) throw new NotFoundException('User not found');
      if (dto.status) {
        const action =
          dto.status === 'active'
            ? 'admin.user_enabled'
            : 'admin.user_disabled';
        await this.activity.log(id, 'admin', action, { adminId });
      }
      return serializeUser(user);
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000)
        throw new ConflictException('Email already registered');
      throw error;
    }
  }
  async resetPassword(id: string, password: string, adminId: string) {
    const user = await this.users.findByIdAndUpdate(id, {
      password: await bcrypt.hash(password.trim(), 12),
    });
    if (!user) throw new NotFoundException('User not found');
    await this.activity.log(id, 'admin', 'admin.password_reset', { adminId });
    return { success: true };
  }
  async deleteUser(id: string, adminId: string) {
    const user = await this.users.findByIdAndDelete(id);
    if (!user) throw new NotFoundException('User not found');
    await Promise.all([
      this.tasks.deleteMany({ userId: id }),
      this.groups.deleteMany({ userId: id }),
      this.logs.deleteMany({ userId: id }),
    ]);
    await this.activity.log(null, 'admin', 'admin.user_deleted', {
      adminId,
      deletedUserId: id,
      email: user.email,
    });
    return { success: true };
  }
  activityList(limit = 100) {
    return this.logs
      .find()
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 500))
      .lean()
      .then((items) => items.map(serializeActivity));
  }
}

@Controller('admin')
class AdminController {
  constructor(private readonly service: AdminService) {}
  @Post('login') @HttpCode(200) async login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.login(dto);
    response.cookie('taskflow_admin_token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 12 * 60 * 60 * 1000,
      path: '/',
    });
    return { admin: result.admin };
  }
  @Post('logout') @HttpCode(200) logout(
    @Res({ passthrough: true }) response: Response,
  ) {
    response.clearCookie('taskflow_admin_token', { path: '/' });
    return { success: true };
  }
  @Get('me') @UseGuards(AdminAuthGuard) me(
    @CurrentAdmin() admin: AdminPrincipal,
  ) {
    return this.service.me(admin.sub);
  }
  @Get('users') @UseGuards(AdminAuthGuard) users(
    @Query('search') search?: string,
  ) {
    return this.service.listUsers(search);
  }
  @Post('users') @UseGuards(AdminAuthGuard) createUser(
    @Body() dto: CreateUserDto,
  ) {
    return this.service.createUser(dto);
  }
  @Get('users/:id') @UseGuards(AdminAuthGuard) user(@Param('id') id: string) {
    return this.service.userDetail(id);
  }
  @Patch('users/:id') @UseGuards(AdminAuthGuard) updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ) {
    return this.service.updateUser(id, dto, admin.sub);
  }
  @Delete('users/:id') @UseGuards(AdminAuthGuard) deleteUser(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
  ) {
    return this.service.deleteUser(id, admin.sub);
  }
  @Post('users/:id/password') @UseGuards(AdminAuthGuard) password(
    @Param('id') id: string,
    @Body() dto: PasswordDto,
    @CurrentAdmin() admin: AdminPrincipal,
  ) {
    return this.service.resetPassword(id, dto.password, admin.sub);
  }
  @Get('activity') @UseGuards(AdminAuthGuard) activity(
    @Query('limit') limit?: string,
  ) {
    const parsed = limit === undefined ? 100 : Number(limit);
    return this.service.activityList(Number.isFinite(parsed) ? parsed : 100);
  }
}

@Module({
  imports: [
    JwtModule.register({}),
    ActivityModule,
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: User.name, schema: UserSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Group.name, schema: GroupSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard],
})
export class AdminModule {}
