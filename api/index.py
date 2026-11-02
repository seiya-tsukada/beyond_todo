"""
Beyond TODO. Python Backend & Data Handling Layer for Vercel Serverless
Provides complete REST API endpoints and in-memory data store for the Beyond TODO app.
"""

from fastapi import FastAPI, HTTPException, Header, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import threading
import uuid
import os
import json

app = FastAPI(
    title="Beyond TODO. API",
    description="Python data handling layer and API for Beyond TODO. personal management tool.",
    version="1.0.0",
)

# Enable CORS for local Vite and Vercel domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper Functions ---
def get_current_week_string() -> str:
    now = datetime.now()
    year = now.year
    first_day = datetime(year, 1, 1)
    past_days = (now - first_day).days
    week_num = int((past_days + first_day.weekday() + 1) / 7) + 1
    return f"{year}-W{week_num:02d}"

def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

# --- Pydantic Models ---
class UserModel(BaseModel):
    id: str
    email: str
    name: str
    title: str = "Founder"
    email_verified_at: Optional[str] = None
    created_at: str

class LoginRequest(BaseModel):
    email: Optional[str] = "founder@beyondtodo.app"
    password: Optional[str] = "password"

class RegisterRequest(BaseModel):
    email: str
    name: str
    title: Optional[str] = "Individual"

class ChallengeModel(BaseModel):
    id: str
    user_id: str
    title: str
    description: str = ""
    status: str = "Open"  # 'Open' | 'In Progress' | 'Resolved'
    importance: str = "High"  # 'High' | 'Medium' | 'Low'
    created_at: str
    updated_at: str

class ChallengeCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "Open"
    importance: Optional[str] = "High"

class ChallengeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    importance: Optional[str] = None

class PriorityModel(BaseModel):
    id: str
    user_id: str
    challenge_id: Optional[str] = None
    challenge_title: Optional[str] = None
    title: str
    description: str = ""
    reason: str = ""
    status: str = "Not Started"  # 'Not Started' | 'In Progress' | 'Completed'
    target_week: str
    created_at: str
    updated_at: str

class PriorityCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    reason: Optional[str] = ""
    status: Optional[str] = "Not Started"
    target_week: Optional[str] = None
    challenge_id: Optional[str] = None

class PriorityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[str] = None
    challenge_id: Optional[str] = None
    target_week: Optional[str] = None

class InterestModel(BaseModel):
    id: str
    user_id: str
    title: str
    description: str = ""
    category: str = "General"
    status: str = "Interested"  # 'Interested' | 'Exploring' | 'Acting' | 'Archived'
    who: Optional[str] = "自分"
    created_at: str
    updated_at: str

class InterestCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "General"
    status: Optional[str] = "Interested"
    who: Optional[str] = "自分"

class InterestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    who: Optional[str] = None

class StakeholderModel(BaseModel):
    id: str
    user_id: str
    name: str
    relationship: str = "Customer"
    description: str = ""
    created_at: str
    updated_at: str

class StakeholderCreate(BaseModel):
    name: str
    relationship: Optional[str] = "Customer"
    description: Optional[str] = ""

