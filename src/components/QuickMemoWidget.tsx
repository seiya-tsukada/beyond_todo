import React, { useState } from 'react';
import {
  FileText,
  X,
  Send,
  AlertTriangle,
  Compass,
  Lightbulb,
} from 'lucide-react';
import { useToast } from './Toast.tsx';

interface QuickMemoWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  memos?: any[]; // Kept optional for backward-compatibility
  onAddMemo: (content: string, tags?: string[]) => Promise<void>;
  onDeleteMemo?: (id: string) => Promise<void>;
  onConvertMemo?: (memo: any, targetType: any) => void;
}

export function QuickMemoWidget({
  isOpen,
  onClose,
  onAddMemo,
}: QuickMemoWidgetProps) {
  const [content, setContent] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<'priority' | 'problem' | 'interest'>('priority');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const tag =
        selectedLabel === 'priority'
          ? 'Priorities'
          : selectedLabel === 'problem'
          ? 'Problems'
          : 'Interests';

      await onAddMemo(content.trim(), [tag]);
      showToast(
        selectedLabel === 'priority'
          ? '「Priorities」ラベルでメモを記録しました'
          : selectedLabel === 'problem'
          ? '「Problems」ラベルでメモを記録しました'
          : '「Interests」ラベルでメモを記録しました'
      );
      setContent('');
      onClose();
    } catch (err: any) {
      showToast(err.message || '保存に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-900" />
            <h2 className="text-base font-bold text-zinc-900">クイックメモ & ブレインダンプ</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form with 3 Label Options (Strict Belonging) */}
        <form onSubmit={handleSubmit} className="pt-4 space-y-4">
          <textarea
            rows={4}
            autoFocus
            required
            placeholder="メモを入力...（所属ラベルを選択して保存。画面遷移時に自動ストックされます）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit(e);
              }
            }}
            className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none placeholder:text-zinc-400"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Label Selection Toggle: Priorities / Problems / Interests (Required) */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600 font-semibold shrink-0">所属ラベル:</span>
              <div className="inline-flex items-center gap-1 p-0.5 bg-zinc-100 rounded-lg flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedLabel('priority')}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedLabel === 'priority'
                      ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-blue-600'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-blue-600" />
                  <span>Priorities</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLabel('problem')}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedLabel === 'problem'
                      ? 'bg-white text-rose-700 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-rose-600'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Problems</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLabel('interest')}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedLabel === 'interest'
                      ? 'bg-white text-amber-800 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-amber-700'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span>Interests</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="text-[11px] text-zinc-400 hidden sm:inline">Ctrl/Cmd + Enter で保存</span>
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {loading
                    ? '保存中...'
                    : selectedLabel === 'priority'
                    ? '「優先事項」として記録'
                    : selectedLabel === 'problem'
                    ? '「Problems」として記録'
                    : '「興味関心」として記録'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
