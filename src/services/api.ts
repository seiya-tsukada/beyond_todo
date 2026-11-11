/**
 * Beyond TODO. Client API Service
 * Talks to the Python API under /api. Authentication uses an httpOnly session
 * cookie set by the server, so no token is handled in the browser.
 */

import {
  Challenge,
  Priority,
  Interest,
  Stakeholder,
  StakeholderInterest,
  WeeklyReview,
  DecisionLog,
  AIInsight,
  DashboardOverview,
  User,
  QuickMemo,
} from '../types/index.ts';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;

/** Called whenever the server reports the session is missing or expired. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(endpoint, { ...options, headers, credentials: 'same-origin' });

  if (!response.ok) {
    let errorMsg = 'リクエストに失敗しました';
    try {
      const errData = await response.json();
      if (errData && errData.error) errorMsg = errData.error;
    } catch {
      // ignore
    }
    if (response.status === 401 && !endpoint.startsWith('/api/auth/')) onUnauthorized?.();
    throw new ApiError(errorMsg, response.status);
  }

  return response.json();
}

function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
}

function put<T>(endpoint: string, body: unknown): Promise<T> {
  return request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
}

function del(endpoint: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(endpoint, { method: 'DELETE' });
}

type Message = { success: boolean; message: string };

export const api = {
  // Auth
  login(email: string, password: string): Promise<{ user: User }> {
    return post('/api/auth/login', { email, password });
  },

  /** Step 1 of sign-up: creates the account unverified and mails a 6-digit code. */
  register(data: { email: string; password: string }): Promise<{ email: string; message: string }> {
    return post('/api/auth/register', data);
  },

  /** Step 2 of sign-up: checks the code and signs in. */
  verifySignupCode(email: string, code: string): Promise<{ user: User }> {
    return post('/api/auth/register/verify', { email, code });
  },

  resendSignupCode(email: string): Promise<Message> {
    return post('/api/auth/register/resend', { email });
  },

  getMe(): Promise<{ user: User }> {
    return request('/api/auth/me');
  },

  updateMe(data: { name?: string; title?: string; notify_weekly_review?: boolean }): Promise<{ user: User }> {
    return request('/api/auth/me', { method: 'PATCH', body: JSON.stringify(data) });
  },

  logout(): Promise<{ success: boolean }> {
    return post('/api/auth/logout');
  },

  forgotPassword(email: string): Promise<Message> {
    return post('/api/auth/forgot-password', { email });
  },

  resetPassword(token: string, password: string): Promise<Message> {
    return post('/api/auth/reset-password', { token, password });
  },

  // Dashboard Overview
  getDashboardOverview(week?: string): Promise<DashboardOverview> {
    const query = week ? `?week=${encodeURIComponent(week)}` : '';
    return request(`/api/dashboard/overview${query}`);
  },

  // Challenges (Problems)
  getChallenges(): Promise<Challenge[]> {
    return request('/api/challenges');
  },

  createChallenge(data: { title: string; description?: string; status?: string; importance?: string }): Promise<Challenge> {
    return post('/api/challenges', data);
  },

  updateChallenge(id: string, data: Partial<Challenge>): Promise<Challenge> {
    return put(`/api/challenges/${id}`, data);
  },

  deleteChallenge(id: string) {
    return del(`/api/challenges/${id}`);
  },

  // Priorities
  getPriorities(targetWeek?: string): Promise<Priority[]> {
    const query = targetWeek ? `?target_week=${encodeURIComponent(targetWeek)}` : '';
    return request(`/api/priorities${query}`);
  },

  createPriority(data: {
    title: string;
    description?: string;
    reason: string;
    status?: string;
    target_week?: string;
    challenge_id?: string | null;
  }): Promise<Priority> {
    return post('/api/priorities', data);
  },

  updatePriority(id: string, data: Partial<Priority>): Promise<Priority> {
    return put(`/api/priorities/${id}`, data);
  },

  deletePriority(id: string) {
    return del(`/api/priorities/${id}`);
  },

  // Interests
  getInterests(): Promise<Interest[]> {
    return request('/api/interests');
  },

  createInterest(data: { title: string; description?: string; category?: string; status?: string; who?: string }): Promise<Interest> {
    return post('/api/interests', data);
  },

  updateInterest(id: string, data: Partial<Interest>): Promise<Interest> {
    return put(`/api/interests/${id}`, data);
  },

  deleteInterest(id: string) {
    return del(`/api/interests/${id}`);
  },

  // Stakeholders
  getStakeholders(): Promise<Stakeholder[]> {
    return request('/api/stakeholders');
  },

  createStakeholder(data: { name: string; relationship?: string; description?: string }): Promise<Stakeholder> {
    return post('/api/stakeholders', data);
  },

  updateStakeholder(id: string, data: Partial<Stakeholder>): Promise<Stakeholder> {
    return put(`/api/stakeholders/${id}`, data);
  },

  deleteStakeholder(id: string) {
    return del(`/api/stakeholders/${id}`);
  },

  createStakeholderInterest(
    stakeholderId: string,
    data: { title: string; description?: string; importance?: string; status?: string }
  ): Promise<StakeholderInterest> {
    return post(`/api/stakeholders/${stakeholderId}/interests`, data);
  },

  updateStakeholderInterest(id: string, data: Partial<StakeholderInterest>): Promise<StakeholderInterest> {
    return put(`/api/stakeholder-interests/${id}`, data);
  },

  deleteStakeholderInterest(id: string) {
    return del(`/api/stakeholder-interests/${id}`);
  },

  // Weekly Reviews
  getReviews(): Promise<WeeklyReview[]> {
    return request('/api/reviews');
  },

  getLatestReview(): Promise<WeeklyReview | null> {
    return request('/api/reviews/latest');
  },

  createReview(data: Partial<WeeklyReview>): Promise<WeeklyReview> {
    return post('/api/reviews', data);
  },

  // Decision Logs
  getDecisionLogs(): Promise<DecisionLog[]> {
    return request('/api/decision-logs');
  },

  createDecisionLog(data: { priority_id?: string | null; decision: string; reason: string; outcome?: string }): Promise<DecisionLog> {
    return post('/api/decision-logs', data);
  },

  deleteDecisionLog(id: string) {
    return del(`/api/decision-logs/${id}`);
  },

  // AI Insights
  analyzeInsights(userQuery?: string): Promise<{ insights: AIInsight[] }> {
    return post('/api/insights/analyze', { userQuery });
  },

  // Quick Memos (Meeting scratchpad & instant capture)
  getQuickMemos(): Promise<QuickMemo[]> {
    return request('/api/memos');
  },

  createQuickMemo(content: string, tags?: string[]): Promise<QuickMemo> {
    return post('/api/memos', { content, tags: tags || [] });
  },

  updateQuickMemo(id: string, data: { content?: string; tags?: string[] }): Promise<QuickMemo> {
    return put(`/api/memos/${id}`, data);
  },

  deleteQuickMemo(id: string) {
    return del(`/api/memos/${id}`);
  },

  convertQuickMemo(
    id: string,
    data: {
      targetType: 'challenge' | 'priority' | 'interest' | 'stakeholder';
      title: string;
      description?: string;
      reason?: string;
      category?: string;
      status?: string;
      importance?: string;
      stakeholder_id?: string;
    }
  ): Promise<{ success: boolean; createdEntity: unknown; convertedType: string }> {
    return post(`/api/memos/${id}/convert`, data);
  },

  autoStockMemos(memoIds?: string[]): Promise<{
    success: boolean;
    processedCount: number;
    skippedCount: number;
    stockedCounts: { priority: number; challenge: number; interest: number };
  }> {
    return post('/api/memos/auto-stock', { memo_ids: memoIds });
  },

  // System
  getExportUrl(): string {
    return '/api/system/export';
  },
};
