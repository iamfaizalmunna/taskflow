import { Types } from 'mongoose';

export function asObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

export function userScope(userId: string) {
  return { $in: [userId, asObjectId(userId)] };
}

/**
 * DTO instances declare every field, so absent keys arrive as `undefined` and would
 * overwrite stored values when merged into a document.
 */
export function definedFields<T extends object>(dto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
