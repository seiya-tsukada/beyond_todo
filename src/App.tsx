/**
 * Beyond TODO.
 * 自分の意思で、人生を動かす。
 * Personal Management Tool
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './components/Toast.tsx';
import { Navbar, NavTab } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { QuickFocusView } from './components/QuickFocusView.tsx';
import { MySpaceView, MySpaceSubTab } from './components/MySpaceView.tsx';
import { WeeklyReviewView } from './components/WeeklyReviewView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { AuthModal, AuthMode } from './components/AuthModal.tsx';
import { QuickMemoWidget } from './components/QuickMemoWidget.tsx';
import { ConvertMemoModal } from './components/ConvertMemoModal.tsx';
import { api, setUnauthorizedHandler } from './services/api.ts';
import {
  DashboardOverview,
  Challenge,
  Priority,
  Interest,
  Stakeholder,
  WeeklyReview,
  DecisionLog,
  QuickMemo,
  User,
  PriorityStatus,
  ChallengeStatus,
  ImportanceLevel,
  InterestStatus,
  StakeholderRelationship,
} from './types/index.ts';

type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

/** Reads and strips the one-time parameters that e-mail links append to the URL. */
function takeEmailLinkParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {
    verifyToken: params.get('verify_token'),
    resetToken: params.get('reset_token'),
    forgot: params.get('forgot') === '1',
    tab: params.get('tab'),
  };
  if (window.location.search) {
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  }
  return result;
}