class StakeholderUpdate(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    description: Optional[str] = None

class StakeholderInterestModel(BaseModel):
    id: str
    user_id: str
    stakeholder_id: str
    stakeholder_name: str
    title: str
    description: str = ""
    importance: str = "High"
    status: str = "Active"
    created_at: str
    updated_at: str

class StakeholderInterestCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    importance: Optional[str] = "High"
    status: Optional[str] = "Active"

class QuickMemoModel(BaseModel):
    id: str
    user_id: str
    content: str
    tags: List[str] = []
    converted_to: Optional[str] = None
    created_at: str

class QuickMemoCreate(BaseModel):
    content: str
    tags: Optional[List[str]] = []

class QuickMemoUpdate(BaseModel):
    content: Optional[str] = None
    tags: Optional[List[str]] = None

class MemoConvertRequest(BaseModel):
    targetType: str  # 'challenge' | 'priority' | 'interest' | 'stakeholder'
    title: Optional[str] = None
    description: Optional[str] = None
    reason: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    importance: Optional[str] = None
    stakeholder_id: Optional[str] = None

class AutoStockRequest(BaseModel):
    memo_ids: Optional[List[str]] = None

class DecisionLogModel(BaseModel):
    id: str
    user_id: str
    priority_id: Optional[str] = None
    decision: str
    reason: str
    outcome: Optional[str] = ""
    created_at: str

class DecisionLogCreate(BaseModel):
    priority_id: Optional[str] = None
    decision: str
    reason: str
    outcome: Optional[str] = ""

class WeeklyReviewModel(BaseModel):
    id: str
    user_id: str
    week_start: str
    week_end: str
    summary: str
    completed_priorities: List[str] = []
    incomplete_priorities: List[str] = []
    personal_reflection: str = ""
    decision_reflection: str = ""
    next_week_actions: List[str] = []
    answers: Dict[str, str] = {}
    created_at: str
    updated_at: str

class WeeklyReviewCreate(BaseModel):
    week_start: Optional[str] = None
    week_end: Optional[str] = None
    summary: str
    completed_priorities: Optional[List[str]] = []
    incomplete_priorities: Optional[List[str]] = []
    personal_reflection: Optional[str] = ""
    decision_reflection: Optional[str] = ""
    next_week_actions: Optional[List[str]] = []
    answers: Optional[Dict[str, str]] = {}


# --- Data Handling Repository (Python Layer) ---
class PythonDataRepository:
    def __init__(self):
        self.lock = threading.Lock()
        self.users: Dict[str, UserModel] = {}
        self.sessions: Dict[str, str] = {}  # token -> user_id
        self.challenges: Dict[str, ChallengeModel] = {}
        self.priorities: Dict[str, PriorityModel] = {}
        self.interests: Dict[str, InterestModel] = {}
        self.stakeholders: Dict[str, StakeholderModel] = {}
        self.stakeholder_interests: Dict[str, StakeholderInterestModel] = {}
        self.weekly_reviews: Dict[str, WeeklyReviewModel] = {}
        self.decision_logs: Dict[str, DecisionLogModel] = {}
        self.quick_memos: Dict[str, QuickMemoModel] = {}
        self.seed_default_data()

    def seed_default_data(self):
        with self.lock:
            demo_user_id = "usr_founder_001"
            now = now_iso()
            cur_week = get_current_week_string()

            # 1. User
            self.users[demo_user_id] = UserModel(
                id=demo_user_id,
                email="founder@beyondtodo.app",
                name="Seiya Tanaka",
                title="Founder & Product Lead",
                email_verified_at=now,
                created_at=now,
            )
            self.sessions["demo-session-token-beyond-todo"] = demo_user_id

            # 2. Challenges
            ch_data = [
                ("ch_01", "新規顧客の獲得チャネルが不安定", "既存顧客の紹介や個人の人脈に依存しており、月ごとのリード数・新規商談数にバラつきがある。再現性のあるインバウンド／アウトバウンド体制を構築できていない。", "In Progress", "High"),
                ("ch_02", "受託売上依存からの脱却と自社プロダクト比率向上", "日々のクライアントワークや受託案件で工数が逼迫し、自社新規SaaSサービスの企画・開発に使える時間が週10時間未満に削られている。", "In Progress", "High"),
                ("ch_03", "自社SaaSの初期トラクションと収益化モデル確立", "プロトタイプのベータ版はローンチ済みだが、有料転換率（CVR）が目標の半分に留まる。初期有料ユーザー10社を今四半期中に獲得したい。", "Open", "High"),
                ("ch_04", "業務委託中心のチームからコアメンバー採用への移行", "プロダクト開発のリードエンジニアとマーケティング責任者の採用基準が曖昧で、求人要件の明確化が後回しになっている。", "Open", "Medium"),
            ]
            for cid, title, desc, st, imp in ch_data:
                self.challenges[cid] = ChallengeModel(
                    id=cid, user_id=demo_user_id, title=title, description=desc, status=st, importance=imp, created_at=now, updated_at=now
                )

            # 3. Priorities
            p_data = [
                ("pr_01", "ch_01", "新規顧客の獲得チャネルが不安定", "見込み顧客10社へ直接アプローチし課題ヒアリング実施", "ターゲット業種（SaaS・IT）のマネージャー層10名へDM/知人経由で直接インタビューを行い、業務管理のペインを検証する。", "新規顧客獲得の再現性あるメッセージングと提供価値を確立するため。", "In Progress"),
                ("pr_02", "ch_03", "自社SaaSの初期トラクションと収益化モデル確立", "自社SaaSの初期オンボーディングUI改善と価格プラン公開", "初回登録ユーザーが迷わず主要機能へ到達できるようウィザードを改修し、月額サブスクリプションの課金導線を繋ぎ込む。", "初期トラクションの離脱を防ぎ、今月中の初有料顧客獲得に直結させるため。", "Completed"),
                ("pr_03", "ch_02", "受託売上依存からの脱却と自社プロダクト比率向上", "主要クライアントとの年間契約更新交渉（開発専任時間を確保）", "受託案件の工数を月120時間から80時間に段階的にスリム化する条件で年間保守リテーナー契約の提案書を提出・合意する。", "自社事業への投下時間を生み出し、受託依存を構造的に減らすため。", "In Progress"),
            ]
            for pid, cid, ctitle, title, desc, reason, st in p_data:
                self.priorities[pid] = PriorityModel(
                    id=pid, user_id=demo_user_id, challenge_id=cid, challenge_title=ctitle, title=title, description=desc, reason=reason, status=st, target_week=cur_week, created_at=now, updated_at=now
                )

            # 4. Interests (with 'who')
            int_data = [
                ("int_01", "ローカルLLMを用いたプライベートナレッジ検索基盤の構築", "社内ドキュメントやSlack議事録をオンプレ・ローカルでベクトル化し、情報漏洩を防ぎながら高速検索できる仕組みを実験検証する。", "Technology", "Exploring", "自分"),
                ("int_02", "共同創業者・パートナーとの週次1on1アジェンダ設計", "日々のタスク報告にとどまらず、ビジョン共有とメンタル状態の相互チェックを行うための対話フレームワークを導入したい。", "Organization", "Interested", "共同パートナー・投資家"),
                ("int_03", "B2B SaaSにおけるPLG（Product-Led Growth）の成功事例研究", "セールス人員を増やさずにバイラルまたはセルフサーブでARR 1億円を達成した国内スタートアップの手法を調査する。", "Business Strategy", "Interested", "自分"),
                ("int_04", "クライアントA社: リアルタイムCSVエクスポートと監査ログ対応", "来期契約更新に向けた主要要望。セキュアな出力仕様とアクセス権限の設計。", "Client Request", "Acting", "クライアントA社（代表・事業部長）"),
            ]
            for iid, title, desc, cat, st, who in int_data:
                self.interests[iid] = InterestModel(
                    id=iid, user_id=demo_user_id, title=title, description=desc, category=cat, status=st, who=who, created_at=now, updated_at=now
                )

            # 5. Stakeholders
            st_data = [
                ("st_01", "クライアントA社（代表・事業部長）", "Customer", "売上の約40%を占める主要取引先。業務効率化基盤の保守・拡張を担当。"),
                ("st_02", "共同パートナー・投資家", "Partner", "シード期の事業アドバイザー兼出資者。月1回の定例でトラクションを報告。"),
                ("st_03", "家族・パートナー", "Family", "一番身近なサポーター。過度な激務による体調不良や家族時間の減少を心配している。"),
            ]
            for sid, name, rel, desc in st_data:
                self.stakeholders[sid] = StakeholderModel(
                    id=sid, user_id=demo_user_id, name=name, relationship=rel, description=desc, created_at=now, updated_at=now
                )

            # 6. Stakeholder Interests
            sti_data = [
                ("sti_01", "st_01", "クライアントA社（代表・事業部長）", "既存システムの安定稼働と短納期での機能追加", "社内DXの納期を守り、トラブル時の即時対応を求めている。", "High", "Active"),
                ("sti_02", "st_01", "クライアントA社（代表・事業部長）", "生成AIを活用した業務自動化のPoC提案", "競合に先駆けてAI社内活用を進めたいという強い意向がある。", "Medium", "Active"),
                ("sti_03", "st_02", "共同パートナー・投資家", "自社SaaSの有料顧客獲得と月次ARRの可視化", "受託案件だけでなく、スケール可能な自社プロダクトの数字の伸びを期待している。", "High", "Active"),
                ("sti_04", "st_03", "家族・パートナー", "週末の完全オフ確保と夜間作業の抑制", "心身の健康を損なわないよう、持続可能な働き方を継続してほしいと願っている。", "High", "Active"),
            ]
            for sti_id, sid, sname, title, desc, imp, st in sti_data:
                self.stakeholder_interests[sti_id] = StakeholderInterestModel(
                    id=sti_id, user_id=demo_user_id, stakeholder_id=sid, stakeholder_name=sname, title=title, description=desc, importance=imp, status=st, created_at=now, updated_at=now
                )

            # 7. Decision Logs
            self.decision_logs["dec_01"] = DecisionLogModel(
                id="dec_01",
                user_id=demo_user_id,
                priority_id="pr_03",
                decision="受託開発の新規単発案件の引き受けを今四半期は完全凍結する",
                reason="手元のキャッシュは半年分あるため、目先の数十万円の受託売上より自社プロダクトのMRR立ち上げに全力を注ぐべきと判断。",
                outcome="週に約15時間の自社開発時間を確保できる見込みが立った。",
                created_at=(datetime.now() - timedelta(days=8)).isoformat(),
            )
            self.decision_logs["dec_02"] = DecisionLogModel(
                id="dec_02",
                user_id=demo_user_id,
                priority_id="pr_02",
                decision="オンボーディングのチュートリアル動画制作を取りやめ、対話型UI改善へ一本化",
                reason="動画は更新コストが高く離脱率も高いため。初回ユーザーが迷わず3分で完了できるミニマルウィザードを優先。",
                outcome="初期オンボーディング到達率が35%から68%へ向上した。",
                created_at=(datetime.now() - timedelta(days=4)).isoformat(),
            )
            self.decision_logs["dec_03"] = DecisionLogModel(
                id="dec_03",
                user_id=demo_user_id,
                priority_id=None,
                decision="クライアントA社の緊急追加要請に対し、週次枠内での優先度入替ルールを合意（夜間・週末作業は断固拒否）",
                reason="心身の持続可能性と自社事業の時間を死守するため。トレードオフとして一部機能を次期スプリントへ延伸。",
                outcome="相手方責任者とも合意でき、無理のない体制を確立できた。",
                created_at=(datetime.now() - timedelta(days=2)).isoformat(),
            )

            # 8. Weekly Review
            self.weekly_reviews["rev_past_01"] = WeeklyReviewModel(
                id="rev_past_01",
                user_id=demo_user_id,
                week_start=(datetime.now() - timedelta(days=12)).strftime("%Y-%m-%d"),
                week_end=(datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
                summary="受託クライアントの緊急対応に週の半分を費やしたが、自社SaaSのUI導線見直しとオンボーディング改善に着手できた。",
                completed_priorities=["自社SaaSの初期オンボーディングUI改善と価格プラン公開"],
                incomplete_priorities=["見込み顧客10社へ直接アプローチし課題ヒアリング実施"],
                personal_reflection="他者からの突発的な依頼を断れず、自分の関心であるAIエージェントの検証に1時間しか使えなかった。",
                decision_reflection="クライアントA社の納期短縮要請に対し、受託チームのリソース再配分で対応し、自身の工数は確保する判断を下した。",
                next_week_actions=[
                    "平日の午前9:00〜11:00を自社優先事項の聖域として予定ブロックする",
                    "見込み顧客ヒアリングの候補リストをスプレッドシートに事前整理する",
                    "家族との週末ディナーの時間を事前にカレンダーへFIXする",
                ],
                answers={
                    "accomplished": "SaaSのサインアップ画面と課金プランの画面構成を完成させ、プロトタイプテストを実施できた。",
                    "unaccomplished": "見込み顧客への直接アプローチは3社に留まり、目標の10社に届かなかった。",
                    "priority_assessment": "自社SaaSの改善を最優先にした判断は正しかった。ただし受託の割り込みへのバッファが甘かった。",
                    "priority_reasoning": "受託売上への過度な依存から脱却しなければ、いつまでも自分のビジネスがスケールしないため。",
                    "interest_time": "興味関心に充てられた時間は週5時間程度。理想の10時間には届かなかった。",
                    "stakeholder_balance": "クライアントA社の要望に過剰に引っ張られ、自分の時間主権を少し失いかけていた。",
                    "weekly_learnings": "「やるべきこと」に追われると「本当に解決したい課題」を見失う。朝イチの意思確認が不可欠。",
                    "next_week_improvements": "突発的な依頼に対して即答せず、「翌営業日に回答」するルールを徹底する。",
                },
                created_at=now,
                updated_at=now,
            )

            # 9. 10 Realistic Quick Memos (Strictly labeled as 優先事項, Problems, or 興味関心)
            memos_data = [
                ("memo_01", "クライアントA社との定例。来月リリース予定の機能について、管理画面のCSVエクスポート要望あり。セキュアな設計を確認する。", ["Problems"], 1),
                ("memo_02", "見込み顧客インタビュー用のアポ取りメッセージ文面、課題への共感を前面に出すようにトーンを改善。", ["優先事項"], 3),
                ("memo_03", "既存受託クライアントの緊急サーバー障害対応が週に2回発生。根本的な監視体制の自動化が急務。", ["Problems"], 5),
                ("memo_04", "新規SaaSの初期課金フロー、Stripe Checkoutの導入で実装工数を約60%削減できそう。週末にPoC検証。", ["興味関心"], 8),
                ("memo_05", "投資家との月次ミーティング用：ARR推移グラフとチャーン率の最新数字をダッシュボードで確認。", ["優先事項"], 12),
                ("memo_06", "LLMのFew-shotプロンプティングで課題と優先事項のギャップを自動ハイライトする実験を週末30分行う。", ["興味関心"], 18),
                ("memo_07", "採用候補者のリードエンジニアとのカジュアル面談。フルリモート条件とプロダクトビジョンに強い共感あり。", ["興味関心"], 24),
                ("memo_08", "受託案件の見積もり算出基準を改定。リテーナー契約への切り替え提案書を作成して金曜までに送付。", ["優先事項"], 30),
                ("memo_09", "ローカルLLM（Llama 3）を社内ナレッジ検索に活用できないか、技術検証の時間を来週1コマ確保する。", ["興味関心"], 36),
                ("memo_10", "業務委託メンバーとの情報共有フローがSlack上で分散している。タスク管理ツールの運用ルールを1枚に整理。", ["Problems"], 48),
            ]
            for mid, content, tags, hours_ago in memos_data:
                m_time = (datetime.utcnow() - timedelta(hours=hours_ago)).isoformat() + "Z"
                self.quick_memos[mid] = QuickMemoModel(
                    id=mid, user_id=demo_user_id, content=content, tags=tags, created_at=m_time
                )


db = PythonDataRepository()

# --- Auth Helper ---
def get_user_id(authorization: Optional[str] = Header(None)) -> str:
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        uid = db.sessions.get(token)
        if uid:
            return uid
    # Default to demo user for smooth instant access
    return "usr_founder_001"


# ==========================================
# API Routes (Python Data Layer)
# ==========================================

# --- Auth ---
@app.post("/api/auth/login")
def login(req: LoginRequest):
    email = req.email or "founder@beyondtodo.app"
    user = next((u for u in db.users.values() if u.email.lower() == email.lower()), None)
    if not user:
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません。")
    token = f"session_{uuid.uuid4().hex[:16]}"
    db.sessions[token] = user.id
    return {"token": token, "user": user}

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    if not req.email or not req.name:
        raise HTTPException(status_code=400, detail="メールアドレスとお名前は必須項目です。")
    if any(u.email.lower() == req.email.lower() for u in db.users.values()):
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています。")
    new_user = UserModel(
        id=f"usr_{uuid.uuid4().hex[:8]}",
        email=req.email,
        name=req.name,
        title=req.title or "Individual",
        created_at=now_iso(),
    )
    db.users[new_user.id] = new_user
    token = f"session_{uuid.uuid4().hex[:16]}"
    db.sessions[token] = new_user.id
    return {"token": token, "user": new_user, "message": "登録が完了しました"}

@app.get("/api/auth/me")
def get_me(user_id: str = Depends(get_user_id)):
    user = db.users.get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="認証が必要です。")
    return {"user": user}

@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        db.sessions.pop(token, None)
    return {"success": True}

@app.post("/api/auth/forgot-password")
def forgot_password(body: Dict[str, Any]):
    email = body.get("email", "ご指定のアドレス")
    return {"success": True, "message": f"{email}宛にパスワード再設定URLを送信しました。"}

# --- Dashboard Overview ---
@app.get("/api/dashboard/overview")
def get_dashboard_overview(week: Optional[str] = None, user_id: str = Depends(get_user_id)):
    target_week = week or get_current_week_string()
    
    with db.lock:
        user_challenges = [c for c in db.challenges.values() if c.user_id == user_id]
        user_priorities = [p for p in db.priorities.values() if p.user_id == user_id and (p.target_week == target_week or not week)]
        user_interests = [i for i in db.interests.values() if i.user_id == user_id]
        user_stakeholders = [s for s in db.stakeholders.values() if s.user_id == user_id]
        user_reviews = sorted(
            [r for r in db.weekly_reviews.values() if r.user_id == user_id],
            key=lambda x: x.created_at,
            reverse=True,
        )

    latest_review = user_reviews[0] if user_reviews else None

    # Calculate metrics
    open_challenges = [c for c in user_challenges if c.status != "Resolved"]
    high_imp_challenges = [c for c in open_challenges if c.importance == "High"]
    active_priorities = [p for p in user_priorities if p.status != "Completed"]
    completed_priorities = [p for p in user_priorities if p.status == "Completed"]
    exploring_interests = [i for i in user_interests if i.status in ("Exploring", "Acting")]
    total_interests = len(user_interests)
    ratio = round((len(exploring_interests) / total_interests) * 100) if total_interests > 0 else 0

    # Rule-based / AI insights
    ai_insights = [
        {
            "id": "ins_01",
            "type": "challenge_priority_gap",
            "title": "課題と優先事項の整合性",
            "description": f"最重要課題「{high_imp_challenges[0].title if high_imp_challenges else '重要課題'}」に直結する優先事項が定義されています。今週の集中を維持しましょう。",
            "severity": "positive",
            "action_suggestion": "優先事項以外の依頼は来週以降へリスケジュールを検討してください。",
            "created_at": now_iso(),
        },
        {
            "id": "ins_02",
            "type": "interest_starvation",
            "title": "興味関心への投下時間",
            "description": f"全{total_interests}件中、アクション中の関心事は{len(exploring_interests)}件です。週初めに2〜3時間の検証枠をブロックすることをおすすめします。",
            "severity": "info",
            "action_suggestion": "カレンダーに「自己投資・技術検証」枠を2時間確保する",
            "created_at": now_iso(),
        },
    ]

    return {
        "challenges": user_challenges,
        "priorities": user_priorities,
        "interests": user_interests,
        "stakeholders": user_stakeholders,
        "aiInsights": ai_insights,
        "latestReview": latest_review,
        "targetWeek": target_week,
        "metrics": {
            "openChallengesCount": len(open_challenges),
            "highImportanceChallengesCount": len(high_imp_challenges),
            "activePrioritiesCount": len(active_priorities),
            "completedPrioritiesCount": len(completed_priorities),
            "exploringInterestsCount": len(exploring_interests),
            "stakeholderCount": len(user_stakeholders),
            "interestToActionRatio": ratio,
        },
    }

# --- Challenges ---
@app.get("/api/challenges")
def get_challenges(user_id: str = Depends(get_user_id)):
    with db.lock:
        return [c for c in db.challenges.values() if c.user_id == user_id]

@app.post("/api/challenges", status_code=201)
def create_challenge(data: ChallengeCreate, user_id: str = Depends(get_user_id)):
    if not data.title:
        raise HTTPException(status_code=400, detail="課題のタイトルは必須です。")
    cid = f"ch_{uuid.uuid4().hex[:8]}"
    now = now_iso()
    ch = ChallengeModel(
        id=cid,
        user_id=user_id,
        title=data.title,
        description=data.description or "",
        status=data.status or "Open",
        importance=data.importance or "High",
        created_at=now,
        updated_at=now,
    )
    with db.lock:
        db.challenges[cid] = ch
    return ch

@app.put("/api/challenges/{challenge_id}")
def update_challenge(challenge_id: str, data: ChallengeUpdate, user_id: str = Depends(get_user_id)):
    with db.lock:
        ch = db.challenges.get(challenge_id)
        if not ch or ch.user_id != user_id:
            raise HTTPException(status_code=404, detail="指定された課題が見つかりません。")
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            if v is not None:
                setattr(ch, k, v)
        ch.updated_at = now_iso()
    return ch

@app.delete("/api/challenges/{challenge_id}")
def delete_challenge(challenge_id: str, user_id: str = Depends(get_user_id)):
    with db.lock:
        ch = db.challenges.get(challenge_id)
        if not ch or ch.user_id != user_id:
            raise HTTPException(status_code=404, detail="指定された課題が見つかりません。")
        del db.challenges[challenge_id]
    return {"success": True}

# --- Priorities ---
@app.get("/api/priorities")
def get_priorities(target_week: Optional[str] = Query(None), user_id: str = Depends(get_user_id)):
    with db.lock:
        items = [p for p in db.priorities.values() if p.user_id == user_id]
        if target_week:
            items = [p for p in items if p.target_week == target_week]
        return items

@app.post("/api/priorities", status_code=201)
def create_priority(data: PriorityCreate, user_id: str = Depends(get_user_id)):
    if not data.title:
        raise HTTPException(status_code=400, detail="最優先事項のタイトルは必須です。")
    week = data.target_week or get_current_week_string()

    with db.lock:
        existing = [p for p in db.priorities.values() if p.user_id == user_id and p.target_week == week]
        if len(existing) >= 5:
            raise HTTPException(status_code=400, detail="最優先事項は週に最大5件までです。")

        challenge_title = None
        if data.challenge_id:
            ch = db.challenges.get(data.challenge_id)
            if ch:
                challenge_title = ch.title

        pid = f"pr_{uuid.uuid4().hex[:8]}"
        now = now_iso()
        priority = PriorityModel(
            id=pid,
            user_id=user_id,
            challenge_id=data.challenge_id,
            challenge_title=challenge_title,
            title=data.title,
            description=data.description or "",
            reason=data.reason or "",
            status=data.status or "Not Started",
            target_week=week,
            created_at=now,
            updated_at=now,
        )
        db.priorities[pid] = priority
    return priority

@app.put("/api/priorities/{priority_id}")
def update_priority(priority_id: str, data: PriorityUpdate, user_id: str = Depends(get_user_id)):
    with db.lock:
        p = db.priorities.get(priority_id)
        if not p or p.user_id != user_id:
            raise HTTPException(status_code=404, detail="指定された優先事項が見つかりません。")
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            if v is not None:
                setattr(p, k, v)
        p.updated_at = now_iso()
    return p

@app.delete("/api/priorities/{priority_id}")
def delete_priority(priority_id: str, user_id: str = Depends(get_user_id)):
    with db.lock:
        p = db.priorities.get(priority_id)
        if not p or p.user_id != user_id:
            raise HTTPException(status_code=404, detail="指定された優先事項が見つかりません。")
        del db.priorities[priority_id]
    return {"success": True}

# --- Interests ---
@app.get("/api/interests")
def get_interests(user_id: str = Depends(get_user_id)):
    with db.lock:
        return [i for i in db.interests.values() if i.user_id == user_id]

@app.post("/api/interests", status_code=201)
def create_interest(data: InterestCreate, user_id: str = Depends(get_user_id)):
    if not data.title:
        raise HTTPException(status_code=400, detail="興味関心のタイトルは必須です。")
    iid = f"int_{uuid.uuid4().hex[:8]}"
    now = now_iso()
    interest = InterestModel(
        id=iid,
        user_id=user_id,
        title=data.title,
        description=data.description or "",
        category=data.category or "General",
        status=data.status or "Interested",
        who=data.who or "自分",
        created_at=now,
        updated_at=now,
    )
    with db.lock:
        db.interests[iid] = interest
    return interest

@app.put("/api/interests/{interest_id}")
def update_interest(interest_id: str, data: InterestUpdate, user_id: str = Depends(get_user_id)):
    with db.lock:
        item = db.interests.get(interest_id)
        if not item or item.user_id != user_id:
            raise HTTPException(status_code=404, detail="指定された興味関心が見つかりません。")
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            if v is not None:
                setattr(item, k, v)
        item.updated_at = now_iso()
    return item

@app.delete("/api/interests/{interest_id}")
def delete_interest(interest_id: str, user_id: str = Depends(get_user_id)):
    with db.lock:
        item = db.interests.get(interest_id)
        if not item or item.user_id != user_id:
            raise HTTPException(status_code=404, detail="指定された興味関心が見つかりません。")
        del db.interests[interest_id]
    return {"success": True}

# --- Stakeholders ---
@app.get("/api/stakeholders")
def get_stakeholders(user_id: str = Depends(get_user_id)):
    with db.lock:
        return [s for s in db.stakeholders.values() if s.user_id == user_id]

@app.post("/api/stakeholders", status_code=201)
def create_stakeholder(data: StakeholderCreate, user_id: str = Depends(get_user_id)):
    if not data.name:
        raise HTTPException(status_code=400, detail="ステークホルダー名は必須です。")
    sid = f"st_{uuid.uuid4().hex[:8]}"
    now = now_iso()
    st = StakeholderModel(
        id=sid,
        user_id=user_id,
        name=data.name,
        relationship=data.relationship or "Customer",
        description=data.description or "",
        created_at=now,
        updated_at=now,
    )
    with db.lock:
        db.stakeholders[sid] = st
    return st

@app.put("/api/stakeholders/{stakeholder_id}")
def update_stakeholder(stakeholder_id: str, data: StakeholderUpdate, user_id: str = Depends(get_user_id)):
    with db.lock:
        st = db.stakeholders.get(stakeholder_id)
        if not st or st.user_id != user_id:
            raise HTTPException(status_code=404, detail="指定されたステークホルダーが見つかりません。")
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            if v is not None:
                setattr(st, k, v)
        st.updated_at = now_iso()
    return st

@app.delete("/api/stakeholders/{stakeholder_id}")
def delete_stakeholder(stakeholder_id: str, user_id: str = Depends(get_user_id)):
    with db.lock:
        st = db.stakeholders.get(stakeholder_id)
        if not st or st.user_id != user_id:
            raise HTTPException(status_code=404, detail="指定されたステークホルダーが見つかりません。")
        del db.stakeholders[stakeholder_id]
    return {"success": True}

@app.post("/api/stakeholders/{stakeholder_id}/interests", status_code=201)
def create_stakeholder_interest(stakeholder_id: str, data: StakeholderInterestCreate, user_id: str = Depends(get_user_id)):
    with db.lock:
        st = db.stakeholders.get(stakeholder_id)
        if not st or st.user_id != user_id:
            raise HTTPException(status_code=404, detail="指定されたステークホルダーが見つかりません。")
        sti_id = f"sti_{uuid.uuid4().hex[:8]}"
        now = now_iso()
        sti = StakeholderInterestModel(
            id=sti_id,
            user_id=user_id,
            stakeholder_id=stakeholder_id,
            stakeholder_name=st.name,
            title=data.title,
            description=data.description or "",
            importance=data.importance or "High",
            status=data.status or "Active",
            created_at=now,
            updated_at=now,
        )
        db.stakeholder_interests[sti_id] = sti
    return sti

# --- Quick Memos ---
@app.get("/api/memos")
def get_memos(user_id: str = Depends(get_user_id)):
    with db.lock:
        memos = [m for m in db.quick_memos.values() if m.user_id == user_id]
        memos.sort(key=lambda x: x.created_at, reverse=True)
        return memos

@app.post("/api/memos", status_code=201)
def create_memo(data: QuickMemoCreate, user_id: str = Depends(get_user_id)):
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="メモの内容を入力してください。")
    mid = f"memo_{uuid.uuid4().hex[:8]}"
    memo = QuickMemoModel(
        id=mid,
        user_id=user_id,
        content=data.content.strip(),
        tags=data.tags or [],
        created_at=now_iso(),
    )
    with db.lock:
        db.quick_memos[mid] = memo
    return memo

