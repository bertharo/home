// Domain types mirroring the Postgres schema (see supabase/schema.sql).

export type Recurrence =
  | "none"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly";

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  color: string;
  household_id: string | null;
  created_at: string;
};

export type Household = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
};

export type Invite = {
  id: string;
  household_id: string;
  email: string | null;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
};

export type Todo = {
  id: string;
  title: string;
  notes: string | null;
  status: "open" | "done";
  assignee_id: string | null; // null = unassigned
  for_both: boolean;
  due_date: string | null; // YYYY-MM-DD
  created_by: string;
  created_at: string;
  completed_at: string | null;
};

export type Chore = {
  id: string;
  title: string;
  notes: string | null;
  recurrence: Recurrence;
  rotate: boolean; // alternate assignee on each completion
  current_assignee_id: string | null;
  last_done_at: string | null;
  last_done_by: string | null;
  next_due: string | null; // YYYY-MM-DD
  created_by: string;
  created_at: string;
};

export type GroceryItem = {
  id: string;
  name: string;
  section: string;
  qty: string | null;
  checked: boolean;
  created_by: string;
  created_at: string;
};

export type PickupDuty = {
  id: string;
  label: string; // e.g. "School pickup", "Dog walk"
  day_of_week: number; // 0=Sunday .. 6=Saturday
  assignee_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};

// Budget types live in src/lib/budget (engine domain types + DB row types).

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  kind: "individual" | "joint";
  owner_id: string | null; // for individual goals
  status: "not_started" | "in_progress" | "on_hold" | "done";
  progress_note: string | null;
  year: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type VacationStatus = "idea" | "researching" | "planned" | "booked";

export type VacationIdea = {
  id: string;
  title: string;
  notes: string | null;
  rough_cost: number | null;
  rough_timing: string | null;
  status: VacationStatus;
  created_by: string;
  created_at: string;
};

export type VacationLink = {
  id: string;
  idea_id: string;
  url: string;
  label: string | null;
  created_at: string;
};

export type VacationPhoto = {
  id: string;
  idea_id: string;
  storage_path: string;
  created_at: string;
};

export type VacationIdeaFull = VacationIdea & {
  vacation_links: VacationLink[];
  vacation_photos: VacationPhoto[];
};

export type GoogleAccount = {
  user_id: string;
  google_email: string | null;
  access_token: string;
  refresh_token: string;
  expiry: string; // ISO
  calendar_id: string; // usually "primary"
  updated_at: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
  ownerId: string; // profile id whose calendar it came from
  ownerColor: string;
  ownerName: string;
  location?: string | null;
  isFamily?: boolean;
};
