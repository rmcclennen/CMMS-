import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

/** Plant job roles, ordered from most to least authority. */
export const ROLE_OPTIONS: { value: AppRole; label: string; hint: string }[] = [
  { value: "admin", label: "Admin", hint: "Full system access" },
  { value: "manager", label: "Manager", hint: "Approves deletions, assigns roles" },
  { value: "supervisor", label: "Supervisor", hint: "Approves deletions" },
  { value: "lead_operator", label: "Lead Operator", hint: "Runs the shift" },
  { value: "operator", label: "Operator", hint: "Process operations" },
  { value: "electrician", label: "Electrician", hint: "Electrical work" },
  { value: "maintenance", label: "Maintenance", hint: "Mechanical work" },
  { value: "technician", label: "Technician", hint: "General technician" },
  { value: "viewer", label: "Viewer", hint: "Read only" },
];

const LABELS = new Map(ROLE_OPTIONS.map((r) => [r.value, r.label]));

export function roleLabel(role: AppRole | string) {
  return LABELS.get(role as AppRole) ?? String(role).replace(/_/g, " ");
}

/** Roles allowed to approve or deny deletion requests. */
export const APPROVER_ROLES: AppRole[] = ["admin", "manager", "supervisor"];

export function canApproveDeletions(roles: AppRole[]) {
  return roles.some((r) => APPROVER_ROLES.includes(r));
}

export function canManageRoles(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("manager") || roles.includes("supervisor");
}

export function isApproverRole(role: AppRole | string): boolean {
  return APPROVER_ROLES.includes(role as AppRole);
}

export function roleBadgeClass(role: AppRole | string): string {
  switch (role) {
    case "admin":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "manager":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold";
    case "supervisor":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold";
    case "lead_operator":
      return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30";
    case "operator":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "electrician":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
    case "maintenance":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30";
    case "technician":
      return "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30";
    case "viewer":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export type DeletableEntity = "asset" | "pm_schedule" | "work_order";

export const ENTITY_LABELS: Record<DeletableEntity, string> = {
  asset: "Asset",
  pm_schedule: "PM schedule",
  work_order: "Work order",
};