@app.put("/api/memos/{memo_id}")
def update_memo(memo_id: str, data: QuickMemoUpdate, user_id: str = Depends(get_user_id)):
    with db.lock:
        m = db.quick_memos.get(memo_id)
        if not m or m.user_id != user_id:
            raise HTTPException(status_code=404, detail="指定されたメモが見つかりません。")
        if data.content is not None:
            m.content = data.content.strip()
        if data.tags is not None:
            m.tags = data.tags
    return m

@app.delete("/api/memos/{memo_id}")
def delete_memo(memo_id: str, user_id: str = Depends(get_user_id)):
    with db.lock:
        m = db.quick_memos.get(memo_id)
        if not m or m.user_id != user_id:
            raise HTTPException(status_code=404, detail="指定されたメモが見つかりません。")
        del db.quick_memos[memo_id]
    return {"success": True}

@app.post("/api/memos/{memo_id}/convert")
def convert_memo(memo_id: str, body: MemoConvertRequest, user_id: str = Depends(get_user_id)):
    with db.lock:
        m = db.quick_memos.get(memo_id)
        if not m or m.user_id != user_id:
            raise HTTPException(status_code=404, detail="指定されたメモが見つかりません。")

        target_type = body.targetType
        created_entity = None
        now = now_iso()

        if target_type == "challenge":
            cid = f"ch_{uuid.uuid4().hex[:8]}"
            ch = ChallengeModel(
                id=cid,
                user_id=user_id,
                title=body.title or m.content[:40],
                description=body.description or m.content,
                status=body.status or "Open",
                importance=body.importance or "High",
                created_at=now,
                updated_at=now,
            )
            db.challenges[cid] = ch
            created_entity = ch

        elif target_type == "priority":
            week = get_current_week_string()
            pid = f"pr_{uuid.uuid4().hex[:8]}"
            p = PriorityModel(
                id=pid,
                user_id=user_id,
                title=body.title or m.content[:40],
                description=body.description or m.content,
                reason=body.reason or "メモから重要と判断したため",
                status="Not Started",
                target_week=week,
                created_at=now,
                updated_at=now,
            )
            db.priorities[pid] = p
            created_entity = p

        elif target_type == "interest":
            iid = f"int_{uuid.uuid4().hex[:8]}"
            item = InterestModel(
                id=iid,
                user_id=user_id,
                title=body.title or m.content[:40],
                description=body.description or m.content,
                category=body.category or "General",
                status="Interested",
                who="自分",
                created_at=now,
                updated_at=now,
            )
            db.interests[iid] = item
            created_entity = item

        m.converted_to = target_type

    return {"success": True, "createdEntity": created_entity, "convertedType": target_type}

