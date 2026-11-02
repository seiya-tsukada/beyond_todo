import React, { useState, useRef } from 'react';
import {
  Compass,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  ArrowRight,
  Lightbulb,
  Users,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Priority, Challenge, Interest, QuickMemo } from '../types/index.ts';
import { useToast } from './Toast.tsx';

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

interface QuickFocusViewProps {
  priorities: Priority[];
  challenges: Challenge[];
  interests: Interest[];
  memos: QuickMemo[];
  currentWeek: string;
  onTogglePriorityStatus: (priority: Priority) => void;
  onAddMemo: (content: string, tags?: string[]) => Promise<void>;
  onUpdateMemo?: (id: string, content: string, tags?: string[]) => Promise<void>;
  onDeleteMemo: (id: string) => Promise<void>;
  onConvertMemo: (memo: QuickMemo, targetType: 'challenge' | 'priority' | 'interest') => void;
  onNavigateToFull: (tab: 'myspace' | 'dashboard' | 'review', subTab?: 'priorities' | 'challenges' | 'interests' | 'decisions' | 'stakeholders') => void;
  onAutoStock?: () => Promise<void>;
  isStocking?: boolean;
}

export function QuickFocusView({
  priorities,
  challenges,
  interests,
  memos,
  currentWeek,
  onTogglePriorityStatus,
  onAddMemo,
  onUpdateMemo,
  onDeleteMemo,
  onConvertMemo,
  onNavigateToFull,
  onAutoStock,
  isStocking,
}: QuickFocusViewProps) {
  const [memoInput, setMemoInput] = useState('');
  const [memoLabel, setMemoLabel] = useState<'priority' | 'problem' | 'interest'>('priority');
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [filterImportance, setFilterImportance] = useState<'all' | 'High'>('High');
  const [stakeholderFilter, setStakeholderFilter] = useState<string>('none');

  // Inline editing state for memo cards
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editLabel, setEditLabel] = useState<'priority' | 'problem' | 'interest'>('priority');

  // Horizontal scroll ref for saved memos
  const memoScrollRef = useRef<HTMLDivElement>(null);

  const handleScrollMemos = (direction: 'left' | 'right') => {
    if (memoScrollRef.current) {
      const scrollAmount = 330;
      memoScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const { showToast } = useToast();

  const handleAddMemoSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!memoInput.trim()) return;
    try {
      const tag =
        memoLabel === 'priority'
          ? 'Priorities'
          : memoLabel === 'problem'
          ? 'Problems'
          : 'Interests';

      await onAddMemo(memoInput.trim(), [tag]);
      showToast(
        memoLabel === 'priority'
          ? '「Priorities」ラベルでメモを記録しました（画面遷移時に自動ストック）'
          : memoLabel === 'problem'
          ? '「Problems」ラベルでメモを記録しました（画面遷移時に自動ストック）'
          : '「Interests」ラベルでメモを記録しました（画面遷移時に自動ストック）'
      );
      setMemoInput('');
      setIsInputExpanded(false);
    } catch (err: any) {
      showToast(err.message || '保存に失敗しました', 'error');
    }
  };

  const handleChangeMemoTag = async (memo: QuickMemo, newTag: 'priority' | 'problem' | 'interest') => {
    const tagName =
      newTag === 'priority'
        ? 'Priorities'
        : newTag === 'problem'
        ? 'Problems'
        : 'Interests';
    try {
      if (onUpdateMemo) {
        await onUpdateMemo(memo.id, memo.content, [tagName]);
        showToast(`メモの所属を「${tagName}」に変更しました（画面遷移時に反映）`);
      }
    } catch (err: any) {
      showToast(err.message || 'ラベル変更に失敗しました', 'error');
    }
  };

  const handleStartEdit = (memo: QuickMemo) => {
    setEditingMemoId(memo.id);
    setEditContent(memo.content);
    if (memo.tags?.some((t) => t.includes('Problem') || t.includes('課題'))) {
      setEditLabel('problem');
    } else if (memo.tags?.some((t) => t.includes('Interest') || t.includes('関心'))) {
      setEditLabel('interest');
    } else {
      setEditLabel('priority');
    }
  };

  const handleSaveEdit = async (memoId: string) => {
    if (!editContent.trim()) {
      showToast('メモ内容を入力してください', 'error');
      return;
    }
    try {
      const tag =
        editLabel === 'priority'
          ? 'Priorities'
          : editLabel === 'problem'
          ? 'Problems'
          : 'Interests';

      if (onUpdateMemo) {
        await onUpdateMemo(memoId, editContent.trim(), [tag]);
      }
      setEditingMemoId(null);
    } catch (err: any) {
      showToast(err.message || '更新に失敗しました', 'error');
    }
  };

  // 1. 優先事項: Completedは表示せず、最大5件表示
  const activePriorities = priorities
    .filter((p) => p.status !== 'Completed')
    .slice(0, 5);

  // 2. 重要課題（Problems）: 最大5件表示
  const activeChallenges = challenges
    .filter((c) => c.status !== 'Resolved' && (filterImportance === 'all' || c.importance === 'High'))
    .slice(0, 5);

  // 3. 興味関心: ステークホルダーでソート/絞り込み可能、初期値は「選択なし」、最大5件表示
  const uniqueStakeholders = Array.from(
    new Set(interests.map((i) => i.who || '自分').filter(Boolean))
  );

  let displayedInterests = [...interests];
  if (stakeholderFilter === 'sort') {
    displayedInterests.sort((a, b) => (a.who || '自分').localeCompare(b.who || '自分', 'ja'));
  } else if (stakeholderFilter !== 'none') {
    displayedInterests = displayedInterests.filter((i) => (i.who || '自分') === stakeholderFilter);
  }
  const finalInterests = displayedInterests.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Quick Memo Card (Google Keep style: Frictionless with 4 label toggles) */}
      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-zinc-200/90 shadow-xs hover:border-zinc-300 transition-all p-3 sm:p-4">
          {!isInputExpanded ? (
            <div
              onClick={() => setIsInputExpanded(true)}
              className="text-xs sm:text-sm text-zinc-400 cursor-text py-1 px-1 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span>メモを入力...（思考、会議の発言、課題や優先事項の気づきなど）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 hidden sm:inline bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded">
                  クリックして書く
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAddMemoSubmit} className="space-y-3">
              <textarea
                autoFocus
                rows={3}
                placeholder="メモを入力...（Enterで改行、Ctrl/Cmd + Enter で保存）"
                value={memoInput}
                onChange={(e) => setMemoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleAddMemoSubmit(e);
                  }
                }}
                className="w-full text-xs sm:text-sm border-0 focus:ring-0 focus:outline-none p-0 text-zinc-900 resize-none placeholder:text-zinc-400"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-100">
                {/* 3 Label Options: 優先事項 / Problems / 興味関心 (Required) */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600 font-semibold shrink-0">所属ラベル:</span>
                  <div className="inline-flex items-center gap-1 p-0.5 bg-zinc-100 rounded-lg flex-wrap">
                    <button
                      type="button"
                      onClick={() => setMemoLabel('priority')}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        memoLabel === 'priority'
                          ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                          : 'text-zinc-600 hover:text-blue-600'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5 text-blue-600" />
                      <span>Priorities</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemoLabel('problem')}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        memoLabel === 'problem'
                          ? 'bg-white text-rose-700 shadow-2xs font-semibold'
                          : 'text-zinc-600 hover:text-rose-600'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Problems</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemoLabel('interest')}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        memoLabel === 'interest'
                          ? 'bg-white text-amber-800 shadow-2xs font-semibold'
                          : 'text-zinc-600 hover:text-amber-700'
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                      <span>Interests</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInputExpanded(false);
                      setMemoInput('');
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 cursor-pointer"
                  >
                    閉じる
                  </button>
                  <button
                    type="submit"
                    disabled={!memoInput.trim()}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-xs cursor-pointer disabled:opacity-40"
                  >
                    {memoLabel === 'priority'
                      ? '「Priorities」として記録'
                      : memoLabel === 'problem'
                      ? '「Problems」として記録'
                      : '「Interests」として記録'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Note Cards List (Horizontal Scrolling UI/UX with Navigation Controls) */}
        {memos.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500 font-medium px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-zinc-900">保存されたメモ ({memos.length}件)</span>
                <span className="text-[11px] text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">
                  一時インスタンス · 画面遷移時に所属ストックへ自動登録
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onAutoStock && (
                  <button
                    type="button"
                    onClick={onAutoStock}
                    disabled={isStocking}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title="画面遷移を待たずに今すぐストックへ反映"
                  >
                    <Save className="w-3.5 h-3.5 text-zinc-700" />
                    <span>{isStocking ? '反映中...' : '今すぐストックに反映'}</span>
                  </button>
                )}

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleScrollMemos('left')}
                    className="w-7 h-7 rounded-lg bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 flex items-center justify-center text-zinc-600 transition-colors shadow-2xs cursor-pointer"
                    title="前へスクロール"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScrollMemos('right')}
                    className="w-7 h-7 rounded-lg bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 flex items-center justify-center text-zinc-600 transition-colors shadow-2xs cursor-pointer"
                    title="次へスクロール"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="relative group/carousel">
              <div
                ref={memoScrollRef}
                className="flex items-stretch gap-3 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory focus:outline-none [-ms-overflow-style:none] [scrollbar-width:thin]"
              >
                {memos.map((memo) => {
                  const isEditing = editingMemoId === memo.id;
                  const hasPriorityTag = memo.tags?.some((t) => t.includes('Priorit') || t.includes('優先'));
                  const hasProblemTag = memo.tags?.some((t) => t.includes('Problem') || t.includes('課題'));
                  const hasInterestTag = memo.tags?.some((t) => t.includes('Interest') || t.includes('関心'));

                  if (isEditing) {
                    return (
                      <div
                        key={memo.id}
                        className="w-[320px] sm:w-[360px] shrink-0 snap-start bg-white rounded-xl p-4 border-2 border-zinc-900 shadow-md flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-900">メモを編集</span>
                            <button
                              onClick={() => setEditingMemoId(null)}
                              className="text-zinc-400 hover:text-zinc-700 p-0.5"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <textarea
                            rows={3}
                            autoFocus
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full text-xs sm:text-sm p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none"
                          />

                          {/* Label selection in edit mode: strictly 3 categories */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-zinc-500 font-medium">所属ラベル:</span>
                            <button
                              type="button"
                              onClick={() => setEditLabel('priority')}
                              className={`px-2 py-0.5 text-[11px] rounded transition-colors flex items-center gap-0.5 cursor-pointer ${
                                editLabel === 'priority' ? 'bg-blue-600 text-white font-semibold' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              }`}
                            >
                              <Compass className="w-3 h-3 text-blue-500" />
                              <span>Priorities</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditLabel('problem')}
                              className={`px-2 py-0.5 text-[11px] rounded transition-colors flex items-center gap-0.5 cursor-pointer ${
                                editLabel === 'problem' ? 'bg-rose-600 text-white font-semibold' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                              <span>Problems</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditLabel('interest')}
                              className={`px-2 py-0.5 text-[11px] rounded transition-colors flex items-center gap-0.5 cursor-pointer ${
                                editLabel === 'interest' ? 'bg-amber-600 text-white font-semibold' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                              }`}
                            >
                              <Lightbulb className="w-3 h-3 text-amber-500" />
                              <span>Interests</span>
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingMemoId(null)}
                            className="px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900"
                          >
                            キャンセル
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(memo.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-2xs"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>保存</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={memo.id}
                      className="w-[320px] sm:w-[360px] shrink-0 snap-start group bg-white rounded-xl p-4 border border-zinc-200 hover:border-zinc-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3 min-h-[140px]"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* ONLY purposeful pillar badges */}
                            {hasPriorityTag && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                <Compass className="w-3 h-3 text-blue-600" />
                                Priorities
                              </span>
                            )}
                            {hasProblemTag && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                Problems
                              </span>
                            )}
                            {hasInterestTag && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                <Lightbulb className="w-3 h-3 text-amber-600" />
                                Interests
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
                              {formatDateTime(memo.created_at)}
                            </span>
                            <button
                              onClick={() => handleStartEdit(memo)}
                              className="text-zinc-400 hover:text-zinc-800 p-1 rounded transition-colors"
                              title="メモを編集"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteMemo(memo.id)}
                              className="text-zinc-400 hover:text-rose-600 p-1 rounded transition-colors"
                              title="メモを削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p
                          onClick={() => handleStartEdit(memo)}
                          className="text-xs sm:text-sm text-zinc-900 whitespace-pre-wrap leading-relaxed break-words cursor-text hover:text-zinc-700"
                          title="クリックして編集"
                        >
                          {memo.content}
                        </p>

                        {memo.converted_to && (
                          <span className="inline-block text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            ✓ {memo.converted_to}に昇華済
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                        {/* Instant label switcher matching image_7588de59.png */}
                        <div className="flex items-center gap-1 text-zinc-500 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleChangeMemoTag(memo, 'problem')}
                            className={`font-medium inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition-colors ${
                              hasProblemTag
                                ? 'text-rose-700 font-semibold bg-rose-50'
                                : 'text-zinc-500 hover:text-rose-600 hover:bg-zinc-50'
                            }`}
                            title="Problemsへ所属変更（画面遷移時に自動登録）"
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Problemsへ</span>
                          </button>
                          <span className="text-zinc-300">·</span>
                          <button
                            type="button"
                            onClick={() => handleChangeMemoTag(memo, 'priority')}
                            className={`font-medium inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition-colors ${
                              hasPriorityTag
                                ? 'text-blue-700 font-semibold bg-blue-50'
                                : 'text-zinc-500 hover:text-blue-600 hover:bg-zinc-50'
                            }`}
                            title="Prioritiesへ所属変更（画面遷移時に自動登録）"
                          >
                            <Compass className="w-3 h-3 text-blue-600" />
                            <span>Prioritiesへ</span>
                          </button>
                          <span className="text-zinc-300">·</span>
                          <button
                            type="button"
                            onClick={() => handleChangeMemoTag(memo, 'interest')}
                            className={`font-medium inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition-colors ${
                              hasInterestTag
                                ? 'text-amber-800 font-semibold bg-amber-50'
                                : 'text-zinc-500 hover:text-amber-800 hover:bg-zinc-50'
                            }`}
                            title="Interestsへ所属変更（画面遷移時に自動登録）"
                          >
                            <Lightbulb className="w-3 h-3 text-amber-600" />
                            <span>Interestsへ</span>
                          </button>
                        </div>

                        {memo.converted_to && (
                          <span className="text-zinc-400 font-mono text-[10px]">
                            {new Date(memo.created_at).toLocaleDateString('ja-JP')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Unified Container for 優先事項 & 重要課題（Problems） */}
      <div className="space-y-2 pt-2">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: Priorities */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <h2 className="text-base font-bold text-zinc-900">
                    Priorities
                  </h2>
                  <span className="text-[11px] font-normal text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded font-mono">
                    ({activePriorities.length}件)
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {activePriorities.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all shadow-2xs"
                  >
                    <div className="flex items-start gap-3.5">
                      <button
                        onClick={() => onTogglePriorityStatus(item)}
                        className="mt-0.5 text-zinc-400 hover:text-emerald-600 transition-colors shrink-0 cursor-pointer"
                        title="完了にする"
                      >
                        <Circle className="w-5 h-5 text-zinc-400 hover:text-emerald-600" />
                      </button>

                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <span className="font-mono font-bold text-zinc-800">
                            Priority 0{idx + 1}
                          </span>
                        </div>

                        <h3 className="text-base font-bold leading-snug text-zinc-900">
                          {item.title}
                        </h3>

                        {item.description && (
                          <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
                            {item.description}
                          </p>
                        )}

                        {/* Reason & Challenge Link */}
                        <div className="pt-2 border-t border-zinc-100 flex flex-col gap-1 text-xs">
                          <div className="text-zinc-700">
                            <span className="font-semibold text-zinc-900">なぜ最優先か:</span>{' '}
                            {item.reason}
                          </div>
                          {item.challenge_title && (
                            <div className="text-zinc-500 flex items-center gap-1.5 text-[11px]">
                              <span className="font-medium text-zinc-700">直結する課題:</span>
                              <span className="truncate">{item.challenge_title}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {activePriorities.length === 0 && (
                  <div className="py-10 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                    現在取り組む Priorities はありません
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Problems */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-zinc-900" />
                  <h2 className="text-base font-bold text-zinc-900">
                    Problems
                  </h2>
                  <span className="text-[11px] font-normal text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded font-mono">
                    ({activeChallenges.length}件)
                  </span>
                </div>

                <select
                  value={filterImportance}
                  onChange={(e) => setFilterImportance(e.target.value as any)}
                  className="text-xs bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-zinc-700"
                >
                  <option value="High">Highのみ</option>
                  <option value="all">全て表示</option>
                </select>
              </div>

              <div className="space-y-3">
                {activeChallenges.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className={c.importance === 'High' ? 'text-rose-600 font-bold' : 'text-zinc-600'}>
                        重要度: {c.importance}
                      </span>
                      <span className="text-zinc-600 font-medium">状態: {c.status}</span>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-900 leading-snug">
                      {c.title}
                    </h3>

                    <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                      {c.description || '詳細なし'}
                    </p>
                  </div>
                ))}

                {activeChallenges.length === 0 && (
                  <div className="py-10 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                    該当する Problems はありません
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Interests */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-zinc-900" />
                  <h2 className="text-base font-bold text-zinc-900">
                    Interests
                  </h2>
                  <span className="text-[11px] font-normal text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded font-mono">
                    ({finalInterests.length}件)
                  </span>
                </div>

                <select
                  value={stakeholderFilter}
                  onChange={(e) => setStakeholderFilter(e.target.value)}
                  className="text-xs bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-zinc-700"
                >
                  <option value="none">選択なし</option>
                  <option value="sort">Stakeholders 順</option>
                  {uniqueStakeholders.map((sh) => (
                    <option key={sh} value={sh}>
                      {sh}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {finalInterests.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200 hover:border-zinc-300 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="font-semibold text-zinc-800 bg-white border border-zinc-200/80 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                        <Users className="w-2.5 h-2.5 text-zinc-500" />
                        <span>{item.who || '自分'}</span>
                      </span>
                      <span className="text-zinc-600 text-[11px] font-medium">
                        {item.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-900 leading-snug">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}

                {finalInterests.length === 0 && (
                  <div className="py-10 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                    Interests が未設定です
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ブロック外の右下に配置: 「My Spaceで管理」 */}
        <div className="flex justify-end pr-1 pt-1">
          <button
            onClick={() => onNavigateToFull('myspace')}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors cursor-pointer group"
          >
            <span>My Spaceで管理</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
