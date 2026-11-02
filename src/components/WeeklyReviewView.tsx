import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  HelpCircle,
  Save,
  ArrowRight,
  BookOpen,
  History,
  Sparkles,
  Plus,
  Trash2,
  Scale,
  RefreshCw,
  Send,
  MessageSquare,
} from 'lucide-react';
import { WeeklyReview, Priority, AIInsight, DashboardOverview } from '../types/index.ts';
import { useToast } from './Toast.tsx';

interface WeeklyReviewViewProps {
  reviews: WeeklyReview[];
  currentPriorities: Priority[];
  currentWeek: string;
  onSaveReview: (reviewData: Partial<WeeklyReview>) => Promise<void>;
  insights: AIInsight[];
  overview: DashboardOverview | null;
  onRefreshInsights: (query?: string) => Promise<void>;
  isRefreshingInsights: boolean;
}

export function WeeklyReviewView({
  reviews,
  currentPriorities,
  currentWeek,
  onSaveReview,
  insights,
  overview,
  onRefreshInsights,
  isRefreshingInsights,
}: WeeklyReviewViewProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'review' | 'ai-insights'>('review');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(
    reviews.length > 0 ? reviews[0].id : null
  );

  const [isEditing, setIsEditing] = useState(false);

  // Form state initialized with 8 questions
  const [summary, setSummary] = useState('');
  const [personalReflection, setPersonalReflection] = useState('');
  const [decisionReflection, setDecisionReflection] = useState('');
  const [nextWeekActions, setNextWeekActions] = useState<string[]>([
    '平日の午前9:00〜11:00を最重要課題のブロックに指定する',
    '他者からの突発的依頼に対し、即答せず翌営業日に回答するルールを徹底する',
  ]);
  const [newActionInput, setNewActionInput] = useState('');

  const [answers, setAnswers] = useState({
    accomplished: '',
    unaccomplished: '',
    priority_assessment: '',
    priority_reasoning: '',
    interest_time: '',
    stakeholder_balance: '',
    weekly_learnings: '',
    next_week_improvements: '',
  });

  // AI Interactive Query state
  const [userQuery, setUserQuery] = useState('');

  const completedFromPriorities = currentPriorities
    .filter((p) => p.status === 'Completed')
    .map((p) => p.title);
  const incompleteFromPriorities = currentPriorities
    .filter((p) => p.status !== 'Completed')
    .map((p) => p.title);

  const handleStartNewReview = () => {
    setSelectedReviewId(null);
    setIsEditing(true);
    setSummary('');
    setPersonalReflection('');
    setDecisionReflection('');
    setAnswers({
      accomplished: completedFromPriorities.join('\n') || '',
      unaccomplished: incompleteFromPriorities.join('\n') || '',
      priority_assessment: '今週設定した最優先事項は適切だったか？',
      priority_reasoning: 'なぜその優先順位を選んだのか？',
      interest_time: '自分の純粋な興味関心に充てられた時間は？',
      stakeholder_balance: '他者の期待に応えることに偏りすぎていないか？',
      weekly_learnings: '今週の行動から得られた最大の気づきは？',
      next_week_improvements: '来週の意思決定や行動で変えたいポイントは？',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      showToast('週次サマリー（今週の総括）を入力してください', 'error');
      return;
    }

    try {
      const now = new Date();
      const weekEnd = now.toISOString().split('T')[0];
      const past7 = new Date(now.getTime() - 7 * 86400000);
      const weekStart = past7.toISOString().split('T')[0];

      await onSaveReview({
        week_start: weekStart,
        week_end: weekEnd,
        summary,
        completed_priorities: completedFromPriorities,
        incomplete_priorities: incompleteFromPriorities,
        personal_reflection: personalReflection || answers.weekly_learnings,
        decision_reflection: decisionReflection || answers.priority_reasoning,
        next_week_actions: nextWeekActions.filter((a) => a.trim().length > 0),
        answers,
      });

      showToast('週次振り返りを保存しました');
      setIsEditing(false);
    } catch (err: any) {
      showToast(err.message || '保存に失敗しました', 'error');
    }
  };

  const handleSendAIQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;
    try {
      await onRefreshInsights(userQuery.trim());
      showToast('AIパートナーがデータを再分析しました');
      setUserQuery('');
    } catch (err: any) {
      showToast(err.message || '分析に失敗しました', 'error');
    }
  };

  const selectedReview = reviews.find((r) => r.id === selectedReviewId) || reviews[0];

  // Self vs Others balance calculation
  const totalStakeholderExpectations = overview?.stakeholders.reduce(
    (sum, s) => sum + (s.interests?.length || 0),
    0
  ) || 0;
  const actingInterests = overview?.interests.filter((i) => i.status === 'Acting').length || 0;
  const exploringInterests = overview?.interests.filter((i) => i.status === 'Exploring').length || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <span className="font-semibold text-zinc-900">Personal Retrospective & AI Partner</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            weekly review
          </h1>
          <p className="text-sm text-zinc-600 mt-1 max-w-3xl leading-relaxed">
            「自分の意思で時間を使えたか」「他者の期待に追われすぎていないか」を8つの問いとAI分析で内省し、来週の意思決定を研ぎ澄ます。
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'review' ? (
            <button
              onClick={handleStartNewReview}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>今週の振り返りを書く</span>
            </button>
          ) : (
            <button
              onClick={() => onRefreshInsights()}
              disabled={isRefreshingInsights}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-800 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingInsights ? 'animate-spin' : ''}`} />
              <span>{isRefreshingInsights ? '分析中...' : '最新データで再分析'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented Sub-Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-zinc-200/70 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('review')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
            activeTab === 'review'
              ? 'bg-white text-zinc-900 shadow-xs font-semibold'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>週次振り返り・8つの問い ({reviews.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ai-insights')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
            activeTab === 'ai-insights'
              ? 'bg-white text-zinc-900 shadow-xs font-semibold'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>AI Insights & 行動壁打ち ({insights.length})</span>
        </button>
      </div>

      {/* SUB-VIEW 1: Retrospective & 8 Questions */}
      {activeTab === 'review' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Timeline of Past Reviews */}
          <div className="lg:col-span-4 bg-white rounded-xl p-5 border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-600" />
                <span>過去の振り返り ({reviews.length})</span>
              </h3>
            </div>

            <div className="space-y-2">
              {reviews.map((rev) => {
                const isSelected = selectedReview?.id === rev.id && !isEditing;
                return (
                  <div
                    key={rev.id}
                    onClick={() => {
                      setSelectedReviewId(rev.id);
                      setIsEditing(false);
                    }}
                    className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-50 shadow-2xs'
                        : 'border-zinc-100 hover:border-zinc-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                      <span className="font-mono tabular-nums font-medium text-zinc-700">
                        {rev.week_start} 〜 {rev.week_end}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {rev.completed_priorities.length}件達成
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-zinc-900 line-clamp-2 leading-snug">
                      {rev.summary}
                    </h4>
                  </div>
                );
              })}

              {reviews.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-6">
                  過去の振り返りはまだありません
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Active Review Viewer or Edit Form */}
          <div className="lg:col-span-8 bg-white rounded-xl p-6 sm:p-8 border border-zinc-200 shadow-2xs space-y-6">
            {isEditing ? (
              /* Editing / Creating Form */
              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900">
                      今週の振り返りを作成
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      8つの問いに答えて、来週への教訓と意思決定ログをまとめます。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-800"
                  >
                    キャンセル
                  </button>
                </div>

                {/* 1. Summary */}
                <div>
                  <label className="block text-xs font-bold text-zinc-900 mb-1">
                    Weekly Summary - 今週の総括 <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="今週を一言〜数行で総括すると？（例: 受託の突発対応に追われたが、自社SaaSの価格モデル決定まで漕ぎ着けた）"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>

                {/* The 8 Specific Questions */}
                <div className="space-y-4 pt-4 border-t border-zinc-100">
                  <h4 className="text-xs font-bold text-zinc-800">8 Review Questions（本質的な問いかけ）</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        1. 今週、達成できたことは何か？
                      </label>
                      <textarea
                        rows={2}
                        value={answers.accomplished}
                        onChange={(e) => setAnswers({ ...answers, accomplished: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        2. 達成できなかったことは何か？
                      </label>
                      <textarea
                        rows={2}
                        value={answers.unaccomplished}
                        onChange={(e) => setAnswers({ ...answers, unaccomplished: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        3. 最優先事項は適切だったか？
                      </label>
                      <textarea
                        rows={2}
                        value={answers.priority_assessment}
                        onChange={(e) => setAnswers({ ...answers, priority_assessment: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        4. なぜその優先順位を選んだのか？
                      </label>
                      <textarea
                        rows={2}
                        value={answers.priority_reasoning}
                        onChange={(e) => setAnswers({ ...answers, priority_reasoning: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        5. 自分の興味関心に時間を使えたか？
                      </label>
                      <textarea
                        rows={2}
                        value={answers.interest_time}
                        onChange={(e) => setAnswers({ ...answers, interest_time: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        6. 他者の期待に応えることに時間を使いすぎていないか？
                      </label>
                      <textarea
                        rows={2}
                        value={answers.stakeholder_balance}
                        onChange={(e) => setAnswers({ ...answers, stakeholder_balance: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        7. 今週の行動から得られた気づきは何か？
                      </label>
                      <textarea
                        rows={2}
                        value={answers.weekly_learnings}
                        onChange={(e) => setAnswers({ ...answers, weekly_learnings: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        8. 来週、改善したいことは何か？
                      </label>
                      <textarea
                        rows={2}
                        value={answers.next_week_improvements}
                        onChange={(e) => setAnswers({ ...answers, next_week_improvements: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Next Week Actions */}
                <div className="space-y-3 pt-4 border-t border-zinc-100">
                  <label className="block text-xs font-bold text-zinc-900">
                    Next Week Actions - 来週の具体的なアクション
                  </label>
                  <div className="space-y-2">
                    {nextWeekActions.map((action, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={action}
                          onChange={(e) => {
                            const updated = [...nextWeekActions];
                            updated[i] = e.target.value;
                            setNextWeekActions(updated);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs border border-zinc-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setNextWeekActions(nextWeekActions.filter((_, idx) => idx !== i))}
                          className="text-zinc-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="新しいアクションを追加..."
                        value={newActionInput}
                        onChange={(e) => setNewActionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newActionInput.trim()) {
                              setNextWeekActions([...nextWeekActions, newActionInput.trim()]);
                              setNewActionInput('');
                            }
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs border border-zinc-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newActionInput.trim()) {
                            setNextWeekActions([...nextWeekActions, newActionInput.trim()]);
                            setNewActionInput('');
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg"
                      >
                        追加
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>振り返りを保存する</span>
                  </button>
                </div>
              </form>
            ) : selectedReview ? (
              /* Selected Review Detail View */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="font-mono tabular-nums">
                        {selectedReview.week_start} 〜 {selectedReview.week_end}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 mt-1">
                      {selectedReview.summary}
                    </h3>
                  </div>

                  <button
                    onClick={() => {
                      setSummary(selectedReview.summary);
                      setPersonalReflection(selectedReview.personal_reflection);
                      setDecisionReflection(selectedReview.decision_reflection);
                      setNextWeekActions(selectedReview.next_week_actions || []);
                      setAnswers(selectedReview.answers || {
                        accomplished: '',
                        unaccomplished: '',
                        priority_assessment: '',
                        priority_reasoning: '',
                        interest_time: '',
                        stakeholder_balance: '',
                        weekly_learnings: '',
                        next_week_improvements: '',
                      });
                      setIsEditing(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                  >
                    編集する
                  </button>
                </div>

                {/* Priorities Outcome */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 space-y-2">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>達成できた最優先事項</span>
                    </span>
                    <ul className="text-xs text-zinc-700 space-y-1">
                      {selectedReview.completed_priorities.length > 0 ? (
                        selectedReview.completed_priorities.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-600">•</span>
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-zinc-400">達成項目なし</li>
                      )}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                    <span className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                      <Circle className="w-4 h-4 text-zinc-400" />
                      <span>持ち越し・未達成</span>
                    </span>
                    <ul className="text-xs text-zinc-700 space-y-1">
                      {selectedReview.incomplete_priorities.length > 0 ? (
                        selectedReview.incomplete_priorities.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-zinc-400">•</span>
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-zinc-400">すべて完了</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Reflections & 8 Answers */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-zinc-900">8つの問いへの記録</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-lg bg-zinc-50/60 border border-zinc-100 space-y-1">
                      <span className="font-semibold text-zinc-800 block">3. 優先順位の妥当性</span>
                      <p className="text-zinc-600 leading-relaxed">
                        {selectedReview.answers?.priority_assessment || '未記入'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-zinc-50/60 border border-zinc-100 space-y-1">
                      <span className="font-semibold text-zinc-800 block">4. 優先順位を選んだ理由</span>
                      <p className="text-zinc-600 leading-relaxed">
                        {selectedReview.answers?.priority_reasoning || '未記入'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-zinc-50/60 border border-zinc-100 space-y-1">
                      <span className="font-semibold text-zinc-800 block">5. 自分の興味関心への時間</span>
                      <p className="text-zinc-600 leading-relaxed">
                        {selectedReview.answers?.interest_time || '未記入'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-zinc-50/60 border border-zinc-100 space-y-1">
                      <span className="font-semibold text-zinc-800 block">6. 他者の期待への偏り</span>
                      <p className="text-zinc-600 leading-relaxed">
                        {selectedReview.answers?.stakeholder_balance || '未記入'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-zinc-50/60 border border-zinc-100 space-y-1">
                      <span className="font-semibold text-zinc-800 block">7. 行動から得た気づき</span>
                      <p className="text-zinc-600 leading-relaxed">
                        {selectedReview.answers?.weekly_learnings || selectedReview.personal_reflection || '未記入'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-zinc-50/60 border border-zinc-100 space-y-1">
                      <span className="font-semibold text-zinc-800 block">8. 来週改善したいこと</span>
                      <p className="text-zinc-600 leading-relaxed">
                        {selectedReview.answers?.next_week_improvements || '未記入'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Next Week Actions */}
                {selectedReview.next_week_actions && selectedReview.next_week_actions.length > 0 && (
                  <div className="pt-4 border-t border-zinc-100 space-y-2">
                    <h4 className="text-xs font-bold text-zinc-900">Next Week Actions - 翌週のアクション</h4>
                    <div className="space-y-1.5">
                      {selectedReview.next_week_actions.map((act, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                          <span className="font-mono text-zinc-400">0{i + 1}.</span>
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center space-y-3">
                <p className="text-sm text-zinc-500">まだ振り返りがありません。</p>
                <button
                  onClick={handleStartNewReview}
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 rounded-lg"
                >
                  最初の週次振り返りを書く
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: AI Insights & Interactive Reflection Partner */}
      {activeTab === 'ai-insights' && (
        <div className="space-y-6">
          {/* Bias Radar: Balance Between Self vs Others */}
          <div className="bg-white rounded-xl p-6 border border-zinc-200 space-y-4">
            <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-zinc-700" />
              <span>自己の好奇心 vs 他者の期待の配分バランス</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2">
                <span className="text-xs text-zinc-500">自分の興味関心（行動中/探究中）</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-zinc-900 tabular-nums">
                    {actingInterests + exploringInterests}
                  </span>
                  <span className="text-xs text-zinc-500">件（全{overview?.interests.length || 0}件中）</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  内発的動機に基づく純粋なアイデア・好奇心の活動量
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2">
                <span className="text-xs text-zinc-500">他者からの期待・要望事項</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-zinc-900 tabular-nums">
                    {totalStakeholderExpectations}
                  </span>
                  <span className="text-xs text-zinc-500">件（{overview?.stakeholders.length || 0}名から）</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  顧客・パートナー・周囲からの外発的な期待値の総量
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2">
                <span className="text-xs text-amber-900 font-semibold">AIによるバランス診断</span>
                <div className="text-sm font-bold text-zinc-900">
                  {totalStakeholderExpectations > (actingInterests + exploringInterests) * 1.5
                    ? '外圧優位（他者対応に時間偏重の兆候）'
                    : '均衡（自己の意思と他者配慮が調和）'}
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {totalStakeholderExpectations > (actingInterests + exploringInterests) * 1.5
                    ? '外部の期待に真面目に応えるあまり、自分の知的好奇心への投資が減速しています。'
                    : '自己の探究と周囲の期待のバランスが保たれています。'}
                </p>
              </div>
            </div>
          </div>

          {/* AI Insights Cards List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="font-semibold text-zinc-900">構造化インサイト ({insights.length} 件)</span>
              <span>決めつけず、問いと選択肢を提供します</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="bg-white rounded-xl p-6 border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col justify-between space-y-4 shadow-2xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                        {insight.tag}
                      </span>
                      <span className="text-zinc-400 font-mono text-[11px]">
                        {new Date(insight.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-zinc-900 leading-snug">
                      {insight.title}
                    </h4>

                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {insight.message}
                    </p>

                    {/* Question */}
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100 text-xs text-zinc-800 space-y-1">
                      <span className="font-semibold text-zinc-900 block flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
                        <span>内省の問い（Reflective Question）:</span>
                      </span>
                      <p className="text-zinc-700 italic pl-5 leading-relaxed">{insight.question}</p>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="pt-3 border-t border-zinc-100 text-xs">
                    <div className="flex items-start gap-2 text-emerald-800">
                      <span className="font-bold shrink-0">推奨アクション:</span>
                      <p className="text-zinc-700 leading-snug">{insight.recommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive AI Query / Reflection Partner Console */}
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-zinc-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <MessageSquare className="w-4 h-4 text-zinc-700" />
              <h3 className="text-sm font-bold text-zinc-900">
                Beyond AI との対話的セッション（壁打ち）
              </h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              「来週の優先事項を何に絞るべきか」「クライアントの追加依頼をどう断るか」など、気になる悩みや状況を投げかけると、あなたの登録データをもとに多角的な視点を返します。
            </p>

            <form onSubmit={handleSendAIQuery} className="flex gap-3 pt-2">
              <input
                type="text"
                placeholder="AIパートナーに質問や内省したいことを入力..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="flex-1 px-4 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isRefreshingInsights || !userQuery.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>壁打ちする</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
