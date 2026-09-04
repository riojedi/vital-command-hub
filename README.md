# Vital Command Hub

Technical Integration Specification: Vital4Living Lovable Front-End & VPS FastAPI Bridge

1. Architectural Synergy: The Lovable-VPS Hybrid Model

This architecture implements a strategic decoupling of the user interface from the high-latency execution environment. By separating the React-based front-end (hosted on Lovable/Vercel) from the Python-driven automation engine (hosted on an OVHcloud VPS at 15.204.83.117), we ensure a "Zero-Lag" user experience. While the front-end provides an agile, mobile-optimized command surface, the VPS manages the resource-intensive CrewAI multi-agent runs, Dockerized PostgreSQL 16 persistence, and Ghost CMS publishing cycles. This hybrid model allows for horizontal scalability where complex AI research tasks—often taking minutes to complete—never compromise the responsiveness of the UI dashboard.

Secure Communication Protocol

All data exchange between the Lovable front-end and the VPS is secured via an encrypted RESTful bridge.

* Security Handshake: Access is restricted via CORS (Cross-Origin Resource Sharing), configured to whitelist only the specific production domains of the front-end.
* Bearer Token Authentication: Every request must include a SECURE_API_TOKEN in the Authorization header. To ensure system-wide consistency, this token is mapped directly to the LITELLM_MASTER_KEY defined in the VPS .env manifest.
* State Durability: This separation ensures "State Durability," allowing the backend to maintain the autonomous agent lifecycle even if the user session terminates.

2. Production-Grade API Bridge: The api_server.py Blueprint

The FastAPI server acts as the central nervous system, bridging the webzine’s UI with the database and script ecosystem. This implementation utilizes a connection pool for high-concurrency reliability and subprocess management to ensure long-running AI tasks do not block the API worker threads.

FastAPI Implementation Template

This blueprint must be deployed to /app/webzine/scripts/api_server.py and run within the system's Python 3 virtual environment.

import os
import subprocess
from datetime import datetime
from typing import List
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2 import pool

app = FastAPI(title="Vital4Living API Bridge")

# Security: Map to LITELLM_MASTER_KEY from Source .env
API_TOKEN = os.getenv("LITELLM_MASTER_KEY")

# Connection Pool for Production Reliability
db_pool = psycopg2.pool.SimpleConnectionPool(
    1, 10,
    dbname="webzine_state", 
    user="webzine_admin", 
    password=os.getenv("POSTGRES_PASSWORD"), 
    host="localhost"
)

class StrategyUpdate(BaseModel):
    active_guidelines: str
    priority_keywords: List[str]
    blacklist_themes: List[str]

def verify_token(authorization: str = Header(None)):
    if authorization != f"Bearer {API_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.get("/health")
def health_check():
    return {"status": "operational", "vps_ip": "15.204.83.117"}

@app.post("/trigger-run", dependencies=[Depends(verify_token)])
def trigger_agent_run():
    """
    Spawns the AI script as a non-blocking subprocess.
    Logs the start event in agent_runs table for front-end telemetry.
    """
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        # Log start event
        cur.execute(
            "INSERT INTO agent_runs (workflow, status, started_at) VALUES (%s, %s, %s) RETURNING run_id",
            ('Production_Run', 'researching', datetime.now())
        )
        run_id = cur.fetchone()[0]
        conn.commit()
        
        # Execute script without blocking API response
        proc = subprocess.Popen(["python3", "/app/webzine/scripts/run_and_publish.py"])
        
        return {"status": "initiated", "task_id": run_id, "pid": proc.pid}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db_pool.putconn(conn)

@app.get("/analytics", dependencies=[Depends(verify_token)])
def get_analytics():
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT title, publication_date, ghost_post_id FROM historical_ledger ORDER BY publication_date DESC LIMIT 5")
        history = cur.fetchall()
        cur.execute("SELECT SUM(token_usage), SUM(estimated_cost) FROM agent_runs")
        totals = cur.fetchone()
        return {
            "recent_publications": [{"title": h[0], "date": h[1]} for h in history],
            "total_token_usage": totals[0],
            "total_estimated_cost": float(totals[1] or 0)
        }
    finally:
        db_pool.putconn(conn)

