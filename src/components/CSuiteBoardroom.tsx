import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Share2,
  Radio,
  Pin,
  Sparkles,
  Plus,
  SlidersHorizontal,
  Settings2,
  Eye,
  EyeOff,
  Layers,
  Grid,
  Crown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  Filter,
  Search,
  RefreshCw,
  Play,
  Pause,
  ShieldCheck,
  Zap,
  Megaphone,
  Hash,
  MessageSquare,
  Heart,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  ExternalLink,
  Send,
  X,
  Activity,
  DollarSign,
  Target,
  Check,
  Compass,
  FileText,
  Sliders,
  Laptop,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  vitalApi,
  type SocialSyndicationPost,
  type SocialSyndicationMetrics,
  type BoardroomWidgetConfig,
  type BoardroomOfficer,
  DEFAULT_SOCIAL_STREAMS,
  DEFAULT_BOARDROOM_WIDGETS,
  DEFAULT_BOARDROOM_OFFICERS,
} from "@/lib/vitalApi";

const PLATFORM_META: Record<
  string,
  { label: string; color: string; bg: string; border: string; badge: string; icon: string }
> = {
  pinterest: {
    label: "Pinterest",
    color: "text-rose-400",
    bg: "bg-rose-950/40",
    border: "border-rose-900/50",
    badge: "bg-rose-900/30 text-rose-300 border-rose-800/60",
    icon: "📌",
  },
  facebook: {
    label: "Facebook / Meta",
    color: "text-blue-400",
    bg: "bg-blue-950/40",
    border: "border-blue-900/50",
    badge: "bg-blue-900/30 text-blue-300 border-blue-800/60",
    icon: "📘",
  },
  instagram: {
    label: "Instagram",
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-950/40",
    border: "border-fuchsia-900/50",
    badge: "bg-fuchsia-900/30 text-fuchsia-300 border-fuchsia-800/60",
    icon: "📷",
  },
  twitter: {
    label: "X / Threads",
    color: "text-zinc-200",
    bg: "bg-zinc-900/70",
    border: "border-zinc-700/60",
    badge: "bg-zinc-800 text-zinc-200 border-zinc-700",
    icon: "𝕏",
  },
  linkedin: {
    label: "LinkedIn",
    color: "text-sky-400",
    bg: "bg-sky-950/40",
    border: "border-sky-900/50",
    badge: "bg-sky-900/30 text-sky-300 border-sky-800/60",
    icon: "💼",
  },
  rss: {
    label: "Global RSS Feed",
    color: "text-amber-400",
    bg: "bg-amber-950/40",
    border: "border-amber-900/50",
    badge: "bg-amber-900/30 text-amber-300 border-amber-800/60",
    icon: "🌐",
  },
};

