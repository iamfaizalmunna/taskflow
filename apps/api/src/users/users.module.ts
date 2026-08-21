import { Injectable, Module, NotFoundException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { User, UserSchema } from '../schemas';
import type { UserDocument } from '../schemas';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) readonly model: Model<UserDocument>) {}

  async publicById(id: string) {
    const user = await this.model.findById(id).lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
