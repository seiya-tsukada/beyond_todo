import React from 'react';
import { Compass, Menu, X, User as UserIcon, FileText } from 'lucide-react';
import { User } from '../types/index.ts';
import { UserAvatar } from './UserAvatar.tsx';

export type NavTab = 'focus' | 'dashboard' | 'myspace' | 'review' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user: User | null;
  onOpenReviewModal?: () => void;
  onOpenQuickMemo?: () => void;
}

export function Navbar({ currentTab, onSelectTab, user, onOpenReviewModal, onOpenQuickMemo }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems: { id: NavTab; label: string }[] = [
    { id: 'focus', label: 'Focus' },
    { id: 'myspace', label: 'My Space' },
    { id: 'dashboard', label: 'Dashboard' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAFA]/90 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand wordmark (navigates to Focus) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('focus')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                <Compass className="w-4 h-4 text-zinc-100" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-zinc-900 whitespace-nowrap">
                  Beyond TODO.
                </span>
                <span className="hidden lg:inline text-xs text-zinc-400 font-normal ml-2">
                  自分の意思で、人生を動かす
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (Clean 3 Tabs) */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {navItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap rounded-md relative cursor-pointer ${
                    active
                      ? 'text-zinc-900 font-semibold bg-zinc-200/70'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Memo + weekly review CTA + Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {onOpenQuickMemo && (
              <button
                onClick={onOpenQuickMemo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                title="クイックメモを開く (Shortcut: M)"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-700" />
                <span>メモ</span>
              </button>
            )}

            <button
              onClick={() => onSelectTab('settings')}
              title="アカウント・設定"
              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-2 ${
                currentTab === 'settings'
                  ? 'border-zinc-900 bg-zinc-100'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white'
              }`}
            >
              <UserAvatar user={user} />
              <span className="hidden xl:inline text-xs font-medium text-zinc-700 max-w-[100px] truncate">
                {user?.name}
              </span>
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-200 bg-[#FAFAFA] px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg ${
                  active ? 'bg-zinc-200 text-zinc-900 font-semibold' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="pt-2 border-t border-zinc-200 flex flex-col gap-2">
            <button
              onClick={() => {
                onSelectTab('review');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-900 font-semibold hover:bg-zinc-100 rounded-lg flex items-center gap-2"
            >
              <span>weekly review</span>
            </button>
            <button
              onClick={() => {
                onSelectTab('settings');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg flex items-center gap-2"
            >
              <UserIcon className="w-4 h-4" />
              設定・アカウント情報
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
