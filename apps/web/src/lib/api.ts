import type { CrmUserDetail, Group, Task, TaskInput, User } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown };

function errorMessage(data: unknown, status: number): string {
  if (typeof data === "object" && data && "message" in data) {
    const message = (data as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return `Request failed (${status})`;
}

function toIso(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(path.startsWith("/api") ? path : `/api${path}`, {
    ...options,
    headers,
    credentials: "include",
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    throw new ApiError(errorMessage(data, response.status), response.status, data);
  }
  return data as T;
}

export const authApi = {
  me: () => api<User>("/auth/me"),
  login: (email: string, password: string) =>
    api<{ user: User }>("/auth/login", { method: "POST", body: { email, password } }).then((res) => res.user),
  register: (name: string, email: string, password: string) =>
    api<{ user: User }>("/auth/register", { method: "POST", body: { name, email, password } }).then((res) => res.user),
  logout: () => api<void>("/auth/logout", { method: "POST" }),
  profile: (body: { name?: string; email?: string; currentPassword?: string; password?: string }) =>
    api<User>("/auth/profile", { method: "PATCH", body }),
};

function taskBody(body: Partial<TaskInput & Pick<Task, "completed">>) {
  const payload: Record<string, unknown> = { ...body };
  if (body.dueDate !== undefined) payload.dueDate = toIso(body.dueDate);
  if (body.reminderAt !== undefined) payload.reminderAt = toIso(body.reminderAt);
  if (body.groupId !== undefined) payload.groupId = body.groupId || null;
  return payload;
}

export const tasksApi = {
  list: () => api<Task[]>("/tasks"),
  create: (body: TaskInput) => api<Task>("/tasks", { method: "POST", body: taskBody(body) }),
  update: (id: string, body: Partial<TaskInput & Pick<Task, "completed">>) =>
    api<Task>(`/tasks/${id}`, { method: "PATCH", body: taskBody(body) }),
  remove: (id: string) => api<void>(`/tasks/${id}`, { method: "DELETE" }),
  reorder: (taskIds: string[], groupId?: string | null) =>
    api<void>("/tasks/reorder", { method: "PATCH", body: { taskIds, groupId } }),
};

export const groupsApi = {
  list: () => api<Group[]>("/groups"),
  create: (name: string) => api<Group>("/groups", { method: "POST", body: { name } }),
  update: (id: string, name: string) =>
    api<Group>(`/groups/${id}`, { method: "PATCH", body: { name } }),
  remove: (id: string) => api<void>(`/groups/${id}`, { method: "DELETE" }),
};

export const crmApi = {
  login: (username: string, password: string) =>
    api<{ admin: User }>("/admin/login", { method: "POST", body: { username, password } }).then((res) => res.admin),
  me: () => api<User>("/admin/me"),
  logout: () => api<void>("/admin/logout", { method: "POST" }),
  users: () => api<User[]>("/admin/users"),
  user: (id: string) => api<CrmUserDetail>(`/admin/users/${id}`),
  createUser: (body: { name: string; email: string; password: string }) =>
    api<User>("/admin/users", { method: "POST", body }),
  updateUser: (id: string, body: Partial<User>) =>
    api<User>(`/admin/users/${id}`, {
      method: "PATCH",
      body: {
        name: body.name,
        email: body.email,
        ...(body.isActive === undefined ? {} : { isActive: body.isActive }),
        ...(body.status ? { status: body.status } : {}),
      },
    }),
  removeUser: (id: string) => api<void>(`/admin/users/${id}`, { method: "DELETE" }),
  resetPassword: (id: string, password: string) =>
    api<void>(`/admin/users/${id}/password`, { method: "POST", body: { password } }),
};
