import React, { useState } from 'react';
import {
  User,
  Shield,
  Database,
  Mail,
  Download,
  RotateCcw,
  CheckCircle2,
  Server,
  Key,
  ExternalLink,
} from 'lucide-react';
import { User as UserType } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useToast } from './Toast.tsx';

interface SettingsViewProps {
  user: UserType | null;
  onLogout: () => void;
  onDataReset: () => Promise<void>;
}

export function SettingsView({ user, onLogout, onDataReset }: SettingsViewProps) {
  const { showToast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  const handleResetData = async () => {
    if (confirm('すべての登録データを初期の起業家サンプルデータにリセットしますか？')) {
      setIsResetting(true);
      try {
        await onDataReset();
        showToast('初期サンプルデータにリセットしました');
      } catch (err: any) {
        showToast(err.message || 'リセットに失敗しました', 'error');
      } finally {
        setIsResetting(false);
      }
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
          アカウント設定、データリポジトリの接続状態、バックアップ・初期化の管理。
        </p>
      </div>

      {/* 1. Account Profile Card */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-700" />
            <span>ユーザーアカウント情報</span>
          </h2>
          <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>認証済み（Session Active）</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <img
            src="/src/assets/images/avatar_founder_user_1793331998568.jpg"
            alt={user?.name || 'User Profile'}
            className="w-14 h-14 rounded-full object-cover border border-zinc-200"
            referrerPolicy="no-referrer"
          />
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-zinc-900">{user?.name || 'Seiya Tanaka'}</h3>
            <p className="text-xs text-zinc-500 font-mono">{user?.email || 'founder@beyondtodo.app'}</p>
            <p className="text-xs text-zinc-600">{user?.title || 'Founder & Product Lead'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs">
          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
            <span className="text-zinc-500 block mb-0.5">アカウントID (Multi-tenant Key):</span>
            <span className="font-mono text-zinc-800 font-medium">{user?.id || 'usr_founder_001'}</span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
            <span className="text-zinc-500 block mb-0.5">認証方式:</span>
            <span className="text-zinc-800 font-medium">
              独自セッション（Argon2idハッシュ管理 / Supabase Auth非依存）
            </span>
          </div>
        </div>
      </div>

      {/* 2. Architecture & Data Repository Status */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-2xs space-y-4">
        <div className="pb-3 border-b border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-zinc-700" />
            <span>データリポジトリ & アーキテクチャ状態</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Repositoryパターンにより、モックデータストアと本番Supabase PostgreSQLを疎結合に切り替え可能です。
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-start justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100">
            <div>
              <span className="font-bold text-zinc-800 block">Repository Mode:</span>
              <span className="text-zinc-600">
                In-Memory Entrepreneur Seed Repository (Multi-tenant Isolated)
              </span>
            </div>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono text-[11px] font-semibold">
              ACTIVE
            </span>
          </div>

          <div className="flex items-start justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100">
            <div>
              <span className="font-bold text-zinc-800 block">Python FastAPI Backend (Vercel Ready):</span>
              <span className="text-zinc-600">
                /backend/main.py, /backend/models.py, /backend/requirements.txt 生成済み
              </span>
            </div>
            <span className="text-zinc-600 bg-zinc-200 px-2 py-0.5 rounded font-mono text-[11px]">
              READY
            </span>
          </div>

          <div className="flex items-start justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100">
            <div>
              <span className="font-bold text-zinc-800 block">Supabase PostgreSQL Schema:</span>
              <span className="text-zinc-600">
                /supabase_schema.sql (RLSポリシー、UUID、9テーブル完全定義)
              </span>
            </div>
            <span className="text-zinc-600 bg-zinc-200 px-2 py-0.5 rounded font-mono text-[11px]">
              CONFIGURED
            </span>
          </div>

          <div className="flex items-start justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100">
            <div>
              <span className="font-bold text-zinc-800 block">Resend Email Gateway:</span>
              <span className="text-zinc-600">
                開発用Mock Mode稼働中（RESEND_API_KEY設定時に実メール送信へ自動昇格）
              </span>
            </div>
            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-mono text-[11px]">
              MOCK MODE
            </span>
          </div>
        </div>
      </div>

      {/* 3. Data Backup & Reset */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 pb-3 border-b border-zinc-100">
          データ操作・バックアップ
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

        <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-rose-800">サンプル初期データへのリセット</h3>
            <p className="text-xs text-zinc-500">
              デモ用の起業家初期データ（課題4件、優先事項3件、関心事4件、ステークホルダー3名、過去振り返り）を再展開します。
            </p>
          </div>
          <button
            onClick={handleResetData}
            disabled={isResetting}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-700 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-transparent rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isResetting ? 'リセット中...' : '初期データに戻す'}</span>
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