@app.patch("/config", dependencies=[Depends(verify_token)])
def update_config(strategy: StrategyUpdate):
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO operational_strategy (active_guidelines, priority_keywords, blacklist_themes, updated_at) VALUES (%s, %s, %s, %s)",
            (strategy.active_guidelines, strategy.priority_keywords, strategy.blacklist_themes, datetime.now())
        )
        conn.commit()
        return {"status": "success", "message": "Operational strategy updated."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db_pool.putconn(conn)


3. Database Integration & Schema-v2 Mapping

Strict data grounding in the PostgreSQL 16 webzine_state database is critical for maintaining "State Durability" across the Vital4Living ecosystem. Every UI action in Lovable must reflect or modify the current state defined in the Schema-v2 SQL.

Endpoint-to-Schema Mapping

API Endpoint	Target Table	Primary Purpose	UI Component
GET /queue	editorial_queue	Article lifecycle monitoring	Dynamic Task Queue
GET /telemetry	agent_runs	Model performance & token costs	System Telemetry Dashboard
GET /analytics	historical_ledger	Publication history & ghost IDs	Metric Cards (Revenue/Cost)
PATCH /config	operational_strategy	Modifying AI guidelines/keywords	AI Assistant Command Center

The "So What?" for the Developer: These mappings ensure the dashboard provides a real-time window into the autonomous agent lifecycle. By surfacing agent_runs data, the front-end can alert the operator if the cost per article deviates from the $0.18 SLA target.

4. UI/UX Design System & Interactive Dashboard Components

The Vital4Living design system is optimized for high-glare, mobile-first alpine environments, utilizing high-contrast typography and large touch targets (minimum 48px) for field professionals.

Alpine-Optimized Styling (Tailwind CSS)

* Typography: 19px base font size for extreme legibility in outdoor conditions.
* Color Palette: Standard high-contrast black/white backgrounds with strategic use of #ff4a00 (High-Contrast Orange) for safety alerts and verification_failed states.

Interactive Components

1. Metric Cards: High-contrast cards featuring lucide-react icons (e.g., Zap for token cost, BarChart for engagement).
2. Dynamic Task Queue: An interactive list visualizing the 15 exact database states identified in the source:
  * States: queued, claimed, researching, research_failed, verifying, verification_failed, drafting, editing, revision_required, approved, pending_human_review, publishing, published, publication_failed, quarantined.
  * Visual Cue: Items in verification_failed or quarantined must utilize the #ff4a00 border.
3. Collapsible Chat Sidebar: A sleek container for the Autopilot AI Assistant that allows for system-level commands without cluttering the data view.

5. The Autopilot AI Assistant: Chat-to-System Command Logic

The Autopilot Assistant serves as a natural language interface, converting human intent into structured API calls that modify the system's core operating parameters.

Command Transformation & Filesystem Access

Beyond database updates, the FastAPI bridge is authorized to modify the VPS file system, specifically the Ghost CMS config.production.json and theme directory.

* Example Commands:
  * User: "Make Sierra more opinionated." -> Action: PATCH /config updates operational_strategy with new persona guidelines.
  * User: "Shift AdSense block." -> Action: FastAPI executes a script to rewrite the Ghost CMS template config on the VPS.

Deterministic JSON Structure

The Assistant must send the following structure to the VPS to ensure safe execution:

{
  "action": "system_config_update",
  "target_table": "operational_strategy",
  "parameters": {
    "priority_keywords": ["Mondo sizing", "boot volume"],
    "active_guidelines": "Focus on high-engagement gear fit guides."
  },
  "authorization_context": "admin_verified"
}


This "human-in-the-loop" model fulfills the Emergency Control mandate, allowing for instant intervention or strategy pivots.

6. Deployment Lifecycle & Integration Checklist

The system follows a gated rollout, moving from "Shadow Mode" to "Full Operational Autonomy."

Deployment Steps

1. Provisioning: SSH into OVHcloud Ubuntu 24.04: ssh root@15.204.83.117.
2. Repository Setup:
  * cd /app/webzine
  * git clone https://github.com/riojedi/vital4living.git . (Note the period to prevent nesting).
  * git pull origin main to ensure the latest production configs are active.
3. Security: Initialize .env with LITELLM_MASTER_KEY and POSTGRES_PASSWORD. Set permissions: chmod 600 .env.
4. Container Launch: sudo docker compose up -d to initialize PostgreSQL 16, n8n, and Ghost.
5. Front-End Handshake: Configure Lovable environment variables to point to the VPS IP and provide the SECURE_API_TOKEN.

Production "Definition of Done"

* Execution Success: \ge 98.5\% completion rate for automated workflows.
* Cost Efficiency: Mean cost per article maintained below $0.18.
* Factual Rigor: 0.0% tolerance for unsupported claims in published output.
* Performance: Mean production execution time \le 4 minutes per entry.

This integrated architecture transforms Vital4Living from a static webzine into an autonomous outdoor intelligence engine, providing the factual rigor and design clarity required by field professionals.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/47d8048e-e608-4103-af5b-7689b8a4d4d1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
