/**
 * Beyond TODO. Full-stack Express Server
 * Serves REST API for all Personal Management tools and mounts Vite middlewares in dev.
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { repository, getCurrentWeekString } from './src/server/repository.ts';
import { generateAIInsights } from './src/server/geminiService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Simple Auth middleware
async function getUserIdFromRequest(req: Request): Promise<string> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const userId = await repository.validateSession(token);
    if (userId) return userId;
  }
  // Default to demo user if no auth token provided, ensuring immediate usability
  return 'usr_founder_001';
}

// --- Auth Routes ---
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await repository.getUserByEmail(email || 'founder@beyondtodo.app');
  if (!user) {
    return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません。' });
  }
  const token = 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  await repository.createSession(user.id, token);
  res.json({ token, user });
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, name, title } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'メールアドレスとお名前は必須項目です。' });
  }
  const existing = await repository.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'このメールアドレスは既に登録されています。' });
  }
  const newUser = await repository.createUser({
    id: 'usr_' + Math.random().toString(36).substring(2, 9),
    email,
    name,
    title: title || 'Individual',
    email_verified_at: null,
    created_at: new Date().toISOString(),
  });
  const token = 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  await repository.createSession(newUser.id, token);
  res.json({ token, user: newUser, message: '認証確認メールを送信しました（開発環境モックモード）' });
});

app.get('/api/auth/me', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const user = await repository.getUserById(userId);
  if (!user) {
    return res.status(401).json({ error: '認証が必要です。' });
  }
  res.json({ user });
});

app.post('/api/auth/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    await repository.destroySession(authHeader.substring(7));
  }
  res.json({ success: true });
});

app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  // Resend or mock notice
  res.json({
    success: true,
    message: `${email || 'ご指定のアドレス'}宛にパスワード再設定URLを送信しました。（開発用Mock Mode）`,
  });
});

// --- Dashboard Overview ---
app.get('/api/dashboard/overview', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromRequest(req);
    const targetWeek = (req.query.week as string) || getCurrentWeekString();

    const [challenges, priorities, interests, stakeholders, reviews] = await Promise.all([
      repository.getChallenges(userId),
      repository.getPriorities(userId, targetWeek),
      repository.getInterests(userId),
      repository.getStakeholders(userId),
      repository.getWeeklyReviews(userId),
    ]);

    const latestReview = reviews.length > 0 ? reviews[0] : null;

    // AI insights
    const aiInsights = await generateAIInsights({
      challenges,
      priorities,
      interests,
      stakeholders,
      reviews,
    });

    const activePrioritiesCount = priorities.filter((p) => p.status !== 'Completed').length;
    const completedPrioritiesCount = priorities.filter((p) => p.status === 'Completed').length;
    const highImportanceChallengesCount = challenges.filter((c) => c.importance === 'High' && c.status !== 'Resolved').length;
    const openChallengesCount = challenges.filter((c) => c.status !== 'Resolved').length;
    const exploringInterestsCount = interests.filter((i) => i.status === 'Exploring' || i.status === 'Acting').length;
    const totalInterests = interests.length;

    const interestToActionRatio = totalInterests > 0
      ? Math.round((exploringInterestsCount / totalInterests) * 100)
      : 0;

    res.json({
      challenges,
      priorities,
      interests,
      stakeholders,
      aiInsights,
      latestReview,
      targetWeek,
      metrics: {
        openChallengesCount,
        highImportanceChallengesCount,
        activePrioritiesCount,
        completedPrioritiesCount,
        exploringInterestsCount,
        stakeholderCount: stakeholders.length,
        interestToActionRatio,
      },
    });
  } catch (err: any) {
    console.error('Error in dashboard overview:', err);
    res.status(500).json({ error: 'ダッシュボードデータの取得に失敗しました。' });
  }
});

// --- Challenges (Problems) ---
app.get('/api/challenges', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const data = await repository.getChallenges(userId);
  res.json(data);
});

app.post('/api/challenges', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const { title, description, status, importance } = req.body;
  if (!title) return res.status(400).json({ error: '課題のタイトルは必須です。' });

  const item = await repository.createChallenge(userId, {
    title,
    description: description || '',
    status: status || 'Open',
    importance: importance || 'High',
  });
  res.status(201).json(item);
});

app.put('/api/challenges/:id', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const updated = await repository.updateChallenge(userId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '指定された課題が見つかりません。' });
  res.json(updated);
});

app.delete('/api/challenges/:id', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const success = await repository.deleteChallenge(userId, req.params.id);
  if (!success) return res.status(404).json({ error: '指定された課題が見つかりません。' });
  res.json({ success: true });
});

// --- Priorities ---
app.get('/api/priorities', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const targetWeek = req.query.target_week as string | undefined;
  const data = await repository.getPriorities(userId, targetWeek);
  res.json(data);
});

app.post('/api/priorities', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const { title, description, reason, status, target_week, challenge_id } = req.body;
  if (!title) return res.status(400).json({ error: '最優先事項のタイトルは必須です。' });

  const week = target_week || getCurrentWeekString();
  // Check max 3 check
  const existingThisWeek = await repository.getPriorities(userId, week);
  if (existingThisWeek.length >= 3) {
    return res.status(400).json({
      error: '最優先事項は週に最大3件までです。本当に集中すべきことだけに絞り込みましょう。',
    });
  }

  const item = await repository.createPriority(userId, {
    title,
    description: description || '',
    reason: reason || '',
    status: status || 'Not Started',
    target_week: week,
    challenge_id: challenge_id || null,
  });
  res.status(201).json(item);
});

app.put('/api/priorities/:id', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const updated = await repository.updatePriority(userId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '指定された優先事項が見つかりません。' });
  res.json(updated);
});

app.delete('/api/priorities/:id', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const success = await repository.deletePriority(userId, req.params.id);
  if (!success) return res.status(404).json({ error: '指定された優先事項が見つかりません。' });
  res.json({ success: true });
});

// --- Interests ---
app.get('/api/interests', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const data = await repository.getInterests(userId);
  res.json(data);
});

app.post('/api/interests', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const { title, description, category, status } = req.body;
  if (!title) return res.status(400).json({ error: '興味関心のタイトルは必須です。' });

  const item = await repository.createInterest(userId, {
    title,
    description: description || '',
    category: category || 'General',
    status: status || 'Interested',
  });
  res.status(201).json(item);
});

app.put('/api/interests/:id', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const updated = await repository.updateInterest(userId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '指定された興味関心が見つかりません。' });
  res.json(updated);
});

app.delete('/api/interests/:id', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const success = await repository.deleteInterest(userId, req.params.id);
  if (!success) return res.status(404).json({ error: '指定された興味関心が見つかりません。' });
  res.json({ success: true });
});

// --- Stakeholders ---
app.get('/api/stakeholders', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const data = await repository.getStakeholders(userId);
  res.json(data);
});

app.post('/api/stakeholders', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const { name, relationship, description } = req.body;
  if (!name) return res.status(400).json({ error: 'ステークホルダー名は必須です。' });

  const item = await repository.createStakeholder(userId, {
    name,
    relationship: relationship || 'Customer',
    description: description || '',
  });
  res.status(201).json(item);
});

app.put('/api/stakeholders/:id', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const updated = await repository.updateStakeholder(userId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '指定されたステークホルダーが見つかりません。' });
  res.json(updated);
});

app.delete('/api/stakeholders/:id', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const success = await repository.deleteStakeholder(userId, req.params.id);
  if (!success) return res.status(404).json({ error: '指定されたステークホルダーが見つかりません。' });
  res.json({ success: true });
});

app.post('/api/stakeholders/:id/interests', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const { title, description, importance, status } = req.body;
  if (!title) return res.status(400).json({ error: '期待事項のタイトルは必須です。' });

  const item = await repository.createStakeholderInterest(userId, req.params.id, {
    title,
    description: description || '',
    importance: importance || 'High',
    status: status || 'Active',
  });
  if (!item) return res.status(404).json({ error: 'ステークホルダーが見つかりません。' });
  res.status(201).json(item);
});

app.put('/api/stakeholders/:id/interests/:interestId', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const updated = await repository.updateStakeholderInterest(userId, req.params.interestId, req.body);
  if (!updated) return res.status(404).json({ error: '指定された期待事項が見つかりません。' });
  res.json(updated);
});

app.delete('/api/stakeholders/:id/interests/:interestId', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const success = await repository.deleteStakeholderInterest(userId, req.params.interestId);
  if (!success) return res.status(404).json({ error: '指定された期待事項が見つかりません。' });
  res.json({ success: true });
});

// --- Weekly Reviews ---
app.get('/api/reviews', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const data = await repository.getWeeklyReviews(userId);
  res.json(data);
});

app.get('/api/reviews/latest', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const data = await repository.getLatestWeeklyReview(userId);
  res.json(data);
});

app.post('/api/reviews', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const {
    week_start,
    week_end,
    summary,
    completed_priorities,
    incomplete_priorities,
    personal_reflection,
    decision_reflection,
    next_week_actions,
    answers,
  } = req.body;

  if (!summary) return res.status(400).json({ error: '週次サマリーは必須です。' });

  const item = await repository.createWeeklyReview(userId, {
    week_start: week_start || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    week_end: week_end || new Date().toISOString().split('T')[0],
    summary,
    completed_priorities: completed_priorities || [],
    incomplete_priorities: incomplete_priorities || [],
    personal_reflection: personal_reflection || '',
    decision_reflection: decision_reflection || '',
    next_week_actions: next_week_actions || [],
    answers: answers || {
      accomplished: '',
      unaccomplished: '',
      priority_assessment: '',
      priority_reasoning: '',
      interest_time: '',
      stakeholder_balance: '',
      weekly_learnings: '',
      next_week_improvements: '',
    },
  });
  res.status(201).json(item);
});

// --- Decision Logs ---
app.get('/api/decision-logs', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const data = await repository.getDecisionLogs(userId);
  res.json(data);
});

app.post('/api/decision-logs', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const { priority_id, decision, reason, outcome } = req.body;
  if (!decision || !reason) return res.status(400).json({ error: '意思決定内容と理由は必須です。' });

  const item = await repository.createDecisionLog(userId, {
    priority_id: priority_id || null,
    decision,
    reason,
    outcome: outcome || '',
  });
  res.status(201).json(item);
});

app.delete('/api/decision-logs/:id', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const success = await repository.deleteDecisionLog(userId, req.params.id);
  if (!success) return res.status(404).json({ error: '指定された意思決定ログが見つかりません。' });
  res.json({ success: true });
});

// --- Quick Memos (Instant meeting notes & scratchpad) ---
app.get('/api/memos', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const data = await repository.getQuickMemos(userId);
  res.json(data);
});

app.post('/api/memos', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const { content, tags } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'メモの内容を入力してください。' });
  }
  const item = await repository.createQuickMemo(userId, content.trim(), tags);
  res.status(201).json(item);
});

app.put('/api/memos/:id', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const { content, tags } = req.body;
  const updated = await repository.updateQuickMemo(userId, req.params.id, {
    ...(content !== undefined ? { content: content.trim() } : {}),
    ...(tags !== undefined ? { tags } : {}),
  });
  if (!updated) return res.status(404).json({ error: '指定されたメモが見つかりません。' });
  res.json(updated);
});

app.delete('/api/memos/:id', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const success = await repository.deleteQuickMemo(userId, req.params.id);
  if (!success) return res.status(404).json({ error: '指定されたメモが見つかりません。' });
  res.json({ success: true });
});

// Convert quick memo into Challenge, Priority, Interest, or Stakeholder Expectation
app.post('/api/memos/:id/convert', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const { targetType, title, description, reason, category, status, importance, stakeholder_id } = req.body;

  let createdEntity: any = null;
  if (targetType === 'challenge') {
    createdEntity = await repository.createChallenge(userId, {
      title: title || 'メモからの課題化',
      description: description || '',
      status: status || 'Open',
      importance: importance || 'High',
    });
  } else if (targetType === 'priority') {
    const week = getCurrentWeekString();
    const existingThisWeek = await repository.getPriorities(userId, week);
    if (existingThisWeek.length >= 3) {
      return res.status(400).json({
        error: '最優先事項は週に最大3件までです。枠を空けるか来週に設定してください。',
      });
    }
    createdEntity = await repository.createPriority(userId, {
      title: title || 'メモからの優先事項',
      description: description || '',
      reason: reason || 'メモから重要と判断したため',
      status: 'Not Started',
      target_week: week,
    });
  } else if (targetType === 'interest') {
    createdEntity = await repository.createInterest(userId, {
      title: title || 'メモからの興味関心',
      description: description || '',
      category: category || 'General',
      status: 'Interested',
    });
  } else if (targetType === 'stakeholder' && stakeholder_id) {
    createdEntity = await repository.createStakeholderInterest(userId, stakeholder_id, {
      title: title || 'メモからの期待事項',
      description: description || '',
      importance: importance || 'High',
      status: 'Active',
    });
  }

  await repository.updateQuickMemo(userId, req.params.id, {
    converted_to: targetType,
  });

  res.json({ success: true, createdEntity, convertedType: targetType });
});

// Auto-stock all unstocked memos to priorities, challenges, and interests on screen transition
app.post('/api/memos/auto-stock', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const { memo_ids } = req.body || {};
  const result = await repository.autoStockMemos(userId, memo_ids);
  res.json(result);
});

// --- AI Insights Interactive Analysis ---
app.post('/api/insights/analyze', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromRequest(req);
    const { userQuery } = req.body;

    const [challenges, priorities, interests, stakeholders, reviews] = await Promise.all([
      repository.getChallenges(userId),
      repository.getPriorities(userId),
      repository.getInterests(userId),
      repository.getStakeholders(userId),
      repository.getWeeklyReviews(userId),
    ]);

    const insights = await generateAIInsights({
      challenges,
      priorities,
      interests,
      stakeholders,
      reviews,
      userQuery,
    });

    res.json({ insights });
  } catch (err: any) {
    console.error('Error generating AI analysis:', err);
    res.status(500).json({ error: 'AI分析の生成中にエラーが発生しました。' });
  }
});

// --- System: Reset & Export ---
app.post('/api/system/reset', (req: Request, res: Response) => {
  repository.resetData();
  res.json({ success: true, message: 'サンプル初期データにリセットしました。' });
});

app.get('/api/system/export', async (req: Request, res: Response) => {
  const userId = await getUserIdFromRequest(req);
  const [challenges, priorities, interests, stakeholders, reviews, decisions] = await Promise.all([
    repository.getChallenges(userId),
    repository.getPriorities(userId),
    repository.getInterests(userId),
    repository.getStakeholders(userId),
    repository.getWeeklyReviews(userId),
    repository.getDecisionLogs(userId),
  ]);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="beyond-todo-export.json"');
  res.json({
    app: 'Beyond TODO.',
    exported_at: new Date().toISOString(),
    user_id: userId,
    data: {
      challenges,
      priorities,
      interests,
      stakeholders,
      reviews,
      decisions,
    },
  });
});

// --- Vite Middleware or Static Files ---
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Beyond TODO. server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
