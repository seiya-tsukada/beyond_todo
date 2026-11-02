import React, { useState } from 'react';
import { User, Mail, Download, CheckCircle2, AlertCircle, Bell } from 'lucide-react';
import { User as UserType } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useToast } from './Toast.tsx';
import { UserAvatar } from './UserAvatar.tsx';

interface SettingsViewProps {
  user: UserType | null;
  onUserUpdated: (user: UserType) => void;
  onLogout: () => void;
}

export function SettingsView({ user, onUserUpdated, onLogout }: SettingsViewProps) {
  const { showToast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [isSavingNotify, setIsSavingNotify] = useState(false);

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const res = await api.resendVerificationEmail();
      showToast(res.message);
    } catch (err: any) {
      showToast(err.message || '確認メールの送信に失敗しました', 'error');
    } finally {
      setIsResending(false);
    }
  };

  const handleToggleWeeklyReminder = async () => {
    if (!user) return;
    setIsSavingNotify(true);
    try {
      const res = await api.updateMe({ notify_weekly_review: !user.notify_weekly_review });
      onUserUpdated(res.user);
      showToast(res.user.notify_weekly_review ? '週次レビューのリマインドを有効にしました' : '週次レビューのリマインドを停止しました');
    } catch (err: any) {
      showToast(err.message || '設定の更新に失敗しました', 'error');
    } finally {
      setIsSavingNotify(false);
    }
  };

  const handleExportData = () => {
    window.open(api.getExportUrl(), '_blank');
    showToast('JSONデータのエクスポートを開始しました');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-zinc-200">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Settings & Account Management
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          アカウント設定、メール通知、データのバックアップ。
        </p>
      </div>

      {/* 1. Account Profile Card */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-700" />
            <span>ユーザーアカウント情報</span>
          </h2>
          {user?.email_verified_at ? (
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>メールアドレス確認済み</span>
            </span>
          ) : (
            <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>メールアドレス未確認</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <UserAvatar user={user} className="w-14 h-14 text-xl" />
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-zinc-900">{user?.name}</h3>
            <p className="text-xs text-zinc-500 font-mono">{user?.email}</p>
            {user?.title && <p className="text-xs text-zinc-600">{user.title}</p>}
          </div>
        </div>

        {user && !user.email_verified_at && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs">
            <p className="text-amber-800">
              登録時にお送りした確認メールのリンクを開いてください。確認が済むまでリマインドメールは届きません。
            </p>
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-amber-900 bg-white border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{isResending ? '送信中...' : '確認メールを再送'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Email Notifications */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2 pb-3 border-b border-zinc-100">
          <Bell className="w-4 h-4 text-zinc-700" />
          <span>メール通知</span>
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-800">週次レビューのリマインド</h3>
            <p className="text-xs text-zinc-500">
              日曜の夕方、その週の振り返りがまだの場合に、最優先事項の進捗と一緒にお知らせします。
            </p>
          </div>
          <button
            role="switch"
            aria-checked={!!user?.notify_weekly_review}
            onClick={handleToggleWeeklyReminder}
            disabled={isSavingNotify || !user}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
              user?.notify_weekly_review ? 'bg-zinc-900' : 'bg-zinc-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                user?.notify_weekly_review ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 3. Data Backup */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 pb-3 border-b border-zinc-100">
          データのバックアップ
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-800">全データのエクスポート (JSON)</h3>
            <p className="text-xs text-zinc-500">
              課題・優先事項・興味関心・ステークホルダー・振り返りログを一括ダウンロードします。
            </p>
          </div>
          <button
            onClick={handleExportData}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>JSONを書き出す</span>
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={onLogout}
          className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
