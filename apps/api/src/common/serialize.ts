type Plain = Record<string, unknown>;

function asPlain(value: unknown): Plain {
  return JSON.parse(JSON.stringify(value)) as Plain;
}

function idOf(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value && 'toString' in value)
    return String(value);
  return String(value);
}

export function serializeEntity<T extends object>(doc: T): Plain {
  const raw = asPlain(doc);
  const { _id, __v, password, ...rest } = raw;
  return {
    ...rest,
    id: idOf(_id) ?? idOf(rest.id),
    ...('userId' in rest ? { userId: idOf(rest.userId) ?? null } : {}),
    ...('groupId' in rest ? { groupId: idOf(rest.groupId) ?? null } : {}),
  };
}

export function serializeUser(doc: object) {
  const user = serializeEntity(doc);
  const status = user.status === 'disabled' ? 'disabled' : 'active';
  return {
    ...user,
    status,
    isActive: status === 'active',
  };
}

export function serializeAdmin(doc: object) {
  const admin = serializeEntity(doc);
  return {
    ...admin,
    name: admin.username,
    role: 'admin',
  };
}

export function serializeTask(doc: object) {
  const task = serializeEntity(doc);
  return {
    ...task,
    groupId: task.groupId ?? null,
    position: task.order ?? 0,
  };
}

export function serializeGroup(doc: object) {
  return serializeEntity(doc);
}

export function serializeActivity(doc: object) {
  const item = serializeEntity(doc);
  return {
    ...item,
    description: String(item.action ?? ''),
  };
}
