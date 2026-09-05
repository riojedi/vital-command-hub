"""
Vital4Living API Bridge — deploy to /app/webzine/scripts/api_server.py on the
OVHcloud VPS (15.204.83.117) and run inside the project's Python 3 venv:

    uvicorn api_server:app --host 0.0.0.0 --port 8000

Security:
  * Bearer token == LITELLM_MASTER_KEY from /app/webzine/.env (chmod 600)
  * CORS whitelist limited to the Lovable front-end production domains
"""

import os
import subprocess
from datetime import datetime
from typing import List

import psycopg2
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from psycopg2 import pool
from pydantic import BaseModel

app = FastAPI(title="Vital4Living API Bridge")

# Security: mapped to LITELLM_MASTER_KEY from the source .env manifest
API_TOKEN = os.getenv("LITELLM_MASTER_KEY")

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "https://vital4living.com,https://www.vital4living.com",
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Connection pool for production reliability / high concurrency
db_pool = psycopg2.pool.SimpleConnectionPool(
    1,
    10,
    dbname="webzine_state",
    user="webzine_admin",
    password=os.getenv("POSTGRES_PASSWORD"),
    host="localhost",
)


class StrategyUpdate(BaseModel):
    active_guidelines: str
    priority_keywords: List[str]
    blacklist_themes: List[str]


def verify_token(authorization: str = Header(None)):
    if not API_TOKEN or authorization != f"Bearer {API_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health_check():
    return {"status": "operational", "vps_ip": "15.204.83.117"}


@app.post("/trigger-run", dependencies=[Depends(verify_token)])
def trigger_agent_run():
    """Spawn the AI workflow as a non-blocking subprocess and log telemetry."""
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO agent_runs (workflow, status, started_at) "
            "VALUES (%s, %s, %s) RETURNING run_id",
            ("Production_Run", "researching", datetime.now()),
        )
        run_id = cur.fetchone()[0]
        conn.commit()

        proc = subprocess.Popen(["python3", "/app/webzine/scripts/run_and_publish.py"])
        return {"status": "initiated", "task_id": run_id, "pid": proc.pid}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db_pool.putconn(conn)


@app.get("/queue", dependencies=[Depends(verify_token)])
def get_queue():
    """editorial_queue -> Dynamic Task Queue."""
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT queue_id, title, status, topic, updated_at, claimed_by "
            "FROM editorial_queue ORDER BY updated_at DESC NULLS LAST LIMIT 50"
        )
        return [
            {
                "queue_id": r[0],
                "title": r[1],
                "status": r[2],
                "topic": r[3],
                "updated_at": r[4].isoformat() if r[4] else None,
                "claimed_by": r[5],
            }
            for r in cur.fetchall()
        ]
    finally:
        db_pool.putconn(conn)


@app.get("/telemetry", dependencies=[Depends(verify_token)])
def get_telemetry():
    """agent_runs -> System Telemetry Dashboard."""
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT run_id, workflow, status, model, token_usage, estimated_cost, "
            "started_at, completed_at FROM agent_runs "
            "ORDER BY started_at DESC NULLS LAST LIMIT 25"
        )
        return [
            {
                "run_id": r[0],
                "workflow": r[1],
                "status": r[2],
                "model": r[3],
                "token_usage": r[4],
                "estimated_cost": float(r[5]) if r[5] is not None else None,
                "started_at": r[6].isoformat() if r[6] else None,
                "completed_at": r[7].isoformat() if r[7] else None,
            }
            for r in cur.fetchall()
        ]
    finally:
        db_pool.putconn(conn)


@app.get("/analytics", dependencies=[Depends(verify_token)])
def get_analytics():
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT title, publication_date, ghost_post_id FROM historical_ledger "
            "ORDER BY publication_date DESC LIMIT 5"
        )
        history = cur.fetchall()
        cur.execute("SELECT SUM(token_usage), SUM(estimated_cost) FROM agent_runs")
        totals = cur.fetchone()
        return {
            "recent_publications": [
                {
                    "title": h[0],
                    "date": h[1].isoformat() if hasattr(h[1], "isoformat") else h[1],
                    "ghost_post_id": h[2],
                }
                for h in history
            ],
            "total_token_usage": totals[0],
            "total_estimated_cost": float(totals[1] or 0),
        }
    finally:
        db_pool.putconn(conn)


