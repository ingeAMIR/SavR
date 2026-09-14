/**
 * Tipos de la base. Se mantienen a mano para no depender de `supabase gen types`
 * en el build de Vercel; si cambias el esquema, actualiza también este archivo.
 */

export type GoalStatus = "active" | "paused" | "completed" | "archived";
export type SurplusMode = "buffer" | "accelerate";
export type MemberRole = "owner" | "collaborator";
export type ContributionKind = "manual" | "daily" | "global" | "micro" | "adjustment";
export type ContributionFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  timezone: string;
  reminder_enabled: boolean;
  reminder_time: string;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  owner_id: string;
  name: string;
  image_url: string | null;
  target_amount: number;
  start_date: string;
  due_date: string;
  status: GoalStatus;
  surplus_mode: SurplusMode;
  rounding_step: number;
  contribution_frequency: ContributionFrequency;
  is_shared: boolean;
  purchased_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalMember {
  id: string;
  goal_id: string;
  user_id: string;
  role: MemberRole;
  share_bps: number;
  joined_at: string;
  profile?: Profile | null;
}

export interface Contribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  kind: ContributionKind;
  note: string | null;
  occurred_on: string;
  created_at: string;
  profile?: Profile | null;
  reactions?: Reaction[];
}

export interface Reaction {
  id: string;
  contribution_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  name: string;
  estimated_amount: number | null;
  image_url: string | null;
  link_url: string | null;
  promoted_goal_id: string | null;
  created_at: string;
}

export interface Invitation {
  id: string;
  goal_id: string;
  code: string;
  invited_email: string | null;
  share_bps: number;
  created_by: string;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  revoked: boolean;
}

export interface InvitationPreview {
  goal_id: string | null;
  goal_name: string | null;
  goal_image: string | null;
  target_amount: number | null;
  due_date: string | null;
  share_bps: number | null;
  owner_name: string | null;
  owner_avatar: string | null;
  already_member: boolean;
  invalid_reason: string | null;
}

/** Meta con todo lo necesario para calcular su estado. */
export interface GoalBundle {
  goal: Goal;
  members: GoalMember[];
  contributions: Contribution[];
}
