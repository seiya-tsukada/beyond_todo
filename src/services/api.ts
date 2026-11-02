/**
 * Beyond TODO. Client API Service
 * Interacts with /api endpoints
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

const TOKEN_KEY = 'beyond_todo_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || 'demo-session-token-beyond-todo';
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'リクエストに失敗しました';
    try {
      const errData = await response.json();
      if (errData && errData.error) errorMsg = errData.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(email: string, password?: string): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token);
    return res;
  },

  async register(name: string, email: string, title?: string): Promise<{ token: string; user: User; message: string }> {
    const res = await request<{ token: string; user: User; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, title }),
    });
    setAuthToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      removeAuthToken();
    }
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Dashboard Overview
  async getDashboardOverview(week?: string): Promise<DashboardOverview> {
    const query = week ? `?week=${encodeURIComponent(week)}` : '';
    return request<DashboardOverview>(`/api/dashboard/overview${query}`);
  },

  // Challenges (Problems)
  async getChallenges(): Promise<Challenge[]> {
    return request<Challenge[]>('/api/challenges');
  },

  async createChallenge(data: { title: string; description?: string; status?: string; importance?: string }): Promise<Challenge> {
    return request<Challenge>('/api/challenges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateChallenge(id: string, data: Partial<Challenge>): Promise<Challenge> {
    return request<Challenge>(`/api/challenges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteChallenge(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/challenges/${id}`, {
      method: 'DELETE',
    });
  },

  // Priorities
  async getPriorities(targetWeek?: string): Promise<Priority[]> {
    const query = targetWeek ? `?target_week=${encodeURIComponent(targetWeek)}` : '';
    return request<Priority[]>(`/api/priorities${query}`);
  },

  async createPriority(data: {
    title: string;
    description?: string;
    reason: string;
    status?: string;
    target_week?: string;
    challenge_id?: string | null;
  }): Promise<Priority> {
    return request<Priority>('/api/priorities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePriority(id: string, data: Partial<Priority>): Promise<Priority> {
    return request<Priority>(`/api/priorities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deletePriority(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/priorities/${id}`, {
      method: 'DELETE',
    });
  },

  // Interests
  async getInterests(): Promise<Interest[]> {
    return request<Interest[]>('/api/interests');
  },

  async createInterest(data: { title: string; description?: string; category?: string; status?: string }): Promise<Interest> {
    return request<Interest>('/api/interests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateInterest(id: string, data: Partial<Interest>): Promise<Interest> {
    return request<Interest>(`/api/interests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteInterest(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/interests/${id}`, {
      method: 'DELETE',
    });
  },

  // Stakeholders
  async getStakeholders(): Promise<Stakeholder[]> {
    return request<Stakeholder[]>('/api/stakeholders');
  },

  async createStakeholder(data: { name: string; relationship?: string; description?: string }): Promise<Stakeholder> {
    return request<Stakeholder>('/api/stakeholders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStakeholder(id: string, data: Partial<Stakeholder>): Promise<Stakeholder> {
    return request<Stakeholder>(`/api/stakeholders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteStakeholder(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/stakeholders/${id}`, {
      method: 'DELETE',
    });
  },

  async createStakeholderInterest(
    stakeholderId: string,
    data: { title: string; description?: string; importance?: string; status?: string }
  ): Promise<StakeholderInterest> {
    return request<StakeholderInterest>(`/api/stakeholders/${stakeholderId}/interests`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStakeholderInterest(id: string, data: Partial<StakeholderInterest>): Promise<StakeholderInterest> {
    return request<StakeholderInterest>(`/api/stakeholders/unused/interests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteStakeholderInterest(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/stakeholders/unused/interests/${id}`, {
      method: 'DELETE',
    });
  },

  // Weekly Reviews
  async getReviews(): Promise<WeeklyReview[]> {
    return request<WeeklyReview[]>('/api/reviews');
  },

  async getLatestReview(): Promise<WeeklyReview | null> {
    return request<WeeklyReview | null>('/api/reviews/latest');
  },

  async createReview(data: Partial<WeeklyReview>): Promise<WeeklyReview> {
    return request<WeeklyReview>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Decision Logs
  async getDecisionLogs(): Promise<DecisionLog[]> {
    return request<DecisionLog[]>('/api/decision-logs');
  },

  async createDecisionLog(data: { priority_id?: string | null; decision: string; reason: string; outcome?: string }): Promise<DecisionLog> {
    return request<DecisionLog>('/api/decision-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteDecisionLog(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/decision-logs/${id}`, {
      method: 'DELETE',
    });
  },

  // AI Insights
  async analyzeInsights(userQuery?: string): Promise<{ insights: AIInsight[] }> {
    return request<{ insights: AIInsight[] }>('/api/insights/analyze', {
      method: 'POST',
      body: JSON.stringify({ userQuery }),
    });
  },

  // Quick Memos (Meeting scratchpad & instant capture)
  async getQuickMemos(): Promise<QuickMemo[]> {
    return request<QuickMemo[]>('/api/memos');
  },

  async createQuickMemo(content: string, tags?: string[]): Promise<QuickMemo> {
    return request<QuickMemo>('/api/memos', {
      method: 'POST',
      body: JSON.stringify({ content, tags }),
    });
  },

  async updateQuickMemo(id: string, data: { content?: string; tags?: string[] }): Promise<QuickMemo> {
    return request<QuickMemo>(`/api/memos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteQuickMemo(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/memos/${id}`, {
      method: 'DELETE',
    });
  },

  async convertQuickMemo(
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
  ): Promise<{ success: boolean; createdEntity: any; convertedType: string }> {
    return request<{ success: boolean; createdEntity: any; convertedType: string }>(`/api/memos/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async autoStockMemos(memoIds?: string[]): Promise<{
    success: boolean;
    processedCount: number;
    stockedCounts: { priority: number; challenge: number; interest: number };
  }> {
    return request<{
      success: boolean;
      processedCount: number;
      stockedCounts: { priority: number; challenge: number; interest: number };
    }>('/api/memos/auto-stock', {
      method: 'POST',
      body: JSON.stringify({ memo_ids: memoIds }),
    });
  },

  // System
  async resetData(): Promise<{ success: boolean; message: string }> {
    return request('/api/system/reset', { method: 'POST' });
  },

  getExportUrl(): string {
    return '/api/system/export';
  },
};