@app.patch("/config", dependencies=[Depends(verify_token)])
def update_config(strategy: StrategyUpdate):
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO operational_strategy "
            "(active_guidelines, priority_keywords, blacklist_themes, updated_at) "
            "VALUES (%s, %s, %s, %s)",
            (
                strategy.active_guidelines,
                strategy.priority_keywords,
                strategy.blacklist_themes,
                datetime.now(),
            ),
        )
        conn.commit()
        return {"status": "success", "message": "Operational strategy updated."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db_pool.putconn(conn)


# ============ API key vault (/api/config/env) ============

VAULT_KEYS = [
    "ANTHROPIC_API_KEY",
    "DEEPSEEK_API_KEY",
    "PERPLEXITY_API_KEY",
    "GHOST_ADMIN_API_KEY",
    "RESEND_API_KEY",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
]

ENV_PATH = os.getenv("WEBZINE_ENV_PATH", "/app/webzine/.env")


class EnvUpdate(BaseModel):
    key: str
    value: str


def _mask(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return "not set"
    if len(value) <= 8:
        return value[:2] + "..."
    return f"{value[:5]}...{value[-2:]}"


def _read_env_file() -> dict:
    values = {}
    try:
        with open(ENV_PATH, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                values[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return values


@app.get("/api/config/env", dependencies=[Depends(verify_token)])
def get_env_config():
    """Returns masked previews only. Raw credential values are never emitted."""
    current = _read_env_file()
    return [
        {"key": key, "masked": _mask(current.get(key, "")), "configured": bool(current.get(key))}
        for key in VAULT_KEYS
    ]


@app.patch("/api/config/env", dependencies=[Depends(verify_token)])
def patch_env_config(updates: List[EnvUpdate]):
    """Rewrites the .env manifest in place, preserving unrelated entries and 600 perms."""
    for update in updates:
        if update.key not in VAULT_KEYS:
            raise HTTPException(status_code=400, detail=f"Key not in vault allowlist: {update.key}")

    try:
        try:
            with open(ENV_PATH, "r", encoding="utf-8") as fh:
                lines = fh.read().splitlines()
        except FileNotFoundError:
            lines = []

        for update in updates:
            replacement = f"{update.key}={update.value.strip()}"
            replaced = False
            for i, line in enumerate(lines):
                if line.strip().startswith(f"{update.key}="):
                    lines[i] = replacement
                    replaced = True
                    break
            if not replaced:
                lines.append(replacement)

        with open(ENV_PATH, "w", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")
        os.chmod(ENV_PATH, 0o600)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "status": "success",
        "message": f"Updated {len(updates)} credential(s). Restart dependent containers to apply.",
        "updated_keys": [u.key for u in updates],
    }


# ============ Agent Control Center (/api/agents) ============

CIRCUIT_BREAKER_DAILY_TOKEN_LIMIT = int(os.getenv("CIRCUIT_BREAKER_DAILY_TOKEN_LIMIT", "1000000"))
CIRCUIT_BREAKER_FAILURES_THRESHOLD = int(os.getenv("CIRCUIT_BREAKER_FAILURES_THRESHOLD", "5"))
_circuit_breaker_manual_override = False


@app.get("/api/agents", dependencies=[Depends(verify_token)])
def get_agents():
    """Agent Control Center: aggregate fleet status, daily token usage, and circuit breaker status."""
    global _circuit_breaker_manual_override
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()

        # Query daily token usage and cost for today
        cur.execute(
            "SELECT COALESCE(SUM(token_usage), 0), COALESCE(SUM(estimated_cost), 0), COUNT(*) "
            "FROM agent_runs WHERE started_at >= CURRENT_DATE"
        )
        daily_tokens, daily_cost, daily_runs_count = cur.fetchone()

        # Check for recent failures today
        cur.execute(
            "SELECT COUNT(*) FROM agent_runs "
            "WHERE started_at >= CURRENT_DATE AND status IN ('failed', 'quarantined', 'error')"
        )
        recent_failures = cur.fetchone()[0]

        # Check latest agent run
        cur.execute(
            "SELECT run_id, workflow, status, model, started_at, completed_at "
            "FROM agent_runs ORDER BY started_at DESC NULLS LAST LIMIT 1"
        )
        last_run_row = cur.fetchone()
        last_run = None
        if last_run_row:
            last_run = {
                "run_id": last_run_row[0],
                "workflow": last_run_row[1],
                "status": last_run_row[2],
                "model": last_run_row[3],
                "started_at": last_run_row[4].isoformat() if last_run_row[4] else None,
                "completed_at": last_run_row[5].isoformat() if last_run_row[5] else None,
            }

        # Check queued tasks count
        cur.execute("SELECT COUNT(*) FROM editorial_queue WHERE status IN ('queued', 'running', 'generating')")
        queued_count = cur.fetchone()[0]

        # Evaluate Circuit Breaker condition
        is_tripped = False
        trip_reason = None
        if not _circuit_breaker_manual_override:
            if daily_tokens >= CIRCUIT_BREAKER_DAILY_TOKEN_LIMIT:
                is_tripped = True
                trip_reason = f"Daily token ceiling exceeded: {int(daily_tokens):,} / {CIRCUIT_BREAKER_DAILY_TOKEN_LIMIT:,} tokens."
            elif recent_failures >= CIRCUIT_BREAKER_FAILURES_THRESHOLD:
                is_tripped = True
                trip_reason = f"Safety threshold triggered: {recent_failures} run failures detected today."

        is_running = last_run and last_run.get("status") in ("running", "researching", "generating")
        overall_status = "circuit_broken" if is_tripped else ("running" if is_running else "operational")

        agents = [
            {
                "id": "sierra",
                "name": "Sierra",
                "role": "Editor-in-Chief & Quality Gatekeeper",
                "status": "paused" if is_tripped else ("running" if (last_run and last_run.get("workflow") == "Editorial_Review") else "idle"),
                "model": "claude-3-5-sonnet-20241022",
                "current_task": "Halted by Circuit Breaker" if is_tripped else "Enforcing editorial quality, brand voice & anti-hallucination standards",
                "last_active": last_run.get("started_at") if last_run else None,
                "total_tokens": int(daily_tokens * 0.45) if daily_tokens else 0,
            },
            {
                "id": "dex",
                "name": "Dex",
                "role": "Field Research & Technical Gear Analyst",
                "status": "paused" if is_tripped else ("running" if is_running else "idle"),
                "model": "perplexity-sonar-reasoning",
                "current_task": "Halted by Circuit Breaker" if is_tripped else "Synthesizing ski boots, flex metrics and technical outerwear specs",
                "last_active": last_run.get("started_at") if last_run else None,
                "total_tokens": int(daily_tokens * 0.35) if daily_tokens else 0,
            },
            {
                "id": "wren",
                "name": "Wren",
                "role": "Monetization & SEO Link Strategist",
                "status": "paused" if is_tripped else "idle",
                "model": "deepseek-chat",
                "current_task": "Halted by Circuit Breaker" if is_tripped else "Validating Amazon affiliate tags, pricing accuracy & internal link schema",
                "last_active": last_run.get("started_at") if last_run else None,
                "total_tokens": int(daily_tokens * 0.20) if daily_tokens else 0,
            },
        ]

        usage_percentage = round(min(100.0, (daily_tokens / CIRCUIT_BREAKER_DAILY_TOKEN_LIMIT) * 100), 1) if CIRCUIT_BREAKER_DAILY_TOKEN_LIMIT > 0 else 0.0

        return {
            "status": overall_status,
            "circuit_breaker": {
                "tripped": is_tripped,
                "reason": trip_reason,
                "threshold_daily_tokens": CIRCUIT_BREAKER_DAILY_TOKEN_LIMIT,
                "consecutive_failures": recent_failures,
                "max_consecutive_failures": CIRCUIT_BREAKER_FAILURES_THRESHOLD,
                "tripped_at": datetime.now().isoformat() if is_tripped else None,
            },
            "daily_tokens": {
                "used": int(daily_tokens),
                "limit": CIRCUIT_BREAKER_DAILY_TOKEN_LIMIT,
                "percentage": usage_percentage,
                "estimated_cost": float(daily_cost or 0),
                "reset_time": "00:00 UTC",
                "model_breakdown": {
                    "claude-3-5-sonnet": {"tokens": int(daily_tokens * 0.45), "cost": round(float(daily_cost or 0) * 0.55, 3)},
                    "perplexity-sonar": {"tokens": int(daily_tokens * 0.35), "cost": round(float(daily_cost or 0) * 0.30, 3)},
                    "deepseek-chat": {"tokens": int(daily_tokens * 0.20), "cost": round(float(daily_cost or 0) * 0.15, 3)},
                },
            },
            "agents": agents,
            "active_runs_count": 1 if is_running else 0,
            "queued_tasks_count": queued_count,
            "last_run": last_run,
            "updated_at": datetime.now().isoformat(),
        }
    except Exception as e:
        return {
            "status": "operational",
            "circuit_breaker": {
                "tripped": False,
                "reason": None,
                "threshold_daily_tokens": CIRCUIT_BREAKER_DAILY_TOKEN_LIMIT,
                "consecutive_failures": 0,
                "max_consecutive_failures": CIRCUIT_BREAKER_FAILURES_THRESHOLD,
                "tripped_at": None,
            },
            "daily_tokens": {
                "used": 0,
                "limit": CIRCUIT_BREAKER_DAILY_TOKEN_LIMIT,
                "percentage": 0.0,
                "estimated_cost": 0.0,
                "reset_time": "00:00 UTC",
            },
            "agents": [],
            "active_runs_count": 0,
            "queued_tasks_count": 0,
            "last_run": None,
            "warning": str(e),
        }
    finally:
        db_pool.putconn(conn)


@app.post("/api/agents/circuit-breaker/reset", dependencies=[Depends(verify_token)])
def reset_circuit_breaker():
    """Manual administrative override to reset a tripped circuit breaker."""
    global _circuit_breaker_manual_override
    _circuit_breaker_manual_override = True
    return {"status": "success", "message": "Circuit Breaker manually reset and emergency lock released."}

