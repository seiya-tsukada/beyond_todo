"""AI insights: Gemini when configured, otherwise a rule-based engine."""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel

from ..config import get_settings

logger = logging.getLogger(__name__)

Row = dict[str, Any]

SYSTEM_INSTRUCTION = (
    "あなたは思慮深く穏やかなパーソナル・マネジメントパートナーです。"
    "ユーザーの行動の偏りを優しく可視化し、自分の意思で人生を動かすサポートをします。"
)


@dataclass
class AnalysisInput:
    challenges: list[Row]
    priorities: list[Row]
    interests: list[Row]
    stakeholders: list[Row]
    reviews: list[Row]
    user_query: str | None = None


class _InsightDraft(BaseModel):
    type: str
    tag: str
    title: str
    message: str
    question: str
    recommendation: str


def generate_insights(data: AnalysisInput, *, use_ai: bool) -> list[Row]:
    if use_ai and get_settings().gemini_api_key:
        try:
            insights = _generate_with_gemini(data)
            if insights:
                return insights
        except Exception:
            logger.exception("Gemini call failed; falling back to rule-based insights")
    return _generate_heuristic(data)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _dump(items: list[Row], keys: tuple[str, ...]) -> str:
    return json.dumps([{k: item.get(k) for k in keys} for item in items], ensure_ascii=False, default=str)


def _build_prompt(data: AnalysisInput) -> str:
    stakeholders = json.dumps(
        [
            {
                "name": s["name"],
                "relationship": s["relationship"],
                "expectations": [i["title"] for i in s.get("interests", [])],
            }
            for s in data.stakeholders
        ],
        ensure_ascii=False,
    )
    latest_review = (
        json.dumps(data.reviews[0], ensure_ascii=False, default=str) if data.reviews else "振り返りはまだありません"
    )
    query = f"【ユーザーからの追加相談・問いかけ】: {data.user_query}" if data.user_query else ""
    return f"""
あなたは個人の意思決定と行動を自己マネジメントへと導くパートナーAIです。
ユーザーは「Beyond TODO.」というツールで自身の課題、今週の最優先事項、個人の興味関心、そしてステークホルダーの期待を統合管理しています。

以下のユーザーの現在データと過去の振り返りを注意深く分析してください。
【現在の課題（Challenges）】:
{_dump(data.challenges, ("title", "status", "importance"))}

【今週の最優先事項（Priorities）】:
{_dump(data.priorities, ("title", "status", "reason", "challenge_title"))}

【自分の興味関心（Interests）】:
{_dump(data.interests, ("title", "category", "status"))}

【ステークホルダーとその関心事（Stakeholder Expectations）】:
{stakeholders}

【直近の振り返り（Latest Review）】:
{latest_review}

{query}

【分析の目的と視点】:
1. 行動の偏り（Behavioral Bias）: 他者の期待に応えることばかりに時間を使っていないか？ 自分の興味関心に時間を使えているか？
2. 優先順位の不一致（Priority Mismatch）: 重要度Highの課題に対して、今週の最優先事項が適切に向き合っているか？
3. 興味関心の放置（Neglected Interests）: 登録されたまま長期間動いていない関心事はないか？
4. ステークホルダーとの健全な関係（Stakeholder Alignment）: 境界線が引けているか？

断定的な命令ではなく、深い内省を促す「具体的な気づき」「問いかけ（question）」「次の一手（recommendation）」を4つの構造化インサイトとしてJSON形式で出力してください。
type は bias | priority_mismatch | neglected_interest | stakeholder_alignment | general のいずれか、
tag は短い日本語ラベル（例: 行動の偏り, 優先度診断, 好奇心の放置, 関係性バランス）としてください。
"""


def _generate_with_gemini(data: AnalysisInput) -> list[Row]:
    from google import genai
    from google.genai import types

    settings = get_settings()
    client = genai.Client(api_key=settings.gemini_api_key)
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=_build_prompt(data),
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=list[_InsightDraft],
        ),
    )
    drafts = [_InsightDraft.model_validate(item) for item in json.loads(response.text or "[]")]
    now = _now()
    return [{"id": f"ai_{uuid.uuid4().hex[:12]}", **d.model_dump(), "created_at": now} for d in drafts]


