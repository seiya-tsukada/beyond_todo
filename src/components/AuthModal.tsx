import React, { useEffect, useState } from 'react';
import { Compass, Mail, Lock, KeyRound } from 'lucide-react';
import { api, ApiError } from '../services/api.ts';
import { User } from '../types/index.ts';
import { useToast } from './Toast.tsx';

/** 'verify' is the second step of sign-up: entering the code mailed to the address. */
export type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

/** Matches SIGNUP_CODE_RESEND_INTERVAL on the server */
const RESEND_INTERVAL_S = 60;

/** Matches NewPassword on the server: 8+ characters with a lowercase letter and a digit */
const PASSWORD_RULE = '8文字以上で、英小文字と数字をそれぞれ1文字以上含めてください。';
const isValidNewPassword = (value: string) => value.length >= 8 && /[a-z]/.test(value) && /[0-9]/.test(value);

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthMode;
  /** Token from the password-reset e-mail link (required for 'reset' mode) */
  resetToken?: string | null;
  onSuccess: (user: User) => void;
  onResetComplete?: () => void;
}

const inputClass =
  'w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none';

export function AuthModal({ isOpen, initialMode = 'login', resetToken, onSuccess, onResetComplete }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Countdown until the code may be resent
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  if (!isOpen) return null;

  const goToVerify = (message: string) => {
    showToast(message);
    setCode('');
    setPassword('');
    setResendIn(RESEND_INTERVAL_S);
    setMode('verify');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((mode === 'register' || mode === 'reset') && !isValidNewPassword(password)) {
      showToast(`パスワードは${PASSWORD_RULE}`, 'error');
      return;
    }
    setLoading(true);

    try {
      if (mode === 'login') {
        try {
          const res = await api.login(email, password);
          showToast('ログインしました');
          onSuccess(res.user);
        } catch (err) {
          // Right password but the address is not verified yet: a code was mailed
          if (err instanceof ApiError && err.status === 403) goToVerify(err.message);
          else throw err;
        }
      } else if (mode === 'register') {
        const res = await api.register({ email, password });
        goToVerify(res.message);
      } else if (mode === 'verify') {
        const res = await api.verifySignupCode(email, code);
        showToast('メールアドレスを確認しました。ようこそ！');
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

  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await api.resendSignupCode(email);
      showToast(res.message);
      setCode('');
      setResendIn(RESEND_INTERVAL_S);
    } catch (err: any) {
      showToast(err.message || '確認コードの再送に失敗しました', 'error');
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
            {mode === 'verify' && 'メールアドレスの確認'}
            {mode === 'forgot' && 'パスワードの再設定'}
            {mode === 'reset' && '新しいパスワードの設定'}
          </h2>
          <p className="text-xs text-zinc-500">
            {mode === 'login' && '自分の意思をコントロールする、パーソナルマネジメント'}
            {mode === 'verify' && (
              <>
                <span className="font-semibold text-zinc-700 break-all">{email}</span> 宛に送信した
                <br />
                6桁の確認コードを入力してください（10分間有効）
              </>
            )}
            {mode === 'forgot' && '登録したメールアドレス宛に再設定リンクを送信します'}
            {mode === 'reset' && '新しいパスワードを入力してください（8文字以上・英小文字と数字を含む）'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'verify' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                確認コード <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} font-mono text-lg tracking-[0.5em]`}
                />
              </div>
            </div>
          )}

          {mode !== 'reset' && mode !== 'verify' && (
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
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && mode !== 'verify' && (
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
                  placeholder={mode === 'login' ? '••••••••' : '8文字以上・英小文字と数字を含む'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'verify' && code.length !== 6)}
            className="w-full py-2.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading
              ? '処理中...'
              : {
                  login: 'ログインする',
                  register: '確認コードを送信',
                  verify: '確認してはじめる',
                  forgot: '再設定メールを送信',
                  reset: 'パスワードを変更する',
                }[mode]}
          </button>
        </form>

        {mode === 'verify' && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
            <button
              type="button"
              onClick={() => setMode('register')}
              className="hover:text-zinc-900 cursor-pointer"
            >
              メールアドレスを変更する
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || resendIn > 0}
              className="font-semibold text-zinc-700 hover:text-zinc-900 cursor-pointer disabled:cursor-default disabled:text-zinc-400"
            >
              {resendIn > 0 ? `コードを再送（${resendIn}秒後）` : 'コードを再送する'}
            </button>
          </div>
        )}

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
