export type UserRole = 'admin' | 'sub_admin' | 'student';
export type TaskType = 'offline' | 'online';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
}

export interface Subject {
  id: string;
  name: string;
  teacher_name: string | null;
  color_hex: string;
}

export interface TaskWithRelations {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  type: TaskType;
  attachment_url: string | null;
  external_link: string | null;
  due_date: string;
  is_archived: boolean;
  updated_at: string;
  subjects: Pick<Subject, 'id' | 'name' | 'color_hex'>;
  updater: Pick<Profile, 'full_name'> | null;
  is_completed: boolean;
}

export interface TaskProgressStat {
  task_id: string;
  completed_count: number;
  total_members: number;
  completion_pct: number;
}
