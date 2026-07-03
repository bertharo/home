import {
  Home,
  CheckSquare,
  Calendar,
  Wallet,
  Target,
  Plane,
  ShoppingCart,
  Repeat,
  Car,
  type LucideIcon,
} from "lucide-react";

export const APP_NAME = "Home Hub";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the bottom tab bar on mobile. */
  primary?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home, primary: true },
  { href: "/todos", label: "To-dos", icon: CheckSquare, primary: true },
  { href: "/calendar", label: "Calendar", icon: Calendar, primary: true },
  { href: "/budget", label: "Budget", icon: Wallet, primary: true },
  { href: "/goals", label: "Goals", icon: Target, primary: true },
  { href: "/vacation", label: "Trips", icon: Plane },
  { href: "/grocery", label: "Grocery", icon: ShoppingCart },
  { href: "/chores", label: "Chores", icon: Repeat },
  { href: "/duties", label: "Pickups", icon: Car },
];

// Budget categories (variable + fixed grouping is by `kind` on the row).
export const EXPENSE_CATEGORIES = [
  "Housing",
  "Utilities",
  "Groceries",
  "Dining",
  "Transportation",
  "Health",
  "Insurance",
  "Subscriptions",
  "Shopping",
  "Entertainment",
  "Kids",
  "Pets",
  "Travel",
  "Gifts",
  "Savings",
  "Investing",
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Salary",
  "Bonus",
  "Side income",
  "Refund",
  "Other",
] as const;

export const GROCERY_SECTIONS = [
  "Produce",
  "Meat & Seafood",
  "Dairy",
  "Bakery",
  "Frozen",
  "Pantry",
  "Beverages",
  "Household",
  "Personal Care",
  "Other",
] as const;

export const TODO_STATUSES = ["open", "done"] as const;

export const GOAL_STATUSES = [
  "not_started",
  "in_progress",
  "on_hold",
  "done",
] as const;

export const GOAL_STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  on_hold: "On hold",
  done: "Done",
};

export const VACATION_STATUSES = [
  "idea",
  "researching",
  "planned",
  "booked",
] as const;

export const VACATION_STATUS_LABELS: Record<string, string> = {
  idea: "Idea",
  researching: "Researching",
  planned: "Planned",
  booked: "Booked",
};

export const RECURRENCE_OPTIONS = [
  { value: "none", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Default palette for the two profiles (index by profile order). */
export const PROFILE_COLORS = ["#2563eb", "#db2777"]; // blue, pink
