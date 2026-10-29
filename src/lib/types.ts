export const roles = ["admin", "employee"] as const;

export type Role = (typeof roles)[number];

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
};

export type WorkspaceStats = {
  people: number;
  employees: number;
};

export type ActionState = {
  error?: string;
  message?: string;
} | null;
