import React, { useEffect, useState } from 'react';
import { Compass, Mail, Lock, User as UserIcon } from 'lucide-react';
import { api } from '../services/api.ts';
import { User } from '../types/index.ts';
import { useToast } from './Toast.tsx';

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthMode;
  /** Token from the password-reset e-mail link (required for 'reset' mode) */
  resetToken?: string | null;
  onSuccess: (user: User) => void;
  onResetComplete?: () => void;
}

export function AuthModal({ isOpen, initialMode = 'login', resetToken, onSuccess, onResetComplete }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        showToast('ログインしました');
        onSuccess(res.user);
      } else if (mode === 'register') {
        const res = await api.register({ name, email, password, title: title || undefined });
        showToast(res.message || 'アカウントを登録しました');
        onSuccess(res.user);
      } else if (mode === 'forgot') {
        const res = await api.forgotPassword(email);
        showToast(res.message);
        setMode('login');
      } else if (mode === 'reset') {
        if (!resetToken) throw new Error('再設定リンクが無効です。もう一度お手続きください。');
        const res = await api.resetPassword(resetToken, password);
        showToast(res.message);
        setPassword('');
        onResetComplete?.();
        setMode('login');
      }
    } catch (err: any) {
      showToast(err.message || '処理に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150 relative">
        <div className="text-center space-y-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center mx-auto shadow-sm">
            <Compass className="w-5 h-5 text-zinc-100" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">
            {mode === 'login' && 'Beyond TODO. へログイン'}
            {mode === 'register' && 'アカウントを新規作成'}
            {mode === 'forgot' && 'パスワードの再設定'}
            {mode === 'reset' && '新しいパスワードの設定'}
          </h2>
          <p className="text-xs text-zinc-500">
            {mode === 'login' && '自分の意思で、人生を動かすパーソナルマネジメント'}
            {mode === 'register' && '課題・優先事項・興味関心を統合管理するワークスペース'}
            {mode === 'forgot' && '登録したメールアドレス宛に再設定リンクを送信します'}
            {mode === 'reset' && '8文字以上の新しいパスワードを入力してください'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  お名前 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="例: 田中 誠也"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  肩書き・役割
                </label>
                <input
                  type="text"
                  placeholder="例: 起業家 / Product Lead"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
            </>
          )}

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                メールアドレス <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-zinc-700">
                  パスワード <span className="text-rose-500">*</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900"
                  >
                    お忘れですか？
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  required
                  minLength={mode === 'login' ? 1 : 8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'login' ? '••••••••' : '8文字以上'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading
              ? '処理中...'
              : { login: 'ログインする', register: 'アカウントを作成', forgot: '再設定メールを送信', reset: 'パスワードを変更する' }[mode]}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-zinc-100 text-center">
          <div className="text-xs text-zinc-500">
            {mode === 'login' ? (
              <span>
                アカウントをお持ちでないですか？{' '}
                <button
                  onClick={() => setMode('register')}
                  className="font-semibold text-zinc-900 hover:underline cursor-pointer"
                >
                  新規登録
                </button>
              </span>
            ) : (
              <span>
                すでに登録済みですか？{' '}
                <button
                  onClick={() => setMode('login')}
                  className="font-semibold text-zinc-900 hover:underline cursor-pointer"
                >
                  ログイン
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
