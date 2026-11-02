import React, { useState } from 'react';
import {
  Compass,
  CheckCircle2,
  Circle,
  Plus,
  AlertCircle,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookmarkCheck,
  X,
  FileText,
} from 'lucide-react';
import { Priority, Challenge, DecisionLog, PriorityStatus } from '../types/index.ts';
import { useToast } from './Toast.tsx';

interface PrioritiesViewProps {
  priorities: Priority[];
  challenges: Challenge[];
  decisionLogs: DecisionLog[];
  currentWeek: string;
  onAddPriority: (data: {
    title: string;
    description: string;
    reason: string;
    status: PriorityStatus;
    target_week: string;
    challenge_id: string | null;
  }) => Promise<void>;
  onUpdatePriority: (id: string, data: Partial<Priority>) => Promise<void>;
  onDeletePriority: (id: string) => Promise<void>;
  onAddDecisionLog: (data: {
    priority_id: string | null;
    decision: string;
    reason: string;
    outcome?: string;
  }) => Promise<void>;
}

export function PrioritiesView({
  priorities,
  challenges,
  decisionLogs,
  currentWeek,
  onAddPriority,
  onUpdatePriority,
  onDeletePriority,
  onAddDecisionLog,
}: PrioritiesViewProps) {
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    reason: '',
    status: 'Not Started' as PriorityStatus,
    challenge_id: '' as string,
  });

  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionForm, setDecisionForm] = useState({
    priority_id: '',
    decision: '',
    reason: '',
    outcome: '',
  });

  const { showToast } = useToast();

  const handleOpenAddModal = (item?: Priority) => {
    if (item) {
      setEditingPriority(item);
      setForm({
        title: item.title,
        description: item.description,
        reason: item.reason,
        status: item.status,
        challenge_id: item.challenge_id || '',
      });
    } else {
      if (priorities.length >= 3) {
        showToast('最優先事項は週に最大3件までです。本当に集中すべきことだけに絞り込みましょう。', 'info');
        return;
      }
      setEditingPriority(null);
      setForm({
        title: '',
        description: '',
        reason: '',
        status: 'Not Started',
        challenge_id: challenges.length > 0 ? challenges[0].id : '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSavePriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('タイトルを入力してください', 'error');
      return;
    }
    if (!form.reason.trim()) {
      showToast('「なぜ優先するのか」の理由を記入してください', 'error');
      return;
    }

    try {
      if (editingPriority) {
        await onUpdatePriority(editingPriority.id, {
          title: form.title,
          description: form.description,
          reason: form.reason,
          status: form.status,
          challenge_id: form.challenge_id || null,
        });
        showToast('最優先事項を更新しました');
      } else {
        await onAddPriority({
          title: form.title,
          description: form.description,
          reason: form.reason,
          status: form.status,
          target_week: selectedWeek,
          challenge_id: form.challenge_id || null,
        });
        showToast('今週の最優先事項を登録しました');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '保存に失敗しました', 'error');
    }
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionForm.decision.trim() || !decisionForm.reason.trim()) {
      showToast('決定内容と理由は必須です', 'error');
      return;
    }
    try {
      await onAddDecisionLog({
        priority_id: decisionForm.priority_id || null,
        decision: decisionForm.decision,
        reason: decisionForm.reason,
        outcome: decisionForm.outcome,
      });
      showToast('重要な意思決定を記録しました');
      setIsDecisionModalOpen(false);
      setDecisionForm({ priority_id: '', decision: '', reason: '', outcome: '' });
    } catch (err: any) {
      showToast(err.message || '記録に失敗しました', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <span className="font-semibold text-zinc-900">Cognitive Focus</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-zinc-700 font-medium">{selectedWeek}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Priorities - 今週の最優先事項（Top 3）
          </h1>
          <p className="text-sm text-zinc-600 mt-1 max-w-2xl leading-relaxed">
            やるべきことのリストを際限なく増やすのではなく、重要課題を動かすための「最大3つの焦点」だけに意思を込める。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDecisionModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <BookmarkCheck className="w-4 h-4 text-zinc-600" />
            <span>意思決定を記録</span>
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            disabled={priorities.length >= 3}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>最優先事項を追加 ({priorities.length}/3)</span>
          </button>
        </div>
      </div>

      {/* 3 Priority Slots Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="font-semibold text-zinc-900">Weekly Focus Slots</span>
            <span aria-hidden="true">·</span>
            <span>枠は3つのみ。4つ目以降は来週へ回すか、課題として留めます。</span>
          </div>
          <span className="font-mono text-xs text-zinc-500 font-medium">{priorities.length} / 3 slots</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((index) => {
            const item = priorities[index];
            if (!item) {
              return (
                <div
                  key={`empty-${index}`}
                  onClick={() => handleOpenAddModal()}
                  className="bg-white/60 hover:bg-white rounded-xl border border-dashed border-zinc-300 hover:border-zinc-400 p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[260px] group shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors mb-3">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-700 group-hover:text-zinc-900">
                    Priority 0{index + 1}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">枠が空いています。クリックして設定</p>
                </div>
              );
            }

            const isDone = item.status === 'Completed';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl p-6 border transition-all flex flex-col justify-between shadow-2xs ${
                  isDone ? 'border-emerald-300 bg-emerald-50/20' : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="space-y-4">
                  {/* Slot index and status */}
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="font-mono font-semibold text-zinc-900">0{index + 1}.</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenAddModal(item)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
                        title="編集"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`最優先事項「${item.title}」を削除しますか？`)) {
                            onDeletePriority(item.id);
                            showToast('優先事項を削除しました');
                          }
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Checkbox */}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => {
                        const newStatus: PriorityStatus = isDone ? 'In Progress' : 'Completed';
                        onUpdatePriority(item.id, { status: newStatus });
                        showToast(isDone ? 'ステータスを進行中に戻しました' : '最優先事項を完了しました！');
                      }}
                      className="mt-1 text-zinc-400 hover:text-emerald-600 transition-colors shrink-0 cursor-pointer"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-400" />
                      )}
                    </button>

                    <div className="space-y-2">
                      <h2
                        className={`text-base font-bold leading-snug ${
                          isDone ? 'line-through text-zinc-400' : 'text-zinc-900'
                        }`}
                      >
                        {item.title}
                      </h2>

                      {item.description && (
                        <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reason & Challenge Link */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100 text-xs">
                    <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                      <span className="font-semibold text-zinc-800 block mb-0.5">なぜ最優先にするのか:</span>
                      <p className="text-zinc-600 leading-relaxed">{item.reason}</p>
                    </div>

                    {item.challenge_title && (
                      <div className="text-zinc-500 flex items-center gap-1.5">
                        <span className="font-medium text-zinc-700">関連課題:</span>
                        <span className="truncate max-w-[220px]">{item.challenge_title}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-medium text-zinc-700">状態: {item.status}</span>
                  <span className="tabular-nums font-mono">
                    {new Date(item.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decision Logs Section (Section 7 in Data Model) */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-zinc-700" />
              <span>Decision Logs - 重要な意思決定の記録</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              何を選び、何を捨てたのか。理由と期待する結果を言語化し、後からの振り返りに活かす。
            </p>
          </div>
          <button
            onClick={() => setIsDecisionModalOpen(true)}
            className="text-xs font-semibold text-zinc-900 hover:bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200 transition-colors"
          >
            + 意思決定を記録
          </button>
        </div>

        <div className="space-y-3">
          {decisionLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-lg bg-zinc-50/60 border border-zinc-100 hover:border-zinc-200 transition-colors space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-900 text-sm">決定: {log.decision}</span>
                <span className="tabular-nums font-mono">
                  {new Date(log.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
              <p className="text-xs text-zinc-600">
                <span className="font-medium text-zinc-800">理由・トレードオフ:</span> {log.reason}
              </p>
              {log.outcome && (
                <p className="text-xs text-emerald-700 font-medium">
                  期待成果 / 経過: {log.outcome}
                </p>
              )}
            </div>
          ))}

          {decisionLogs.length === 0 && (
            <p className="text-xs text-zinc-400 text-center py-6">
              まだ意思決定ログがありません。重要な選択を行った際に記録しておきましょう。
            </p>
          )}
        </div>
      </div>

      {/* Add / Edit Priority Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
              <h2 className="text-base font-bold text-zinc-900">
                {editingPriority ? '最優先事項の編集' : '今週の最優先事項を登録'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePriority} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  最優先事項のタイトル <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 見込み顧客10社へ直接アプローチし課題ヒアリング実施"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  なぜ最優先にするのか（Reason） <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="なぜ他のすべてを差し置いて今週これを最優先にするのか、明確な理由を言語化します"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  関連する課題（Problem）
                </label>
                <select
                  value={form.challenge_id}
                  onChange={(e) => setForm({ ...form, challenge_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
                >
                  <option value="">-- 紐付ける課題を選択 --</option>
                  {challenges.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.importance}] {c.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-400 mt-1">
                  課題と結びつけることで、TODOの消化ではなく本質的な課題解決に向かいます。
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  詳細・具体的アクション
                </label>
                <textarea
                  rows={2}
                  placeholder="完了条件や具体的な段取りをメモします"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg cursor-pointer shadow-xs"
                >
                  {editingPriority ? '更新する' : '登録する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision Log Modal */}
      {isDecisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
              <h2 className="text-base font-bold text-zinc-900">意思決定の記録</h2>
              <button onClick={() => setIsDecisionModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDecision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  決定したこと <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 受託の新規単発案件の引き受けを今期は完全凍結する"
                  value={decisionForm.decision}
                  onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  判断の理由・受け入れたトレードオフ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="目先の売上ではなく自社SaaSのMRR立ち上げに時間を割くため"
                  value={decisionForm.reason}
                  onChange={(e) => setDecisionForm({ ...decisionForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  期待する成果・想定されるアウトカム
                </label>
                <input
                  type="text"
                  placeholder="週15時間の開発時間を確保し、今四半期中に有料顧客10社を目指す"
                  value={decisionForm.outcome}
                  onChange={(e) => setDecisionForm({ ...decisionForm, outcome: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg cursor-pointer shadow-xs"
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
