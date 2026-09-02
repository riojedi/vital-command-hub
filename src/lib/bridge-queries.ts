import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAnalytics,
  getHealth,
  getQueue,
  getTelemetry,
  type AnalyticsPayload,
} from "@/lib/bridge.functions";
import type { QueueItem, TelemetryRun } from "@/lib/queue-shared";

function unwrap<T>(payload: T[] | { items?: T[]; runs?: T[] } | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.items ?? payload.runs ?? [];
}

export function useHealth() {
  const fn = useServerFn(getHealth);
  const query = useQuery({ queryKey: ["health"], queryFn: () => fn(), refetchInterval: 60_000 });
  return {
    query,
    online: query.data?.ok === true,
    vpsIp: query.data?.ok ? query.data.data.vps_ip : undefined,
    error: query.data && !query.data.ok ? query.data.error : null,
  };
}

export function useQueueData() {
  const fn = useServerFn(getQueue);
  const query = useQuery({ queryKey: ["queue"], queryFn: () => fn(), refetchInterval: 20_000 });
  return {
    query,
    items: query.data?.ok ? unwrap<QueueItem>(query.data.data) : [],
    error: query.data && !query.data.ok ? query.data.error : null,
  };
}

export function useTelemetryData() {
  const fn = useServerFn(getTelemetry);
  const query = useQuery({ queryKey: ["telemetry"], queryFn: () => fn(), refetchInterval: 30_000 });
  return {
    query,
    runs: query.data?.ok ? unwrap<TelemetryRun>(query.data.data) : [],
    error: query.data && !query.data.ok ? query.data.error : null,
  };
}

export function useAnalyticsData() {
  const fn = useServerFn(getAnalytics);
  const query = useQuery({ queryKey: ["analytics"], queryFn: () => fn(), refetchInterval: 60_000 });
  const data: AnalyticsPayload = query.data?.ok ? query.data.data : {};
  return {
    query,
    publications: data.recent_publications ?? [],
    totalTokens: data.total_token_usage ?? 0,
    totalCost: data.total_estimated_cost ?? 0,
    error: query.data && !query.data.ok ? query.data.error : null,
  };
}
