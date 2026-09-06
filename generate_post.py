#!/usr/bin/env python3
"""
Vital Command Hub - Post Generation Entry Point
Runs a test post generation and creates a new draft in Ghost CMS
using the verified local curated manifest image pipeline.
"""
import sys
from image_engine import create_ghost_draft

if __name__ == "__main__":
    title = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "Alpine Backcountry Touring & Gear Analysis 2026"
    persona = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "Sierra Marlowe"
    tier = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 1
    create_ghost_draft(topic_title=title, persona=persona, tier=tier)
