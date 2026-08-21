export type Priority = "low" | "medium" | "high";

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role?: string;
  status?: "active" | "disabled";
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  taskCount?: number;
  groupCount?: number;
}

export interface Group {
  id: string;
  name: string;
  color?: string;
  taskCount?: number;
  createdAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  dueDate?: string | null;
  reminderAt?: string | null;
  groupId?: string | null;
  group?: Group | null;
  order?: number;
  position?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Activity {
  id: string;
  action: string;
  description?: string;
  createdAt: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  groupId?: string | null;
  priority: Priority;
  dueDate?: string | null;
  reminderAt?: string | null;
}

export interface CrmUserDetail extends User {
  tasks?: Task[];
  groups?: Group[];
  activity?: Activity[];
}
