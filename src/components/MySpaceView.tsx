import React, { useState } from 'react';
import {
  Compass,
  AlertTriangle,
  Lightbulb,
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  BookmarkCheck,
  X,
  Archive,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  Challenge,
  Interest,
  Priority,
  Stakeholder,
  StakeholderInterest,
  DecisionLog,
  ChallengeStatus,
  ImportanceLevel,
  InterestStatus,
  PriorityStatus,
  StakeholderRelationship,
} from '../types/index.ts';
import { useToast } from './Toast.tsx';
import { MAX_ACTIVE_PRIORITIES_PER_WEEK } from '../constants.ts';

export type MySpaceSubTab = 'priorities' | 'challenges' | 'interests' | 'stakeholders' | 'decisions';

interface MySpaceViewProps {
  initialSubTab?: MySpaceSubTab;
  challenges: Challenge[];
  interests: Interest[];
  priorities: Priority[];
  stakeholders: Stakeholder[];
  decisionLogs: DecisionLog[];
  currentWeek: string;
  // Challenge handlers
  onAddChallenge: (data: { title: string; description: string; status: ChallengeStatus; importance: ImportanceLevel }) => Promise<void>;
  onUpdateChallenge: (id: string, data: Partial<Challenge>) => Promise<void>;
  onDeleteChallenge: (id: string) => Promise<void>;
  // Interest handlers
  onAddInterest: (data: { title: string; description: string; category: string; status: InterestStatus; who?: string }) => Promise<void>;
  onUpdateInterest: (id: string, data: Partial<Interest>) => Promise<void>;
  onDeleteInterest: (id: string) => Promise<void>;
  // Priority handlers
  onAddPriority: (data: {
    title: string;
    description: string;
    reason: string;
    status: PriorityStatus;
    target_week: string;
    challenge_id: string | null;
  }) => Promise<void>;
  onUpdatePriority: (id: string, data: Partial<Priority>) => Promise<void>;
  onDeletePriority: (id: string) => Promise<void>;
  onTogglePriorityStatus: (priority: Priority) => void;
  // Decision log handlers
  onAddDecisionLog: (data: { priority_id: string | null; decision: string; reason: string; outcome?: string }) => Promise<void>;
  onDeleteDecisionLog?: (id: string) => Promise<void>;
  // Stakeholder handlers
  onAddStakeholder: (data: { name: string; relationship: StakeholderRelationship; description: string }) => Promise<void>;
  onUpdateStakeholder: (id: string, data: Partial<Stakeholder>) => Promise<void>;
  onDeleteStakeholder: (id: string) => Promise<void>;
  onAddStakeholderInterest: (stakeholderId: string, data: { title: string; description: string; importance: ImportanceLevel }) => Promise<void>;
  onDeleteStakeholderInterest: (id: string) => Promise<void>;
}

