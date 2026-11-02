import React, { useState } from 'react';
import { X, AlertTriangle, Compass, Lightbulb, Check } from 'lucide-react';
import { QuickMemo, ImportanceLevel, ChallengeStatus } from '../types/index.ts';

interface ConvertMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  memo: QuickMemo | null;
  targetType: 'challenge' | 'priority' | 'interest' | null;
  onConfirm: (
    memoId: string,
    data: {
      targetType: 'challenge' | 'priority' | 'interest';
      title: string;
      description?: string;
      reason?: string;
      category?: string;
      importance?: ImportanceLevel;
      status?: string;
    }
  ) => Promise<void>;
}

export function ConvertMemoModal({
  isOpen,
  onClose,
  memo,
  targetType,
  onConfirm,
}: ConvertMemoModalProps) {
  if (!isOpen || !memo || !targetType) return null;

  const [title, setTitle] = useState(memo.content.slice(0, 40));
  const [description, setDescription] = useState(memo.content);
  const [reason, setReason] = useState('会議メモおよび現状の課題から優先度が高いと判断');
  const [category, setCategory] = useState('Business');
  const [importance, setImportance] = useState<ImportanceLevel>('High');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(memo.id, {
        targetType,
        title,
        description,
        reason,
        category,
        importance,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            {targetType === 'challenge' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
            {targetType === 'priority' && <Compass className="w-4 h-4 text-zinc-900" />}
            {targetType === 'interest' && <Lightbulb className="w-4 h-4 text-amber-600" />}
            <h2 className="text-base font-bold text-zinc-900">
              {targetType === 'challenge' && 'メモを「Problems」として登録'}
              {targetType === 'priority' && 'メモを「Priorities」として登録'}
              {targetType === 'interest' && 'メモを「Interests」としてストック'}
            </h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              タイトル <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              詳細な背景・内容
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          {targetType === 'priority' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                なぜ最優先にするのか (Reason) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
          )}

          {targetType === 'challenge' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                重要度
              </label>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value as ImportanceLevel)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
              >
                <option value="High">High (最重要)</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          )}

          {targetType === 'interest' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                カテゴリー
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
              />
            </div>
          )}

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg cursor-pointer"
            >
              {loading ? '保存中...' : '昇華して登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
