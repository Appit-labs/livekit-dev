export type AppSection =
  | "channel"
  | "dm"
  | "threads"
  | "bundle"
  | "drafts"
  | "directories"
  | "board"
  | "tasks"
  | "calendar"
  | "settings";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  title: string | null;
  department: string | null;
  status: "online" | "away" | "busy" | "offline";
  role: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  members_online: number;
}

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  unread: number;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  reply_count: number;
  reactions: { emoji: string; count: number }[];
}

export interface DMParticipant {
  user_id: string;
  name: string;
  avatar_url: string | null;
  status: string;
}

export interface DMConversation {
  id: string;
  workspace_id: string;
  participants: DMParticipant[];
  last_message: string | null;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
}

export interface BoardTask {
  id: string;
  column_id: string;
  board_id?: string;
  board_name?: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  template: "bug" | "feature" | "improvement" | "custom";
  due_date: string | null;
  estimation: number | null;
  time_spent: number;
  position: number;
  created_at: string;
  subtasks: Subtask[];
  labels: Label[];
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  position: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface BoardColumn {
  id: string;
  board_id: string;
  title: string;
  color: string;
  position: number;
  tasks: BoardTask[];
}

export interface Board {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_at: string;
  columns: BoardColumn[];
  members: { user_id: string; role: string }[];
}

export interface BoardSummary {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  event_type: "meeting" | "personal" | "team" | "deadline" | "holiday";
  color: string | null;
  recurrence_rule: string | null;
  created_by: string;
  attendees: { user_id: string; rsvp_status: string }[];
}

export interface Draft {
  id: string;
  user_id: string;
  channel_id: string | null;
  conversation_id: string | null;
  content: string;
  sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPrefs {
  email_messages: boolean;
  email_mentions: boolean;
  push_messages: boolean;
  push_mentions: boolean;
  sound_enabled: boolean;
}

export interface AppearanceSettings {
  theme: "light" | "dark" | "system";
  compact_mode: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
}
