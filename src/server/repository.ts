/**
 * Beyond TODO. Repository Layer
 * Implements Repository Pattern with in-memory store initialized with rich entrepreneur seed data.
 * Ready for Supabase PostgreSQL adapter drop-in.
 */

import { Challenge, Priority, Interest, Stakeholder, StakeholderInterest, WeeklyReview, DecisionLog, User, AIInsight, QuickMemo } from '../types/index.ts';

// Helper to get current week string e.g. "2026-W44"
export function getCurrentWeekString(): string {
  const d = new Date();
  const year = d.getFullYear();
  // Simple week number calculation
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

export function getPreviousWeekString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const year = d.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

class InMemoryRepository {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, { userId: string; expiresAt: number }> = new Map();
  private challenges: Map<string, Challenge> = new Map();
  private priorities: Map<string, Priority> = new Map();
  private interests: Map<string, Interest> = new Map();
  private stakeholders: Map<string, Stakeholder> = new Map();
  private stakeholderInterests: Map<string, StakeholderInterest> = new Map();
  private weeklyReviews: Map<string, WeeklyReview> = new Map();
  private decisionLogs: Map<string, DecisionLog> = new Map();
  private quickMemos: Map<string, QuickMemo> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const demoUserId = 'usr_founder_001';
    const now = new Date().toISOString();
    const currentWeek = getCurrentWeekString();
    const prevWeek = getPreviousWeekString();

    // 1. Seed User
    this.users.set(demoUserId, {
      id: demoUserId,
      email: 'founder@beyondtodo.app',
      name: 'Seiya Tanaka',
      title: 'Founder & Product Lead',
      email_verified_at: now,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    });

    // Create a demo session token
    this.sessions.set('demo-session-token-beyond-todo', {
      userId: demoUserId,
      expiresAt: Date.now() + 30 * 86400000,
    });

    // 2. Seed Challenges (Problems)
    const ch1: Challenge = {
      id: 'ch_01',
      user_id: demoUserId,
      title: '新規顧客の獲得チャネルが不安定',
      description: '既存顧客の紹介や個人の人脈に依存しており、月ごとのリード数・新規商談数にバラつきがある。再現性のあるインバウンド／アウトバウンド体制を構築できていない。',
      status: 'In Progress',
      importance: 'High',
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      updated_at: now,
    };
    const ch2: Challenge = {
      id: 'ch_02',
      user_id: demoUserId,
      title: '受託売上依存からの脱却と自社プロダクト比率向上',
      description: '日々のクライアントワークや受託案件で工数が逼迫し、自社新規SaaSサービスの企画・開発に使える時間が週10時間未満に削られている。',
      status: 'In Progress',
      importance: 'High',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      updated_at: now,
    };
    const ch3: Challenge = {
      id: 'ch_03',
      user_id: demoUserId,
      title: '自社SaaSの初期トラクションと収益化モデル確立',
      description: 'プロトタイプのベータ版はローンチ済みだが、有料転換率（CVR）が目標の半分に留まる。初期有料ユーザー10社を今四半期中に獲得したい。',
      status: 'Open',
      importance: 'High',
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      updated_at: now,
    };
    const ch4: Challenge = {
      id: 'ch_04',
      user_id: demoUserId,
      title: '業務委託中心のチームからコアメンバー採用への移行',
      description: 'プロダクト開発のリードエンジニアとマーケティング責任者の採用基準が曖昧で、求人要件の明確化が後回しになっている。',
      status: 'Open',
      importance: 'Medium',
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      updated_at: now,
    };

    [ch1, ch2, ch3, ch4].forEach((c) => this.challenges.set(c.id, c));

    // 3. Seed Priorities (Max 3 per week focus)
    const p1: Priority = {
      id: 'pr_01',
      user_id: demoUserId,
      challenge_id: ch1.id,
      challenge_title: ch1.title,
      title: '見込み顧客10社へ直接アプローチし課題ヒアリング実施',
      description: 'ターゲット業種（SaaS・IT）のマネージャー層10名へDM/知人経由で直接インタビューを行い、業務管理のペインを検証する。',
      reason: '新規顧客獲得の再現性あるメッセージングと提供価値を確立するため。',
      status: 'In Progress',
      target_week: currentWeek,
      created_at: now,
      updated_at: now,
    };
    const p2: Priority = {
      id: 'pr_02',
      user_id: demoUserId,
      challenge_id: ch3.id,
      challenge_title: ch3.title,
      title: '自社SaaSの初期オンボーディングUI改善と価格プラン公開',
      description: '初回登録ユーザーが迷わず主要機能へ到達できるようウィザードを改修し、月額サブスクリプションの課金導線を繋ぎ込む。',
      reason: '初期トラクションの離脱を防ぎ、今月中の初有料顧客獲得に直結させるため。',
      status: 'Completed',
      target_week: currentWeek,
      created_at: now,
      updated_at: now,
    };
    const p3: Priority = {
      id: 'pr_03',
      user_id: demoUserId,
      challenge_id: ch2.id,
      challenge_title: ch2.title,
      title: '主要クライアントとの年間契約更新交渉（開発専任時間を確保）',
      description: '受託案件の工数を月120時間から80時間に段階的にスリム化する条件で年間保守リテーナー契約の提案書を提出・合意する。',
      reason: '自社事業への投下時間を生み出し、受託依存を構造的に減らすため。',
      status: 'In Progress',
      target_week: currentWeek,
      created_at: now,
      updated_at: now,
    };

    [p1, p2, p3].forEach((p) => this.priorities.set(p.id, p));

    // 4. Seed Interests (Curiosities, ideas & stakeholder expectations with who)
    const int1: Interest = {
      id: 'int_01',
      user_id: demoUserId,
      title: 'AIエージェントによる自己マネジメント・振り返り自動化',
      description: '単なるLLM呼び出しではなく、個人のログから行動の偏りやバイアスを察知して問いかけてくれる内省パートナーのアーキテクチャ。',
      category: 'Technology',
      status: 'Acting',
      who: '自分',
      created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
      updated_at: now,
    };
    const int2: Interest = {
      id: 'int_02',
      user_id: demoUserId,
      title: 'プロダクト主導型グロース（PLG）の最新B2Bベストプラクティス',
      description: 'セールス人員を抱えずに海外SaaSのようにセルフサーブでARR 1億円を超えるグロースモデルの研究。海外事例のインプット。',
      category: 'Business',
      status: 'Exploring',
      who: '取締役・投資家',
      created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
      updated_at: now,
    };
    const int3: Interest = {
      id: 'int_03',
      user_id: demoUserId,
      title: 'エグゼクティブ向け意思決定フレームワークとMBA学習',
      description: '不確実性の高い事業フェーズで、何を捨てるか（トレードオフ）を論理的かつ直感的に判断するための思考法。',
      category: 'Personal Growth',
      status: 'Interested',
      who: '自分',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      updated_at: now,
    };
    const int4: Interest = {
      id: 'int_04',
      user_id: demoUserId,
      title: 'クライアントA社: リアルタイムCSVエクスポートと監査ログ対応',
      description: '来期契約更新に向けた主要要望。セキュアな出力仕様とアクセス権限の設計。',
      category: 'Client Request',
      status: 'Acting',
      who: 'クライアントA社',
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      updated_at: now,
    };

    [int1, int2, int3, int4].forEach((i) => this.interests.set(i.id, i));

    // 5. Seed Stakeholders & Stakeholder Interests (Expectations)
    const st1: Stakeholder = {
      id: 'st_01',
      user_id: demoUserId,
      name: 'クライアントA社（代表・事業部長）',
      relationship: 'Customer',
      description: '売上の約40%を占める主要取引先。業務効率化基盤の保守・拡張を担当。',
      created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
      updated_at: now,
    };
    const st2: Stakeholder = {
      id: 'st_02',
      user_id: demoUserId,
      name: '共同パートナー・投資家',
      relationship: 'Partner',
      description: 'シード期の事業アドバイザー兼出資者。月1回の定例でトラクションを報告。',
      created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
      updated_at: now,
    };
    const st3: Stakeholder = {
      id: 'st_03',
      user_id: demoUserId,
      name: '家族・パートナー',
      relationship: 'Family',
      description: '一番身近なサポーター。過度な激務による体調不良や家族時間の減少を心配している。',
      created_at: new Date(Date.now() - 50 * 86400000).toISOString(),
      updated_at: now,
    };

    [st1, st2, st3].forEach((s) => this.stakeholders.set(s.id, s));

    const sti1: StakeholderInterest = {
      id: 'sti_01',
      user_id: demoUserId,
      stakeholder_id: st1.id,
      stakeholder_name: st1.name,
      title: '既存システムの安定稼働と短納期での機能追加',
      description: '社内DXの納期を守り、トラブル時の即時対応を求めている。',
      importance: 'High',
      status: 'Active',
      created_at: now,
      updated_at: now,
    };
    const sti2: StakeholderInterest = {
      id: 'sti_02',
      user_id: demoUserId,
      stakeholder_id: st1.id,
      stakeholder_name: st1.name,
      title: '生成AIを活用した業務自動化のPoC提案',
      description: '競合に先駆けてAI社内活用を進めたいという強い意向がある。',
      importance: 'Medium',
      status: 'Active',
      created_at: now,
      updated_at: now,
    };
    const sti3: StakeholderInterest = {
      id: 'sti_03',
      user_id: demoUserId,
      stakeholder_id: st2.id,
      stakeholder_name: st2.name,
      title: '自社SaaSの有料顧客獲得と月次ARRの可視化',
      description: '受託案件だけでなく、スケール可能な自社プロダクトの数字の伸びを期待している。',
      importance: 'High',
      status: 'Active',
      created_at: now,
      updated_at: now,
    };
    const sti4: StakeholderInterest = {
      id: 'sti_04',
      user_id: demoUserId,
      stakeholder_id: st3.id,
      stakeholder_name: st3.name,
      title: '週末の完全オフ確保と夜間作業の抑制',
      description: '心身の健康を損なわないよう、持続可能な働き方を継続してほしいと願っている。',
      importance: 'High',
      status: 'Active',
      created_at: now,
      updated_at: now,
    };

    [sti1, sti2, sti3, sti4].forEach((si) => this.stakeholderInterests.set(si.id, si));

    // 6. Seed Past Weekly Review
    const pastRev: WeeklyReview = {
      id: 'rev_past_01',
      user_id: demoUserId,
      week_start: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
      week_end: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
      summary: '受託クライアントの緊急対応に週の半分を費やしたが、自社SaaSのUI導線見直しとオンボーディング改善に着手できた。',
      completed_priorities: ['自社SaaSの初期オンボーディングUI改善と価格プラン公開'],
      incomplete_priorities: ['見込み顧客10社へ直接アプローチし課題ヒアリング実施'],
      personal_reflection: '他者からの突発的な依頼を断れず、自分の関心であるAIエージェントの検証に1時間しか使えなかった。',
      decision_reflection: 'クライアントA社の納期短縮要請に対し、受託チームのリソース再配分で対応し、自身の工数は確保する判断を下した。',
      next_week_actions: [
        '平日の午前9:00〜11:00を自社優先事項の聖域として予定ブロックする',
        '見込み顧客ヒアリングの候補リストをスプレッドシートに事前整理する',
        '家族との週末ディナーの時間を事前にカレンダーへFIXする',
      ],
      answers: {
        accomplished: 'SaaSのサインアップ画面と課金プランの画面構成を完成させ、プロトタイプテストを実施できた。',
        unaccomplished: '見込み顧客への直接アプローチは3社に留まり、目標の10社に届かなかった。',
        priority_assessment: '自社SaaSの改善を最優先にした判断は正しかった。ただし受託の割り込みへのバッファが甘かった。',
        priority_reasoning: '受託売上への過度な依存から脱却しなければ、いつまでも自分のビジネスがスケールしないため。',
        interest_time: '興味関心に充てられた時間は週5時間程度。理想の10時間には届かなかった。',
        stakeholder_balance: 'クライアントA社の要望に過剰に引っ張られ、自分の時間主権を少し失いかけていた。',
        weekly_learnings: '「やるべきこと」に追われると「本当に解決したい課題」を見失う。朝イチの意思確認が不可欠。',
        next_week_improvements: '突発的な依頼に対して即答せず、「翌営業日に回答」するルールを徹底する。',
      },
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    };

    this.weeklyReviews.set(pastRev.id, pastRev);

    // 7. Seed Decision Logs
    const d1: DecisionLog = {
      id: 'dec_01',
      user_id: demoUserId,
      priority_id: p3.id,
      decision: '受託開発の新規単発案件の引き受けを今四半期は完全凍結する',
      reason: '手元のキャッシュは半年分あるため、目先の数十万円の受託売上より自社プロダクトのMRR立ち上げに全力を注ぐべきと判断。',
      outcome: '週に約15時間の自社開発時間を確保できる見込みが立った。',
      created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    };
    const d2: DecisionLog = {
      id: 'dec_02',
      user_id: demoUserId,
      priority_id: p2.id,
      decision: 'オンボーディングのチュートリアル動画制作を取りやめ、対話型UI改善へ一本化',
      reason: '動画は更新コストが高く離脱率も高いため。初回ユーザーが迷わず3分で完了できるミニマルウィザードを優先。',
      outcome: '初期オンボーディング到達率が35%から68%へ向上した。',
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    };
    const d3: DecisionLog = {
      id: 'dec_03',
      user_id: demoUserId,
      priority_id: null,
      decision: 'クライアントA社の緊急追加要請に対し、週次枠内での優先度入替ルールを合意（夜間・週末作業は断固拒否）',
      reason: '心身の持続可能性と自社事業の時間を死守するため。トレードオフとして一部機能を次期スプリントへ延伸。',
      outcome: '相手方責任者とも合意でき、無理のない体制を確立できた。',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    };
    [d1, d2, d3].forEach((d) => this.decisionLogs.set(d.id, d));

    // 8. Seed Quick Memos (10 realistic founder memos, strictly labeled with 優先事項, Problems, or 興味関心)
    const m1: QuickMemo = {
      id: 'memo_01',
      user_id: demoUserId,
      content: 'クライアントA社との定例。来月リリース予定の機能について、管理画面のCSVエクスポート要望あり。セキュアな設計を確認する。',
      tags: ['Problems'],
      created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    };
    const m2: QuickMemo = {
      id: 'memo_02',
      user_id: demoUserId,
      content: '見込み顧客インタビュー用のアポ取りメッセージ文面、課題への共感を前面に出すようにトーンを改善。',
      tags: ['優先事項'],
      created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    };
    const m3: QuickMemo = {
      id: 'memo_03',
      user_id: demoUserId,
      content: '既存受託クライアントの緊急サーバー障害対応が週に2回発生。根本的な監視体制の自動化が急務。',
      tags: ['Problems'],
      created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    };
    const m4: QuickMemo = {
      id: 'memo_04',
      user_id: demoUserId,
      content: '新規SaaSの初期課金フロー、Stripe Checkoutの導入で実装工数を約60%削減できそう。週末にPoC検証。',
      tags: ['興味関心'],
      created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    };
    const m5: QuickMemo = {
      id: 'memo_05',
      user_id: demoUserId,
      content: '投資家との月次ミーティング用：ARR推移グラフとチャーン率の最新数字をダッシュボードで確認。',
      tags: ['優先事項'],
      created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    };
    const m6: QuickMemo = {
      id: 'memo_06',
      user_id: demoUserId,
      content: 'LLMのFew-shotプロンプティングで課題と優先事項のギャップを自動ハイライトする実験を週末30分行う。',
      tags: ['興味関心'],
      created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
    };
    const m7: QuickMemo = {
      id: 'memo_07',
      user_id: demoUserId,
      content: '採用候補者のリードエンジニアとのカジュアル面談。フルリモート条件とプロダクトビジョンに強い共感あり。',
      tags: ['興味関心'],
      created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    };
    const m8: QuickMemo = {
      id: 'memo_08',
      user_id: demoUserId,
      content: '受託案件の見積もり算出基準を改定。リテーナー契約への切り替え提案書を作成して金曜までに送付。',
      tags: ['優先事項'],
      created_at: new Date(Date.now() - 30 * 3600000).toISOString(),
    };
    const m9: QuickMemo = {
      id: 'memo_09',
      user_id: demoUserId,
      content: 'ローカルLLM（Llama 3）を社内ナレッジ検索に活用できないか、技術検証の時間を来週1コマ確保する。',
      tags: ['興味関心'],
      created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    };
    const m10: QuickMemo = {
      id: 'memo_10',
      user_id: demoUserId,
      content: '業務委託メンバーとの情報共有フローがSlack上で分散している。タスク管理ツールの運用ルールを1枚に整理。',
      tags: ['Problems'],
      created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    };
    [m1, m2, m3, m4, m5, m6, m7, m8, m9, m10].forEach((m) => this.quickMemos.set(m.id, m));
  }

  // --- Users & Sessions ---
  async getUserByEmail(email: string): Promise<User | null> {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async createUser(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  async createSession(userId: string, token: string): Promise<void> {
    this.sessions.set(token, {
      userId,
      expiresAt: Date.now() + 30 * 86400000,
    });
  }

  async validateSession(token: string): Promise<string | null> {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }
    return session.userId;
  }

  async destroySession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  // --- Challenges ---
  async getChallenges(userId: string): Promise<Challenge[]> {
    return Array.from(this.challenges.values())
      .filter((c) => c.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getChallengeById(userId: string, id: string): Promise<Challenge | null> {
    const item = this.challenges.get(id);
    if (!item || item.user_id !== userId) return null;
    return item;
  }

  async createChallenge(userId: string, data: Omit<Challenge, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Challenge> {
    const now = new Date().toISOString();
    const item: Challenge = {
      ...data,
      id: 'ch_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    this.challenges.set(item.id, item);
    return item;
  }

  async updateChallenge(userId: string, id: string, data: Partial<Challenge>): Promise<Challenge | null> {
    const existing = await this.getChallengeById(userId, id);
    if (!existing) return null;
    const updated: Challenge = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.challenges.set(id, updated);
    return updated;
  }

  async deleteChallenge(userId: string, id: string): Promise<boolean> {
    const existing = await this.getChallengeById(userId, id);
    if (!existing) return false;
    this.challenges.delete(id);
    return true;
  }

  // --- Priorities ---
  async getPriorities(userId: string, targetWeek?: string): Promise<Priority[]> {
    return Array.from(this.priorities.values())
      .filter((p) => p.user_id === userId && (!targetWeek || p.target_week === targetWeek))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createPriority(userId: string, data: Omit<Priority, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Priority> {
    const now = new Date().toISOString();
    let challengeTitle = data.challenge_title;
    if (data.challenge_id && !challengeTitle) {
      const ch = this.challenges.get(data.challenge_id);
      if (ch) challengeTitle = ch.title;
    }

    const item: Priority = {
      ...data,
      challenge_title: challengeTitle,
      id: 'pr_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    this.priorities.set(item.id, item);
    return item;
  }

  async updatePriority(userId: string, id: string, data: Partial<Priority>): Promise<Priority | null> {
    const existing = this.priorities.get(id);
    if (!existing || existing.user_id !== userId) return null;
    let challengeTitle = data.challenge_title ?? existing.challenge_title;
    if (data.challenge_id && data.challenge_id !== existing.challenge_id) {
      const ch = this.challenges.get(data.challenge_id);
      challengeTitle = ch ? ch.title : null;
    }
    const updated: Priority = {
      ...existing,
      ...data,
      challenge_title: challengeTitle,
      updated_at: new Date().toISOString(),
    };
    this.priorities.set(id, updated);
    return updated;
  }

  async deletePriority(userId: string, id: string): Promise<boolean> {
    const existing = this.priorities.get(id);
    if (!existing || existing.user_id !== userId) return false;
    this.priorities.delete(id);
    return true;
  }

  // --- Interests ---
  async getInterests(userId: string): Promise<Interest[]> {
    return Array.from(this.interests.values())
      .filter((i) => i.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createInterest(userId: string, data: Omit<Interest, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Interest> {
    const now = new Date().toISOString();
    const item: Interest = {
      ...data,
      id: 'int_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    this.interests.set(item.id, item);
    return item;
  }

  async updateInterest(userId: string, id: string, data: Partial<Interest>): Promise<Interest | null> {
    const existing = this.interests.get(id);
    if (!existing || existing.user_id !== userId) return null;
    const updated: Interest = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.interests.set(id, updated);
    return updated;
  }

  async deleteInterest(userId: string, id: string): Promise<boolean> {
    const existing = this.interests.get(id);
    if (!existing || existing.user_id !== userId) return false;
    this.interests.delete(id);
    return true;
  }

  // --- Stakeholders & Interests ---
  async getStakeholders(userId: string): Promise<Stakeholder[]> {
    const list = Array.from(this.stakeholders.values())
      .filter((s) => s.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return list.map((st) => ({
      ...st,
      interests: Array.from(this.stakeholderInterests.values()).filter((si) => si.stakeholder_id === st.id),
    }));
  }

  async createStakeholder(userId: string, data: Omit<Stakeholder, 'id' | 'user_id' | 'interests' | 'created_at' | 'updated_at'>): Promise<Stakeholder> {
    const now = new Date().toISOString();
    const item: Stakeholder = {
      ...data,
      id: 'st_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    this.stakeholders.set(item.id, item);
    return { ...item, interests: [] };
  }

  async updateStakeholder(userId: string, id: string, data: Partial<Stakeholder>): Promise<Stakeholder | null> {
    const existing = this.stakeholders.get(id);
    if (!existing || existing.user_id !== userId) return null;
    const updated: Stakeholder = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.stakeholders.set(id, updated);
    return {
      ...updated,
      interests: Array.from(this.stakeholderInterests.values()).filter((si) => si.stakeholder_id === id),
    };
  }

  async deleteStakeholder(userId: string, id: string): Promise<boolean> {
    const existing = this.stakeholders.get(id);
    if (!existing || existing.user_id !== userId) return false;
    this.stakeholders.delete(id);
    // Cascade delete stakeholder interests
    for (const [key, val] of this.stakeholderInterests.entries()) {
      if (val.stakeholder_id === id) {
        this.stakeholderInterests.delete(key);
      }
    }
    return true;
  }

  async createStakeholderInterest(
    userId: string,
    stakeholderId: string,
    data: Omit<StakeholderInterest, 'id' | 'user_id' | 'stakeholder_id' | 'created_at' | 'updated_at'>
  ): Promise<StakeholderInterest | null> {
    const st = this.stakeholders.get(stakeholderId);
    if (!st || st.user_id !== userId) return null;
    const now = new Date().toISOString();
    const item: StakeholderInterest = {
      ...data,
      id: 'sti_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      stakeholder_id: stakeholderId,
      stakeholder_name: st.name,
      created_at: now,
      updated_at: now,
    };
    this.stakeholderInterests.set(item.id, item);
    return item;
  }

  async updateStakeholderInterest(
    userId: string,
    id: string,
    data: Partial<StakeholderInterest>
  ): Promise<StakeholderInterest | null> {
    const existing = this.stakeholderInterests.get(id);
    if (!existing || existing.user_id !== userId) return null;
    const updated: StakeholderInterest = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.stakeholderInterests.set(id, updated);
    return updated;
  }

  async deleteStakeholderInterest(userId: string, id: string): Promise<boolean> {
    const existing = this.stakeholderInterests.get(id);
    if (!existing || existing.user_id !== userId) return false;
    this.stakeholderInterests.delete(id);
    return true;
  }

  // --- Weekly Reviews ---
  async getWeeklyReviews(userId: string): Promise<WeeklyReview[]> {
    return Array.from(this.weeklyReviews.values())
      .filter((r) => r.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getLatestWeeklyReview(userId: string): Promise<WeeklyReview | null> {
    const reviews = await this.getWeeklyReviews(userId);
    return reviews.length > 0 ? reviews[0] : null;
  }

  async createWeeklyReview(userId: string, data: Omit<WeeklyReview, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<WeeklyReview> {
    const now = new Date().toISOString();
    const item: WeeklyReview = {
      ...data,
      id: 'rev_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    this.weeklyReviews.set(item.id, item);
    return item;
  }

  async updateWeeklyReview(userId: string, id: string, data: Partial<WeeklyReview>): Promise<WeeklyReview | null> {
    const existing = this.weeklyReviews.get(id);
    if (!existing || existing.user_id !== userId) return null;
    const updated: WeeklyReview = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.weeklyReviews.set(id, updated);
    return updated;
  }

  // --- Decision Logs ---
  async getDecisionLogs(userId: string): Promise<DecisionLog[]> {
    return Array.from(this.decisionLogs.values())
      .filter((d) => d.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createDecisionLog(userId: string, data: Omit<DecisionLog, 'id' | 'user_id' | 'created_at'>): Promise<DecisionLog> {
    const item: DecisionLog = {
      ...data,
      id: 'dec_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      created_at: new Date().toISOString(),
    };
    this.decisionLogs.set(item.id, item);
    return item;
  }

  async deleteDecisionLog(userId: string, id: string): Promise<boolean> {
    const existing = this.decisionLogs.get(id);
    if (!existing || existing.user_id !== userId) return false;
    this.decisionLogs.delete(id);
    return true;
  }

  // --- Quick Memos (Meeting notes & scratchpad) ---
  async getQuickMemos(userId: string): Promise<QuickMemo[]> {
    return Array.from(this.quickMemos.values())
      .filter((m) => m.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createQuickMemo(userId: string, content: string, tags?: string[]): Promise<QuickMemo> {
    const item: QuickMemo = {
      id: 'memo_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      content,
      tags: tags || [],
      created_at: new Date().toISOString(),
    };
    this.quickMemos.set(item.id, item);
    return item;
  }

  async updateQuickMemo(userId: string, id: string, data: Partial<QuickMemo>): Promise<QuickMemo | null> {
    const existing = this.quickMemos.get(id);
    if (!existing || existing.user_id !== userId) return null;
    const updated: QuickMemo = { ...existing, ...data };
    this.quickMemos.set(id, updated);
    return updated;
  }

  async deleteQuickMemo(userId: string, id: string): Promise<boolean> {
    const existing = this.quickMemos.get(id);
    if (!existing || existing.user_id !== userId) return false;
    this.quickMemos.delete(id);
    return true;
  }

  async autoStockMemos(userId: string, memoIds?: string[]): Promise<{
    success: boolean;
    processedCount: number;
    stockedCounts: { priority: number; challenge: number; interest: number };
  }> {
    const allUserMemos = Array.from(this.quickMemos.values()).filter((m) => m.user_id === userId);
    const targetMemos = memoIds
      ? allUserMemos.filter((m) => memoIds.includes(m.id))
      : allUserMemos;

    const currentWeek = getCurrentWeekString();
    const stockedCounts = { priority: 0, challenge: 0, interest: 0 };

    for (const m of targetMemos) {
      const tags = m.tags || [];
      const isPriority = tags.some((t) => t.includes('優先') || t.toLowerCase().includes('priorit'));
      const isProblem = tags.some((t) => t.includes('Problem') || t.includes('課題'));
      const isInterest = tags.some((t) => t.includes('関心') || t.toLowerCase().includes('interest'));

      const title = m.content.trim().split('\n')[0].substring(0, 50);
      const description = m.content.trim();

      if (isPriority) {
        await this.createPriority(userId, {
          title,
          description,
          reason: 'メモから自動ストック',
          status: 'In Progress',
          target_week: currentWeek,
        });
        stockedCounts.priority++;
      } else if (isProblem) {
        await this.createChallenge(userId, {
          title,
          description,
          status: 'Open',
          importance: 'High',
        });
        stockedCounts.challenge++;
      } else if (isInterest) {
        await this.createInterest(userId, {
          title,
          description,
          category: 'General',
          status: 'Interested',
          who: '自分',
        });
        stockedCounts.interest++;
      } else {
        await this.createPriority(userId, {
          title,
          description,
          reason: 'メモから自動ストック',
          status: 'In Progress',
          target_week: currentWeek,
        });
        stockedCounts.priority++;
      }

      this.quickMemos.delete(m.id);
    }

    return {
      success: true,
      processedCount: targetMemos.length,
      stockedCounts,
    };
  }

  // --- Reset to seed ---
  resetData(): void {
    this.users.clear();
    this.sessions.clear();
    this.challenges.clear();
    this.priorities.clear();
    this.interests.clear();
    this.stakeholders.clear();
    this.stakeholderInterests.clear();
    this.weeklyReviews.clear();
    this.decisionLogs.clear();
    this.quickMemos.clear();
    this.seedDefaultData();
  }
}

export const repository = new InMemoryRepository();

