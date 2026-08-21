import { Types } from 'mongoose';
import { asObjectId, definedFields, userScope } from './ids';

describe('definedFields', () => {
  it('drops undefined keys so partial updates do not wipe stored values', () => {
    expect(
      definedFields({
        title: undefined,
        groupId: null,
        completed: true,
      }),
    ).toEqual({ groupId: null, completed: true });
  });

  it('returns an empty object when every field is undefined', () => {
    expect(definedFields({ title: undefined, priority: undefined })).toEqual(
      {},
    );
  });
});

describe('asObjectId', () => {
  it('parses a 24-character hex id', () => {
    const id = '507f1f77bcf86cd799439011';
    const objectId = asObjectId(id);
    expect(objectId).toBeInstanceOf(Types.ObjectId);
    expect(objectId.toHexString()).toBe(id);
  });
});

describe('userScope', () => {
  it('matches both the string id and ObjectId form used in Mongo queries', () => {
    const id = '507f1f77bcf86cd799439011';
    const scope = userScope(id);
    expect(scope.$in).toHaveLength(2);
    expect(scope.$in[0]).toBe(id);
    expect((scope.$in[1] as Types.ObjectId).toHexString()).toBe(id);
  });
});
