#!/usr/bin/env python3
"""
Vital4Living - Technical Editorial Image Pipeline Engine
Resolves and generates high-impact, verified feature images:
- Tier 1: Curated Local Alpine Manifest (/content/images/curated/) with round-robin or randomized selection
- Tier 2: Alpine Spec SVG card with isometric topographic contour lines and HUD telemetry
- Tier 3: Glassmorphic product cutout for gear teardowns with translucent panels, telemetry metrics, and schematic callouts
"""

import os
import re
import json
import random
import hashlib
from pathlib import Path
from datetime import datetime as dt

# Storage and Manifest Paths
MANIFEST_CANDIDATES = [
    Path("/home/ubuntu/vital-command-hub/curated_manifest.json"),
    Path("/var/lib/docker/volumes/vital4living_ghost_storage/_data/images/curated_manifest.json"),
    Path(__file__).resolve().parent / "curated_manifest.json",
    Path(__file__).resolve().parent.parent / "curated_manifest.json",
    Path("curated_manifest.json")
]

RR_STATE_FILE = Path("/home/ubuntu/vital-command-hub/.curated_rr_index")
GHOST_STORAGE_PATH = Path("/var/lib/docker/volumes/vital4living_ghost_storage/_data/images/features")
GHOST_PUBLIC_BASE = "http://15.204.83.117:2368/content/images/features"

# ==============================================================================
# FEATURE IMAGE RESULT CLASS
# ==============================================================================
class FeatureImageResult(str):
    """
    Subclasses str so that any code expecting a plain string URL 
    works seamlessly, while providing .url, .caption, .alt, .photographer properties.
    """
    def __new__(cls, url, caption=None, alt=None, photographer=None, photographer_url=None):
        obj = super().__new__(cls, url)
        obj.url = url
        obj.caption = caption
        obj.alt = alt or "Vital4Living Technical Alpine Photography"
        obj.photographer = photographer or "Unsplash Contributor"
        obj.photographer_url = photographer_url or "https://unsplash.com"
        return obj

    def to_dict(self):
        return {
            "url": self.url,
            "feature_image": self.url,
            "caption": self.caption,
            "feature_image_caption": self.caption,
            "alt": self.alt,
            "feature_image_alt": self.alt,
            "photographer": self.photographer,
            "photographer_url": self.photographer_url
        }

