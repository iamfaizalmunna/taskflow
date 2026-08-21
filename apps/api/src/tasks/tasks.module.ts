import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type { FilterQuery, Model } from 'mongoose';
import { ActivityModule, ActivityService } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { CurrentUser, UserAuthGuard } from '../common/auth';
import type { UserPrincipal } from '../common/auth';
import { asObjectId, definedFields, userScope } from '../common/ids';
import { serializeTask } from '../common/serialize';
import { Group, GroupSchema, Task, TaskSchema } from '../schemas';
import type { TaskDocument } from '../schemas';

class CreateTaskDto {
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsBoolean() completed?: boolean;
  @IsOptional() @IsIn(['low', 'medium', 'high']) priority?:
    'low' | 'medium' | 'high';
  @ValidateIf((_object, value) => value != null)
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
  @ValidateIf((_object, value) => value != null)
  @IsOptional()
  @IsDateString()
  reminderAt?: string | null;
  @ValidateIf((_object, value) => value != null)
  @IsOptional()
  @IsMongoId()
  groupId?: string | null;
  @IsOptional() @IsNumber() order?: number;
}
class UpdateTaskDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsBoolean() completed?: boolean;
  @IsOptional() @IsIn(['low', 'medium', 'high']) priority?:
    'low' | 'medium' | 'high';
  @ValidateIf((_object, value) => value !== null)
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
  @ValidateIf((_object, value) => value !== null)
  @IsOptional()
  @IsDateString()
  reminderAt?: string | null;
  @ValidateIf((_object, value) => value !== null)
  @IsOptional()
  @IsMongoId()
  groupId?: string | null;
  @IsOptional() @IsNumber() order?: number;
}
class ReorderTasksDto {
  @IsArray() @IsMongoId({ each: true }) taskIds!: string[];
  @ValidateIf((_object, value) => value !== null)
  @IsOptional()
  @IsMongoId()
  groupId?: string | null;
}
class TaskQueryDto {
  @IsOptional()
  @IsIn(['all', 'active', 'completed', 'today', 'overdue'])
  filter?: string;
  @IsOptional() @IsMongoId() groupId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional()
  @IsIn(['order', 'createdAt', 'dueDate', 'priority', 'title'])
  sort?: string;
}

@Injectable()
class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly tasks: Model<TaskDocument>,
    @InjectModel(Group.name) private readonly groups: Model<Group>,
    private readonly activity: ActivityService,
  ) {}
  private async assertGroup(userId: string, groupId?: string | null) {
    if (
      groupId &&
      !(await this.groups.exists({ _id: groupId, userId: userScope(userId) }))
    ) {
      throw new BadRequestException('Group not found');
    }
  }
  async list(userId: string, query: TaskQueryDto) {
    const where: FilterQuery<TaskDocument> = { userId: userScope(userId) };
    if (query.groupId) where.groupId = query.groupId;
    if (query.search)
      where.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    if (query.filter === 'active') where.completed = false;
    if (query.filter === 'completed') where.completed = true;
    if (query.filter === 'today')
      where.dueDate = { $gte: today, $lt: tomorrow };
    if (query.filter === 'overdue')
      Object.assign(where, { completed: false, dueDate: { $lt: now } });
    const sort = query.sort ?? 'order';
    const direction = sort === 'order' || sort === 'title' ? 1 : -1;
    const tasks = await this.tasks
      .find(where)
      .sort({ [sort]: direction, createdAt: -1 })
      .lean();
    return tasks.map(serializeTask);
  }
  async one(userId: string, id: string) {
    const task = await this.tasks
      .findOne({ _id: id, userId: userScope(userId) })
      .lean();
    if (!task) throw new NotFoundException('Task not found');
    return serializeTask(task);
  }
  async create(userId: string, dto: CreateTaskDto) {
    await this.assertGroup(userId, dto.groupId);
    const completed = dto.completed ?? false;
    const task = await this.tasks.create({
      ...dto,
      userId: asObjectId(userId),
      completed,
      completedAt: completed ? new Date() : undefined,
    });
    await this.activity.log(userId, 'user', 'task.created', {
      taskId: task.id,
      title: task.title,
    });
    return serializeTask(task);
  }
  async update(userId: string, id: string, dto: UpdateTaskDto) {
    await this.assertGroup(userId, dto.groupId);
    const existing = await this.tasks.findOne({
      _id: id,
      userId: userScope(userId),
    });
    if (!existing) throw new NotFoundException('Task not found');
    const completing = dto.completed === true && !existing.completed;
    Object.assign(existing, definedFields(dto));
    if (completing) existing.completedAt = new Date();
    if (dto.completed === false) existing.completedAt = undefined;
    if (dto.reminderAt === null) {
      existing.reminderAt = undefined;
      existing.reminderFiredAt = undefined;
    }
    if (typeof dto.reminderAt === 'string')
      existing.reminderFiredAt = undefined;
    if (dto.groupId === null) existing.groupId = null;
    await existing.save();
    if (completing)
      await this.activity.log(userId, 'user', 'task.completed', {
        taskId: existing.id,
      });
    return serializeTask(existing);
  }
  async remove(userId: string, id: string) {
    const task = await this.tasks.findOneAndDelete({
      _id: id,
      userId: userScope(userId),
    });
    if (!task) throw new NotFoundException('Task not found');
    await this.activity.log(userId, 'user', 'task.deleted', {
      taskId: task.id,
      title: task.title,
    });
    return { success: true };
  }
  async reorder(userId: string, dto: ReorderTasksDto) {
    await this.assertGroup(userId, dto.groupId);
    const count = await this.tasks.countDocuments({
      _id: { $in: dto.taskIds },
      userId: userScope(userId),
    });
    if (count !== dto.taskIds.length)
      throw new BadRequestException('One or more tasks are invalid');
    await Promise.all(
      dto.taskIds.map((id, order) =>
        this.tasks.updateOne(
          { _id: id, userId: userScope(userId) },
          {
            order,
            ...(dto.groupId !== undefined ? { groupId: dto.groupId } : {}),
          },
        ),
      ),
    );
    return { success: true };
  }
}

@Controller('tasks')
@UseGuards(UserAuthGuard)
class TasksController {
  constructor(private readonly tasks: TasksService) {}
  @Get() list(
    @CurrentUser() user: UserPrincipal,
    @Query() query: TaskQueryDto,
  ) {
    return this.tasks.list(user.sub, query);
  }
  @Post() create(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(user.sub, dto);
  }
  @Patch('reorder') reorder(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: ReorderTasksDto,
  ) {
    return this.tasks.reorder(user.sub, dto);
  }
  @Get(':id') one(@CurrentUser() user: UserPrincipal, @Param('id') id: string) {
    return this.tasks.one(user.sub, id);
  }
  @Patch(':id') update(
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(user.sub, id, dto);
  }
  @Delete(':id') remove(
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
  ) {
    return this.tasks.remove(user.sub, id);
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
    ActivityModule,
    AuthModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
