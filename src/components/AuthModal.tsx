import React, { useState } from 'react';
import { Compass, X, Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import { api } from '../services/api.ts';
import { User } from '../types/index.ts';
import { useToast } from './Toast.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        showToast('ログインしました');
        onSuccess(res.user);
        onClose();
      } else if (mode === 'register') {
        const res = await api.register(name, email, title);
        showToast(res.message || 'アカウントを登録しました');
        onSuccess(res.user);
        onClose();
      } else if (mode === 'forgot') {
        const res = await api.forgotPassword(email);
        showToast(res.message);
        setMode('login');
      }
    } catch (err: any) {
      showToast(err.message || '処理に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setLoading(true);
    try {
      const res = await api.login('founder@beyondtodo.app', 'password123');
      showToast('デモ起業家アカウントでログインしました');
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'ログインに失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-700 p-1 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center mx-auto shadow-sm">
            <Compass className="w-5 h-5 text-zinc-100" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">
            {mode === 'login' && 'Beyond TODO. へログイン'}
            {mode === 'register' && 'アカウントを新規作成'}
            {mode === 'forgot' && 'パスワードの再設定'}
          </h2>
          <p className="text-xs text-zinc-500">
            {mode === 'login' && '自分の意思で、人生を動かすパーソナルマネジメント'}
            {mode === 'register' && '課題・優先事項・興味関心を統合管理するワークスペース'}
            {mode === 'forgot' && '登録したメールアドレス宛に再設定リンクを送信します'}
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

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              メールアドレス <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                required
                placeholder="founder@beyondtodo.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>
          </div>

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
                  placeholder="••••••••"
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
            {loading ? '処理中...' : mode === 'login' ? 'ログインする' : mode === 'register' ? 'アカウントを作成' : '再設定メールを送信'}
          </button>
        </form>

        {/* Demo Fast Login */}
        <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3 text-center">
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={loading}
            className="w-full py-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            起業家デモアカウントですぐ試す
          </button>

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
