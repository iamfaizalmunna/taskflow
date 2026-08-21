import { Injectable, Module } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { ActivityLog, ActivityLogSchema } from '../schemas';
import type { ActivityLogDocument } from '../schemas';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(ActivityLog.name)
    private readonly logs: Model<ActivityLogDocument>,
  ) {}

  async log(
    userId: string | Types.ObjectId | null,
    actor: 'user' | 'admin',
    action: string,
    meta: Record<string, unknown> = {},
  ): Promise<void> {
    await this.logs.create({ userId, actor, action, meta });
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
  providers: [ActivityService],
  exports: [ActivityService, MongooseModule],
})
export class ActivityModule {}
