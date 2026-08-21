import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { ActivityLog, Admin, Group, Task, User } from './schemas';
import type {
  ActivityLogDocument,
  AdminDocument,
  GroupDocument,
  TaskDocument,
  UserDocument,
} from './schemas';

function seedValue(name: string, developmentDefault: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set when seeding production`);
  }
  return developmentDefault;
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const admins = app.get<Model<AdminDocument>>(getModelToken(Admin.name));
    const users = app.get<Model<UserDocument>>(getModelToken(User.name));
    const groups = app.get<Model<GroupDocument>>(getModelToken(Group.name));
    const tasks = app.get<Model<TaskDocument>>(getModelToken(Task.name));
    const logs = app.get<Model<ActivityLogDocument>>(
      getModelToken(ActivityLog.name),
    );
    const adminUsername = seedValue(
      'SEED_ADMIN_USERNAME',
      'admin',
    ).toLowerCase();
    const adminPassword = seedValue('SEED_ADMIN_PASSWORD', 'Admin@12345');
    const userPassword = seedValue('SEED_USER_PASSWORD', 'Demo@12345');

    await admins.findOneAndUpdate(
      { username: adminUsername },
      {
        username: adminUsername,
        password: await bcrypt.hash(adminPassword, 12),
        role: 'admin',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const demos = [
      { name: 'Alex Chen', email: 'alex@demo.test' },
      { name: 'Sam Patel', email: 'sam@demo.test' },
      { name: 'Riya Kumar', email: 'riya@demo.test' },
    ];
    for (const demo of demos) {
      const user = await users.findOneAndUpdate(
        { email: demo.email },
        {
          ...demo,
          password: await bcrypt.hash(userPassword, 12),
          status: 'active',
          lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      await Promise.all([
        groups.deleteMany({ userId: user._id }),
        tasks.deleteMany({ userId: user._id }),
        logs.deleteMany({ userId: user._id }),
      ]);
      const [work, personal] = await groups.create([
        { name: 'Work', color: '#4f46e5', order: 0, userId: user._id },
        { name: 'Personal', color: '#10b981', order: 1, userId: user._id },
      ]);
      const day = 24 * 60 * 60 * 1000;
      if (demo.email === 'riya@demo.test') {
        await logs.create({
          userId: user._id,
          actor: 'user',
          action: 'seed.demo_created',
          meta: {},
        });
        continue;
      }
      await tasks.create([
        {
          title: 'Review weekly priorities',
          description: 'Confirm milestones and owners',
          priority: 'high',
          dueDate: new Date(Date.now() + day),
          groupId: work._id,
          order: 0,
          userId: user._id,
        },
        {
          title: 'Prepare project update',
          description: 'Share progress and open decisions',
          priority: 'medium',
          dueDate: new Date(Date.now() + 3 * day),
          reminderAt: new Date(Date.now() + 2 * day),
          groupId: work._id,
          order: 1,
          userId: user._id,
        },
        {
          title: 'Book dentist appointment',
          priority: 'low',
          groupId: personal._id,
          order: 0,
          userId: user._id,
        },
        {
          title: 'Plan weekend groceries',
          priority: 'medium',
          completed: true,
          completedAt: new Date(Date.now() - day),
          groupId: personal._id,
          order: 1,
          userId: user._id,
        },
      ]);
      await logs.create({
        userId: user._id,
        actor: 'user',
        action: 'seed.demo_created',
        meta: {},
      });
    }
    console.log(
      `Seeded admin "${adminUsername}" and ${demos.length} demo users.`,
    );
  } finally {
    await app.close();
  }
}

void seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