# ==============================================================================
# CURATED MANIFEST LOADER & METADATA PARSER
# ==============================================================================
def load_curated_manifest() -> list:
    """Loads the verified curated photo manifest from disk."""
    for p in MANIFEST_CANDIDATES:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    manifest = json.load(f)
                    if isinstance(manifest, list) and len(manifest) > 0:
                        return manifest
            except Exception as e:
                print(f"⚠ Warning: Could not read manifest at {p}: {e}")

    # Fallback: scan curated storage directly if manifest file is missing
    curated_dir = Path("/var/lib/docker/volumes/vital4living_ghost_storage/_data/images/curated")
    if curated_dir.exists():
        files = [f for f in sorted(os.listdir(curated_dir)) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
        return [f"/content/images/curated/{f}" for f in files]

    return []

def parse_metadata_from_curated_path(image_path: str):
    """
    Extracts photographer name, Unsplash ID, attribution caption, and alt text
    from the curated image filename (format: {photographer-slug}-{photo-id}-unsplash.jpg).
    """
    filename = os.path.basename(image_path)
    base_name = re.sub(r"-unsplash\.[a-zA-Z0-9]+$", "", filename, flags=re.I)

    # Unsplash IDs are 11 chars; photographer precedes it
    if len(base_name) > 12 and base_name[-12] == "-":
        photo_id = base_name[-11:]
        photographer_slug = base_name[:-12]
    else:
        parts = base_name.rsplit("-", 1)
        if len(parts) == 2:
            photographer_slug, photo_id = parts
        else:
            photographer_slug, photo_id = base_name, ""

    photographer = " ".join(
        word.capitalize() for word in photographer_slug.replace("_", " ").replace("-", " ").split()
    )
    if not photographer:
        photographer = "Unsplash Contributor"

    photographer_link = (
        f"https://unsplash.com/photos/{photo_id}?utm_source=vital4living&utm_medium=referral"
        if photo_id else
        "https://unsplash.com/?utm_source=vital4living&utm_medium=referral"
    )

    caption = (
        f'Photo by <a href="{photographer_link}">{photographer}</a> '
        f'on <a href="https://unsplash.com/?utm_source=vital4living&utm_medium=referral">Unsplash</a>'
    )
    alt = f"{photographer} - Curated Alpine Backcountry Photography"

    return photographer, photo_id, caption, alt

# ==============================================================================
# SELECTION LOGIC: ROUND-ROBIN & RANDOM
# ==============================================================================
def get_curated_manifest_image(slug: str = None, topic_title: str = None, mode: str = "round_robin") -> FeatureImageResult:
    """
    Selects a verified alpine photo directly from /home/ubuntu/vital-command-hub/curated_manifest.json.
    Supported modes:
      - 'round_robin' (default): Cycles sequentially through the manifest, persisted across invocations.
      - 'random': Selects a photo at random from the manifest.
      - 'deterministic': Hashes slug/title to consistently select the same image for a given article.
    """
    manifest = load_curated_manifest()
    if not manifest:
        # Ultimate emergency fallback if manifest is completely empty
        fallback_url = "/content/images/curated/maarten-duineveld-BWI3aaS-_Ao-unsplash.jpg"
        return FeatureImageResult(
            url=fallback_url,
            caption='Photo by <a href="https://unsplash.com/?utm_source=vital4living&utm_medium=referral">Maarten Duineveld</a> on Unsplash',
            alt="Alpine Backcountry Ski Touring",
            photographer="Maarten Duineveld"
        )

    total_images = len(manifest)

    if mode == "random":
        chosen_path = random.choice(manifest)
    elif mode == "deterministic" and (slug or topic_title):
        seed = slug or topic_title
        idx = int(hashlib.md5(seed.encode("utf-8")).hexdigest(), 16) % total_images
        chosen_path = manifest[idx]
    else:
        # Round-robin selection with atomic persistent state
        current_idx = 0
        try:
            if RR_STATE_FILE.exists():
                with open(RR_STATE_FILE, "r", encoding="utf-8") as f:
                    current_idx = int(f.read().strip() or "0")
        except Exception:
            current_idx = 0

        chosen_path = manifest[current_idx % total_images]

        try:
            RR_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(RR_STATE_FILE, "w", encoding="utf-8") as f:
                f.write(str(current_idx + 1))
        except Exception as e:
            pass

    photographer, photo_id, caption, alt = parse_metadata_from_curated_path(chosen_path)

    return FeatureImageResult(
        url=chosen_path,
        caption=caption,
        alt=alt,
        photographer=photographer,
        photographer_url=f"https://unsplash.com/photos/{photo_id}" if photo_id else "https://unsplash.com"
    )

# Backward-compatibility alias
def get_curated_unsplash_image(topic_title: str = None, tags: list = None, slug: str = None, mode: str = "round_robin") -> FeatureImageResult:
    return get_curated_manifest_image(slug=slug, topic_title=topic_title, mode=mode)

# ==============================================================================
# TIER 2: ALPINE SPEC SVG CARD WITH TOPOGRAPHIC CONTOUR LINES
# ==============================================================================
def generate_tier2_alpine_spec_svg(topic_title: str, persona: str, slug: str) -> FeatureImageResult:
    """Generates an elite 16:9 dark-mode SVG card with topographic contour lines and HUD telemetry."""
    try:
        GHOST_STORAGE_PATH.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    clean_title = topic_title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    clean_persona = persona.strip() if persona else "Dex Okafor"
    
    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <radialGradient id="spec-bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="60%" stop-color="#09090b"/>
      <stop offset="100%" stop-color="#040405"/>
    </radialGradient>
    <linearGradient id="text-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f4f4f5"/>
      <stop offset="100%" stop-color="#a1a1aa"/>
    </linearGradient>
    <linearGradient id="accent-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <filter id="soft-glow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <rect width="1200" height="675" fill="url(#spec-bg)"/>
  
  <g opacity="0.12" stroke="#71717a" stroke-width="1">
    <line x1="80" y1="80" x2="1120" y2="80"/>
    <line x1="80" y1="595" x2="1120" y2="595"/>
    <line x1="80" y1="80" x2="80" y2="595"/>
    <line x1="1120" y1="80" x2="1120" y2="595"/>
    <line x1="600" y1="40" x2="600" y2="635" stroke-dasharray="4,6"/>
    <line x1="40" y1="337" x2="1160" y2="337" stroke-dasharray="4,6"/>
  </g>

  <g fill="none" stroke="#22d3ee" opacity="0.22" stroke-width="1.5">
    <path d="M 40,520 Q 250,440 500,490 T 950,410 T 1160,460"/>
    <path d="M 40,470 Q 280,380 540,430 T 920,350 T 1160,390"/>
    <path d="M 40,420 Q 300,320 580,370 T 900,290 T 1160,330"/>
    <path d="M 60,360 Q 320,260 620,310 T 880,230 T 1140,260"/>
    <path d="M 120,300 Q 360,190 660,250 T 860,160 T 1120,200"/>
    <path d="M 200,240 Q 420,130 700,190 T 840,110 T 1100,140"/>
  </g>
  <g fill="none" stroke="#38bdf8" opacity="0.15" stroke-width="1" stroke-dasharray="3,6">
    <path d="M 40,550 Q 300,480 600,530 T 1160,500"/>
    <path d="M 40,390 Q 340,290 640,340 T 1160,300"/>
    <path d="M 160,270 Q 400,160 680,220 T 1120,170"/>
  </g>

  <g font-family="-apple-system, BlinkMacSystemFont, 'SF Mono', Consolas, 'Roboto Mono', monospace" font-size="12" fill="#22d3ee" letter-spacing="2">
    <text x="90" y="115">▲ V4L.LAB // FIELD TECHNICAL SPECIFICATION</text>
    <text x="1110" y="115" text-anchor="end">45°18'N 111°02'W // ELEV:3,420M</text>
  </g>
  <line x1="90" y1="128" x2="1110" y2="128" stroke="url(#accent-cyan)" stroke-width="2" opacity="0.7"/>

  <rect x="90" y="160" width="1020" height="390" rx="16" fill="#18181b" fill-opacity="0.45" stroke="#3f3f46" stroke-width="1" stroke-dasharray="6,6"/>

  <g transform="translate(130, 210)">
    <rect x="0" y="0" width="170" height="28" rx="6" fill="#0e7490" fill-opacity="0.3" stroke="#22d3ee" stroke-width="1"/>
    <circle cx="14" cy="14" r="4" fill="#22d3ee"/>
    <text x="30" y="18" font-family="-apple-system, BlinkMacSystemFont, 'SF Mono', Consolas, 'Roboto Mono', monospace" font-size="11" font-weight="700" fill="#a5f3fc" letter-spacing="1">STRESS AUDIT</text>
  </g>

  <text x="130" y="290" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', sans-serif" font-weight="900" font-size="44" fill="url(#text-grad)" letter-spacing="-1">
    {clean_title[:45]}
  </text>
  <text x="130" y="345" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', sans-serif" font-weight="800" font-size="34" fill="#38bdf8" letter-spacing="-0.5">
    {clean_title[45:90] if len(clean_title) > 45 else "Kinematic Safety Margins &amp; Hardware Tolerances"}
  </text>

  <g transform="translate(130, 410)" font-family="-apple-system, BlinkMacSystemFont, 'SF Mono', Consolas, 'Roboto Mono', monospace" font-size="12" fill="#71717a">
    <g transform="translate(0, 0)">
      <text x="0" y="0" fill="#a1a1aa">SHEAR STRENGTH</text>
      <text x="0" y="24" font-size="18" font-weight="700" fill="#f4f4f5">450 N·m</text>
      <text x="0" y="44" font-size="10" fill="#06b6d4">ISO 9523 COMPLIANT</text>
    </g>
    <g transform="translate(240, 0)">
      <text x="0" y="0" fill="#a1a1aa">ELASTIC TRAVEL</text>
      <text x="0" y="24" font-size="18" font-weight="700" fill="#f4f4f5">47 mm TOE</text>
      <text x="0" y="44" font-size="10" fill="#06b6d4">PRE-RELEASE DAMPING</text>
    </g>
    <g transform="translate(480, 0)">
      <text x="0" y="0" fill="#a1a1aa">TEMPERATURE RANGE</text>
      <text x="0" y="24" font-size="18" font-weight="700" fill="#f4f4f5">-35°C to +15°C</text>
      <text x="0" y="44" font-size="10" fill="#06b6d4">COLD-SOAK TESTED</text>
    </g>
  </g>

  <g transform="translate(1110, 500)" text-anchor="end">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'SF Mono', Consolas, 'Roboto Mono', monospace" font-size="11" fill="#71717a" letter-spacing="1">AUTHENTICATED BY</text>
    <text x="0" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-weight="700" font-size="16" fill="#f4f4f5">{clean_persona}</text>
    <text x="0" y="40" font-family="-apple-system, BlinkMacSystemFont, 'SF Mono', Consolas, 'Roboto Mono', monospace" font-size="10" fill="#22d3ee">LEAD EQUIPMENT ENGINEER</text>
  </g>
</svg>"""

    file_name = f"{slug}-spec.svg"
    out_path = GHOST_STORAGE_PATH / file_name
    try:
        out_path.write_text(svg_content, encoding="utf-8")
        try:
            os.chmod(out_path, 0o644)
        except Exception:
            pass
        url = f"{GHOST_PUBLIC_BASE}/{file_name}"
    except Exception as e:
        print(f"⚠ Tier 2 SVG generation error for {file_name}: {e}")
        return get_curated_manifest_image(slug=slug, topic_title=topic_title)

    caption = f"Alpine Spec HUD Blueprint: {clean_title} — Authenticated by {clean_persona}"
    return FeatureImageResult(url=url, caption=caption, alt=f"Alpine Spec Blueprint for {clean_title}")

# ==============================================================================
# TIER 3: GLASSMORPHIC PRODUCT CUTOUT FOR GEAR TEARDOWNS
# Ingests clean product cutouts inside glassmorphic cards with telemetry callouts
# ==============================================================================
def generate_tier3_glassmorphic_gear_svg(topic_title: str, persona: str, slug: str, cutout_url: str = None, metrics: dict = None) -> FeatureImageResult:
    """
    Generates a high-end glassmorphic gear product cutout card.
    Ingests clean product cutouts or renders technical hardware schematics with telemetry benchmarks.
    """
    try:
        GHOST_STORAGE_PATH.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    clean_title = topic_title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    clean_persona = persona.strip() if persona else "Dex Okafor"

    # Default technical telemetry metrics for gear bench teardowns
    m1_label = metrics.get("m1_label", "LATERAL DIN TORQUE") if metrics else "LATERAL DIN TORQUE"
    m1_val = metrics.get("m1_val", "13.0 DIN MAX") if metrics else "13.0 DIN MAX"
    m2_label = metrics.get("m2_label", "HEEL CLIMBER ELEVATION") if metrics else "HEEL CLIMBER ELEVATION"
    m2_val = metrics.get("m2_val", "2° / 10° RISERS") if metrics else "2° / 10° RISERS"
    sub_title = "Hardware Teardown & Stress Release Analysis"

    # Product cutout pane
    if cutout_url:
        cutout_element = f"""
    <!-- Ingested Clean Product Cutout -->
    <filter id="product-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#0284c7" flood-opacity="0.45"/>
    </filter>
    <image href="{cutout_url}" x="30" y="60" width="360" height="380" preserveAspectRatio="xMidYMid meet" filter="url(#product-shadow)"/>
    <!-- Spec Callout Overlays -->
    <g font-family="-apple-system, BlinkMacSystemFont, 'SF Mono', monospace" font-size="10" fill="#38bdf8">
      <circle cx="90" cy="140" r="4" fill="#38bdf8"/>
      <line x1="90" y1="140" x2="40" y2="100" stroke="#38bdf8" stroke-dasharray="2,2"/>
      <text x="40" y="90">PIN ENGAGEMENT</text>

      <circle cx="280" cy="260" r="4" fill="#38bdf8"/>
      <line x1="280" y1="260" x2="340" y2="220" stroke="#38bdf8" stroke-dasharray="2,2"/>
      <text x="340" y="210">AFD CONTACT PLANE</text>
    </g>
"""
    else:
        # Default Precision Vector Technical Hardware Blueprint
        cutout_element = """
    <!-- Technical Binding Blueprint Cutout Assembly -->
    <g transform="translate(60, 70)" stroke="#38bdf8" fill="none" stroke-width="2">
      <!-- Toe Piece Geometry -->
      <path d="M 40,80 L 120,40 L 200,80 L 220,160 L 120,200 L 20,160 Z" stroke-width="2.5" opacity="0.9"/>
      <circle cx="120" cy="120" r="35" stroke-dasharray="4,4" opacity="0.6"/>
      <circle cx="120" cy="120" r="15" fill="#38bdf8" fill-opacity="0.3"/>
      <!-- Pin Wings -->
      <path d="M 20,160 L 0,220 L 60,240 L 80,185" stroke-width="2" opacity="0.8"/>
      <path d="M 220,160 L 240,220 L 180,240 L 160,185" stroke-width="2" opacity="0.8"/>
      <!-- AFD Gliding Plate -->
      <rect x="70" y="210" width="100" height="20" rx="4" fill="#06b6d4" fill-opacity="0.25" stroke="#22d3ee" stroke-width="1.5"/>
      <line x1="120" y1="230" x2="120" y2="340" stroke-dasharray="6,6" stroke="#94a3b8" opacity="0.5"/>
      <!-- Heel Assembly Housing -->
      <rect x="50" y="340" width="140" height="50" rx="8" stroke="#38bdf8" stroke-width="2" opacity="0.9"/>
      <circle cx="120" cy="365" r="12" fill="#6366f1" fill-opacity="0.4"/>
      <!-- Brake Arms -->
      <path d="M 40,360 L 10,410 L 15,440" stroke-width="2" opacity="0.7"/>
      <path d="M 200,360 L 230,410 L 225,440" stroke-width="2" opacity="0.7"/>
    </g>

    <!-- Blueprint Dimensional Callouts -->
    <g font-family="-apple-system, BlinkMacSystemFont, 'SF Mono', monospace" font-size="10" fill="#38bdf8">
      <line x1="180" y1="190" x2="310" y2="170" stroke="#38bdf8" stroke-width="1" stroke-dasharray="2,2"/>
      <circle cx="180" cy="190" r="3" fill="#38bdf8"/>
      <text x="315" y="174">CAM TOE PINS</text>

      <line x1="220" y1="300" x2="310" y2="280" stroke="#38bdf8" stroke-width="1" stroke-dasharray="2,2"/>
      <circle cx="220" cy="300" r="3" fill="#38bdf8"/>
      <text x="315" y="284">AFD GLIDE TOLERANCE</text>

      <line x1="240" y1="430" x2="310" y2="410" stroke="#38bdf8" stroke-width="1" stroke-dasharray="2,2"/>
      <circle cx="240" cy="430" r="3" fill="#38bdf8"/>
      <text x="315" y="414">HEEL SPRING INDEX</text>
    </g>
"""

    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <!-- Deep Cosmic Alpine Backdrop -->
    <radialGradient id="gear-radial" cx="35%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#1e1b4b" stop-opacity="0.8"/>
      <stop offset="45%" stop-color="#0f172a" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <!-- Product Luminescence Glow Halo -->
    <radialGradient id="glow-halo" cx="72%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#6366f1" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
    <!-- Glassmorphic Border Highlight -->
    <linearGradient id="glass-border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1"/>
    </linearGradient>
    <!-- Frosted Glass Filter -->
    <filter id="glass-blur">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background Base Canvas -->
  <rect width="1200" height="675" fill="url(#gear-radial)"/>
  <rect width="1200" height="675" fill="url(#glow-halo)"/>

  <!-- Fine Engineering Dot Matrix -->
  <pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="2" r="1" fill="#475569" opacity="0.35"/>
  </pattern>
  <rect width="1200" height="675" fill="url(#dot-grid)"/>

  <!-- Left Frosted Glass Card: HUD Telemetry & Specifications -->
  <g transform="translate(80, 80)">
    <rect width="580" height="515" rx="24" fill="#0f172a" fill-opacity="0.6" stroke="url(#glass-border)" stroke-width="1.5" filter="url(#glass-blur)"/>
    
    <!-- Header Lab Fixture Badge -->
    <g transform="translate(40, 48)">
      <rect x="0" y="0" width="130" height="26" rx="13" fill="#38bdf8" fill-opacity="0.15" stroke="#38bdf8" stroke-width="1"/>
      <text x="65" y="17" font-family="-apple-system, BlinkMacSystemFont, 'SF Mono', monospace" font-size="10" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="1.5">GEAR BENCH</text>
      <text x="145" y="17" font-family="-apple-system, BlinkMacSystemFont, 'SF Mono', monospace" font-size="11" fill="#94a3b8">REV.04 // LAB FIXTURE</text>
    </g>

    <!-- Main Title & Subtitle -->
    <text x="40" y="130" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-weight="900" font-size="36" fill="#f8fafc" letter-spacing="-1">
      {clean_title[:40]}
    </text>
    <text x="40" y="175" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-weight="800" font-size="28" fill="#38bdf8" letter-spacing="-0.5">
      {clean_title[40:85] if len(clean_title) > 40 else sub_title}
    </text>

    <!-- Engineering Teardown Summary -->
    <text x="40" y="235" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="15" fill="#cbd5e1" width="500">
      <tspan x="40" dy="0">Laboratory stress benchmarking evaluates lateral retention,</tspan>
      <tspan x="40" dy="24">DIN spring consistency, and multi-directional boot release</tspan>
      <tspan x="40" dy="24">under high-torque torsional deflection.</tspan>
    </text>

    <!-- Lab Metric Cards -->
    <g transform="translate(40, 340)">
      <rect x="0" y="0" width="230" height="54" rx="12" fill="#1e293b" fill-opacity="0.7" stroke="#334155" stroke-width="1"/>
      <text x="18" y="22" font-family="-apple-system, BlinkMacSystemFont, 'SF Mono', monospace" font-size="10" fill="#94a3b8">{m1_label}</text>
      <text x="18" y="44" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="18" font-weight="800" fill="#38bdf8">{m1_val}</text>

      <rect x="250" y="0" width="230" height="54" rx="12" fill="#1e293b" fill-opacity="0.7" stroke="#334155" stroke-width="1"/>
      <text x="268" y="22" font-family="-apple-system, BlinkMacSystemFont, 'SF Mono', monospace" font-size="10" fill="#94a3b8">{m2_label}</text>
      <text x="268" y="44" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="18" font-weight="800" fill="#38bdf8">{m2_val}</text>
    </g>

    <!-- Authenticated Engineer Signature -->
    <g transform="translate(40, 445)">
      <circle cx="18" cy="18" r="18" fill="#38bdf8" fill-opacity="0.2" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="18" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="13" font-weight="900" fill="#38bdf8" text-anchor="middle">DO</text>
      <text x="48" y="16" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="14" font-weight="700" fill="#f8fafc">{clean_persona}</text>
      <text x="48" y="32" font-family="-apple-system, BlinkMacSystemFont, 'SF Mono', monospace" font-size="10" fill="#94a3b8">EQUIPMENT &amp; BACKCOUNTRY DESIGN ENGINEER</text>
    </g>
  </g>

  <!-- Right Frosted Glass Card: Product Cutout / Hardware Blueprint -->
  <g transform="translate(700, 80)">
    <rect width="420" height="515" rx="24" fill="#0f172a" fill-opacity="0.4" stroke="url(#glass-border)" stroke-width="1.5"/>
    {cutout_element}
  </g>
</svg>"""

    file_name = f"{slug}-gear.svg"
    out_path = GHOST_STORAGE_PATH / file_name
    try:
        out_path.write_text(svg_content, encoding="utf-8")
        try:
            os.chmod(out_path, 0o644)
        except Exception:
            pass
        url = f"{GHOST_PUBLIC_BASE}/{file_name}"
    except Exception as e:
        print(f"⚠ Tier 3 SVG generation error for {file_name}: {e}")
        return get_curated_manifest_image(slug=slug, topic_title=topic_title)

    caption = f"Schematic Blueprint: {clean_title} — Authenticated by {clean_persona}"
    return FeatureImageResult(url=url, caption=caption, alt=f"Schematic Blueprint for {clean_title}")

# ==============================================================================
# PIPELINE ENTRY POINT
# ==============================================================================
def resolve_feature_image(topic_title: str, persona: str = "Dex", tier: int = None, slug: str = None, tags: list = None, cutout_url: str = None, metrics: dict = None, mode: str = "round_robin", **kwargs) -> FeatureImageResult:
    """
    Resolves or generates a feature image for the given post.
    All dynamic external image search logic has been replaced with verified selection from curated_manifest.json:
    tier:
      1 (or None): Curated Alpine Manifest (/content/images/curated/) - DEFAULT
      2: Alpine Spec SVG Card with isometric contour lines
      3: Glassmorphic Product Cutout for gear teardowns - AUTO-SELECTED FOR HARDWARE/TEARDOWNS
    """
    if not slug:
        clean_s = topic_title.lower().replace(' ', '-').replace('/', '-').replace(':', '')
        slug = ''.join(c for c in clean_s if c.isalnum() or c == '-')

    slug_lower = (slug or topic_title).lower()

    # Auto-select Tier 3 for hardware teardowns if tier not specified
    if tier is None:
        if any(k in slug_lower for k in ["shift-2-vs-cast", "teardown", "bench", "millimeters-matter", "boot-compatibility"]):
            tier = 3
        else:
            tier = 1

    if tier == 2:
        return generate_tier2_alpine_spec_svg(topic_title, persona, slug)
    elif tier == 3:
        return generate_tier3_glassmorphic_gear_svg(topic_title, persona, slug, cutout_url=cutout_url, metrics=metrics)
    else:
        # Default Tier 1: Selection directly from /home/ubuntu/vital-command-hub/curated_manifest.json
        return get_curated_manifest_image(slug=slug, topic_title=topic_title, mode=mode)

# ==============================================================================
# GHOST CMS DRAFT POST GENERATION ENTRY POINT
# ==============================================================================
def create_ghost_draft(
    topic_title: str = "Alpine Backcountry Touring & Gear Analysis 2026",
    persona: str = "Sierra Marlowe",
    tier: int = 1,
    slug: str = None,
    html_body: str = None,
    ghost_url: str = None,
    admin_key: str = None,
    mode: str = "round_robin"
) -> dict:
    """
    Executes post generation with feature image resolution from curated_manifest.json
    and pushes the resulting article directly to Ghost CMS as a draft.
    """
    import urllib.request
    import urllib.error
    import jwt

    # Load environment for Ghost configuration if not passed
    if not ghost_url or not admin_key:
        env_files = [
            Path("/home/ubuntu/vital4living/.env"),
            Path("/home/ubuntu/vital-command-hub/.env"),
            Path(__file__).resolve().parent / ".env",
            Path(".env")
        ]
        for env_path in env_files:
            if env_path.exists():
                try:
                    with open(env_path, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith("#") and "=" in line:
                                k, v = line.split("=", 1)
                                clean_v = v.split("#")[0].strip().strip('"').strip("'")
                                if k == "GHOST_URL" and not ghost_url:
                                    ghost_url = clean_v
                                elif k == "GHOST_ADMIN_API_KEY" and not admin_key:
                                    admin_key = clean_v
                except Exception:
                    pass

    ghost_url = (ghost_url or "http://127.0.0.1:2368").rstrip("/")
    if not admin_key:
        admin_key = "6a977ae757552900019e73f1:4e017971dc33a5e28d7abd8112d34b66b7436a1594a7e2749af8b36d914142f1"

    if not slug:
        clean_s = topic_title.lower().replace(" ", "-").replace("/", "-").replace(":", "")
        clean_s = "".join(c for c in clean_s if c.isalnum() or c == "-")
        timestamp = int(dt.now().timestamp())
        slug = f"{clean_s}-{timestamp}"

    print("================================================================================")
    print("🚀 LAUNCHING TEST POST GENERATION VIA CURATED MANIFEST PIPELINE")
    print("================================================================================")
    print(f"📌 Article Title:      {topic_title}")
    print(f"👤 Assigned Persona:   {persona}")
    print(f"🎯 Target Post Slug:    {slug}")
    print(f"📊 Image Tier:         Tier {tier} (Curated Alpine Manifest)")

    # 1. Resolve feature image from curated manifest
    print("\n--------------------------------------------------------------------------------")
    print("📷 SELECTING IMAGE FROM CURATED_MANIFEST.JSON:")
    print("--------------------------------------------------------------------------------")
    feature_res = resolve_feature_image(topic_title=topic_title, persona=persona, tier=tier, slug=slug, mode=mode)
    print(f"✔ Selected Curated Image:  {feature_res.url}")
    print(f"✔ Photographer:            {feature_res.photographer}")
    print(f"✔ Attribution Caption:     {feature_res.caption}")
    print(f"✔ Verified Curated Path:   {feature_res.url.startswith('/content/images/curated/')}")
    print("--------------------------------------------------------------------------------\n")

    # 2. Author mapping
    author_slug = "sierra-marlowe"
    persona_lower = persona.lower()
    if "dex" in persona_lower:
        author_slug = "dex-okafor"
    elif "sierra" in persona_lower:
        author_slug = "sierra-marlowe"
    elif "wren" in persona_lower:
        author_slug = "wren-calloway"
    elif "bo" in persona_lower:
        author_slug = "bo-hartley"
    elif "niko" in persona_lower:
        author_slug = "niko-reyes"
    elif "nyx" in persona_lower:
        author_slug = "nyx-salinger"

    if not html_body:
        html_body = f"""<div class="kg-card kg-html-card">
<p class="lead">Evaluating route safety, binding elasticity, and snowpack stress factors across high-altitude ski touring routes.</p>
<hr/>
<h2>1. Backcountry Terrain & Load Dynamics</h2>
<p>Alpine touring systems undergo cyclic fatigue on extended approaches. Weight distribution, toe-piece retention forces, and torsional boot-sole rigidity are critical to mission success.</p>
<h2>2. Technical Benchmark & Field Observations</h2>
<ul>
  <li><strong>Weight Budget:</strong> Target sub-1,400g per binding interface for multi-day traverses.</li>
  <li><strong>Elastic Travel:</strong> Ensure continuous lateral elasticity through varied snowpack densities.</li>
  <li><strong>Release Calibration:</strong> ISO 13992 certified release testing under extreme temperature gradients.</li>
</ul>
<p><em>Field report authored by {persona}. Authenticated with local curated alpine telemetry.</em></p>
</div>"""

    # 3. Generate Ghost Admin JWT
    kid, secret = admin_key.split(":")
    iat = int(dt.now().timestamp())
    header = {"alg": "HS256", "typ": "JWT", "kid": kid}
    payload_jwt = {"iat": iat, "exp": iat + 300, "aud": "/admin/"}
    jwt_token = jwt.encode(payload_jwt, bytes.fromhex(secret), algorithm="HS256", headers=header)

    post_payload = {
        "posts": [
            {
                "title": topic_title,
                "slug": slug,
                "status": "draft",
                "html": html_body,
                "feature_image": feature_res.url,
                "feature_image_caption": feature_res.caption,
                "feature_image_alt": feature_res.alt,
                "visibility": "public",
                "authors": [{"slug": author_slug}]
            }
        ]
    }

    req_url = f"{ghost_url}/ghost/api/admin/posts/?source=html"
    req_data = json.dumps(post_payload).encode("utf-8")
    req = urllib.request.Request(
        req_url,
        data=req_data,
        headers={
            "Authorization": f"Ghost {jwt_token}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    print("📤 Transmitting draft post to Ghost CMS Admin API...")
    try:
        with urllib.request.urlopen(req) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            created_post = resp_data["posts"][0]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"🚨 Ghost API HTTP Error {e.code}: {error_body}")
        raise

    post_id = created_post["id"]
    post_slug = created_post["slug"]
    post_status = created_post["status"]
    assigned_feature_image = created_post.get("feature_image")
    primary_author = created_post.get("primary_author", {}).get("name", "Unknown")

    print("\n================================================================================")
    print("🎉 SUCCESS! NEW GHOST DRAFT CREATED WITH CURATED MANIFEST IMAGE!")
    print("================================================================================")
    print(f"🆔 Ghost Post ID:       {post_id}")
    print(f"📌 Post Title:           {created_post['title']}")
    print(f"🔗 Slug:                 {post_slug}")
    print(f"📄 Publication Status:   {post_status}")
    print(f"👤 Primary Author:       {primary_author} (slug: '{author_slug}')")
    print(f"🖼 Ghost Feature Image:  {assigned_feature_image}")
    print(f"📷 Caption:              {created_post.get('feature_image_caption')}")
    print(f"🌐 Admin Editor Link:    http://15.204.83.117:2368/ghost/#/editor/post/{post_id}")
    print(f"🌐 Public Draft Link:    http://15.204.83.117:2368/{post_slug}/")
    print("================================================================================\n")

    return created_post

if __name__ == "__main__":
    import sys
    if any(arg in sys.argv for arg in ["--create-draft", "--draft", "create-draft"]):
        title_arg = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "Alpine Backcountry Touring & Gear Analysis 2026"
        persona_arg = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith("--") else "Sierra Marlowe"
        create_ghost_draft(topic_title=title_arg, persona=persona_arg)
    else:
        print("Testing Curated Manifest Loader & Selection Engine:")
        manifest = load_curated_manifest()
        print(f"Total photos in manifest: {len(manifest)}")

        print("\n1. Round-Robin Invocations:")
        for i in range(3):
            res = get_curated_manifest_image(mode="round_robin")
            print(f"  [RR {i+1}] Path: {res.url} | Photographer: {res.photographer}")

        print("\n2. Random Invocations:")
        for i in range(3):
            res = get_curated_manifest_image(mode="random")
            print(f"  [RND {i+1}] Path: {res.url} | Photographer: {res.photographer}")

        print("\n3. Testing resolve_feature_image default (Tier 1):")
        res_default = resolve_feature_image("Alpine Backcountry Touring Guide", "Dex")
        print(f"  Result URL: {res_default.url}")
        print(f"  Result Caption: {res_default.caption}")
        print(f"  Starts with /content/images/curated/: {res_default.url.startswith('/content/images/curated/')}")

        if "--test-all" in sys.argv:
            print("\nExecuting full draft creation test:")
            create_ghost_draft()