def _generate_heuristic(data: AnalysisInput) -> list[Row]:
    insights: list[Row] = []
    now = _now()

    # 1. Bias: stakeholder expectations vs. own interests in action
    total_expectations = sum(len(s.get("interests", [])) for s in data.stakeholders)
    acting = [i for i in data.interests if i["status"] == "Acting"]
    if total_expectations >= 3 and len(acting) <= 1:
        acting_titles = "、".join(i["title"] for i in acting) or "なし"
        insights.append(
            {
                "id": "insight_bias",
                "type": "bias",
                "tag": "行動の偏り",
                "title": "他者の期待への即応に偏り、自分の興味関心が後退しています",
                "message": f"現在、ステークホルダーからの期待事項（{total_expectations}件）に対して、行動に移せている自分の興味関心は「{acting_titles}」のみです。外的な要望に応えることで1週間が埋まっていませんか？",
                "question": "今週、誰からの指示でも義務でもない「純粋な自分の好奇心」のために取れた時間は何時間ありましたか？",
                "recommendation": "来週のスケジュールに、誰にも邪魔されない「自分の興味関心のための90分」を最初から予定として固定してみましょう。",
                "created_at": now,
            }
        )

    # 2. High-importance challenge without a linked priority
    linked = {p.get("challenge_id") for p in data.priorities if p.get("challenge_id")}
    unaddressed = [
        c for c in data.challenges if c["importance"] == "High" and c["status"] != "Resolved" and c["id"] not in linked
    ]
    if unaddressed:
        title = unaddressed[0]["title"]
        insights.append(
            {
                "id": "insight_mismatch",
                "type": "priority_mismatch",
                "tag": "優先順位の不一致",
                "title": f"最重要課題「{title}」に直結する今週の優先事項がありません",
                "message": f"自ら重要度「High」と位置づけている課題「{title}」ですが、今週設定された優先事項のいずれにも直接紐付いていません。緊急度の高いタスクに気を取られ、本質的な課題が保留になっていませんか？",
                "question": "この最重要課題を前進させるために、今週1ミリでも進められる最小のアクションは何でしょうか？",
                "recommendation": "今週の優先事項を絞り込んだ上で、この課題に紐づくアクションを1つ選定するか、課題の優先順位そのものを再評価してください。",
                "created_at": now,
            }
        )

    # 3. Interest still only an idea
    dormant = next((i for i in data.interests if i["status"] == "Interested"), None)
    if dormant:
        title = dormant["title"]
        insights.append(
            {
                "id": "insight_neglected",
                "type": "neglected_interest",
                "tag": "好奇心の放置",
                "title": f"関心事「{title}」がアイデアのまま留まっています",
                "message": f"「{title}」は魅力的なアイデアですが、TODOに変換する必要はありません。まずは本を1冊読む、関連する記事を保存するなど、小さく探索（Exploring）ステータスへ移行させてみませんか？",
                "question": "この関心は、今のあなたにとって本当にワクワクするものですか？それとも「知っておくべき」という焦りでしょうか？",
                "recommendation": "まずは今週末に30分だけネットリサーチしてメモを残し、ステータスを「Exploring」に更新してみましょう。",
                "created_at": now,
            }
        )

    # 4. Work / private life boundary
    family = next((s for s in data.stakeholders if s["relationship"] == "Family"), None)
    if family:
        insights.append(
            {
                "id": "insight_boundary",
                "type": "stakeholder_alignment",
                "tag": "関係性バランス",
                "title": "ビジネスの期待とプライベートの調和が取れていますか？",
                "message": f"ステークホルダー「{family['name']}」も、あなたの大切な関係者です。仕事の要望に押されて、身近な人との時間や自分の健康が後回しになっていないか振り返ってみましょう。",
                "question": "他者との約束を守るのと同じ真剣さで、自分自身や身近な人との約束を守れていますか？",
                "recommendation": "今週末はPCを開かない完全オフの時間帯を3時間確保し、カレンダー上で宣言しましょう。",
                "created_at": now,
            }
        )

    return insights
