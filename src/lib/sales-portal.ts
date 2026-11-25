import type { LeadStage, QueueFilter } from "@/lib/api/types";

export type { LeadStage, QueueFilter };

export const SALES_WORKSPACE_PATHS = ["/today", "/leads", "/calls", "/calendar"] as const;
export const ADMIN_WORKSPACE_PATHS = ["/salespeople"] as const;

function matchesPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function isSalesWorkspacePath(pathname: string): boolean {
  return [...SALES_WORKSPACE_PATHS, ...ADMIN_WORKSPACE_PATHS].some((path) => matchesPath(pathname, path));
}

export function isSalesAllowedPath(pathname: string): boolean {
  return pathname === "/profile" || SALES_WORKSPACE_PATHS.some((path) => matchesPath(pathname, path));
}

export const QUEUE_FILTERS: Array<{ id: QueueFilter; label: string }> = [
  { id: "due", label: "Due today" },
  { id: "new", label: "New" },
  { id: "overdue", label: "Overdue" },
  { id: "mine", label: "Mine" },
];

export const LEAD_STAGES: LeadStage[] = ["New", "Contacted", "Qualified", "Visit booked", "Won", "Lost"];

export function mondayOf(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + (next.getDay() === 0 ? -6 : 1 - next.getDay()));
  return next;
}

/** Monday through Sunday of the week that contains `from`. */
export function weekDays(from = new Date()): Date[] {
  const monday = mondayOf(from);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function toYmd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