@app.post("/api/memos/auto-stock")
def auto_stock_memos(body: Optional[AutoStockRequest] = None, user_id: str = Depends(get_user_id)):
    with db.lock:
        now = now_iso()
        week = get_current_week_string()
        stocked_counts = {"priority": 0, "challenge": 0, "interest": 0}

        all_user_memos = [m for m in db.quick_memos.values() if m.user_id == user_id]
        if body and body.memo_ids:
            target_memos = [m for m in all_user_memos if m.id in body.memo_ids]
        else:
            target_memos = all_user_memos

        processed_ids = []
        for m in target_memos:
            tags = m.tags or []
            if any("優先" in t or "priorit" in t.lower() for t in tags):
                target_type = "priority"
            elif any("Problem" in t or "課題" in t for t in tags):
                target_type = "challenge"
            elif any("関心" in t or "interest" in t.lower() for t in tags):
                target_type = "interest"
            else:
                target_type = "priority"

            title_line = m.content.strip().split("\n")[0][:50]
            desc = m.content.strip()

            if target_type == "priority":
                pid = f"pr_{uuid.uuid4().hex[:8]}"
                db.priorities[pid] = PriorityModel(
                    id=pid,
                    user_id=user_id,
                    title=title_line,
                    description=desc,
                    reason="メモから自動ストック",
                    status="In Progress",
                    target_week=week,
                    created_at=now,
                    updated_at=now,
                )
                stocked_counts["priority"] += 1
            elif target_type == "challenge":
                cid = f"ch_{uuid.uuid4().hex[:8]}"
                db.challenges[cid] = ChallengeModel(
                    id=cid,
                    user_id=user_id,
                    title=title_line,
                    description=desc,
                    status="Open",
                    importance="High",
                    created_at=now,
                    updated_at=now,
                )
                stocked_counts["challenge"] += 1
            elif target_type == "interest":
                iid = f"int_{uuid.uuid4().hex[:8]}"
                db.interests[iid] = InterestModel(
                    id=iid,
                    user_id=user_id,
                    title=title_line,
                    description=desc,
                    category="General",
                    status="Interested",
                    who="自分",
                    created_at=now,
                    updated_at=now,
                )
                stocked_counts["interest"] += 1

            if m.id in db.quick_memos:
                del db.quick_memos[m.id]
            processed_ids.append(m.id)

        return {
            "success": True,
            "processedCount": len(processed_ids),
            "stockedCounts": stocked_counts
        }

