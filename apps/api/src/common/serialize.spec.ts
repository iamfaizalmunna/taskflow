import {
  serializeActivity,
  serializeAdmin,
  serializeGroup,
  serializeTask,
  serializeUser,
} from './serialize';

describe('serializeUser', () => {
  it('exposes id, hides the password, and treats missing status as active', () => {
    const user = serializeUser({
      _id: '507f1f77bcf86cd799439011',
      name: 'Alex',
      email: 'alex@demo.test',
      password: 'secret',
      __v: 0,
    });
    expect(user).toMatchObject({
      id: '507f1f77bcf86cd799439011',
      name: 'Alex',
      email: 'alex@demo.test',
      status: 'active',
      isActive: true,
    });
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('_id');
  });

  it('marks disabled users as inactive', () => {
    const user = serializeUser({
      _id: '507f1f77bcf86cd799439011',
      status: 'disabled',
    });
    expect(user.status).toBe('disabled');
    expect(user.isActive).toBe(false);
  });
});

describe('serializeTask', () => {
  it('maps order to position and keeps a null groupId', () => {
    const task = serializeTask({
      _id: '507f191e810c19729de860ea',
      title: 'Ship MVP',
      order: 4,
      groupId: null,
    });
    expect(task).toMatchObject({
      id: '507f191e810c19729de860ea',
      title: 'Ship MVP',
      groupId: null,
      position: 4,
    });
  });

  it('stringifies a nested group ObjectId', () => {
    const task = serializeTask({
      _id: '507f191e810c19729de860ea',
      title: 'Review PR',
      groupId: '507f1f77bcf86cd799439011',
      order: 0,
    });
    expect(task.groupId).toBe('507f1f77bcf86cd799439011');
  });
});

describe('serializeGroup', () => {
  it('does not invent a groupId field on groups', () => {
    const group = serializeGroup({
      _id: '507f1f77bcf86cd799439011',
      name: 'Work',
      userId: '507f191e810c19729de860ea',
    });
    expect(group).toMatchObject({
      id: '507f1f77bcf86cd799439011',
      name: 'Work',
      userId: '507f191e810c19729de860ea',
    });
    expect(group).not.toHaveProperty('groupId');
  });
});

describe('serializeAdmin', () => {
  it('uses the username as the display name', () => {
    expect(
      serializeAdmin({ _id: '507f1f77bcf86cd799439011', username: 'admin' }),
    ).toMatchObject({
      id: '507f1f77bcf86cd799439011',
      name: 'admin',
      role: 'admin',
    });
  });
});

describe('serializeActivity', () => {
  it('copies the action into description', () => {
    expect(
      serializeActivity({
        _id: '507f1f77bcf86cd799439011',
        action: 'task.created',
      }),
    ).toMatchObject({
      description: 'task.created',
    });
  });
});
