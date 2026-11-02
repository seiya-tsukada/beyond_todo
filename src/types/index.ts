/**
 * Beyond TODO. Data Models & TypeScript Types
 * Designed for Supabase PostgreSQL compatibility with user_id multi-tenancy
 */

export type ChallengeStatus = 'Open' | 'In Progress' | 'Resolved';
export type ImportanceLevel = 'High' | 'Medium' | 'Low';
export type PriorityStatus = 'Not Started' | 'In Progress' | 'Completed';
export type InterestStatus = 'Interested' | 'Exploring' | 'Acting' | 'Archived';
export type StakeholderRelationship = 'Customer' | 'Partner' | 'Family' | 'Colleague' | 'Other';

export interface User {
  id: string;
  email: string;
  name: string;
  title?: string | null;
  email_verified_at: string | null;
  notify_weekly_review: boolean;
  created_at: string;
}

export interface Challenge {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: ChallengeStatus;
  importance: ImportanceLevel;
  created_at: string;
  updated_at: string;
}

export interface Priority {
  id: string;
  user_id: string;
  challenge_id?: string | null;
  challenge_title?: string | null;
  title: string;
  description: string;
  reason: string;
  status: PriorityStatus;
  target_week: string; // Format: YYYY-Www (e.g., 2026-W44)
  created_at: string;
  updated_at: string;
}

export interface Interest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: InterestStatus;
  who?: string; // ステークホルダー / 対象者 (例: 自分, クライアントA社, チーム, 経営陣)
  created_at: string;
  updated_at: string;
}

export interface Stakeholder {
  id: string;
  user_id: string;
  name: string;
  relationship: StakeholderRelationship;
  description: string;
  interests?: StakeholderInterest[];
  created_at: string;
  updated_at: string;
}

export interface StakeholderInterest {
  id: string;
  user_id: string;
  stakeholder_id: string;
  stakeholder_name?: string;
  title: string;
  description: string;
  importance: ImportanceLevel;
  status: 'Active' | 'Addressed' | 'Pending';
  created_at: string;
  updated_at: string;
}

export interface WeeklyReviewAnswers {
  accomplished: string;
  unaccomplished: string;
  priority_assessment: string;
  priority_reasoning: string;
  interest_time: string;
  stakeholder_balance: string;
  weekly_learnings: string;
  next_week_improvements: string;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  summary: string;
  completed_priorities: string[];
  incomplete_priorities: string[];
  personal_reflection: string;
  decision_reflection: string;
  next_week_actions: string[];
  answers: WeeklyReviewAnswers;
  created_at: string;
  updated_at: string;
}

export interface DecisionLog {
  id: string;
  user_id: string;
  priority_id?: string | null;
  decision: string;
  reason: string;
  outcome?: string;
  created_at: string;
}

export interface AIInsight {
  id: string;
  type: 'bias' | 'priority_mismatch' | 'neglected_interest' | 'stakeholder_alignment' | 'general';
  title: string;
  message: string;
  recommendation: string;
  question: string;
  tag: string;
  created_at: string;
}

export interface DashboardOverview {
  challenges: Challenge[];
  priorities: Priority[];
  interests: Interest[];
  stakeholders: Stakeholder[];
  aiInsights: AIInsight[];
  latestReview: WeeklyReview | null;
  targetWeek: string;
  metrics: {
    openChallengesCount: number;
    highImportanceChallengesCount: number;
    activePrioritiesCount: number;
    completedPrioritiesCount: number;
    exploringInterestsCount: number;
    stakeholderCount: number;
    interestToActionRatio: number; // percentage
  };
}

export interface QuickMemo {
  id: string;
  user_id: string;
  content: string;
  tags?: string[];
  converted_to?: 'challenge' | 'priority' | 'interest' | 'stakeholder' | null;
  created_at: string;
  updated_at: string;
}
