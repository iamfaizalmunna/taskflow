import {
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
  UseGuards,
} from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import {
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { Model } from 'mongoose';
import { AuthModule } from '../auth/auth.module';
import { CurrentUser, UserAuthGuard } from '../common/auth';
import type { UserPrincipal } from '../common/auth';
import { asObjectId, definedFields, userScope } from '../common/ids';
import { serializeGroup } from '../common/serialize';
import { Group, GroupSchema, Task, TaskSchema } from '../schemas';
import type { GroupDocument, TaskDocument } from '../schemas';

class CreateGroupDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsNumber() order?: number;
}
class UpdateGroupDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsNumber() order?: number;
}

@Injectable()
class GroupsService {
  constructor(
    @InjectModel(Group.name) private readonly groups: Model<GroupDocument>,
    @InjectModel(Task.name) private readonly tasks: Model<TaskDocument>,
  ) {}
  async list(userId: string) {
    const groups = await this.groups
      .find({ userId: userScope(userId) })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    return groups.map(serializeGroup);
  }
  async create(userId: string, dto: CreateGroupDto) {
    return serializeGroup(
      await this.groups.create({ ...dto, userId: asObjectId(userId) }),
    );
  }
  async one(userId: string, id: string) {
    const group = await this.groups
      .findOne({ _id: id, userId: userScope(userId) })
      .lean();
    if (!group) throw new NotFoundException('Group not found');
    return serializeGroup(group);
  }
  async update(userId: string, id: string, dto: UpdateGroupDto) {
    const group = await this.groups.findOneAndUpdate(
      { _id: id, userId: userScope(userId) },
      definedFields(dto),
      { new: true },
    );
    if (!group) throw new NotFoundException('Group not found');
    return serializeGroup(group);
  }
  async remove(userId: string, id: string) {
    const group = await this.groups.findOneAndDelete({
      _id: id,
      userId: userScope(userId),
    });
    if (!group) throw new NotFoundException('Group not found');
    await this.tasks.updateMany(
      { userId: userScope(userId), groupId: group._id },
      { $set: { groupId: null } },
    );
    return { success: true };
  }
}

@Controller('groups')
@UseGuards(UserAuthGuard)
class GroupsController {
  constructor(private readonly groups: GroupsService) {}
  @Get() list(@CurrentUser() user: UserPrincipal) {
    return this.groups.list(user.sub);
  }
  @Post() create(
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateGroupDto,
  ) {
    return this.groups.create(user.sub, dto);
  }
  @Get(':id') one(@CurrentUser() user: UserPrincipal, @Param('id') id: string) {
    return this.groups.one(user.sub, id);
  }
  @Patch(':id') update(
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groups.update(user.sub, id, dto);
  }
  @Delete(':id') remove(
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
  ) {
    return this.groups.remove(user.sub, id);
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
    AuthModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
