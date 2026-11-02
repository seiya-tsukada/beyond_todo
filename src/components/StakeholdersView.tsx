import React, { useState } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { Stakeholder, StakeholderInterest, StakeholderRelationship, ImportanceLevel } from '../types/index.ts';
import { useToast } from './Toast.tsx';

interface StakeholdersViewProps {
  stakeholders: Stakeholder[];
  onAddStakeholder: (data: { name: string; relationship: StakeholderRelationship; description: string }) => Promise<void>;
  onUpdateStakeholder: (id: string, data: Partial<Stakeholder>) => Promise<void>;
  onDeleteStakeholder: (id: string) => Promise<void>;
  onAddStakeholderInterest: (stakeholderId: string, data: { title: string; description: string; importance: ImportanceLevel }) => Promise<void>;
  onDeleteStakeholderInterest: (id: string) => Promise<void>;
}

export function StakeholdersView({
  stakeholders,
  onAddStakeholder,
  onUpdateStakeholder,
  onDeleteStakeholder,
  onAddStakeholderInterest,
  onDeleteStakeholderInterest,
}: StakeholdersViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null);
  const [form, setForm] = useState({
    name: '',
    relationship: 'Customer' as StakeholderRelationship,
    description: '',
  });

  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [targetStakeholderId, setTargetStakeholderId] = useState<string>('');
  const [interestForm, setInterestForm] = useState({
    title: '',
    description: '',
    importance: 'High' as ImportanceLevel,
  });

  const { showToast } = useToast();

  const handleOpenAddStakeholder = (item?: Stakeholder) => {
    if (item) {
      setEditingStakeholder(item);
      setForm({
        name: item.name,
        relationship: item.relationship,
        description: item.description,
      });
    } else {
      setEditingStakeholder(null);
      setForm({
        name: '',
        relationship: 'Customer',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('お名前または組織名を入力してください', 'error');
      return;
    }
    try {
      if (editingStakeholder) {
        await onUpdateStakeholder(editingStakeholder.id, form);
        showToast('ステークホルダー情報を更新しました');
      } else {
        await onAddStakeholder(form);
        showToast('ステークホルダーを登録しました');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '保存に失敗しました', 'error');
    }
  };

  const handleOpenAddExpectation = (stakeholderId: string) => {
    setTargetStakeholderId(stakeholderId);
    setInterestForm({
      title: '',
      description: '',
      importance: 'High',
    });
    setIsInterestModalOpen(true);
  };

  const handleSaveExpectation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interestForm.title.trim()) {
      showToast('期待事項のタイトルを入力してください', 'error');
      return;
    }
    try {
      await onAddStakeholderInterest(targetStakeholderId, interestForm);
      showToast('相手の関心・期待事項を追加しました');
      setIsInterestModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '追加に失敗しました', 'error');
    }
  };

  // Relationship counts for summary
  const relationshipCounts = stakeholders.reduce((acc, s) => {
    acc[s.relationship] = (acc[s.relationship] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Stakeholder Interests - 他者の関心・期待のマネジメント
          </h1>
          <p className="text-sm text-zinc-600 mt-1 max-w-3xl leading-relaxed">
            周囲が自分に何を求めているかを明確にし、応えるべき期待と、守るべき自分の意思・境界線を整理します。
          </p>
        </div>

        <button
          onClick={() => handleOpenAddStakeholder()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ステークホルダーを登録</span>
        </button>
      </div>

      {/* Guide Banner */}
      <div className="bg-zinc-100/70 p-4 rounded-xl border border-zinc-200/80 text-xs text-zinc-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="font-bold text-zinc-900">💡 差別化の要: 「他者の期待」を外在化する</span>
          <p className="text-zinc-600">
            他者からの依頼や要望に追われ続けると、本当にやりたいことが後回しになります。相手の関心を可視化し、自分の優先事項と照らし合わせましょう。
          </p>
        </div>
        <div className="flex items-center gap-3 text-zinc-500 font-mono text-[11px] shrink-0">
          <span>Customer: {relationshipCounts['Customer'] || 0}</span>
          <span aria-hidden="true">·</span>
          <span>Partner: {relationshipCounts['Partner'] || 0}</span>
          <span aria-hidden="true">·</span>
          <span>Family: {relationshipCounts['Family'] || 0}</span>
        </div>
      </div>

      {/* Stakeholders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stakeholders.map((st) => (
          <div
            key={st.id}
            className="bg-white rounded-xl p-5 border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col justify-between space-y-4 shadow-2xs"
          >
            <div className="space-y-3">
              {/* Header card */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                    <span className="font-medium text-zinc-700">{st.relationship}</span>
                  </div>
                  <h2 className="text-base font-bold text-zinc-900">{st.name}</h2>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenAddStakeholder(st)}
                    className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
                    title="編集"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`ステークホルダー「${st.name}」を削除しますか？`)) {
                        onDeleteStakeholder(st.id);
                        showToast('ステークホルダーを削除しました');
                      }
                    }}
                    className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {st.description && (
                <p className="text-xs text-zinc-600 leading-relaxed">{st.description}</p>
              )}

              {/* Expectations List */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <span>この人物の関心・期待事項</span>
                  <button
                    onClick={() => handleOpenAddExpectation(st.id)}
                    className="text-zinc-700 hover:text-zinc-950 flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>追加</span>
                  </button>
                </div>

                {st.interests && st.interests.length > 0 ? (
                  <div className="space-y-2">
                    {st.interests.map((exp) => (
                      <div
                        key={exp.id}
                        className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-medium ${
                                exp.importance === 'High' ? 'text-rose-600' : 'text-zinc-500'
                              }`}
                            >
                              重要度: {exp.importance}
                            </span>
                          </div>
                          <h4 className="font-semibold text-zinc-900">{exp.title}</h4>
                          {exp.description && (
                            <p className="text-zinc-500 text-[11px] leading-snug">{exp.description}</p>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (confirm(`期待事項「${exp.title}」を削除しますか？`)) {
                              onDeleteStakeholderInterest(exp.id);
                              showToast('期待事項を削除しました');
                            }
                          }}
                          className="text-zinc-400 hover:text-rose-600 p-0.5"
                          title="削除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 py-2">まだ期待事項が登録されていません</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
              <span className="font-mono tabular-nums">
                {st.interests?.length || 0} 件の期待事項
              </span>
              <button
                onClick={() => handleOpenAddExpectation(st.id)}
                className="text-zinc-700 hover:text-zinc-950 font-medium cursor-pointer"
              >
                + 期待を追加
              </button>
            </div>
          </div>
        ))}

        {stakeholders.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-xl border border-dashed border-zinc-200">
            <p className="text-sm text-zinc-500">ステークホルダーがまだ登録されていません。</p>
            <button
              onClick={() => handleOpenAddStakeholder()}
              className="mt-3 text-xs font-semibold text-zinc-900 hover:underline"
            >
              最初のステークホルダーを登録する
            </button>
          </div>
        )}
      </div>

      {/* Stakeholder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
              <h2 className="text-base font-bold text-zinc-900">
                {editingStakeholder ? 'ステークホルダーの編集' : 'ステークホルダーの新規登録'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStakeholder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  名前 / 会社・組織名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: クライアントA社 代表取締役, 家族"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  関係性（Relationship）
                </label>
                <select
                  value={form.relationship}
                  onChange={(e) => setForm({ ...form, relationship: e.target.value as StakeholderRelationship })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
                >
                  <option value="Customer">Customer（顧客・クライアント）</option>
                  <option value="Partner">Partner（共同創業者・提携先・投資家）</option>
                  <option value="Family">Family（家族・パートナー）</option>
                  <option value="Colleague">Colleague（同僚・チームメンバー）</option>
                  <option value="Other">Other（その他）</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  概要・関わりの背景
                </label>
                <textarea
                  rows={2}
                  placeholder="どんな関わりがあるか、売上比率や心理的距離感などをメモします"
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
                  {editingStakeholder ? '更新する' : '登録する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expectation / Interest Modal */}
      {isInterestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
              <h2 className="text-base font-bold text-zinc-900">期待事項・関心の追加</h2>
              <button onClick={() => setIsInterestModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpectation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  相手が関心を持っていること・期待していること <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 売上を増やしたい、納期の短縮、週末の家族時間確保"
                  value={interestForm.title}
                  onChange={(e) => setInterestForm({ ...interestForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  詳細・要望のコンテキスト
                </label>
                <textarea
                  rows={2}
                  placeholder="相手の発言や具体的な期待値についてメモします"
                  value={interestForm.description}
                  onChange={(e) => setInterestForm({ ...interestForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  重要度
                </label>
                <select
                  value={interestForm.importance}
                  onChange={(e) => setInterestForm({ ...interestForm, importance: e.target.value as ImportanceLevel })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
                >
                  <option value="High">High（最重要・見逃せない期待）</option>
                  <option value="Medium">Medium（中程度）</option>
                  <option value="Low">Low（低）</option>
                </select>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInterestModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg cursor-pointer shadow-xs"
                >
                  追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
