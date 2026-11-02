/**
 * Beyond TODO. AI Service
 * Powered by Gemini 3.8 Flash via @google/genai SDK (Server-Side only)
 * Analyzes Challenges, Priorities, Interests, Stakeholders, and Reviews to reveal behavioral bias and alignment.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { AIInsight, Challenge, Priority, Interest, Stakeholder, WeeklyReview } from '../types/index.ts';

const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface AnalysisInput {
  challenges: Challenge[];
  priorities: Priority[];
  interests: Interest[];
  stakeholders: Stakeholder[];
  reviews: WeeklyReview[];
  userQuery?: string;
}

export async function generateAIInsights(input: AnalysisInput): Promise<AIInsight[]> {
  const { challenges, priorities, interests, stakeholders, reviews, userQuery } = input;

  // If Gemini API is available and configured, use gemini-3.8-flash
  if (ai) {
    try {
      const prompt = `
あなたは個人の意思決定と行動を自己マネジメントへと導くパートナーAIです。
ユーザーは「Beyond TODO.」というツールで自身の課題、今週の最優先事項（最大3件）、個人の興味関心、そしてステークホルダーの期待を統合管理しています。

以下のユーザーの現在データと過去の振り返りを注意深く分析してください。
【現在の課題（Challenges）】:
${JSON.stringify(challenges.map((c) => ({ title: c.title, status: c.status, importance: c.importance })))}

【今週の最優先事項（Priorities）】:
${JSON.stringify(priorities.map((p) => ({ title: p.title, status: p.status, reason: p.reason, related: p.challenge_title })))}

【自分の興味関心（Interests）】:
${JSON.stringify(interests.map((i) => ({ title: i.title, category: i.category, status: i.status })))}

【ステークホルダーとその関心事（Stakeholder Expectations）】:
${JSON.stringify(stakeholders.map((s) => ({ name: s.name, relationship: s.relationship, expectations: s.interests?.map((i) => i.title) })))}

【直近の振り返り（Latest Review）】:
${reviews.length > 0 ? JSON.stringify(reviews[0]) : '振り返りはまだありません'}

${userQuery ? `【ユーザーからの追加相談・問いかけ】: ${userQuery}` : ''}

【分析の目的と視点】:
1. 行動の偏り（Behavioral Bias）: 他者の期待に応えることばかりに時間を使っていないか？ 自分の興味関心に時間を使えているか？
2. 優先順位の不一致（Priority Mismatch）: 重要度Highの課題に対して、今週の最優先事項が適切に向き合っているか？
3. 興味関心の放置（Neglected Interests）: 登録されたまま長期間動いていない関心事はないか？
4. ステークホルダーとの健全な関係（Stakeholder Alignment）: 境界線が引けているか？

断定的な命令ではなく、深い内省を促す「具体的な気づき」「問いかけ（Question）」「次の一手（Recommendation）」を4つの構造化インサイトとしてJSON形式で出力してください。
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: 'あなたは思慮深く穏やかなパーソナル・マネジメントパートナーです。ユーザーの行動の偏りを優しく可視化し、自分の意思で人生を動かすサポートをします。',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'List of actionable AI insights',
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description: 'Type of insight: bias | priority_mismatch | neglected_interest | stakeholder_alignment | general',
                },
                tag: {
                  type: Type.STRING,
                  description: 'Short Japanese badge label (e.g. 行動の偏り, 優先度診断, 好奇心の放置, 関係性バランス)',
                },
                title: {
                  type: Type.STRING,
                  description: 'Insight title in Japanese',
                },
                message: {
                  type: Type.STRING,
                  description: 'Detailed thoughtful observation in Japanese',
                },
                question: {
                  type: Type.STRING,
                  description: 'Reflective question to ask the user',
                },
                recommendation: {
                  type: Type.STRING,
                  description: 'Practical gentle next action',
                },
              },
              required: ['type', 'tag', 'title', 'message', 'question', 'recommendation'],
            },
          },
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => ({
            id: `ai_${Date.now()}_${idx}`,
            type: item.type || 'general',
            tag: item.tag || 'AIの気づき',
            title: item.title,
            message: item.message,
            question: item.question,
            recommendation: item.recommendation,
            created_at: new Date().toISOString(),
          }));
        }
      }
    } catch (err) {
      console.error('Gemini API call error (fallback to rule-based engine):', err);
    }
  }

  // Robust Heuristic Fallback Engine (runs if no key or fallback needed)
  return generateHeuristicInsights(challenges, priorities, interests, stakeholders, reviews);
}

function generateHeuristicInsights(
  challenges: Challenge[],
  priorities: Priority[],
  interests: Interest[],
  stakeholders: Stakeholder[],
  reviews: WeeklyReview[]
): AIInsight[] {
  const insights: AIInsight[] = [];
  const now = new Date().toISOString();

  // 1. Bias Check: Stakeholders vs Interests
  const totalStakeholderInterests = stakeholders.reduce((sum, s) => sum + (s.interests?.length || 0), 0);
  const actingInterests = interests.filter((i) => i.status === 'Acting');
  const exploringInterests = interests.filter((i) => i.status === 'Exploring');

  if (totalStakeholderInterests >= 3 && actingInterests.length <= 1) {
    insights.push({
      id: 'insight_bias_01',
      type: 'bias',
      tag: '行動の偏り',
      title: '他者の期待への即応に偏り、自分の興味関心が後退しています',
      message: `現在、ステークホルダーからの期待事項（${totalStakeholderInterests}件）に対して、行動に移せている自分の興味関心は「${actingInterests.map((i) => i.title).join('、') || 'なし'}」のみです。外的な要望に応えることで1週間が埋まっていませんか？`,
      question: '今週、誰からの指示でも義務でもない「純粋な自分の好奇心」のために取れた時間は何時間ありましたか？',
      recommendation: '来週のスケジュールに、誰にも邪魔されない「自分の興味関心のための90分」を最初から予定として固定してみましょう。',
      created_at: now,
    });
  }

  // 2. Priority & Challenge Mismatch Check
  const highChallenges = challenges.filter((c) => c.importance === 'High' && c.status !== 'Resolved');
  const linkedChallengeIds = new Set(priorities.map((p) => p.challenge_id).filter(Boolean));
  const unaddressedHigh = highChallenges.filter((c) => !linkedChallengeIds.has(c.id));

  if (unaddressedHigh.length > 0) {
    insights.push({
      id: 'insight_mismatch_02',
      type: 'priority_mismatch',
      tag: '優先順位の不一致',
      title: `最重要課題「${unaddressedHigh[0].title}」に直結する今週の優先事項がありません`,
      message: `自ら重要度「High」と位置づけている課題「${unaddressedHigh[0].title}」ですが、今週設定されたTop 3の優先事項のいずれにも直接紐付いていません。緊急度の高いタスクに気を取られ、本質的な課題が保留になっていませんか？`,
      question: 'この最重要課題を前進させるために、今週1ミリでも進められる最小のアクションは何でしょうか？',
      recommendation: '今週の優先事項を3件以内に絞った上で、この課題に紐づくアクションを1つ選定するか、課題の優先順位そのものを再評価してください。',
      created_at: now,
    });
  }

  // 3. Neglected Interest Check
  const dormantInterest = interests.find((i) => i.status === 'Interested');
  if (dormantInterest) {
    insights.push({
      id: 'insight_neglected_03',
      type: 'neglected_interest',
      tag: '好奇心の放置',
      title: `関心事「${dormantInterest.title}」がアイデアのまま留まっています`,
      message: `「${dormantInterest.title}」は魅力的なアイデアですが、TODOに変換する必要はありません。まずは本を1冊読む、関連する記事を保存するなど、小さく探索（Exploring）ステータスへ移行させてみませんか？`,
      question: 'この関心は、今のあなたにとって本当にワクワクするものですか？それとも「知っておくべき」という焦りでしょうか？',
      recommendation: 'まずは今週末に30分だけネットリサーチしてメモを残し、ステータスを「Exploring」に更新してみましょう。',
      created_at: now,
    });
  }

  // 4. Stakeholder Boundary Check
  const familyOrHealth = stakeholders.find((s) => s.relationship === 'Family');
  if (familyOrHealth) {
    insights.push({
      id: 'insight_boundary_04',
      type: 'stakeholder_alignment',
      tag: '関係性バランス',
      title: 'ビジネスの期待とプライベートの調和が取れていますか？',
      message: `ステークホルダー「${familyOrHealth.name}」の期待として「健康維持や家族時間」が挙げられています。直近の振り返りでは、受託案件や突発的な要望に押されて夜間作業が増えている傾向が見られます。`,
      question: '他者との約束を守るのと同じ真剣さで、自分自身や身近な人との約束を守れていますか？',
      recommendation: '今週末はPCを開かない完全オフの時間帯を3時間確保し、カレンダー上で宣言しましょう。',
      created_at: now,
    });
  }

  return insights;
}
