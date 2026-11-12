/**
 * Database types for the Planora schema (supabase/migrations).
 * Once the Supabase CLI is linked, these can be regenerated with:
 *   npx supabase gen types typescript --linked > src/types/database.ts
 */
import type { StoredPlan } from '@shared/plan'

export type WorkspaceRole = 'owner' | 'admin' | 'member'
export type TaskStatus = 'todo' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed'
export type DocumentStatus = 'uploaded' | 'processing' | 'processed' | 'failed'
export type DocumentFileType = 'pdf' | 'docx' | 'doc' | 'txt' | 'csv' | 'xlsx'
export type DocumentCategory =
  'brief' | 'requirements' | 'report' | 'reference' | 'assignment' | 'other'
export type AiJobStatus = 'queued' | 'extracting' | 'analysing' | 'completed' | 'failed'
export type PlanStatus = 'pending_review' | 'approved' | 'rejected'
export type ReminderStatus = 'scheduled' | 'sent' | 'dismissed'
export type NotificationType =
  'reminder' | 'task_overdue' | 'task_due_soon' | 'plan_ready' | 'plan_failed' | 'system'
export type EventCategory = 'personal' | 'academic' | 'work' | 'meeting' | 'deadline' | 'other'
export type CategoryColor = 'navy' | 'sage' | 'amber' | 'red' | 'blue' | 'purple' | 'slate'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  owner_id: string
  is_personal: boolean
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  created_at: string
}

export interface TaskCategory {
  id: string
  workspace_id: string
  name: string
  color: CategoryColor
  is_default: boolean
  created_at: string
}

export interface Task {
  id: string
  workspace_id: string
  category_id: string | null
  project_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  start_date: string | null
  due_date: string | null
  completed_at: string | null
  assigned_to: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Subtask {
  id: string
  workspace_id: string
  task_id: string
  title: string
  is_completed: boolean
  completed_at: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface TaskDependency {
  workspace_id: string
  task_id: string
  depends_on_task_id: string
  created_at: string
}

export interface Project {
  id: string
  workspace_id: string
  name: string
  description: string | null
  status: ProjectStatus
  priority: TaskPriority
  start_date: string | null
  end_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: string
  workspace_id: string
  project_id: string
  title: string
  description: string | null
  due_date: string | null
  is_completed: boolean
  completed_at: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface PlannerEvent {
  id: string
  workspace_id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  category: EventCategory
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  workspace_id: string
  user_id: string
  item_date: string
  title: string
  is_completed: boolean
  completed_at: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface DocumentRecord {
  id: string
  workspace_id: string
  project_id: string | null
  uploaded_by: string | null
  file_name: string
  file_type: DocumentFileType
  mime_type: string
  file_size: number
  storage_path: string
  category: DocumentCategory
  description: string | null
  processing_status: DocumentStatus
  extracted_text: string | null
  created_at: string
  updated_at: string
}

export interface AiJob {
  id: string
  workspace_id: string
  document_id: string
  requested_by: string | null
  status: AiJobStatus
  error_message: string | null
  model: string | null
  input_chars: number | null
  truncated: boolean
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface GeneratedPlan {
  id: string
  workspace_id: string
  ai_job_id: string
  document_id: string
  plan: StoredPlan
  approved_plan: unknown
  status: PlanStatus
  project_id: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  user_id: string
  in_app_enabled: boolean
  email_enabled: boolean
  browser_enabled: boolean
  overdue_alerts: boolean
  due_soon_alerts: boolean
  default_reminder_minutes: number
  week_starts_on: 0 | 1
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: string
  workspace_id: string
  user_id: string
  task_id: string | null
  event_id: string | null
  title: string
  note: string | null
  remind_at: string
  status: ReminderStatus
  sent_at: string | null
  created_at: string
  updated_at: string
}

export interface AppNotification {
  id: string
  workspace_id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  reminder_id: string | null
  task_id: string | null
  event_id: string | null
  dedupe_key: string
  read_at: string | null
  email_status: 'not_required' | 'pending' | 'sent' | 'failed'
  created_at: string
}

/** Interfaces lack an index signature; mapping them gives supabase-js the plain object type it needs. */
type Plain<T> = { [K in keyof T]: T[K] }

/** Row type + permissive Insert/Update (the database enforces required columns). */
type Table<Row, Rel extends unknown[] = []> = {
  Row: Plain<Row>
  Insert: Plain<Partial<Row>>
  Update: Plain<Partial<Row>>
  Relationships: Rel
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>
      workspaces: Table<
        Workspace,
        [
          {
            foreignKeyName: 'workspaces_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      >
      workspace_members: Table<
        WorkspaceMember,
        [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      >
      task_categories: Table<TaskCategory>
      tasks: Table<Task>
      subtasks: Table<Subtask>
      task_dependencies: Table<TaskDependency>
      projects: Table<Project>
      milestones: Table<Milestone>
      planner_events: Table<PlannerEvent>
      daily_checklists: Table<ChecklistItem>
      documents: Table<DocumentRecord>
      ai_jobs: Table<AiJob>
      generated_plans: Table<GeneratedPlan>
      user_preferences: Table<UserPreferences>
      reminders: Table<Reminder>
      notifications: Table<AppNotification>
    }
    Views: { [_ in never]: never }
    Functions: {
      is_workspace_member: { Args: { ws: string }; Returns: boolean }
      approve_generated_plan: {
        Args: { p_plan_id: string; p_plan: unknown; p_project_id?: string | null }
        Returns: string
      }
      reject_generated_plan: { Args: { p_plan_id: string }; Returns: undefined }
    }
    Enums: {
      workspace_role: WorkspaceRole
      task_status: TaskStatus
      task_priority: TaskPriority
      project_status: ProjectStatus
    }
    CompositeTypes: { [_ in never]: never }
  }
}