export function CSuiteBoardroom() {
  // Boardroom officer selection
  const [officers, setOfficers] = useState<BoardroomOfficer[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>("nyx");

  // Live syndication stream state
  const [streams, setStreams] = useState<SocialSyndicationPost[]>([]);
  const [metrics, setMetrics] = useState<SocialSyndicationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoSyndicate, setAutoSyndicate] = useState(true);

  // Filters & Search for stream
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dynamic widgets configuration
  const [widgets, setWidgets] = useState<BoardroomWidgetConfig[]>([]);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);

  // New Custom Widget form state
  const [newWidgetTitle, setNewWidgetTitle] = useState("");
  const [newWidgetCategory, setNewWidgetCategory] =
    useState<BoardroomWidgetConfig["category"]>("custom_placeholder");
  const [newWidgetMetricValue, setNewWidgetMetricValue] = useState("");
  const [newWidgetMetricLabel, setNewWidgetMetricLabel] = useState("");
  const [newWidgetChannel, setNewWidgetChannel] = useState("pinterest");
  const [newWidgetSubtext, setNewWidgetSubtext] = useState("");
  const [newWidgetColSpan, setNewWidgetColSpan] = useState<1 | 2 | 3>(1);

  // Manual Syndication Dispatch Modal state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchTitle, setDispatchTitle] = useState("");
  const [dispatchExcerpt, setDispatchExcerpt] = useState("");
  const [dispatchPlatform, setDispatchPlatform] =
    useState<SocialSyndicationPost["platform"]>("pinterest");
  const [dispatchChannel, setDispatchChannel] = useState("Backcountry Ski Gear & Touring Labs");
  const [dispatchHashtags, setDispatchHashtags] = useState(
    "#BackcountrySkiing, #SkiTouring, #Vital4Living",
  );
  const [dispatching, setDispatching] = useState(false);

  // Inspect Post Modal state
  const [inspectedPost, setInspectedPost] = useState<SocialSyndicationPost | null>(null);

  // Visual Pin Lab interactive aspect ratio preview
  const [activeAspectRatio, setActiveAspectRatio] = useState<"2:3" | "1:1" | "16:9">("2:3");

  // Load all initial boardroom & syndication state
  const loadData = useCallback(async () => {
    try {
      const [fetchedStreams, fetchedMetrics, fetchedWidgets] = await Promise.all([
        vitalApi.getSocialStreams(),
        vitalApi.getSocialMetrics(),
        vitalApi.getBoardroomWidgets(),
      ]);

      setStreams(fetchedStreams);
      setMetrics(fetchedMetrics);
      setWidgets(fetchedWidgets);
      setAutoSyndicate(fetchedMetrics.auto_broadcast_enabled);
      setOfficers(vitalApi.getBoardroomOfficers());
    } catch (err) {
      console.error("Failed to load boardroom data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Periodic heartbeat / simulated stream updates (every 25 seconds)
  useEffect(() => {
    if (!autoSyndicate) return;
    const interval = setInterval(() => {
      // Simulate live stream background impressions increment
      setStreams((prev) =>
        prev.map((s, idx) => {
          if (idx === 0 && s.status === "syndicated") {
            return {
              ...s,
              metrics: {
                ...s.metrics,
                impressions: s.metrics.impressions + Math.floor(Math.random() * 45) + 10,
                clicks: s.metrics.clicks + (Math.random() > 0.4 ? 1 : 0),
              },
            };
          }
          return s;
        }),
      );
    }, 25000);
    return () => clearInterval(interval);
  }, [autoSyndicate]);

  // Handle master auto-syndication toggle
  const handleToggleAutoSyndication = async () => {
    const nextState = !autoSyndicate;
    setAutoSyndicate(nextState);
    await vitalApi.toggleAutoSyndication(nextState);
    if (nextState) {
      toast.success(
        "Nyx Salinger: Master Syndication Stream is now ACTIVE. Omni-channel broadcasting resumed.",
      );
    } else {
      toast.warning(
        "Nyx Salinger: Master Syndication Stream PAUSED. Outgoing dispatches held in staging.",
      );
    }
  };

  // Handle manual broadcast dispatch
  const handleDispatchSyndication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchTitle.trim()) {
      toast.error("Please provide an article title or hook for syndication.");
      return;
    }

    setDispatching(true);
    try {
      const tags = dispatchHashtags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t : `#${t}`));

      const createdPost = await vitalApi.syndicateSocialPost({
        title: dispatchTitle.trim(),
        excerpt:
          dispatchExcerpt.trim() || "Deep technical review and field analysis by Vital4Living.",
        platform: dispatchPlatform,
        board_or_channel: dispatchChannel,
        hashtags: tags,
        article_url: `https://vital4living.com/p/${encodeURIComponent(
          dispatchTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        )}`,
        aspect_ratio:
          dispatchPlatform === "pinterest"
            ? "2:3"
            : dispatchPlatform === "instagram"
              ? "1:1"
              : "16:9",
      });

      setStreams((prev) => [createdPost, ...prev]);
      toast.success(
        `Nyx Salinger: Successfully syndicated to ${PLATFORM_META[dispatchPlatform]?.label || dispatchPlatform}! Broadcast live.`,
      );
      setIsDispatchModalOpen(false);
      setDispatchTitle("");
      setDispatchExcerpt("");
    } catch (err) {
      toast.error("Failed to syndicate post.");
    } finally {
      setDispatching(false);
    }
  };

  // Simulate real-time stream ingestion (Nyx dispatches instant event)
  const handleSimulateLiveIngestion = async () => {
    const templates = [
      {
        title: "2027 BOA Alpine Ski Boot Closure Field Data",
        excerpt:
          "Pressure mapping across 14 boot fitters: 42% more even instep wrap vs traditional micro-metric buckles on 120-flex shells.",
        platform: "pinterest" as const,
        channel: "Ski Boot Fitting & Labs",
        tags: ["#BOAFitSystem", "#SkiBootLab", "#BackcountryGear"],
      },
      {
        title: "DWR Degradation Curve: Fluorinated vs Non-Fluorinated Membranes",
        excerpt:
          "30-day rain chamber telemetry shows non-fluoro C0 treatments require reactivating every 6 backcountry outings.",
        platform: "twitter" as const,
        channel: "@Vital4LivingTech",
        tags: ["#OutdoorScience", "#EcoTech", "#DWR"],
      },
      {
        title: "Kästle vs Blizzard Edge Hold on 45-Degree Hardpack",
        excerpt:
          "Vibration telemetry sensors attached to ski tips prove dual Titanal sheets dampen chatter by 28% at 45mph.",
        platform: "facebook" as const,
        channel: "Vital4Living Technical Community",
        tags: ["#SkiTesting", "#ChatterDampening", "#Sawtooths"],
      },
      {
        title: "Swipe: Dynafit Radical Pro Liner Heat Mold Breakdown",
        excerpt:
          "Step-by-step oven protocol, toe cap spacing, and heel pocket anchorage instructions verified by master fitters.",
        platform: "instagram" as const,
        channel: "@vital4living.lab",
        tags: ["#SkiTouring", "#BootFitter", "#CustomFit"],
      },
    ];

    const pick = templates[Math.floor(Math.random() * templates.length)];
    const post = await vitalApi.syndicateSocialPost({
      title: pick.title,
      excerpt: pick.excerpt,
      platform: pick.platform,
      board_or_channel: pick.channel,
      hashtags: pick.tags,
      aspect_ratio:
        pick.platform === "pinterest" ? "2:3" : pick.platform === "instagram" ? "1:1" : "16:9",
    });

    setStreams((prev) => [post, ...prev]);
    toast.success(
      `Nyx Salinger dispatched live syndication event to ${PLATFORM_META[pick.platform]?.label}!`,
    );
  };

  // Re-syndicate existing post
  const handleResyndicate = async (post: SocialSyndicationPost) => {
    const updated = await vitalApi.syndicateSocialPost({
      title: post.title,
      excerpt: post.excerpt,
      platform: post.platform,
      board_or_channel: post.board_or_channel,
      hashtags: post.hashtags,
      aspect_ratio: post.aspect_ratio,
    });
    setStreams((prev) => [updated, ...prev.filter((p) => p.id !== post.id)]);
    toast.success(`Nyx Salinger: Re-syndicated "${post.title}" across active platform nodes.`);
  };

  // Copy post text to clipboard
  const handleCopyPost = (post: SocialSyndicationPost) => {
    const text = `${post.title}\n\n${post.excerpt}\n\nRead more: ${post.article_url}\n\n${post.hashtags.join(" ")}`;
    void navigator.clipboard.writeText(text);
    toast.success("Syndicated post copy & hashtags copied to clipboard!");
  };

  // Save widget adjustments
  const handleSaveWidgets = async (updatedWidgets: BoardroomWidgetConfig[]) => {
    setWidgets(updatedWidgets);
    await vitalApi.saveBoardroomWidgets(updatedWidgets);
  };

  // Toggle widget visibility
  const handleToggleWidgetVisibility = (id: string) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    void handleSaveWidgets(updated);
  };

  // Move widget up/down
  const handleMoveWidget = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= widgets.length) return;
    const reordered = [...widgets];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIdx, 0, moved);
    const updated = reordered.map((w, i) => ({ ...w, order: i + 1 }));
    void handleSaveWidgets(updated);
  };

  // Reset widgets to boardroom default
  const handleResetWidgets = async () => {
    await handleSaveWidgets(DEFAULT_BOARDROOM_WIDGETS);
    toast.success("Nyx Salinger: Boardroom widget layout restored to C-suite default.");
  };

  // Add custom widget placeholder
  const handleAddCustomWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWidgetTitle.trim()) {
      toast.error("Widget title is required.");
      return;
    }

    const newWidget: BoardroomWidgetConfig = {
      id: `widget-custom-${Date.now()}`,
      title: newWidgetTitle.trim(),
      category: newWidgetCategory,
      colSpan: newWidgetColSpan,
      visible: true,
      order: widgets.length + 1,
      refreshIntervalSeconds: 30,
      customData: {
        metricValue: newWidgetMetricValue.trim() || "99.4%",
        metricLabel: newWidgetMetricLabel.trim() || "Operational Efficiency",
        channel: newWidgetChannel,
        subtext: newWidgetSubtext.trim() || "Dynamic placeholder configured by Nyx Salinger",
      },
    };

    const updated = [...widgets, newWidget];
    await handleSaveWidgets(updated);
    toast.success(`Nyx Salinger: Dynamic widget "${newWidget.title}" added to Boardroom floor.`);
    setIsAddWidgetModalOpen(false);
    setNewWidgetTitle("");
    setNewWidgetMetricValue("");
    setNewWidgetMetricLabel("");
    setNewWidgetSubtext("");
  };

  // Delete custom widget
  const handleDeleteWidget = async (id: string) => {
    const updated = widgets.filter((w) => w.id !== id);
    await handleSaveWidgets(updated);
    toast.info("Widget removed from boardroom layout.");
  };

  // Filtered streams
  const filteredStreams = useMemo(() => {
    return streams.filter((item) => {
      const matchesPlatform = platformFilter === "all" || item.platform === platformFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.hashtags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesPlatform && matchesStatus && matchesSearch;
    });
  }, [streams, platformFilter, statusFilter, searchQuery]);

  // Chart data for virality radar
  const viralityRadarData = useMemo(() => {
    const platformTotals: Record<string, { name: string; impressions: number; clicks: number }> = {
      pinterest: { name: "Pinterest", impressions: 0, clicks: 0 },
      facebook: { name: "Facebook", impressions: 0, clicks: 0 },
      instagram: { name: "Instagram", impressions: 0, clicks: 0 },
      twitter: { name: "X / Threads", impressions: 0, clicks: 0 },
      linkedin: { name: "LinkedIn", impressions: 0, clicks: 0 },
      rss: { name: "RSS Syndicate", impressions: 0, clicks: 0 },
    };

    streams.forEach((s) => {
      if (platformTotals[s.platform]) {
        platformTotals[s.platform].impressions += s.metrics?.impressions || 0;
        platformTotals[s.platform].clicks += s.metrics?.clicks || 0;
      }
    });

    return Object.values(platformTotals);
  }, [streams]);

  const selectedOfficer = officers.find((o) => o.id === selectedOfficerId) || officers[0];

  return (
    <div className="space-y-6">
      {/* 1. Executive Boardroom Header & Master Syndication Controls */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 size-96 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-96 bg-rose-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Interactive C-Suite Boardroom • Operational Session #2026-V4L</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Executive Command Dais</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300">
                Quorum {officers.length > 0 ? `${officers.length}/${officers.length}` : "8/8"} Seated
              </span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-400 max-w-2xl">
              Live multi-channel syndication floor and dynamic boardroom widget ecosystem governed
              by <strong className="text-zinc-200">Nyx Salinger (Director of Social Media)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Auto-Syndication Broadcast Toggle */}
            <button
              type="button"
              onClick={handleToggleAutoSyndication}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition border ${
                autoSyndicate
                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
              }`}
              title="Toggle automatic Ghost-to-Social broadcast engine"
            >
              {autoSyndicate ? (
                <>
                  <Radio className="size-4 animate-pulse text-emerald-400" />
                  <span>Broadcast Stream: ACTIVE</span>
                </>
              ) : (
                <>
                  <Pause className="size-4 text-zinc-400" />
                  <span>Broadcast Stream: PAUSED</span>
                </>
              )}
            </button>

            {/* Manual Broadcast Trigger */}
            <button
              type="button"
              onClick={() => setIsDispatchModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold tracking-wide uppercase shadow-lg shadow-emerald-950/40 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
            >
              <Send className="size-3.5" />
              <span>Dispatch Blast</span>
            </button>

            {/* Widget Manager */}
            <button
              type="button"
              onClick={() => setIsWidgetModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition"
              title="Configure and reorder dynamic boardroom widgets"
            >
              <SlidersHorizontal className="size-3.5 text-zinc-400" />
              <span>Widgets</span>
            </button>

            {/* Quick Refresh */}
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                void loadData();
              }}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs transition disabled:opacity-50"
              title="Refresh live streams and metrics"
            >
              <RefreshCw
                className={`size-3.5 ${refreshing ? "animate-spin text-emerald-400" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Boardroom KPI Strip */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-zinc-800/80 text-xs">
          <div className="bg-zinc-900/40 rounded-lg p-2.5 border border-zinc-800/50">
            <span className="text-zinc-500 block text-[11px] font-semibold uppercase">
              24h Omni-Impressions
            </span>
            <span className="text-base font-extrabold text-white mt-0.5 block">
              {metrics?.daily_impressions ? metrics.daily_impressions.toLocaleString() : "384,250"}
            </span>
          </div>
          <div className="bg-zinc-900/40 rounded-lg p-2.5 border border-zinc-800/50">
            <span className="text-zinc-500 block text-[11px] font-semibold uppercase">
              Click-Through Rate
            </span>
            <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">
              {metrics?.click_through_rate ?? 4.82}%{" "}
              <span className="text-[10px] text-zinc-400 font-normal">SLA &gt; 3.5%</span>
            </span>
          </div>
          <div className="bg-zinc-900/40 rounded-lg p-2.5 border border-zinc-800/50">
            <span className="text-zinc-500 block text-[11px] font-semibold uppercase">
              Live Syndication Channels
            </span>
            <span className="text-base font-extrabold text-zinc-200 mt-0.5 block">
              6 Channels <span className="text-[10px] text-emerald-400 font-normal">100% Up</span>
            </span>
          </div>
          <div className="bg-zinc-900/40 rounded-lg p-2.5 border border-zinc-800/50">
            <span className="text-zinc-500 block text-[11px] font-semibold uppercase">
              Lead Channel
            </span>
            <span className="text-base font-extrabold text-rose-400 mt-0.5 block">
              {metrics?.top_channel ?? "Pinterest"}{" "}
              <span className="text-[10px] text-zinc-400 font-normal">Rich Pin SEO</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive C-Suite Boardroom Table (Executive Dais) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Users className="size-4 text-emerald-400" />
            <span>C-Suite Boardroom Dais • Executive Officer Seats</span>
          </h2>
          <span className="text-xs text-zinc-500">
            Select an officer to inspect directives &amp; mandate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {officers.map((officer) => {
            const isSelected = officer.id === selectedOfficerId;
            const isNyx = officer.id === "nyx";

            return (
              <button
                key={officer.id}
                type="button"
                onClick={() => setSelectedOfficerId(officer.id)}
                className={`text-left p-3.5 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? isNyx
                      ? "border-emerald-500/80 bg-zinc-900/90 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/40"
                      : "border-zinc-600 bg-zinc-900/80 shadow-md ring-1 ring-zinc-500/30"
                    : "border-zinc-800/80 bg-zinc-950/70 hover:border-zinc-700 hover:bg-zinc-900/40"
                }`}
              >
                {isNyx && (
                  <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-bl border-l border-b border-emerald-500/20 flex items-center gap-1">
                    <Radio className="size-3 animate-pulse" />
                    <span>PRESIDING</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`size-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isNyx
                          ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/30 font-display"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {officer.avatarInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white truncate">
                          {officer.name}
                        </span>
                        {isNyx && <Crown className="size-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      <span className="text-[11px] text-zinc-400 truncate block font-medium">
                        {officer.title}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {officer.focusArea}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500 truncate">
                    {officer.metricsSummary.split("•")[0]}
                  </span>
                  <span
                    className={`font-semibold capitalize px-1.5 py-0.5 rounded text-[10px] ${
                      officer.status === "broadcasting"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                        : officer.status === "reviewing"
                          ? "bg-blue-950 text-blue-400 border border-blue-800/60"
                          : "bg-zinc-800 text-zinc-300"
                    }`}
                  >
                    {officer.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Officer Focus Brief */}
        {selectedOfficer && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <div>
                <span className="text-zinc-400">
                  Active Mandate:{" "}
                  <strong className="text-zinc-200">{selectedOfficer.office}</strong>
                </span>
                <p className="text-zinc-300 mt-0.5">
                  Officer:{" "}
                  <span className="text-emerald-400 font-bold">{selectedOfficer.name}</span> &bull;
                  Telemetry: <span className="text-zinc-200">{selectedOfficer.metricsSummary}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                LLM: {selectedOfficer.model}
              </span>
              {selectedOfficer.id === "nyx" && (
                <button
                  type="button"
                  onClick={handleSimulateLiveIngestion}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-semibold text-xs transition flex items-center gap-1.5"
                  title="Simulate live syndication stream ingestion"
                >
                  <Sparkles className="size-3" />
                  <span>Simulate Stream Flow</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Dynamic Widgets Floor Managed by Nyx Salinger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid className="size-4 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
              Dynamic Boardroom Widgets • Managed by Nyx Salinger
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddWidgetModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:border-emerald-500 transition"
            >
              <Plus className="size-3 text-emerald-400" />
              <span>Add Widget Placeholder</span>
            </button>
            <button
              type="button"
              onClick={handleResetWidgets}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition"
              title="Reset layout to default"
            >
              Reset Layout
            </button>
          </div>
        </div>

        {/* Dynamic Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgets
            .filter((w) => w.visible)
            .sort((a, b) => a.order - b.order)
            .map((widget, index) => {
              const colClass =
                widget.colSpan === 3
                  ? "col-span-1 md:col-span-2 lg:col-span-3"
                  : widget.colSpan === 2
                    ? "col-span-1 md:col-span-2"
                    : "col-span-1";

              return (
                <div
                  key={widget.id}
                  className={`rounded-xl border border-zinc-800/90 bg-zinc-950 p-4 shadow-xl flex flex-col justify-between transition-all hover:border-zinc-700/80 ${colClass}`}
                >
                  {/* Widget Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-zinc-800/70">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 truncate">
                        {widget.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 text-zinc-500 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-500">
                        {widget.refreshIntervalSeconds}s
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMoveWidget(index, "up")}
                        disabled={index === 0}
                        className="p-1 hover:text-zinc-200 transition disabled:opacity-20"
                        title="Move Widget Left/Up"
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveWidget(index, "down")}
                        disabled={index === widgets.length - 1}
                        className="p-1 hover:text-zinc-200 transition disabled:opacity-20"
                        title="Move Widget Right/Down"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                      {widget.id.startsWith("widget-custom") && (
                        <button
                          type="button"
                          onClick={() => handleDeleteWidget(widget.id)}
                          className="p-1 hover:text-rose-400 transition"
                          title="Delete Custom Widget"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Widget Content based on category */}
                  <div className="flex-1">
                    {/* 1. Live Social Syndication Stream Widget */}
                    {widget.category === "syndication_stream" && (
                      <div className="space-y-3">
                        {/* Stream Controls & Filter Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          {/* Platform pills */}
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => setPlatformFilter("all")}
                              className={`px-2 py-1 rounded-md font-semibold transition ${
                                platformFilter === "all"
                                  ? "bg-zinc-200 text-zinc-950"
                                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              All ({streams.length})
                            </button>
                            {Object.entries(PLATFORM_META).map(([key, meta]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setPlatformFilter(key)}
                                className={`px-2 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                                  platformFilter === key
                                    ? meta.badge
                                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                                }`}
                              >
                                <span>{meta.icon}</span>
                                <span className="hidden sm:inline">{meta.label.split(" ")[0]}</span>
                              </button>
                            ))}
                          </div>

                          {/* Search Input */}
                          <div className="relative">
                            <Search className="size-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search stream..."
                              className="pl-7 pr-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-36 sm:w-48"
                            />
                          </div>
                        </div>

                        {/* Stream Item List */}
                        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                          {filteredStreams.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500 text-xs">
                              No syndication streams match the active filter.
                            </div>
                          ) : (
                            filteredStreams.map((post) => {
                              const meta = PLATFORM_META[post.platform] || PLATFORM_META.pinterest;

                              return (
                                <div
                                  key={post.id}
                                  className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all group"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border flex items-center gap-1 ${meta.badge}`}
                                      >
                                        <span>{meta.icon}</span>
                                        <span>{meta.label}</span>
                                      </span>
                                      {post.aspect_ratio && (
                                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                                          {post.aspect_ratio} Pin
                                        </span>
                                      )}
                                      <span className="text-[10px] text-zinc-500">
                                        {new Date(post.syndicated_at).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition">
                                      <button
                                        type="button"
                                        onClick={() => handleCopyPost(post)}
                                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                                        title="Copy Post Copy"
                                      >
                                        <Copy className="size-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleResyndicate(post)}
                                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition"
                                        title="Re-Syndicate Across Channels"
                                      >
                                        <RefreshCw className="size-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setInspectedPost(post)}
                                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                                        title="Inspect Full Syndication Payload"
                                      >
                                        <ExternalLink className="size-3" />
                                      </button>
                                    </div>
                                  </div>

                                  <h4 className="mt-1.5 font-bold text-xs text-white group-hover:text-emerald-300 transition">
                                    {post.title}
                                  </h4>
                                  <p className="mt-1 text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                                    {post.excerpt}
                                  </p>

                                  {/* Tags & Channel */}
                                  <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                                    <span className="text-zinc-500 font-semibold">
                                      Channel:{" "}
                                      <strong className="text-zinc-400">
                                        {post.board_or_channel}
                                      </strong>
                                    </span>
                                    <span className="text-zinc-700">&bull;</span>
                                    {post.hashtags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>

                                  {/* Live Metrics Strip */}
                                  <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                                    <div className="flex items-center gap-3">
                                      <span className="flex items-center gap-1">
                                        <Activity className="size-3 text-emerald-400" />
                                        <span>
                                          {post.metrics.impressions.toLocaleString()} views
                                        </span>
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <ArrowUpRight className="size-3 text-sky-400" />
                                        <span>{post.metrics.clicks} clicks</span>
                                      </span>
                                      {post.metrics.repins != null && (
                                        <span className="flex items-center gap-1">
                                          <Pin className="size-3 text-rose-400" />
                                          <span>{post.metrics.repins} pins</span>
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-bold text-emerald-400">
                                      {post.metrics.engagement_rate}% CTR
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {/* 2. Virality Radar Widget */}
                    {widget.category === "virality_radar" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-medium">Channel Distribution</span>
                          <span className="text-emerald-400 font-bold">+24.8% Reach Surge</span>
                        </div>
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={viralityRadarData}
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#27272a"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="name"
                                stroke="#71717a"
                                fontSize={10}
                                tickLine={false}
                                tickFormatter={(val: string) => val.split(" ")[0]}
                              />
                              <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#09090b",
                                  borderColor: "#27272a",
                                  borderRadius: "0.5rem",
                                  fontSize: "0.75rem",
                                }}
                              />
                              <Bar dataKey="impressions" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800/80">
                          <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800/60">
                            <span className="text-[10px] text-zinc-500 uppercase block">
                              Top Platform
                            </span>
                            <span className="font-bold text-white text-xs mt-0.5 block">
                              📌 Pinterest (41%)
                            </span>
                          </div>
                          <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800/60">
                            <span className="text-[10px] text-zinc-500 uppercase block">
                              Syndication Velocity
                            </span>
                            <span className="font-bold text-emerald-400 text-xs mt-0.5 block">
                              14 Posts / Hour
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. Campaign Dispatcher Queue Widget */}
                    {widget.category === "campaign_dispatcher" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-medium">Staged for Broadcast</span>
                          <span className="text-zinc-500">Auto-Timer: 18m</span>
                        </div>
                        <div className="space-y-2">
                          {[
                            {
                              title: "Ultralight Alpine Harness Tensile Strengths",
                              eta: "In 18 mins",
                              channel: "Pinterest & Meta",
                              persona: "Nyx / Dex",
                            },
                            {
                              title: "Avalanche Airbag Canister Weight Benchmarks",
                              eta: "In 45 mins",
                              channel: "X / Threads",
                              persona: "Nyx Salinger",
                            },
                            {
                              title: "Merino Wool Microns vs Synthetic Polypro",
                              eta: "In 1h 20m",
                              channel: "LinkedIn Tech",
                              persona: "Nyx / Bo",
                            },
                          ].map((item, i) => (
                            <div
                              key={i}
                              className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-semibold text-zinc-200 block truncate">
                                  {item.title}
                                </span>
                                <span className="text-[10px] text-zinc-500">
                                  {item.channel} &bull; {item.persona}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 shrink-0">
                                {item.eta}
                              </span>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            toast.success(
                              "Nyx Salinger: Campaign queue released immediately for omni-channel syndication!",
                            );
                            void handleSimulateLiveIngestion();
                          }}
                          className="w-full py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 transition text-center"
                        >
                          Trigger Immediate Staged Dispatch
                        </button>
                      </div>
                    )}

                    {/* 4. Visual Asset & Pin Lab Widget */}
                    {widget.category === "pin_lab" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-medium">Rich Pin Card Mock</span>
                          {/* Aspect Ratio Toggles */}
                          <div className="flex gap-1">
                            {(["2:3", "1:1", "16:9"] as const).map((ratio) => (
                              <button
                                key={ratio}
                                type="button"
                                onClick={() => setActiveAspectRatio(ratio)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                                  activeAspectRatio === ratio
                                    ? "bg-rose-900/60 text-rose-300 border border-rose-700"
                                    : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                                }`}
                              >
                                {ratio}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Pin Graphic Mock */}
                        <div
                          className={`rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-4 flex flex-col justify-between relative overflow-hidden transition-all ${
                            activeAspectRatio === "2:3"
                              ? "aspect-[2/3]"
                              : activeAspectRatio === "1:1"
                                ? "aspect-square"
                                : "aspect-video"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded">
                              V4L Verified Pin
                            </span>
                            <Pin className="size-3.5 text-rose-400" />
                          </div>

                          <div>
                            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
                              Technical Gear Benchmark
                            </span>
                            <h4 className="text-sm font-extrabold text-white leading-tight mt-1">
                              2026 Boot Fit Matrix: 98mm vs 102mm Last Geometry
                            </h4>
                            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                              Thermal molding EVA intuition liners &amp; BOA alpine closures tested.
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400">
                            <span>vital4living.com</span>
                            <span className="text-emerald-400 font-bold">Rich Pin Validated</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 5. Trending Keyword & Hashtag Clusters Widget */}
                    {widget.category === "keyword_clusters" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-medium">Algorithmic Surge Tags</span>
                          <span className="text-emerald-400 font-semibold">96.4% Relevance</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { tag: "#BackcountrySkiing", vol: "45.2k", tone: "text-rose-400" },
                            { tag: "#BootFittingMastery", vol: "18.9k", tone: "text-emerald-400" },
                            { tag: "#GoreTexProTouring", vol: "29.4k", tone: "text-blue-400" },
                            { tag: "#AlpineEndurance", vol: "33.1k", tone: "text-amber-400" },
                            { tag: "#UltralightSkimo", vol: "14.5k", tone: "text-fuchsia-400" },
                            { tag: "#BoaAlpineBoots", vol: "22.8k", tone: "text-zinc-300" },
                          ].map((item) => (
                            <button
                              key={item.tag}
                              type="button"
                              onClick={() => {
                                setDispatchHashtags((prev) => `${prev}, ${item.tag}`);
                                toast.info(
                                  `Added ${item.tag} to Nyx's syndication broadcast tags.`,
                                );
                              }}
                              className="px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-xs flex items-center gap-1.5 transition"
                            >
                              <span className={`font-semibold ${item.tone}`}>{item.tag}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {item.vol}
                              </span>
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-normal">
                          Click any keyword cluster to append it into Nyx Salinger&apos;s upcoming
                          syndication batch.
                        </p>
                      </div>
                    )}

                    {/* 6. Audience Sentiment Heatmap Widget */}
                    {widget.category === "sentiment_heat" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-medium">Sentiment Index</span>
                          <span className="text-emerald-400 font-bold">94.2% Positive</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-800 flex overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full"
                            style={{ width: "94%" }}
                            title="94% Positive"
                          />
                          <div
                            className="bg-amber-500 h-full"
                            style={{ width: "4%" }}
                            title="4% Sizing Questions"
                          />
                          <div
                            className="bg-rose-500 h-full"
                            style={{ width: "2%" }}
                            title="2% Feedback"
                          />
                        </div>
                        <div className="space-y-2 pt-1 text-xs">
                          <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-300">
                            &ldquo;The last geometry comparison saved me from dropping $800 on the
                            wrong shell width.&rdquo;
                            <span className="block text-[10px] text-zinc-500 mt-0.5">
                              — Pinterest Repin comment
                            </span>
                          </div>
                          <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-300">
                            &ldquo;Finally an outdoor webzine that tests flex indices under actual
                            freezing temps.&rdquo;
                            <span className="block text-[10px] text-zinc-500 mt-0.5">
                              — Facebook community share
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 7. Social-Driven Monetization Yield Widget */}
                    {widget.category === "monetization_yield" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-medium">Social EPC Attribution</span>
                          <span className="text-emerald-400 font-bold">$3,842.10 (30d)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                            <span className="text-[10px] text-zinc-500 uppercase block">
                              Pinterest Affiliate GMV
                            </span>
                            <span className="text-sm font-bold text-white mt-0.5 block">
                              $2,410.50
                            </span>
                          </div>
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                            <span className="text-[10px] text-zinc-500 uppercase block">
                              Meta &amp; X Referrals
                            </span>
                            <span className="text-sm font-bold text-white mt-0.5 block">
                              $1,431.60
                            </span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between">
                          <span>Top Item: Dynafit Radical Pro</span>
                          <span className="text-emerald-400 font-bold">18 Conversions</span>
                        </div>
                      </div>
                    )}

                    {/* 8. Boardroom Directives & Social Policy Widget */}
                    {widget.category === "boardroom_directive" && (
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 font-medium">
                            Nyx&apos;s Active Directive
                          </span>
                          <span className="text-emerald-400 font-bold">Enforced</span>
                        </div>
                        <ul className="space-y-1.5 text-zinc-300 text-[11px]">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                            <span>
                              Max 5 high-relevance hashtags per post to avoid shadow-throttling.
                            </span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                            <span>
                              Mandatory FTC affiliate disclosure tags on commercial gear pins.
                            </span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                            <span>
                              Automated rate limit backoff: 30s delay if platform throttles.
                            </span>
                          </li>
                        </ul>
                      </div>
                    )}

                    {/* 9. Custom Dynamic Placeholder Widget */}
                    {widget.category === "custom_placeholder" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-medium">
                            {widget.customData?.metricLabel || "Operational Telemetry"}
                          </span>
                          <span className="text-emerald-400 font-bold">
                            {widget.customData?.channel
                              ? widget.customData.channel.toUpperCase()
                              : "LIVE"}
                          </span>
                        </div>
                        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 text-center">
                          <span className="text-3xl font-extrabold text-white block">
                            {widget.customData?.metricValue || "99.8%"}
                          </span>
                          <span className="text-xs text-zinc-400 mt-1 block">
                            {widget.customData?.subtext || "Dynamic Placeholder active"}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 text-center">
                          Configured by Nyx Salinger &bull; Refreshes every{" "}
                          {widget.refreshIntervalSeconds}s
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 4. Modal: Manual Broadcast / New Syndication Blast */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60">
                  <Send className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Broadcast Syndication Blast</h3>
                  <p className="text-xs text-zinc-400">
                    Directly dispatched by Nyx Salinger (Director of Social Media)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchSyndication} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Target Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PLATFORM_META).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDispatchPlatform(key as SocialSyndicationPost["platform"])}
                      className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition ${
                        dispatchPlatform === key
                          ? `${meta.badge} border-current font-bold`
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span>{meta.icon}</span>
                      <span className="truncate">{meta.label.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Article Title / Hook
                </label>
                <input
                  type="text"
                  value={dispatchTitle}
                  onChange={(e) => setDispatchTitle(e.target.value)}
                  placeholder="e.g. Kästle TX93 vs Blizzard Zero G 95 Field Test"
                  className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Syndication Post Copy / Excerpt
                </label>
                <textarea
                  value={dispatchExcerpt}
                  onChange={(e) => setDispatchExcerpt(e.target.value)}
                  rows={3}
                  placeholder="Compelling hook with technical gear data, weight specs, and review conclusions..."
                  className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Board / Channel</label>
                  <input
                    type="text"
                    value={dispatchChannel}
                    onChange={(e) => setDispatchChannel(e.target.value)}
                    placeholder="e.g. Backcountry Ski Gear"
                    className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Hashtags (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={dispatchHashtags}
                    onChange={(e) => setDispatchHashtags(e.target.value)}
                    placeholder="#SkiTouring, #GearReview"
                    className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="px-5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-wider transition shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {dispatching ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  <span>{dispatching ? "Broadcasting..." : "Broadcast Now"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Dynamic Widget Layout Customizer */}
      {isWidgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-zinc-900 text-zinc-200 flex items-center justify-center border border-zinc-700">
                  <SlidersHorizontal className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Boardroom Widget Configuration</h3>
                  <p className="text-xs text-zinc-400">
                    Toggle visibility and reorder Nyx Salinger&apos;s dynamic widgets
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWidgetModalOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 overflow-y-auto flex-1 pr-1">
              {widgets.map((widget, idx) => (
                <div
                  key={widget.id}
                  className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleWidgetVisibility(widget.id)}
                      className={`p-1.5 rounded transition ${
                        widget.visible
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                      title={widget.visible ? "Hide Widget" : "Show Widget"}
                    >
                      {widget.visible ? (
                        <Eye className="size-3.5" />
                      ) : (
                        <EyeOff className="size-3.5" />
                      )}
                    </button>
                    <div>
                      <span className="font-semibold text-white block truncate">
                        {widget.title}
                      </span>
                      <span className="text-[10px] text-zinc-500 capitalize">
                        Span: {widget.colSpan} Col &bull; Category:{" "}
                        {widget.category.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveWidget(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition disabled:opacity-20"
                      title="Move Up"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveWidget(idx, "down")}
                      disabled={idx === widgets.length - 1}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition disabled:opacity-20"
                      title="Move Down"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetWidgets}
                className="text-xs text-zinc-400 hover:text-white transition"
              >
                Reset to Boardroom Defaults
              </button>
              <button
                type="button"
                onClick={() => setIsWidgetModalOpen(false)}
                className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Add New Dynamic Widget Placeholder */}
      {isAddWidgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60">
                  <Plus className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Add Dynamic Widget Placeholder</h3>
                  <p className="text-xs text-zinc-400">
                    Add a modular placeholder managed by Nyx Salinger
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddWidgetModalOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomWidget} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Widget Title</label>
                <input
                  type="text"
                  value={newWidgetTitle}
                  onChange={(e) => setNewWidgetTitle(e.target.value)}
                  placeholder="e.g. YouTube Shorts Virality Gauge"
                  className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Primary Metric Value
                  </label>
                  <input
                    type="text"
                    value={newWidgetMetricValue}
                    onChange={(e) => setNewWidgetMetricValue(e.target.value)}
                    placeholder="e.g. 142.5k views or $1,280"
                    className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Metric Label</label>
                  <input
                    type="text"
                    value={newWidgetMetricLabel}
                    onChange={(e) => setNewWidgetMetricLabel(e.target.value)}
                    placeholder="e.g. 24h Engagement"
                    className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Platform Focus</label>
                  <select
                    value={newWidgetChannel}
                    onChange={(e) => setNewWidgetChannel(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="pinterest">Pinterest</option>
                    <option value="facebook">Facebook / Meta</option>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">X / Threads</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube Shorts</option>
                    <option value="tiktok">TikTok Outdoor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Column Width</label>
                  <select
                    value={newWidgetColSpan}
                    onChange={(e) => setNewWidgetColSpan(Number(e.target.value) as 1 | 2 | 3)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value={1}>1 Column (Compact)</option>
                    <option value={2}>2 Columns (Wide)</option>
                    <option value={3}>3 Columns (Full Width)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Subtext / Notes</label>
                <input
                  type="text"
                  value={newWidgetSubtext}
                  onChange={(e) => setNewWidgetSubtext(e.target.value)}
                  placeholder="e.g. Tracking 15s transition reels for alpine skis"
                  className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddWidgetModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-wider transition shadow-lg"
                >
                  Add to Boardroom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Inspect Full Syndication Post Payload */}
      {inspectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400" />
                <h3 className="font-bold text-white text-sm">Syndication Stream Inspector</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedPost(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-white transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">
                  Post Title
                </span>
                <p className="font-bold text-white text-sm mt-0.5">{inspectedPost.title}</p>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">
                  Syndication Excerpt
                </span>
                <p className="text-zinc-300 mt-0.5 leading-relaxed bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                  {inspectedPost.excerpt}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">
                    Platform
                  </span>
                  <p className="text-zinc-200 font-semibold capitalize mt-0.5">
                    {inspectedPost.platform}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">
                    Governing Officer
                  </span>
                  <p className="text-emerald-400 font-semibold mt-0.5">
                    {inspectedPost.managed_by}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">
                  Destination URL
                </span>
                <a
                  href={inspectedPost.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                >
                  <span>{inspectedPost.article_url}</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">
                  Hashtags
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {inspectedPost.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[10px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded bg-zinc-900/50 border border-zinc-800 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Impressions</span>
                  <span className="font-extrabold text-white text-sm mt-0.5 block">
                    {inspectedPost.metrics.impressions.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Clicks</span>
                  <span className="font-extrabold text-sky-400 text-sm mt-0.5 block">
                    {inspectedPost.metrics.clicks}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">CTR %</span>
                  <span className="font-extrabold text-emerald-400 text-sm mt-0.5 block">
                    {inspectedPost.metrics.engagement_rate}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  handleCopyPost(inspectedPost);
                  setInspectedPost(null);
                }}
                className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition flex items-center gap-1.5"
              >
                <Copy className="size-3.5" />
                <span>Copy Post Payload</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