function AppContent() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<NavTab>('focus');
  const [mySpaceSubTab, setMySpaceSubTab] = useState<MySpaceSubTab>('priorities');
  const [user, setUser] = useState<User | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [decisionLogs, setDecisionLogs] = useState<DecisionLog[]>([]);
  const [memos, setMemos] = useState<QuickMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [isMemoWidgetOpen, setIsMemoWidgetOpen] = useState(false);

  // Memo conversion modal state
  const [convertTarget, setConvertTarget] = useState<{
    memo: QuickMemo;
    targetType: 'challenge' | 'priority' | 'interest';
  } | null>(null);

  const { showToast } = useToast();

  // Load all workspace data for the signed-in user
  const loadData = useCallback(async () => {
    try {
      const [ovData, decData, memosData] = await Promise.all([
        api.getDashboardOverview(),
        api.getDecisionLogs().catch(() => []),
        api.getQuickMemos().catch(() => []),
      ]);

      setOverview(ovData);
      setChallenges(ovData.challenges);
      setPriorities(ovData.priorities);
      setInterests(ovData.interests);
      setStakeholders(ovData.stakeholders);
      setDecisionLogs(decData);
      setMemos(memosData);

      // Reviews
      const revs = await api.getReviews().catch(() => []);
      setReviews(revs);
    } catch (err: any) {
      if (err?.status === 401) return; // handled by the unauthorized handler
      console.error('Failed to load initial data:', err);
      showToast('データの読み込みに失敗しました。サーバーの稼働状態を確認してください。', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const clearWorkspace = useCallback(() => {
    setUser(null);
    setOverview(null);
    setChallenges([]);
    setPriorities([]);
    setInterests([]);
    setStakeholders([]);
    setReviews([]);
    setDecisionLogs([]);
    setMemos([]);
    setLoading(true);
  }, []);

  const handleSignedIn = useCallback(
    (signedInUser: User) => {
      setUser(signedInUser);
      setAuthStatus('authenticated');
      loadData();
    },
    [loadData]
  );

  // Session bootstrap: handle e-mail links, then restore the session from the cookie
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearWorkspace();
      setAuthMode('login');
      setAuthStatus('anonymous');
      showToast('セッションの有効期限が切れました。再度ログインしてください。', 'info');
    });

    const { verifyToken, resetToken: linkResetToken, forgot, tab } = takeEmailLinkParams();
    if (tab === 'review') setCurrentTab('review');

    (async () => {
      if (verifyToken) {
        try {
          const res = await api.verifyEmail(verifyToken);
          showToast(res.message);
        } catch (err: any) {
          showToast(err.message || 'メールアドレスの確認に失敗しました', 'error');
        }
      }

      if (linkResetToken) {
        setResetToken(linkResetToken);
        setAuthMode('reset');
        setAuthStatus('anonymous');
        return;
      }

      try {
        const me = await api.getMe();
        handleSignedIn(me.user);
      } catch {
        setAuthMode(forgot ? 'forgot' : 'login');
        setAuthStatus('anonymous');
      }
    })();

    return () => setUnauthorizedHandler(null);
  }, [clearWorkspace, handleSignedIn, showToast]);

  // Global keyboard shortcut: Press 'm' to open quick memo when not typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMemoWidgetOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers for Quick Memos
  const handleAddMemo = async (content: string, tags?: string[]) => {
    const created = await api.createQuickMemo(content, tags);
    setMemos((prev) => [created, ...prev]);
  };

  const handleDeleteMemo = async (id: string) => {
    await api.deleteQuickMemo(id);
    setMemos((prev) => prev.filter((m) => m.id !== id));
    showToast('メモを削除しました');
  };

  const handleUpdateMemo = async (id: string, content: string, tags?: string[]) => {
    try {
      const updated = await api.updateQuickMemo(id, { content, tags });
      setMemos((prev) => prev.map((m) => (m.id === id ? updated : m)));
      showToast('メモを更新しました');
    } catch (err: any) {
      showToast(err.message || '更新に失敗しました', 'error');
    }
  };

  const handleStartConvertMemo = (memo: QuickMemo, targetType: 'challenge' | 'priority' | 'interest') => {
    setConvertTarget({ memo, targetType });
  };

  const handleConfirmConvert = async (
    memoId: string,
    data: {
      targetType: 'challenge' | 'priority' | 'interest';
      title: string;
      description?: string;
      reason?: string;
      category?: string;
      importance?: ImportanceLevel;
    }
  ) => {
    try {
      const res = await api.convertQuickMemo(memoId, data);
      showToast(`メモを「${data.targetType}」に昇華しました！`);
      loadData();
    } catch (err: any) {
      showToast(err.message || '変換に失敗しました', 'error');
    }
  };

  // Handlers for Challenges
  const handleAddChallenge = async (data: {
    title: string;
    description: string;
    status: ChallengeStatus;
    importance: ImportanceLevel;
  }) => {
    const created = await api.createChallenge(data);
    setChallenges((prev) => [created, ...prev]);
    loadData();
  };

  const handleUpdateChallenge = async (id: string, data: Partial<Challenge>) => {
    const updated = await api.updateChallenge(id, data);
    setChallenges((prev) => prev.map((c) => (c.id === id ? updated : c)));
    loadData();
  };

  const handleDeleteChallenge = async (id: string) => {
    await api.deleteChallenge(id);
    setChallenges((prev) => prev.filter((c) => c.id !== id));
    loadData();
  };

  // Handlers for Priorities
  const handleAddPriority = async (data: {
    title: string;
    description: string;
    reason: string;
    status: PriorityStatus;
    target_week: string;
    challenge_id: string | null;
  }) => {
    const created = await api.createPriority(data);
    setPriorities((prev) => [created, ...prev]);
    loadData();
  };

  const handleUpdatePriority = async (id: string, data: Partial<Priority>) => {
    const updated = await api.updatePriority(id, data);
    setPriorities((prev) => prev.map((p) => (p.id === id ? updated : p)));
    loadData();
  };

  const handleDeletePriority = async (id: string) => {
    await api.deletePriority(id);
    setPriorities((prev) => prev.filter((p) => p.id !== id));
    loadData();
  };

  const handleTogglePriorityStatus = async (p: Priority) => {
    const nextStatus: PriorityStatus = p.status === 'Completed' ? 'In Progress' : 'Completed';
    try {
      await handleUpdatePriority(p.id, { status: nextStatus });
      showToast(nextStatus === 'Completed' ? 'Priorities を完了しました！' : '進行中に戻しました');
    } catch (err: any) {
      showToast(err.message || '更新に失敗しました', 'error');
    }
  };

  // Handlers for Interests
  const handleAddInterest = async (data: {
    title: string;
    description: string;
    category: string;
    status: InterestStatus;
    who?: string;
  }) => {
    const created = await api.createInterest(data);
    setInterests((prev) => [created, ...prev]);
    loadData();
  };

  const handleUpdateInterest = async (id: string, data: Partial<Interest>) => {
    const updated = await api.updateInterest(id, data);
    setInterests((prev) => prev.map((i) => (i.id === id ? updated : i)));
    loadData();
  };

  const handleDeleteInterest = async (id: string) => {
    await api.deleteInterest(id);
    setInterests((prev) => prev.filter((i) => i.id !== id));
    loadData();
  };

  // Handlers for Stakeholders
  const handleAddStakeholder = async (data: {
    name: string;
    relationship: StakeholderRelationship;
    description: string;
  }) => {
    const created = await api.createStakeholder(data);
    setStakeholders((prev) => [created, ...prev]);
    loadData();
  };

  const handleUpdateStakeholder = async (id: string, data: Partial<Stakeholder>) => {
    const updated = await api.updateStakeholder(id, data);
    setStakeholders((prev) => prev.map((s) => (s.id === id ? updated : s)));
    loadData();
  };

  const handleDeleteStakeholder = async (id: string) => {
    await api.deleteStakeholder(id);
    setStakeholders((prev) => prev.filter((s) => s.id !== id));
    loadData();
  };

  const handleAddStakeholderInterest = async (
    stakeholderId: string,
    data: { title: string; description: string; importance: ImportanceLevel }
  ) => {
    await api.createStakeholderInterest(stakeholderId, data);
    loadData();
  };

  const handleDeleteStakeholderInterest = async (id: string) => {
    await api.deleteStakeholderInterest(id);
    loadData();
  };

  // Handlers for Weekly Reviews
  const handleSaveReview = async (reviewData: Partial<WeeklyReview>) => {
    const created = await api.createReview(reviewData);
    setReviews((prev) => [created, ...prev]);
    loadData();
  };

  // Handlers for Decision Logs
  const handleAddDecisionLog = async (data: {
    priority_id: string | null;
    decision: string;
    reason: string;
    outcome?: string;
  }) => {
    const created = await api.createDecisionLog(data);
    setDecisionLogs((prev) => [created, ...prev]);
    loadData();
  };

  const handleDeleteDecisionLog = async (id: string) => {
    await api.deleteDecisionLog(id);
    setDecisionLogs((prev) => prev.filter((d) => d.id !== id));
    showToast('Decision Logs を削除しました');
    loadData();
  };

  // AI Re-analysis Handler
  const handleRefreshInsights = async (userQuery?: string) => {
    setIsRefreshingInsights(true);
    try {
      const res = await api.analyzeInsights(userQuery);
      if (overview) {
        setOverview({
          ...overview,
          aiInsights: res.insights,
        });
      }
      showToast('AIインサイトを最新のデータで再分析しました');
    } catch (err: any) {
      showToast(err.message || '分析に失敗しました', 'error');
    } finally {
      setIsRefreshingInsights(false);
    }
  };

  const [isStocking, setIsStocking] = useState(false);

  // Auto-stock memos into their labeled domains (priorities, challenges, interests) on screen transition
  const handleAutoStockMemos = async (targetMemoIds?: string[]) => {
    if (memos.length === 0) return;
    setIsStocking(true);
    try {
      const res = await api.autoStockMemos(targetMemoIds);
      if (res.processedCount > 0) {
        showToast(
          `画面遷移に伴い、メモ${res.processedCount}件を各ストックへ自動登録しました（Priorities: ${res.stockedCounts.priority}件, Problems: ${res.stockedCounts.challenge}件, Interests: ${res.stockedCounts.interest}件）`
        );
      }
      if (res.skippedCount > 0) {
        showToast(`最優先事項の上限に達しているため、メモ${res.skippedCount}件はメモのまま残しました`, 'info');
      }
      await loadData();
    } catch (err: any) {
      console.error('Auto stock error:', err);
    } finally {
      setIsStocking(false);
    }
  };

  const handleSelectTab = async (newTab: NavTab) => {
    if (newTab !== currentTab && memos.length > 0) {
      await handleAutoStockMemos();
    }
    setCurrentTab(newTab);
  };

  // Quick Add router from Dashboard
  const handleOpenQuickAdd = async (type: 'challenge' | 'priority' | 'interest' | 'stakeholder') => {
    if (memos.length > 0) {
      await handleAutoStockMemos();
    }
    if (type === 'challenge') {
      setMySpaceSubTab('challenges');
    } else if (type === 'priority') {
      setMySpaceSubTab('priorities');
    } else if (type === 'interest') {
      setMySpaceSubTab('interests');
    } else if (type === 'stakeholder') {
      setMySpaceSubTab('stakeholders');
    }
    setCurrentTab('myspace');
  };

  const handleNavigateFromDashboard = async (tab: NavTab, subTab?: MySpaceSubTab) => {
    if (memos.length > 0) {
      await handleAutoStockMemos();
    }
    if (subTab) {
      setMySpaceSubTab(subTab);
    }
    setCurrentTab(tab);
  };

  if (authStatus !== 'authenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <AuthModal
          isOpen={authStatus === 'anonymous'}
          initialMode={authMode}
          resetToken={resetToken}
          onSuccess={handleSignedIn}
          onResetComplete={() => setResetToken(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col text-zinc-900">
      {/* Top Bar Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        user={user}
        onOpenReviewModal={async () => {
          if (memos.length > 0) await handleAutoStockMemos();
          setCurrentTab('review');
        }}
        onOpenQuickMemo={() => setIsMemoWidgetOpen(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        {currentTab === 'dashboard' && (
          <DashboardView
            data={overview}
            loading={loading}
            onNavigate={handleNavigateFromDashboard}
            onTogglePriorityStatus={handleTogglePriorityStatus}
            onRefreshInsights={() => handleRefreshInsights()}
            isRefreshingInsights={isRefreshingInsights}
            onOpenQuickAdd={handleOpenQuickAdd}
          />
        )}

        {currentTab === 'focus' && (
          <QuickFocusView
            priorities={priorities}
            challenges={challenges}
            interests={interests}
            memos={memos}
            currentWeek={overview?.targetWeek || '2026-W44'}
            onTogglePriorityStatus={handleTogglePriorityStatus}
            onAddMemo={handleAddMemo}
            onUpdateMemo={handleUpdateMemo}
            onDeleteMemo={handleDeleteMemo}
            onConvertMemo={handleStartConvertMemo}
            onAutoStock={() => handleAutoStockMemos()}
            isStocking={isStocking}
            onNavigateToFull={async (target, subTab) => {
              if (memos.length > 0) {
                await handleAutoStockMemos();
              }
              if (subTab) {
                setMySpaceSubTab(subTab);
              }
              setCurrentTab(target);
            }}
          />
        )}

        {currentTab === 'myspace' && (
          <MySpaceView
            initialSubTab={mySpaceSubTab}
            challenges={challenges}
            interests={interests}
            priorities={priorities}
            stakeholders={stakeholders}
            decisionLogs={decisionLogs}
            currentWeek={overview?.targetWeek || '2026-W44'}
            onAddChallenge={handleAddChallenge}
            onUpdateChallenge={handleUpdateChallenge}
            onDeleteChallenge={handleDeleteChallenge}
            onAddInterest={handleAddInterest}
            onUpdateInterest={handleUpdateInterest}
            onDeleteInterest={handleDeleteInterest}
            onAddPriority={handleAddPriority}
            onUpdatePriority={handleUpdatePriority}
            onDeletePriority={handleDeletePriority}
            onTogglePriorityStatus={handleTogglePriorityStatus}
            onAddDecisionLog={handleAddDecisionLog}
            onDeleteDecisionLog={handleDeleteDecisionLog}
            onAddStakeholder={handleAddStakeholder}
            onUpdateStakeholder={handleUpdateStakeholder}
            onDeleteStakeholder={handleDeleteStakeholder}
            onAddStakeholderInterest={handleAddStakeholderInterest}
            onDeleteStakeholderInterest={handleDeleteStakeholderInterest}
          />
        )}

        {currentTab === 'review' && (
          <WeeklyReviewView
            reviews={reviews}
            currentPriorities={priorities}
            currentWeek={overview?.targetWeek || '2026-W44'}
            onSaveReview={handleSaveReview}
            insights={overview?.aiInsights || []}
            overview={overview}
            onRefreshInsights={handleRefreshInsights}
            isRefreshingInsights={isRefreshingInsights}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            user={user}
            onUserUpdated={setUser}
            onLogout={async () => {
              await api.logout().catch(() => undefined);
              clearWorkspace();
              setAuthMode('login');
              setAuthStatus('anonymous');
              showToast('ログアウトしました');
            }}
          />
        )}
      </main>

      {/* Global Quick Memo Modal / Drawer */}
      <QuickMemoWidget
        isOpen={isMemoWidgetOpen}
        onClose={() => setIsMemoWidgetOpen(false)}
        memos={memos}
        onAddMemo={handleAddMemo}
        onDeleteMemo={handleDeleteMemo}
        onConvertMemo={handleStartConvertMemo}
      />

      {/* Convert Memo Modal */}
      <ConvertMemoModal
        isOpen={convertTarget !== null}
        onClose={() => setConvertTarget(null)}
        memo={convertTarget?.memo || null}
        targetType={convertTarget?.targetType || null}
        onConfirm={handleConfirmConvert}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-6 bg-white/50 text-xs text-zinc-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Beyond TODO. — 自分の意思で、人生を動かす。</p>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>Problem · Priority · Interest · Stakeholders</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
