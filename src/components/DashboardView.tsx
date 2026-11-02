import React from 'react';
import {
  Compass,
  ArrowRight,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Lightbulb,
  Users,
  Sparkles,
  Calendar,
  Plus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  DashboardOverview,
  Challenge,
  Priority,
  Interest,
  Stakeholder,
  AIInsight,
} from '../types/index.ts';
import { NavTab } from './Navbar.tsx';
import { MAX_ACTIVE_PRIORITIES_PER_WEEK } from '../constants.ts';

interface DashboardViewProps {
  data: DashboardOverview | null;
  loading: boolean;
  onNavigate: (tab: NavTab, subTab?: 'priorities' | 'challenges' | 'interests' | 'stakeholders' | 'decisions') => void;
  onTogglePriorityStatus: (priority: Priority) => void;
  onRefreshInsights: () => void;
  isRefreshingInsights: boolean;
  onOpenQuickAdd: (type: 'challenge' | 'priority' | 'interest' | 'stakeholder') => void;
}

export function DashboardView({
  data,
  loading,
  onNavigate,
  onTogglePriorityStatus,
  onRefreshInsights,
  isRefreshingInsights,
  onOpenQuickAdd,
}: DashboardViewProps) {
  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-8">
        <div className="h-20 bg-zinc-200/70 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-zinc-200/50 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-zinc-200/50 rounded-xl" />
          <div className="h-80 bg-zinc-200/50 rounded-xl" />
        </div>
      </div>
    );
  }

  const { challenges, priorities, interests, stakeholders, aiInsights, latestReview, targetWeek, metrics } = data;

  const todayStr = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header: Welcome & Context */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span className="tabular-nums">{todayStr}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            自分の意思で、人生を動かす。
          </h1>
          <p className="text-sm text-zinc-600 mt-1 max-w-2xl leading-relaxed">
            TODOの消化から自己を解放し、自らの課題・最優先事項・純粋な興味関心・他者の期待を俯瞰する。
          </p>
        </div>

        {/* Quick Focus & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('focus')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
            title="会議・即時確認ビューへ切替"
          >
            <span>Focus（会議・即時確認）</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onNavigate('review')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <span>weekly review</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Snapshot (Tabular discipline, quiet, unboxed) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-5 rounded-xl border border-zinc-200">
        <div className="space-y-1">
          <span className="text-xs text-zinc-500">直面中の課題</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 tabular-nums">
              {metrics.openChallengesCount}
            </span>
            <span className="text-xs text-rose-600 font-medium">
              High重要度 {metrics.highImportanceChallengesCount}件
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-zinc-500">今週の最優先</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 tabular-nums">
              {metrics.completedPrioritiesCount}/{priorities.length}
            </span>
            <span className="text-xs text-emerald-600 font-medium">完了</span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-zinc-500">好奇心のストック</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 tabular-nums">
              {interests.length}
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              探究中 {metrics.exploringInterestsCount}件
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-zinc-500">関心あるステークホルダー</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 tabular-nums">
              {metrics.stakeholderCount}
            </span>
            <span className="text-xs text-zinc-500">名 / 組織</span>
          </div>
        </div>
      </div>

      {/* 3. AI Insights Banner: The Differentiation Catalyst */}
      <div className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 rounded-xl p-6 border border-amber-200/80 shadow-xs relative">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900">AI Insights & 自己認知の気づき</h2>
                <span className="text-xs text-amber-800 font-medium">行動の偏り・優先順位を分析中</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshInsights}
              disabled={isRefreshingInsights}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingInsights ? 'animate-spin' : ''}`} />
              <span>{isRefreshingInsights ? '分析中...' : '再分析する'}</span>
            </button>
            <button
              onClick={() => onNavigate('review')}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:text-amber-950 px-2 py-1 transition-colors cursor-pointer"
            >
              <span>深掘り・壁打ち</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* AI Insight Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiInsights.slice(0, 2).map((insight) => (
            <div
              key={insight.id}
              className="bg-white/95 rounded-lg p-4 border border-zinc-200/80 text-sm space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span className="font-medium text-amber-800">{insight.tag}</span>
                <span className="text-zinc-400">客観的な内省の視点</span>
              </div>
              <h3 className="font-semibold text-zinc-900 text-sm leading-snug">
                {insight.title}
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                {insight.message}
              </p>
              <div className="pt-2 border-t border-zinc-100 flex items-start gap-2 text-xs text-zinc-700 italic">
                <span className="font-semibold not-italic text-zinc-900 shrink-0">問い:</span>
                <span>{insight.question}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. The Core 4 Pillars Grid (Section 5-1 A, B, C, D) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pillar A: Current Challenges (Problem) */}
        <div className="bg-white rounded-xl p-6 border border-zinc-200 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-zinc-700" />
                <h2 className="text-base font-bold text-zinc-900">1. Current Challenges（今の課題）</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenQuickAdd('challenge')}
                  className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
                  title="課題を追加"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('myspace', 'challenges')}
                  className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
                >
                  一覧
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              単なる作業ではなく、いま事業や生活で根本的に解決すべき本質的なボトルネック。
            </p>

            <div className="space-y-3">
              {challenges.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-lg border border-zinc-100 hover:border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className={c.importance === 'High' ? 'text-rose-600 font-medium' : 'text-zinc-600'}>
                          重要度: {c.importance}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-zinc-600">状態: {c.status}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        {c.title}
                      </h3>
                      <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>登録中: {challenges.length}件</span>
            <button
              onClick={() => onNavigate('myspace', 'challenges')}
              className="text-zinc-700 hover:text-zinc-950 font-medium flex items-center gap-1 cursor-pointer"
            >
              すべての課題を管理する
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pillar B: Current Priorities (This Week Focus) */}
        <div className="bg-white rounded-xl p-6 border border-zinc-200 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-zinc-700" />
                <h2 className="text-base font-bold text-zinc-900">2. Current Priorities（今週の最優先事項）</h2>
              </div>
              <div className="flex items-center gap-2">
                {priorities.length < 3 && (
                  <button
                    onClick={() => onOpenQuickAdd('priority')}
                    className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
                    title="優先事項を追加"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onNavigate('myspace', 'priorities')}
                  className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
                >
                  詳細
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>認知負荷を減らし行動を研ぎ澄ますため、未完了は週に最大{MAX_ACTIVE_PRIORITIES_PER_WEEK}件まで厳選。</span>
              <span className="font-mono text-zinc-700 font-semibold">{priorities.filter((p) => p.status !== 'Completed').length} / {MAX_ACTIVE_PRIORITIES_PER_WEEK}件</span>
            </div>

            <div className="space-y-3">
              {priorities.map((p) => {
                const isCompleted = p.status === 'Completed';
                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      isCompleted
                        ? 'border-emerald-200/80 bg-emerald-50/30'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onTogglePriorityStatus(p)}
                        className="mt-0.5 text-zinc-400 hover:text-emerald-600 transition-colors shrink-0 cursor-pointer"
                        title={isCompleted ? '未完了に戻す' : '完了にする'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          {p.challenge_title && (
                            <>
                              <span className="text-zinc-700 truncate max-w-[200px]">
                                課題: {p.challenge_title}
                              </span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span className={isCompleted ? 'text-emerald-700 font-medium' : 'text-zinc-600'}>
                            {p.status}
                          </span>
                        </div>

                        <h3
                          className={`text-sm font-semibold ${
                            isCompleted ? 'line-through text-zinc-400' : 'text-zinc-900'
                          }`}
                        >
                          {p.title}
                        </h3>

                        {p.reason && (
                          <p className="text-xs text-zinc-500">
                            <span className="font-medium text-zinc-700">なぜ最優先か:</span> {p.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {priorities.length === 0 && (
                <div className="p-8 text-center border border-dashed border-zinc-200 rounded-lg text-sm text-zinc-500">
                  <p>今週の最優先事項がまだ設定されていません。</p>
                  <button
                    onClick={() => onOpenQuickAdd('priority')}
                    className="mt-2 text-xs font-semibold text-zinc-900 hover:underline inline-block"
                  >
                    最優先事項を1件登録する（最大{MAX_ACTIVE_PRIORITIES_PER_WEEK}件）
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>意思決定ログと紐づけて管理</span>
            <button
              onClick={() => onNavigate('myspace', 'priorities')}
              className="text-zinc-700 hover:text-zinc-950 font-medium flex items-center gap-1 cursor-pointer"
            >
              優先事項と意思決定を管理
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pillar C: My Interests (Curiosity & Ideas - NOT tasks!) */}
        <div className="bg-white rounded-xl p-6 border border-zinc-200 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-zinc-700" />
                <h2 className="text-base font-bold text-zinc-900">3. My Interests（自分の興味関心）</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenQuickAdd('interest')}
                  className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
                  title="興味関心を追加"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('myspace', 'interests')}
                  className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
                >
                  ストック
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              TODOに落とす必要はありません。純粋な知的好奇心やアイデアを枯らさないためのストック。
            </p>

            <div className="space-y-3">
              {interests.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-lg border border-zinc-100 hover:border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-700 font-medium">{item.status}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
                    <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>行動率: {metrics.interestToActionRatio}%</span>
            <button
              onClick={() => onNavigate('myspace', 'interests')}
              className="text-zinc-700 hover:text-zinc-950 font-medium flex items-center gap-1 cursor-pointer"
            >
              好奇心ストックを見る
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pillar D: Stakeholder Interests (Expectations & Relationships) */}
        <div className="bg-white rounded-xl p-6 border border-zinc-200 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-700" />
                <h2 className="text-base font-bold text-zinc-900">4. Stakeholder Interests（他者の期待と関心）</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenQuickAdd('stakeholder')}
                  className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
                  title="ステークホルダーを追加"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('myspace', 'stakeholders')}
                  className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
                >
                  全体図
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              顧客・パートナー・家族が自分に何を求めているかを自覚し、振り回されずに誠実に応える。
            </p>

            <div className="space-y-3">
              {stakeholders.slice(0, 3).map((st) => (
                <div
                  key={st.id}
                  className="p-3.5 rounded-lg border border-zinc-100 hover:border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="font-semibold text-zinc-900">{st.name}</span>
                        <span aria-hidden="true">·</span>
                        <span>{st.relationship}</span>
                      </div>
                    </div>
                    {st.interests && st.interests.length > 0 ? (
                      <div className="space-y-1 mt-1">
                        {st.interests.slice(0, 2).map((exp) => (
                          <div key={exp.id} className="text-xs text-zinc-600 flex items-start gap-1.5">
                            <span className="text-zinc-400 mt-0.5">•</span>
                            <span className="font-medium text-zinc-800">{exp.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400">期待事項はまだ登録されていません</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>{stakeholders.length}名のステークホルダー</span>
            <button
              onClick={() => onNavigate('myspace', 'stakeholders')}
              className="text-zinc-700 hover:text-zinc-950 font-medium flex items-center gap-1 cursor-pointer"
            >
              関係性と期待を管理
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Latest Weekly Review Preview & Jump */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-900">直近の週次振り返り</span>
            {latestReview && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums font-mono text-zinc-600">
                  {latestReview.week_start} 〜 {latestReview.week_end}
                </span>
              </>
            )}
          </div>
          {latestReview ? (
            <div>
              <p className="text-sm text-zinc-800 font-medium leading-relaxed">
                「{latestReview.summary}」
              </p>
              {latestReview.personal_reflection && (
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  内省の気づき: {latestReview.personal_reflection}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              まだ振り返りが記録されていません。今週末に最初の振り返りを実施してみましょう。
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('review')}
            className="px-4 py-2 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            振り返り一覧・新規記録
          </button>
        </div>
      </div>
    </div>
  );
}
