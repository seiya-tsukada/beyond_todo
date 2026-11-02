import React, { useState } from 'react';
import {
  Sparkles,
  HelpCircle,
  TrendingDown,
  Scale,
  RefreshCw,
  Send,
  MessageSquare,
  Compass,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { AIInsight, DashboardOverview } from '../types/index.ts';
import { useToast } from './Toast.tsx';

interface InsightsViewProps {
  insights: AIInsight[];
  overview: DashboardOverview | null;
  onRefreshInsights: (query?: string) => Promise<void>;
  isLoading: boolean;
}

export function InsightsView({
  insights,
  overview,
  onRefreshInsights,
  isLoading,
}: InsightsViewProps) {
  const [userQuery, setUserQuery] = useState('');
  const { showToast } = useToast();

  const handleSendQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;
    try {
      await onRefreshInsights(userQuery.trim());
      showToast('AIパートナーがデータを再分析しました');
      setUserQuery('');
    } catch (err: any) {
      showToast(err.message || '分析に失敗しました', 'error');
    }
  };

  const handleQuickPrompt = async (prompt: string) => {
    try {
      await onRefreshInsights(prompt);
      showToast(`「${prompt}」の観点で再分析しました`);
    } catch (err: any) {
      showToast(err.message || '分析に失敗しました', 'error');
    }
  };

  // Metrics from overview
  const totalStakeholderExpectations = overview?.stakeholders.reduce(
    (sum, s) => sum + (s.interests?.length || 0),
    0
  ) || 0;
  const actingInterests = overview?.interests.filter((i) => i.status === 'Acting').length || 0;
  const exploringInterests = overview?.interests.filter((i) => i.status === 'Exploring').length || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-800 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-semibold">AI Reflection Partner (Powered by Gemini 3.8 Flash)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            AI Insights - 行動の偏りと自己決定の可視化
          </h1>
          <p className="text-sm text-zinc-600 mt-1 max-w-3xl leading-relaxed">
            課題・優先事項・好奇心・他者の期待・過去の振り返りを統合分析し、無自覚な偏りや放置された重要関心に光を当てます。
          </p>
        </div>

        <button
          onClick={() => onRefreshInsights()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-800 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? '分析中...' : '最新データで再分析'}</span>
        </button>
      </div>

      {/* Bias Radar: Balance Between Self vs Others */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200 space-y-4">
        <h2 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
          <Scale className="w-4 h-4 text-zinc-700" />
          <span>自己の好奇心 vs 他者の期待の配分バランス</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2">
            <span className="text-xs text-zinc-500">自分の興味関心（行動中/探究中）</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-zinc-900 tabular-nums">
                {actingInterests + exploringInterests}
              </span>
              <span className="text-xs text-zinc-500">件（全{overview?.interests.length || 0}件中）</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              内発的動機に基づく純粋なアイデア・好奇心の活動量
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2">
            <span className="text-xs text-zinc-500">他者からの期待・要望事項</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-zinc-900 tabular-nums">
                {totalStakeholderExpectations}
              </span>
              <span className="text-xs text-zinc-500">件（{overview?.stakeholders.length || 0}名から）</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              顧客・パートナー・周囲からの外発的な期待値の総量
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2">
            <span className="text-xs text-amber-900 font-semibold">AIによるバランス診断</span>
            <div className="text-sm font-bold text-zinc-900">
              {totalStakeholderExpectations > (actingInterests + exploringInterests) * 1.5
                ? '外圧優位（他者対応に時間偏重の兆候）'
                : '均衡（自己の意思と他者配慮が調和）'}
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {totalStakeholderExpectations > (actingInterests + exploringInterests) * 1.5
                ? '外部の期待に真面目に応えるあまり、自分の知的好奇心への投資が減速しています。'
                : '自己の探究と周囲の期待のバランスが保たれています。'}
            </p>
          </div>
        </div>
      </div>

      {/* AI Insights Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span className="font-semibold text-zinc-900">構造化インサイト ({insights.length} 件)</span>
          <span>決めつけず、問いと選択肢を提供します</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="bg-white rounded-xl p-6 border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col justify-between space-y-4 shadow-2xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                    {insight.tag}
                  </span>
                  <span className="text-zinc-400 font-mono text-[11px]">
                    {new Date(insight.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>

                <h3 className="text-base font-bold text-zinc-900 leading-snug">
                  {insight.title}
                </h3>

                <p className="text-xs text-zinc-600 leading-relaxed">
                  {insight.message}
                </p>

                {/* Question */}
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100 text-xs text-zinc-800 space-y-1">
                  <span className="font-semibold text-zinc-900 block flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
                    <span>内省の問い（Reflective Question）:</span>
                  </span>
                  <p className="text-zinc-700 italic pl-5 leading-relaxed">{insight.question}</p>
                </div>
              </div>

              {/* Recommendation */}
              <div className="pt-3 border-t border-zinc-100 text-xs">
                <div className="flex items-start gap-2 text-emerald-800">
                  <span className="font-bold shrink-0">推奨アクション:</span>
                  <p className="text-zinc-700 leading-snug">{insight.recommendation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive AI Query / Reflection Partner Console */}
      <div className="bg-white rounded-xl p-6 sm:p-8 border border-zinc-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2">
          <MessageSquare className="w-4 h-4 text-zinc-700" />
          <h2 className="text-sm font-bold text-zinc-900">
            Beyond AI との対話的セッション（壁打ち）
          </h2>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">
          「来週の優先事項を何に絞るべきか」「クライアントの追加依頼をどう断るか」など、気になる悩みや状況を投げかけると、あなたの登録データをもとに多角的な視点を返します。
        </p>

        {/* Quick prompt buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-400">クイック問いかけ:</span>
          {[
            '他者の期待に引きずられていないか詳しく見てほしい',
            '最重要課題を前進させるための来週の優先事項を提案して',
            '放置されている興味関心の再活性化プランは？',
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleQuickPrompt(prompt)}
              className="text-xs text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input box */}
        <form onSubmit={handleSendQuery} className="flex gap-3 pt-2">
          <input
            type="text"
            placeholder="AIパートナーに質問や内省したいことを入力..."
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            className="flex-1 px-4 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-1 focus:ring-zinc-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !userQuery.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm cursor-pointer disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>壁打ちする</span>
          </button>
        </form>
      </div>
    </div>
  );
}
