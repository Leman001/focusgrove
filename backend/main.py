"""
FocusGrove — FastAPI Backend
Entities: User, Reward, FocusSession, LedgerEntry, Settings
SQLite via aiosqlite. Single-user mode (userId=1).
"""

import os, time, uuid
from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import aiosqlite

DB_PATH = os.path.join(os.path.dirname(__file__), "focusgrove.db")
USER_ID = 1

app = FastAPI(title="FocusGrove API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ────────────────────────────────────────────────────────────────────

class RewardCreate(BaseModel):
    emoji: str
    name: str
    costMinutes: int
    badge: Optional[str] = None

class RewardOut(BaseModel):
    id: str
    emoji: str
    name: str
    costMinutes: int
    badge: Optional[str] = None
    createdAt: str

class SessionStart(BaseModel):
    durationMinutes: int
    mode: str = "countdown"
    ambientTrack: Optional[str] = None

class SessionOut(BaseModel):
    id: str
    durationMinutes: int
    mode: str
    startedAt: str
    endedAt: Optional[str] = None
    earnedMinutes: int = 0
    completed: bool = False

class SettingsPatch(BaseModel):
    defaultDurationMinutes: Optional[int] = None
    defaultMode: Optional[str] = None
    language: Optional[str] = None
    strictMode: Optional[bool] = None

class SettingsOut(BaseModel):
    defaultDurationMinutes: int
    defaultMode: str
    language: str
    strictMode: bool

class LedgerOut(BaseModel):
    id: str
    kind: str
    amountMinutes: int
    sourceType: str
    sourceId: str
    createdAt: str

class MeOut(BaseModel):
    id: int
    name: str
    balanceMinutes: int
    dayStreak: int
    settings: SettingsOut
    todayFocusMinutes: int
    weekFocusMinutes: int
    dailyAvgMinutes: int
    totalFocusHours: float
    weeklyBars: List[float]

# ── Database ──────────────────────────────────────────────────────────────────

async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    return db

async def init_db():
    db = await get_db()
    await db.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'FocusGrove User',
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY,
        userId INTEGER NOT NULL DEFAULT 1,
        emoji TEXT NOT NULL,
        name TEXT NOT NULL,
        costMinutes INTEGER NOT NULL,
        badge TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS focus_sessions (
        id TEXT PRIMARY KEY,
        userId INTEGER NOT NULL DEFAULT 1,
        durationMinutes INTEGER NOT NULL,
        mode TEXT NOT NULL DEFAULT 'countdown',
        ambientTrack TEXT,
        startedAt TEXT NOT NULL DEFAULT (datetime('now')),
        endedAt TEXT,
        earnedMinutes INTEGER NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS ledger (
        id TEXT PRIMARY KEY,
        userId INTEGER NOT NULL DEFAULT 1,
        kind TEXT NOT NULL,
        amountMinutes INTEGER NOT NULL,
        sourceType TEXT NOT NULL,
        sourceId TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
        userId INTEGER PRIMARY KEY,
        defaultDurationMinutes INTEGER NOT NULL DEFAULT 25,
        defaultMode TEXT NOT NULL DEFAULT 'countdown',
        language TEXT NOT NULL DEFAULT 'en',
        strictMode INTEGER NOT NULL DEFAULT 1
    );
    INSERT OR IGNORE INTO users (id, name) VALUES (1, 'FocusGrove User');
    INSERT OR IGNORE INTO settings (userId) VALUES (1);
    """)
    await db.commit()
    await db.close()

def gen_id():
    return uuid.uuid4().hex[:12]

# ── Helpers ───────────────────────────────────────────────────────────────────

async def get_balance(db):
    row = await db.execute_fetchall(
        "SELECT COALESCE(SUM(CASE WHEN kind='earn' THEN amountMinutes ELSE -amountMinutes END), 0) AS bal FROM ledger WHERE userId=?",
        (USER_ID,)
    )
    return row[0][0] if row else 0

async def get_streak(db):
    rows = await db.execute_fetchall(
        "SELECT DISTINCT date(endedAt) as d FROM focus_sessions WHERE userId=? AND completed=1 ORDER BY d DESC",
        (USER_ID,)
    )
    if not rows:
        return 0
    dates = [row[0] for row in rows]
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    if dates[0] != today and dates[0] != yesterday:
        return 0
    streak = 1
    for i in range(len(dates) - 1):
        d1 = date.fromisoformat(dates[i])
        d2 = date.fromisoformat(dates[i + 1])
        if (d1 - d2).days == 1:
            streak += 1
        else:
            break
    return streak

async def get_stats(db):
    today = date.today().isoformat()
    week_start = (date.today() - timedelta(days=6)).isoformat()

    # Today
    row = await db.execute_fetchall(
        "SELECT COALESCE(SUM(earnedMinutes), 0) FROM focus_sessions WHERE userId=? AND completed=1 AND date(endedAt)=?",
        (USER_ID, today)
    )
    today_min = row[0][0] if row else 0

    # This week
    row = await db.execute_fetchall(
        "SELECT COALESCE(SUM(earnedMinutes), 0) FROM focus_sessions WHERE userId=? AND completed=1 AND date(endedAt)>=?",
        (USER_ID, week_start)
    )
    week_min = row[0][0] if row else 0

    # Total
    row = await db.execute_fetchall(
        "SELECT COALESCE(SUM(earnedMinutes), 0) FROM focus_sessions WHERE userId=? AND completed=1",
        (USER_ID,)
    )
    total_min = row[0][0] if row else 0

    # Weekly bars (7 days)
    bars = []
    for i in range(6, -1, -1):
        d = (date.today() - timedelta(days=i)).isoformat()
        row = await db.execute_fetchall(
            "SELECT COALESCE(SUM(earnedMinutes), 0) FROM focus_sessions WHERE userId=? AND completed=1 AND date(endedAt)=?",
            (USER_ID, d)
        )
        bars.append(row[0][0] if row else 0)
    max_bar = max(bars) if max(bars) > 0 else 1
    bars_normalized = [b / max_bar for b in bars]

    daily_avg = week_min // 7 if week_min > 0 else 0

    return {
        "todayFocusMinutes": today_min,
        "weekFocusMinutes": week_min,
        "dailyAvgMinutes": daily_avg,
        "totalFocusHours": round(total_min / 60, 1),
        "weeklyBars": bars_normalized,
    }

# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    await init_db()

# ── GET /me ───────────────────────────────────────────────────────────────────

@app.get("/api/me")
async def get_me():
    db = await get_db()
    try:
        user = await db.execute_fetchall("SELECT * FROM users WHERE id=?", (USER_ID,))
        if not user:
            raise HTTPException(404, "User not found")
        settings = await db.execute_fetchall("SELECT * FROM settings WHERE userId=?", (USER_ID,))
        s = settings[0] if settings else None
        balance = await get_balance(db)
        streak = await get_streak(db)
        stats = await get_stats(db)
        return {
            "id": USER_ID,
            "name": user[0][1],
            "balanceMinutes": balance,
            "dayStreak": streak,
            "settings": {
                "defaultDurationMinutes": s[1] if s else 25,
                "defaultMode": s[2] if s else "countdown",
                "language": s[3] if s else "en",
                "strictMode": bool(s[4]) if s else True,
            },
            **stats,
        }
    finally:
        await db.close()

# ── Rewards ───────────────────────────────────────────────────────────────────

@app.get("/api/rewards")
async def list_rewards():
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT * FROM rewards WHERE userId=? ORDER BY createdAt DESC", (USER_ID,)
        )
        return [{"id": r[0], "emoji": r[2], "name": r[3], "costMinutes": r[4], "badge": r[5], "createdAt": r[6]} for r in rows]
    finally:
        await db.close()

@app.post("/api/rewards", status_code=201)
async def create_reward(body: RewardCreate):
    db = await get_db()
    try:
        rid = gen_id()
        await db.execute(
            "INSERT INTO rewards (id, userId, emoji, name, costMinutes, badge) VALUES (?,?,?,?,?,?)",
            (rid, USER_ID, body.emoji, body.name, body.costMinutes, body.badge)
        )
        await db.commit()
        return {"id": rid, "emoji": body.emoji, "name": body.name, "costMinutes": body.costMinutes, "badge": body.badge}
    finally:
        await db.close()

@app.delete("/api/rewards/{reward_id}")
async def delete_reward(reward_id: str):
    db = await get_db()
    try:
        await db.execute("DELETE FROM rewards WHERE id=? AND userId=?", (reward_id, USER_ID))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()

@app.post("/api/rewards/{reward_id}/claim")
async def claim_reward(reward_id: str):
    db = await get_db()
    try:
        rows = await db.execute_fetchall("SELECT * FROM rewards WHERE id=? AND userId=?", (reward_id, USER_ID))
        if not rows:
            raise HTTPException(404, "Reward not found")
        cost = rows[0][4]
        balance = await get_balance(db)
        if balance < cost:
            raise HTTPException(409, f"Insufficient balance: have {balance}, need {cost}")
        lid = gen_id()
        await db.execute(
            "INSERT INTO ledger (id, userId, kind, amountMinutes, sourceType, sourceId) VALUES (?,?,?,?,?,?)",
            (lid, USER_ID, "spend", cost, "reward", reward_id)
        )
        await db.commit()
        new_balance = await get_balance(db)
        return {"ok": True, "balanceMinutes": new_balance}
    finally:
        await db.close()

# ── Sessions ──────────────────────────────────────────────────────────────────

@app.post("/api/sessions", status_code=201)
async def start_session(body: SessionStart):
    db = await get_db()
    try:
        sid = gen_id()
        await db.execute(
            "INSERT INTO focus_sessions (id, userId, durationMinutes, mode, ambientTrack) VALUES (?,?,?,?,?)",
            (sid, USER_ID, body.durationMinutes, body.mode, body.ambientTrack)
        )
        await db.commit()
        return {"id": sid, "durationMinutes": body.durationMinutes, "mode": body.mode}
    finally:
        await db.close()

@app.post("/api/sessions/{session_id}/complete")
async def complete_session(session_id: str):
    db = await get_db()
    try:
        rows = await db.execute_fetchall("SELECT * FROM focus_sessions WHERE id=? AND userId=?", (session_id, USER_ID))
        if not rows:
            raise HTTPException(404, "Session not found")
        if rows[0][7]:  # already completed
            raise HTTPException(409, "Session already completed")
        earned = rows[0][2]  # durationMinutes
        now = datetime.utcnow().isoformat()
        await db.execute(
            "UPDATE focus_sessions SET completed=1, earnedMinutes=?, endedAt=? WHERE id=?",
            (earned, now, session_id)
        )
        lid = gen_id()
        await db.execute(
            "INSERT INTO ledger (id, userId, kind, amountMinutes, sourceType, sourceId) VALUES (?,?,?,?,?,?)",
            (lid, USER_ID, "earn", earned, "session", session_id)
        )
        await db.commit()
        balance = await get_balance(db)
        return {"ok": True, "earnedMinutes": earned, "balanceMinutes": balance}
    finally:
        await db.close()

@app.post("/api/sessions/{session_id}/abort")
async def abort_session(session_id: str):
    db = await get_db()
    try:
        now = datetime.utcnow().isoformat()
        await db.execute(
            "UPDATE focus_sessions SET completed=0, endedAt=? WHERE id=? AND userId=?",
            (now, session_id, USER_ID)
        )
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()

# ── History ───────────────────────────────────────────────────────────────────

@app.get("/api/history")
async def get_history(limit: int = 20):
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT l.*, CASE WHEN l.sourceType='reward' THEN r.name ELSE 'Focus session' END as sourceName, "
            "CASE WHEN l.sourceType='reward' THEN r.emoji ELSE '🌳' END as sourceEmoji "
            "FROM ledger l LEFT JOIN rewards r ON l.sourceType='reward' AND l.sourceId=r.id "
            "WHERE l.userId=? ORDER BY l.createdAt DESC LIMIT ?",
            (USER_ID, limit)
        )
        return [{"id": r[0], "kind": r[2], "amountMinutes": r[3], "sourceType": r[4], "sourceId": r[5], "createdAt": r[6], "sourceName": r[7], "sourceEmoji": r[8]} for r in rows]
    finally:
        await db.close()

# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
async def stats_endpoint():
    db = await get_db()
    try:
        return await get_stats(db)
    finally:
        await db.close()

# ── Settings ──────────────────────────────────────────────────────────────────

@app.patch("/api/settings")
async def patch_settings(body: SettingsPatch):
    db = await get_db()
    try:
        updates = []
        params = []
        if body.defaultDurationMinutes is not None:
            updates.append("defaultDurationMinutes=?"); params.append(body.defaultDurationMinutes)
        if body.defaultMode is not None:
            updates.append("defaultMode=?"); params.append(body.defaultMode)
        if body.language is not None:
            updates.append("language=?"); params.append(body.language)
        if body.strictMode is not None:
            updates.append("strictMode=?"); params.append(1 if body.strictMode else 0)
        if updates:
            params.append(USER_ID)
            await db.execute(f"UPDATE settings SET {','.join(updates)} WHERE userId=?", params)
            await db.commit()
        return {"ok": True}
    finally:
        await db.close()

# ── Wipe ──────────────────────────────────────────────────────────────────────

@app.delete("/api/me/data")
async def wipe_data():
    db = await get_db()
    try:
        for table in ["ledger", "focus_sessions", "rewards"]:
            await db.execute(f"DELETE FROM {table} WHERE userId=?", (USER_ID,))
        await db.execute("UPDATE settings SET defaultDurationMinutes=25, defaultMode='countdown', language='en', strictMode=1 WHERE userId=?", (USER_ID,))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()

# ── Serve static frontend ────────────────────────────────────────────────────

frontend_dir = os.path.join(os.path.dirname(__file__), "..")
if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")
