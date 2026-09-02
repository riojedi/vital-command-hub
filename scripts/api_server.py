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