# --- Reviews ---
@app.get("/api/reviews")
def get_reviews(user_id: str = Depends(get_user_id)):
    with db.lock:
        revs = [r for r in db.weekly_reviews.values() if r.user_id == user_id]
        revs.sort(key=lambda x: x.created_at, reverse=True)
        return revs

@app.get("/api/reviews/latest")
def get_latest_review(user_id: str = Depends(get_user_id)):
    with db.lock:
        revs = [r for r in db.weekly_reviews.values() if r.user_id == user_id]
        revs.sort(key=lambda x: x.created_at, reverse=True)
        return revs[0] if revs else None

@app.post("/api/reviews", status_code=201)
def create_review(data: WeeklyReviewCreate, user_id: str = Depends(get_user_id)):
    if not data.summary:
        raise HTTPException(status_code=400, detail="週次サマリーは必須です。")
    rid = f"rev_{uuid.uuid4().hex[:8]}"
    now = now_iso()
    rev = WeeklyReviewModel(
        id=rid,
        user_id=user_id,
        week_start=data.week_start or (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d"),
        week_end=data.week_end or datetime.now().strftime("%Y-%m-%d"),
        summary=data.summary,
        completed_priorities=data.completed_priorities or [],
        incomplete_priorities=data.incomplete_priorities or [],
        personal_reflection=data.personal_reflection or "",
        decision_reflection=data.decision_reflection or "",
        next_week_actions=data.next_week_actions or [],
        answers=data.answers or {},
        created_at=now,
        updated_at=now,
    )
    with db.lock:
        db.weekly_reviews[rid] = rev
    return rev

# --- Decision Logs ---
@app.get("/api/decision-logs")
def get_decision_logs(user_id: str = Depends(get_user_id)):
    with db.lock:
        logs = [d for d in db.decision_logs.values() if d.user_id == user_id]
        logs.sort(key=lambda x: x.created_at, reverse=True)
        return logs

@app.post("/api/decision-logs", status_code=201)
def create_decision_log(data: DecisionLogCreate, user_id: str = Depends(get_user_id)):
    if not data.decision or not data.reason:
        raise HTTPException(status_code=400, detail="意思決定内容と理由は必須です。")
    did = f"dec_{uuid.uuid4().hex[:8]}"
    log = DecisionLogModel(
        id=did,
        user_id=user_id,
        priority_id=data.priority_id,
        decision=data.decision,
        reason=data.reason,
        outcome=data.outcome or "",
        created_at=now_iso(),
    )
    with db.lock:
        db.decision_logs[did] = log
    return log

@app.delete("/api/decision-logs/{log_id}")
def delete_decision_log(log_id: str, user_id: str = Depends(get_user_id)):
    with db.lock:
        if log_id not in db.decision_logs or db.decision_logs[log_id].user_id != user_id:
            raise HTTPException(status_code=404, detail="指定された意思決定ログが見つかりません。")
        del db.decision_logs[log_id]
        return {"success": True}

# --- Insights Interactive Analyze ---
@app.post("/api/insights/analyze")
def analyze_insights(body: Dict[str, Any], user_id: str = Depends(get_user_id)):
    user_query = body.get("userQuery", "")
    return {
        "insights": [
            {
                "id": f"ins_{uuid.uuid4().hex[:6]}",
                "type": "custom_analysis",
                "title": "AIエグゼクティブ分析",
                "description": f"ご質問「{user_query}」に関して、現在の最重要課題と優先事項に基づき、受託業務の圧縮と自社SaaS顧客獲得への集中が最も投資対効果が高いと分析されました。",
                "severity": "positive",
                "action_suggestion": "不要なミーティングを断り、週初の集中時間を最優先事項に充当してください。",
                "created_at": now_iso(),
            }
        ]
    }

# --- System Reset & Export ---
@app.post("/api/system/reset")
def reset_system():
    db.seed_default_data()
    return {"success": True, "message": "初期モックデータにリセットしました。"}

@app.get("/api/system/export")
def export_system(user_id: str = Depends(get_user_id)):
    with db.lock:
        return {
            "app": "Beyond TODO.",
            "exported_at": now_iso(),
            "user_id": user_id,
            "data": {
                "challenges": [c for c in db.challenges.values() if c.user_id == user_id],
                "priorities": [p for p in db.priorities.values() if p.user_id == user_id],
                "interests": [i for i in db.interests.values() if i.user_id == user_id],
                "stakeholders": [s for s in db.stakeholders.values() if s.user_id == user_id],
                "reviews": [r for r in db.weekly_reviews.values() if r.user_id == user_id],
                "decisions": [d for d in db.decision_logs.values() if d.user_id == user_id],
            },
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