export function MySpaceView({
  initialSubTab = 'priorities',
  challenges,
  interests,
  priorities,
  stakeholders,
  decisionLogs,
  currentWeek,
  onAddChallenge,
  onUpdateChallenge,
  onDeleteChallenge,
  onAddInterest,
  onUpdateInterest,
  onDeleteInterest,
  onAddPriority,
  onUpdatePriority,
  onDeletePriority,
  onTogglePriorityStatus,
  onAddDecisionLog,
  onDeleteDecisionLog,
  onAddStakeholder,
  onUpdateStakeholder,
  onDeleteStakeholder,
  onAddStakeholderInterest,
  onDeleteStakeholderInterest,
}: MySpaceViewProps) {
  const [activeTab, setActiveTab] = useState<MySpaceSubTab>(initialSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [importanceFilter, setImportanceFilter] = useState<string>('all');

  // Archive visibility toggles for Priorities, Challenges, and Interests
  const [showArchivedPriorities, setShowArchivedPriorities] = useState(false);
  const [showArchivedChallenges, setShowArchivedChallenges] = useState(false);
  const [showArchivedInterests, setShowArchivedInterests] = useState(false);

  // Decision logs search & filter
  const [decisionSearch, setDecisionSearch] = useState('');
  const [decisionPriorityFilter, setDecisionPriorityFilter] = useState<string>('all');

  const { showToast } = useToast();

  // Modals state
  // 1. Challenge Modal
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    status: 'Open' as ChallengeStatus,
    importance: 'High' as ImportanceLevel,
  });

  // 2. Interest Modal
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [editingInterest, setEditingInterest] = useState<Interest | null>(null);
  const [interestForm, setInterestForm] = useState({
    title: '',
    description: '',
    category: 'Technology',
    status: 'Interested' as InterestStatus,
    who: '自分',
  });

  // 3. Priority Modal
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [priorityForm, setPriorityForm] = useState({
    title: '',
    description: '',
    reason: '',
    status: 'Not Started' as PriorityStatus,
    challenge_id: '' as string,
  });

  // 4. Decision Log Modal
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [editingDecision, setEditingDecision] = useState<DecisionLog | null>(null);
  const [decisionForm, setDecisionForm] = useState({
    priority_id: '',
    decision: '',
    reason: '',
    outcome: '',
  });

  // 5. Stakeholder Modal
  const [isStakeholderModalOpen, setIsStakeholderModalOpen] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null);
  const [stakeholderForm, setStakeholderForm] = useState({
    name: '',
    relationship: 'Customer' as StakeholderRelationship,
    description: '',
  });

  // 6. Stakeholder Interest Modal
  const [isExpectationModalOpen, setIsExpectationModalOpen] = useState(false);
  const [targetStakeholderId, setTargetStakeholderId] = useState<string>('');
  const [expectationForm, setExpectationForm] = useState({
    title: '',
    description: '',
    importance: 'High' as ImportanceLevel,
  });

  // Challenge modal helpers
  const handleOpenChallengeModal = (c?: Challenge) => {
    if (c) {
      setEditingChallenge(c);
      setChallengeForm({
        title: c.title,
        description: c.description,
        status: c.status,
        importance: c.importance,
      });
    } else {
      setEditingChallenge(null);
      setChallengeForm({
        title: '',
        description: '',
        status: 'Open',
        importance: 'High',
      });
    }
    setIsChallengeModalOpen(true);
  };

  const handleSaveChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeForm.title.trim()) {
      showToast('課題タイトルを入力してください', 'error');
      return;
    }
    try {
      if (editingChallenge) {
        await onUpdateChallenge(editingChallenge.id, challengeForm);
        showToast('課題を更新しました');
      } else {
        await onAddChallenge(challengeForm);
        showToast('新しい課題を登録しました');
      }
      setIsChallengeModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '保存に失敗しました', 'error');
    }
  };

  const handleToggleChallengeStatus = async (c: Challenge) => {
    const isResolved = c.status === 'Resolved';
    const newStatus: ChallengeStatus = isResolved ? 'Open' : 'Resolved';
    try {
      await onUpdateChallenge(c.id, { status: newStatus });
      showToast(newStatus === 'Resolved' ? '課題を解決（アーカイブ）に設定しました' : '課題を再開しました');
    } catch (err: any) {
      showToast(err.message || 'ステータス更新に失敗しました', 'error');
    }
  };

  // Interest modal helpers
  const handleOpenInterestModal = (i?: Interest) => {
    if (i) {
      setEditingInterest(i);
      setInterestForm({
        title: i.title,
        description: i.description,
        category: i.category,
        status: i.status,
        who: i.who || '自分',
      });
    } else {
      setEditingInterest(null);
      setInterestForm({
        title: '',
        description: '',
        category: 'Technology',
        status: 'Interested',
        who: '自分',
      });
    }
    setIsInterestModalOpen(true);
  };

  const handleSaveInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interestForm.title.trim()) {
      showToast('興味関心のタイトルを入力してください', 'error');
      return;
    }
    try {
      if (editingInterest) {
        await onUpdateInterest(editingInterest.id, interestForm);
        showToast('興味関心を更新しました');
      } else {
        await onAddInterest(interestForm);
        showToast('新しい興味関心をストックしました');
      }
      setIsInterestModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '保存に失敗しました', 'error');
    }
  };

  const handleToggleInterestStatus = async (item: Interest) => {
    const isArchived = item.status === 'Archived';
    const newStatus: InterestStatus = isArchived ? 'Interested' : 'Archived';
    try {
      await onUpdateInterest(item.id, { status: newStatus });
      showToast(newStatus === 'Archived' ? '興味関心をアーカイブ（既読）にしました' : '興味関心を再開しました');
    } catch (err: any) {
      showToast(err.message || 'ステータス更新に失敗しました', 'error');
    }
  };

  // Priority modal helpers
  const handleOpenPriorityModal = (p?: Priority) => {
    if (p) {
      setEditingPriority(p);
      setPriorityForm({
        title: p.title,
        description: p.description,
        reason: p.reason,
        status: p.status,
        challenge_id: p.challenge_id || '',
      });
    } else {
      const activeCount = priorities.filter((pr) => pr.status !== 'Completed').length;
      if (activeCount >= MAX_ACTIVE_PRIORITIES_PER_WEEK) {
        showToast(`未完了の最優先事項は週に最大${MAX_ACTIVE_PRIORITIES_PER_WEEK}件までです。`, 'info');
        return;
      }
      setEditingPriority(null);
      setPriorityForm({
        title: '',
        description: '',
        reason: '',
        status: 'Not Started',
        challenge_id: challenges.length > 0 ? challenges[0].id : '',
      });
    }
    setIsPriorityModalOpen(true);
  };

  const handleSavePriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priorityForm.title.trim() || !priorityForm.reason.trim()) {
      showToast('タイトルと理由は必須です', 'error');
      return;
    }
    try {
      if (editingPriority) {
        await onUpdatePriority(editingPriority.id, {
          title: priorityForm.title,
          description: priorityForm.description,
          reason: priorityForm.reason,
          status: priorityForm.status,
          challenge_id: priorityForm.challenge_id || null,
        });
        showToast('最優先事項を更新しました');
      } else {
        await onAddPriority({
          title: priorityForm.title,
          description: priorityForm.description,
          reason: priorityForm.reason,
          status: priorityForm.status,
          target_week: currentWeek,
          challenge_id: priorityForm.challenge_id || null,
        });
        showToast('最優先事項を登録しました');
      }
      setIsPriorityModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '保存に失敗しました', 'error');
    }
  };

  // Decision log modal helpers
  const handleOpenDecisionModal = (d?: DecisionLog) => {
    if (d) {
      setEditingDecision(d);
      setDecisionForm({
        priority_id: d.priority_id || '',
        decision: d.decision,
        reason: d.reason,
        outcome: d.outcome || '',
      });
    } else {
      setEditingDecision(null);
      setDecisionForm({
        priority_id: priorities.length > 0 ? priorities[0].id : '',
        decision: '',
        reason: '',
        outcome: '',
      });
    }
    setIsDecisionModalOpen(true);
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionForm.decision.trim() || !decisionForm.reason.trim()) {
      showToast('決定内容と理由は必須です', 'error');
      return;
    }
    try {
      await onAddDecisionLog({
        priority_id: decisionForm.priority_id || null,
        decision: decisionForm.decision,
        reason: decisionForm.reason,
        outcome: decisionForm.outcome,
      });
      showToast('意思決定ログを記録しました');
      setIsDecisionModalOpen(false);
      setDecisionForm({ priority_id: '', decision: '', reason: '', outcome: '' });
      setEditingDecision(null);
    } catch (err: any) {
      showToast(err.message || '記録に失敗しました', 'error');
    }
  };

  // Stakeholder modal helpers
  const handleOpenStakeholderModal = (st?: Stakeholder) => {
    if (st) {
      setEditingStakeholder(st);
      setStakeholderForm({
        name: st.name,
        relationship: st.relationship,
        description: st.description,
      });
    } else {
      setEditingStakeholder(null);
      setStakeholderForm({
        name: '',
        relationship: 'Customer',
        description: '',
      });
    }
    setIsStakeholderModalOpen(true);
  };

  const handleSaveStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stakeholderForm.name.trim()) {
      showToast('お名前を入力してください', 'error');
      return;
    }
    try {
      if (editingStakeholder) {
        await onUpdateStakeholder(editingStakeholder.id, stakeholderForm);
        showToast('ステークホルダー情報を更新しました');
      } else {
        await onAddStakeholder(stakeholderForm);
        showToast('ステークホルダーを登録しました');
      }
      setIsStakeholderModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '保存に失敗しました', 'error');
    }
  };

  // Expectation modal
  const handleOpenAddExpectation = (stakeholderId: string) => {
    setTargetStakeholderId(stakeholderId);
    setExpectationForm({
      title: '',
      description: '',
      importance: 'High',
    });
    setIsExpectationModalOpen(true);
  };

  const handleSaveExpectation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectationForm.title.trim()) {
      showToast('期待事項を入力してください', 'error');
      return;
    }
    try {
      await onAddStakeholderInterest(targetStakeholderId, expectationForm);
      showToast('期待事項を追加しました');
      setIsExpectationModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '追加に失敗しました', 'error');
    }
  };

  // Filtered & counts logic
  // 1. Priorities
  const activePriorities = priorities.filter((p) => p.status !== 'Completed');
  const completedPriorities = priorities.filter((p) => p.status === 'Completed');
  const displayedPriorities = showArchivedPriorities ? priorities : activePriorities;

  // 2. Challenges
  const resolvedChallengesCount = challenges.filter((c) => c.status === 'Resolved').length;
  const filteredChallenges = challenges.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesImportance = importanceFilter === 'all' || c.importance === importanceFilter;
    const matchesArchive = showArchivedChallenges ? true : c.status !== 'Resolved';
    return matchesSearch && matchesStatus && matchesImportance && matchesArchive;
  });

  // 3. Interests
  const archivedInterestsCount = interests.filter((i) => i.status === 'Archived').length;
  const filteredInterests = interests.filter((i) => {
    const matchesSearch =
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.who || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchesArchive = showArchivedInterests ? true : i.status !== 'Archived';
    return matchesSearch && matchesStatus && matchesArchive;
  });

  // 4. Decision Logs
  const filteredDecisionLogs = decisionLogs.filter((d) => {
    const matchesSearch =
      d.decision.toLowerCase().includes(decisionSearch.toLowerCase()) ||
      d.reason.toLowerCase().includes(decisionSearch.toLowerCase()) ||
      (d.outcome || '').toLowerCase().includes(decisionSearch.toLowerCase());
    const matchesPriority =
      decisionPriorityFilter === 'all'
        ? true
        : decisionPriorityFilter === 'linked'
        ? !!d.priority_id
        : d.priority_id === decisionPriorityFilter;
    return matchesSearch && matchesPriority;
  });

  const linkedDecisionsCount = decisionLogs.filter((d) => !!d.priority_id).length;
  const withOutcomeDecisionsCount = decisionLogs.filter((d) => !!d.outcome && d.outcome.trim().length > 0).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            My Space
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Priorities、Problems、Interests、Stakeholders、Decision Logs を統合管理。
          </p>
        </div>

        {/* Dynamic Action Button based on active subtab */}
        <div>
          {activeTab === 'priorities' && (
            <button
              onClick={() => handleOpenPriorityModal()}
              disabled={activePriorities.length >= MAX_ACTIVE_PRIORITIES_PER_WEEK}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              <span>Priorities を追加 ({activePriorities.length}/5)</span>
            </button>
          )}

          {activeTab === 'challenges' && (
            <button
              onClick={() => handleOpenChallengeModal()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Problems を登録</span>
            </button>
          )}

          {activeTab === 'interests' && (
            <button
              onClick={() => handleOpenInterestModal()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Interests をストック</span>
            </button>
          )}

          {activeTab === 'stakeholders' && (
            <button
              onClick={() => handleOpenStakeholderModal()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Stakeholders を追加</span>
            </button>
          )}

          {activeTab === 'decisions' && (
            <button
              onClick={() => handleOpenDecisionModal()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Decision Logs を記録</span>
            </button>
          )}
        </div>
      </div>

      {/* 5 Core Pillars Sub-Navigation Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-1 p-1 bg-zinc-200/70 rounded-lg overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('priorities')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'priorities'
                ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span>Priorities ({activePriorities.length}/5)</span>
          </button>

          <button
            onClick={() => setActiveTab('challenges')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'challenges'
                ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Problems ({challenges.filter((c) => c.status !== 'Resolved').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('interests')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'interests'
                ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Interests ({interests.filter((i) => i.status !== 'Archived').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stakeholders')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'stakeholders'
                ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Stakeholders ({stakeholders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('decisions')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'decisions'
                ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Decision Logs ({decisionLogs.length})</span>
          </button>
        </div>

        {/* Search for lists */}
        {(activeTab === 'challenges' || activeTab === 'interests') && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 w-48"
            />
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* SUB-VIEW 1: Priorities (Top 5 Focus)                           */}
      {/* ============================================================== */}
      {activeTab === 'priorities' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-zinc-50 p-3 rounded-lg border border-zinc-200/60">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900">Priorities</span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-600">
                Focus画面にリアルタイム参照。未完了は週に最大{MAX_ACTIVE_PRIORITIES_PER_WEEK}件まで厳選。完了（アーカイブ）はワンクリックで切り替え。
              </span>
            </div>

            {/* Archive Toggle Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowArchivedPriorities(!showArchivedPriorities)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  showArchivedPriorities
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <Archive className={`w-3.5 h-3.5 ${showArchivedPriorities ? 'text-zinc-300' : 'text-zinc-500'}`} />
                <span>アーカイブを表示 ({completedPriorities.length}件)</span>
              </button>
            </div>
          </div>

          {/* 5 Slots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4].map((index) => {
              const item = displayedPriorities[index];
              if (!item) {
                return (
                  <div
                    key={`slot-${index}`}
                    onClick={() => handleOpenPriorityModal()}
                    className="bg-white/60 hover:bg-white rounded-xl border border-dashed border-zinc-300 hover:border-zinc-400 p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[240px] group shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-full bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors mb-3">
                      <Plus className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-700 group-hover:text-zinc-900">
                      Priority 0{index + 1}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">枠が空いています。クリックして登録</p>
                  </div>
                );
              }

              const isDone = item.status === 'Completed';

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl p-6 border transition-all flex flex-col justify-between shadow-2xs ${
                    isDone ? 'border-emerald-300 bg-emerald-50/20' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="font-mono font-bold text-zinc-900">0{index + 1}.</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenPriorityModal(item)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
                          title="編集"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`最優先事項「${item.title}」を削除しますか？`)) {
                              onDeletePriority(item.id);
                              showToast('優先事項を削除しました');
                            }
                          }}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onTogglePriorityStatus(item)}
                        className="mt-1 text-zinc-400 hover:text-emerald-600 transition-colors shrink-0 cursor-pointer"
                        title={isDone ? '進行中に戻す' : '完了（アーカイブ）にする'}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-400 hover:text-emerald-600" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <h3 className={`text-base font-bold leading-snug ${isDone ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-zinc-100 text-xs">
                      <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                        <span className="font-semibold text-zinc-800 block mb-0.5">なぜ最優先か:</span>
                        <p className="text-zinc-600 leading-relaxed">{item.reason}</p>
                      </div>
                      {item.challenge_title && (
                        <div className="text-zinc-500 flex items-center gap-1.5 text-[11px]">
                          <span className="font-medium text-zinc-700">直結する課題:</span>
                          <span className="truncate">{item.challenge_title}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                    <span className={`font-medium ${isDone ? 'text-emerald-700' : 'text-zinc-700'}`}>
                      {item.status}
                    </span>
                    <span className="tabular-nums font-mono">
                      {new Date(item.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 2: Challenges (重要課題 / Problems)                   */}
      {/* ============================================================== */}
      {activeTab === 'challenges' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-zinc-50 p-3 rounded-lg border border-zinc-200/60">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900">Problems</span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-600">
                いま解決すべき根本的なボトルネック。円のチェックをクリックで解決（アーカイブ）に設定できます。
              </span>
            </div>

            {/* Archive Toggle Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowArchivedChallenges(!showArchivedChallenges)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  showArchivedChallenges
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <Archive className={`w-3.5 h-3.5 ${showArchivedChallenges ? 'text-zinc-300' : 'text-zinc-500'}`} />
                <span>アーカイブを表示 ({resolvedChallengesCount}件)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChallenges.map((c) => {
              const isResolved = c.status === 'Resolved';

              return (
                <div
                  key={c.id}
                  className={`bg-white rounded-xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-2xs ${
                    isResolved ? 'border-emerald-300 bg-emerald-50/20' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <div className="flex items-center gap-2">
                        <span className={c.importance === 'High' ? 'text-rose-600 font-semibold' : 'text-zinc-600'}>
                          重要度: {c.importance}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={`font-medium ${isResolved ? 'text-emerald-700 font-bold' : 'text-zinc-700'}`}>
                          状態: {c.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenChallengeModal(c)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 rounded cursor-pointer"
                          title="編集"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`課題「${c.title}」を削除しますか？`)) {
                              onDeleteChallenge(c.id);
                              showToast('課題を削除しました');
                            }
                          }}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded cursor-pointer"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Circle Checkbox and Title matching image_c23a9920 */}
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleChallengeStatus(c)}
                        className="mt-1 text-zinc-400 hover:text-emerald-600 transition-colors shrink-0 cursor-pointer"
                        title={isResolved ? '未解決に戻す' : '解決（アーカイブ）にする'}
                      >
                        {isResolved ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-400 hover:text-emerald-600" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <h3 className={`text-base font-bold leading-snug ${isResolved ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                          {c.title}
                        </h3>
                        <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
                          {c.description || '詳細な説明はありません。'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                    <span className="tabular-nums">
                      登録: {new Date(c.created_at).toLocaleDateString('ja-JP')}
                    </span>
                    <div>
                      {isResolved ? (
                        <button
                          type="button"
                          onClick={() => handleToggleChallengeStatus(c)}
                          className="text-xs text-zinc-500 hover:text-zinc-900 font-medium cursor-pointer"
                        >
                          未解決に戻す
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleChallengeStatus(c)}
                          className="text-xs text-emerald-700 hover:text-emerald-900 font-medium cursor-pointer"
                        >
                          解決済みにする
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredChallenges.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-xl border border-dashed border-zinc-200">
                <p className="text-sm text-zinc-500">条件に一致する課題がありません。</p>
                {resolvedChallengesCount > 0 && !showArchivedChallenges && (
                  <button
                    type="button"
                    onClick={() => setShowArchivedChallenges(true)}
                    className="mt-3 text-xs text-zinc-900 font-semibold underline cursor-pointer"
                  >
                    アーカイブ済みの課題（{resolvedChallengesCount}件）を表示する
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 3: Interests (興味関心)                                */}
      {/* ============================================================== */}
      {activeTab === 'interests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-zinc-50 p-3 rounded-lg border border-zinc-200/60">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900">Interests</span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-600">
                純粋な好奇心やステークホルダーの関心事。円のチェックをクリックでアーカイブ（保管）できます。
              </span>
            </div>

            {/* Archive Toggle Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowArchivedInterests(!showArchivedInterests)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  showArchivedInterests
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <Archive className={`w-3.5 h-3.5 ${showArchivedInterests ? 'text-zinc-300' : 'text-zinc-500'}`} />
                <span>アーカイブを表示 ({archivedInterestsCount}件)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInterests.map((item) => {
              const isArchived = item.status === 'Archived';

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-2xs ${
                    isArchived ? 'border-emerald-300 bg-emerald-50/20' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-zinc-800 bg-zinc-100 border border-zinc-200/80 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                          <Users className="w-3 h-3 text-zinc-500" />
                          <span>{item.who || '自分'}</span>
                        </span>
                        <span className="font-medium text-zinc-500 text-[11px]">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenInterestModal(item)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 rounded cursor-pointer"
                          title="編集"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`興味関心「${item.title}」を削除しますか？`)) {
                              onDeleteInterest(item.id);
                              showToast('興味関心を削除しました');
                            }
                          }}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded cursor-pointer"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Circle Checkbox and Title matching image_c23a9920 */}
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleInterestStatus(item)}
                        className="mt-1 text-zinc-400 hover:text-emerald-600 transition-colors shrink-0 cursor-pointer"
                        title={isArchived ? 'アーカイブを解除して再開' : 'アーカイブ（既読・保管）にする'}
                      >
                        {isArchived ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-400 hover:text-emerald-600" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <h3 className={`text-base font-bold leading-snug ${isArchived ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                          {item.title}
                        </h3>
                        <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line line-clamp-3">
                          {item.description || 'メモはありません。'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <select
                      value={item.status}
                      onChange={(e) => {
                        onUpdateInterest(item.id, { status: e.target.value as InterestStatus });
                        showToast(`ステータスを「${e.target.value}」に変更しました`);
                      }}
                      className="text-xs bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-zinc-700 font-medium"
                    >
                      <option value="Interested">Interested（関心）</option>
                      <option value="Exploring">Exploring（探索中）</option>
                      <option value="Acting">Acting（行動中）</option>
                      <option value="Archived">Archived（保管・既読）</option>
                    </select>

                    <span className="text-zinc-400 tabular-nums">
                      {new Date(item.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredInterests.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-xl border border-dashed border-zinc-200">
                <p className="text-sm text-zinc-500">ストックされている興味関心がありません。</p>
                {archivedInterestsCount > 0 && !showArchivedInterests && (
                  <button
                    type="button"
                    onClick={() => setShowArchivedInterests(true)}
                    className="mt-3 text-xs text-zinc-900 font-semibold underline cursor-pointer"
                  >
                    アーカイブ済みの関心（{archivedInterestsCount}件）を表示する
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 4: Stakeholders                                       */}
      {/* ============================================================== */}
      {activeTab === 'stakeholders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-zinc-50 p-3 rounded-lg border border-zinc-200/60">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900">Stakeholders</span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-600">
                主要な関係者・意思決定者の把握と、各ステークホルダーからの期待値・関心事の管理。
              </span>
            </div>
            <button
              onClick={() => handleOpenStakeholderModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-800 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Stakeholders を追加</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stakeholders.map((st) => (
              <div
                key={st.id}
                className="bg-white rounded-xl p-5 border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col justify-between space-y-4 shadow-2xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-zinc-500 font-medium">{st.relationship}</span>
                      <h3 className="text-base font-bold text-zinc-900 mt-0.5">{st.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenStakeholderModal(st)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 rounded cursor-pointer"
                        title="編集"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Stakeholders「${st.name}」を削除しますか？`)) {
                            onDeleteStakeholder(st.id);
                            showToast('Stakeholders を削除しました');
                          }
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-600 rounded cursor-pointer"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {st.description && <p className="text-xs text-zinc-600">{st.description}</p>}

                  {/* Expectations list */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                      <span>この人物の期待事項（Interests）</span>
                      <button
                        onClick={() => handleOpenAddExpectation(st.id)}
                        className="text-zinc-800 hover:underline flex items-center gap-0.5 text-[11px] font-semibold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>追加</span>
                      </button>
                    </div>

                    {st.interests && st.interests.length > 0 ? (
                      <div className="space-y-2">
                        {st.interests.map((exp) => (
                          <div
                            key={exp.id}
                            className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100 flex items-start justify-between gap-2 text-xs"
                          >
                            <div className="space-y-0.5">
                              <span className={`text-[10px] font-medium ${exp.importance === 'High' ? 'text-rose-600' : 'text-zinc-500'}`}>
                                重要度: {exp.importance}
                              </span>
                              <h4 className="font-semibold text-zinc-900">{exp.title}</h4>
                            </div>
                            <button
                              onClick={() => {
                                if (confirm(`期待事項「${exp.title}」を削除しますか？`)) {
                                  onDeleteStakeholderInterest(exp.id);
                                  showToast('削除しました');
                                }
                              }}
                              className="text-zinc-400 hover:text-rose-600 p-0.5 cursor-pointer"
                              title="削除"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 py-1">期待事項はまだありません</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 text-xs text-zinc-400 flex justify-between">
                  <span>{st.interests?.length || 0} 件の期待事項</span>
                </div>
              </div>
            ))}

            {stakeholders.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-xl border border-dashed border-zinc-200">
                <p className="text-sm text-zinc-500">Stakeholders がまだ登録されていません。</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 5: Decision Logs (独立した意思決定ジャーナル)        */}
      {/* ============================================================== */}
      {activeTab === 'decisions' && (
        <div className="space-y-4">
          {/* 1. Header Bar: Unified with Priorities, Problems, Interests, Stakeholders */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-zinc-50 p-3 rounded-lg border border-zinc-200/60">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900">Decision Logs</span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-600">
                「何を選び、何を捨てたのか」。選択理由とトレードオフの軌跡を蓄積し、後々のブレを防ぐ意思決定ログ。
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleOpenDecisionModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-800 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg shadow-2xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Decision Logs を記録</span>
            </button>
          </div>

          {/* 2. Metrics Bar: Clean Light Theme */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3.5 border border-zinc-200 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-zinc-500 block text-[11px] font-medium">総意思決定数</span>
                <span className="text-base font-bold text-zinc-900 font-mono mt-0.5 block">{decisionLogs.length}件</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                <BookmarkCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-zinc-200 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-zinc-500 block text-[11px] font-medium">Priorities と連携</span>
                <span className="text-base font-bold text-zinc-900 font-mono mt-0.5 block">{linkedDecisionsCount}件</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Compass className="w-4 h-4 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-zinc-200 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-zinc-500 block text-[11px] font-medium">期待成果・検証済み</span>
                <span className="text-base font-bold text-emerald-700 font-mono mt-0.5 block">{withOutcomeDecisionsCount}件</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* 3. Input Slot Card: Consistent with Priorities empty slot input feel */}
          <div
            onClick={() => handleOpenDecisionModal()}
            className="bg-white hover:bg-zinc-50 rounded-xl border border-dashed border-zinc-300 hover:border-zinc-400 p-4 transition-all cursor-pointer shadow-2xs group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center text-zinc-600 transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-800 group-hover:text-zinc-950">
                  新しい Decision Logs を記録する
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  決定事項、捨てた選択肢（トレードオフ）、判断理由を入力
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-800 bg-white group-hover:bg-zinc-100 border border-zinc-200 rounded-lg shadow-2xs transition-colors">
              <Plus className="w-3.5 h-3.5" />
              <span>入力する</span>
            </span>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="決定内容、トレードオフ理由、期待結果で検索..."
                  value={decisionSearch}
                  onChange={(e) => setDecisionSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <select
                  value={decisionPriorityFilter}
                  onChange={(e) => setDecisionPriorityFilter(e.target.value)}
                  className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-700 font-medium"
                >
                  <option value="all">すべての Decision Logs</option>
                  <option value="linked">Priorities 連携ありのみ</option>
                  {priorities.map((p) => (
                    <option key={p.id} value={p.id}>
                      Priorities: {p.title.slice(0, 20)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <span className="text-xs text-zinc-500 font-mono font-medium self-end sm:self-auto">
              表示中: {filteredDecisionLogs.length} / {decisionLogs.length} 件
            </span>
          </div>

          {/* Decision Stream Timeline Visualization */}
          <div className="relative pl-6 sm:pl-10 space-y-6 before:absolute before:top-3 before:bottom-3 before:left-3 sm:before:left-4 before:w-0.5 before:bg-zinc-200">
            {filteredDecisionLogs.map((log, idx) => {
              const linkedPriority = priorities.find((p) => p.id === log.priority_id);
              const decisionDate = new Date(log.created_at);

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Pin Node */}
                  <div className="absolute -left-6 sm:-left-10 top-5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-zinc-300 group-hover:border-zinc-900 text-zinc-700 group-hover:text-zinc-900 flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold shadow-xs transition-colors">
                    {idx + 1}
                  </div>

                  {/* Main Decision Journal Card */}
                  <div className="bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 transition-all p-5 sm:p-6 shadow-2xs space-y-4">
                    {/* Header Row: Date, Badge, Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded">
                          DECISION #{String(idx + 1).padStart(2, '0')}
                        </span>

                        <span className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span>
                            {decisionDate.toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </span>

                        {linkedPriority && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                            <Compass className="w-3 h-3 text-blue-600" />
                            <span className="truncate max-w-[200px]">直結: {linkedPriority.title}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenDecisionModal(log)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                          title="編集"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteDecisionLog && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Decision Logs「${log.decision}」を削除しますか？`)) {
                                onDeleteDecisionLog(log.id);
                              }
                            }}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Decision Statement (The Chosen Action) */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                        決定事項 (The Choice)
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug">
                        {log.decision}
                      </h3>
                    </div>

                    {/* Rationale & Trade-offs (What was sacrificed) */}
                    <div className="bg-zinc-50/90 rounded-xl p-4 border border-zinc-200/80 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                        <span>判断の理由とトレードオフ（何を捨て、何を選んだか）</span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed whitespace-pre-line pl-3 border-l-2 border-zinc-300">
                        {log.reason}
                      </p>
                    </div>

                    {/* Expected Outcome / Verification Points (If recorded) */}
                    {log.outcome && (
                      <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-200/70 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>期待結果・事後検証</span>
                        </div>
                        <p className="text-xs text-emerald-800 leading-relaxed pl-5">
                          {log.outcome}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredDecisionLogs.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 mx-auto">
                  <BookmarkCheck className="w-6 h-6 text-zinc-500" />
                </div>
                <h4 className="text-sm font-bold text-zinc-900">
                  {decisionSearch ? '検索条件に一致する意思決定がありません' : 'まだ Decision Logs がありません'}
                </h4>
                <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                  トレードオフのない選択は意思決定ではありません。「何を捨てたのか」を1行残すことで、後々のブレを防ぎます。
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenDecisionModal()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer mt-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>最初の Decision Logs を記録</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ALL MODALS --- */}
      {/* 1. Priority Modal */}
      {isPriorityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-zinc-900">
                {editingPriority ? 'Priorities の編集' : 'Priorities の登録'}
              </h3>
              <button onClick={() => setIsPriorityModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePriority} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Priorities のタイトル <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 見込み顧客10社へ直接アプローチしヒアリング"
                  value={priorityForm.title}
                  onChange={(e) => setPriorityForm({ ...priorityForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  なぜ最優先にするのか (Reason) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="明確な選択の理由を記入"
                  value={priorityForm.reason}
                  onChange={(e) => setPriorityForm({ ...priorityForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">関連する Problems</label>
                <select
                  value={priorityForm.challenge_id}
                  onChange={(e) => setPriorityForm({ ...priorityForm, challenge_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
                >
                  <option value="">-- 紐付ける Problems を選択 --</option>
                  {challenges.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.importance}] {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsPriorityModalOpen(false)} className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer">
                  キャンセル
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg cursor-pointer">
                  {editingPriority ? '更新する' : '登録する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Challenge Modal */}
      {isChallengeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-zinc-900">{editingChallenge ? 'Problems の編集' : 'Problems の登録'}</h3>
              <button onClick={() => setIsChallengeModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveChallenge} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Problems タイトル <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="例: 新規顧客の獲得チャネルが不安定"
                  value={challengeForm.title}
                  onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">詳細・背景</label>
                <textarea
                  rows={3}
                  value={challengeForm.description}
                  onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">重要度</label>
                  <select
                    value={challengeForm.importance}
                    onChange={(e) => setChallengeForm({ ...challengeForm, importance: e.target.value as ImportanceLevel })}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
                  >
                    <option value="High">High (最重要)</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">ステータス</label>
                  <select
                    value={challengeForm.status}
                    onChange={(e) => setChallengeForm({ ...challengeForm, status: e.target.value as ChallengeStatus })}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved（解決済・アーカイブ）</option>
                  </select>
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsChallengeModalOpen(false)} className="px-4 py-2 text-xs font-medium text-zinc-600 cursor-pointer">キャンセル</button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg cursor-pointer">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Interest Modal */}
      {isInterestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-zinc-900">{editingInterest ? 'Interests の編集' : 'Interests をストック'}</h3>
              <button onClick={() => setIsInterestModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveInterest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Interests のタイトル <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="例: AIエージェントを活用した自己マネジメント"
                  value={interestForm.title}
                  onChange={(e) => setInterestForm({ ...interestForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  誰の関心・期待か（who / Stakeholders）
                </label>
                <input
                  type="text"
                  placeholder="例: 自分, クライアントA社, チーム, 経営陣"
                  value={interestForm.who}
                  onChange={(e) => setInterestForm({ ...interestForm, who: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {['自分', 'クライアント', 'チーム', '経営陣/役員', 'パートナー'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInterestForm({ ...interestForm, who: s })}
                      className="px-2 py-0.5 text-[11px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">詳細・メモ</label>
                <textarea
                  rows={2}
                  placeholder="背景や期待される成果など"
                  value={interestForm.description}
                  onChange={(e) => setInterestForm({ ...interestForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">カテゴリー</label>
                  <input
                    type="text"
                    value={interestForm.category}
                    onChange={(e) => setInterestForm({ ...interestForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">ステータス</label>
                  <select
                    value={interestForm.status}
                    onChange={(e) => setInterestForm({ ...interestForm, status: e.target.value as InterestStatus })}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
                  >
                    <option value="Interested">Interested（関心）</option>
                    <option value="Exploring">Exploring（探索中）</option>
                    <option value="Acting">Acting（行動中）</option>
                    <option value="Archived">Archived（保管・既読）</option>
                  </select>
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsInterestModalOpen(false)} className="px-4 py-2 text-xs font-medium text-zinc-600 cursor-pointer">キャンセル</button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg cursor-pointer">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Decision Log Modal */}
      {isDecisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4 text-zinc-800" />
                <h3 className="text-base font-bold text-zinc-900">
                  {editingDecision ? 'Decision Logs の編集' : 'Decision Logs の記録'}
                </h3>
              </div>
              <button onClick={() => setIsDecisionModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDecision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  決定したこと (Decision) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 受託開発の新規単発案件の引き受けを今期は完全凍結する"
                  value={decisionForm.decision}
                  onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none placeholder:text-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  判断の理由・トレードオフ (Reason & Trade-offs) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="例: 目先の売上より自社プロダクトのMRR立ち上げに時間を割くため。何を捨て、何を選んだのか。"
                  value={decisionForm.reason}
                  onChange={(e) => setDecisionForm({ ...decisionForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none placeholder:text-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  関連する Priorities
                </label>
                <select
                  value={decisionForm.priority_id}
                  onChange={(e) => setDecisionForm({ ...decisionForm, priority_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                >
                  <option value="">-- 紐付けなし（独立した戦略判断） --</option>
                  {priorities.map((p) => (
                    <option key={p.id} value={p.id}>
                      Priorities: {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  期待結果・事後検証 (Expected Outcome / Reflection)
                </label>
                <input
                  type="text"
                  placeholder="例: 週に15時間の自社開発時間を確保し、初期顧客獲得に充てる"
                  value={decisionForm.outcome}
                  onChange={(e) => setDecisionForm({ ...decisionForm, outcome: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none placeholder:text-zinc-400"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm cursor-pointer"
                >
                  {editingDecision ? '更新する' : '記録する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Stakeholder Modal */}
      {isStakeholderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-zinc-900">{editingStakeholder ? 'Stakeholders の編集' : 'Stakeholders の登録'}</h3>
              <button onClick={() => setIsStakeholderModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveStakeholder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">お名前・組織名 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={stakeholderForm.name}
                  onChange={(e) => setStakeholderForm({ ...stakeholderForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">関係性</label>
                <select
                  value={stakeholderForm.relationship}
                  onChange={(e) => setStakeholderForm({ ...stakeholderForm, relationship: e.target.value as StakeholderRelationship })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
                >
                  <option value="Customer">Customer（顧客・クライアント）</option>
                  <option value="Partner">Partner（パートナー・投資家）</option>
                  <option value="Family">Family（家族・生活）</option>
                  <option value="Colleague">Colleague（同僚）</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsStakeholderModalOpen(false)} className="px-4 py-2 text-xs font-medium text-zinc-600 cursor-pointer">キャンセル</button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg cursor-pointer">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Expectation Modal */}
      {isExpectationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-zinc-900">期待事項の追加</h3>
              <button onClick={() => setIsExpectationModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveExpectation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">相手が期待していること <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="例: 売上拡大、納期短縮、週末の家族時間"
                  value={expectationForm.title}
                  onChange={(e) => setExpectationForm({ ...expectationForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">重要度</label>
                <select
                  value={expectationForm.importance}
                  onChange={(e) => setExpectationForm({ ...expectationForm, importance: e.target.value as ImportanceLevel })}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsExpectationModalOpen(false)} className="px-4 py-2 text-xs font-medium text-zinc-600 cursor-pointer">キャンセル</button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg cursor-pointer">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
