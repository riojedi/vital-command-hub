// src/lib/vitalApi.ts
const API_BASE_URL = import.meta.env.VITE_VPS_API_URL;
const SECURE_API_TOKEN = import.meta.env.VITE_SECURE_API_TOKEN;

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${SECURE_API_TOKEN}`
};

export const vitalApi = {
  checkHealth: async () => {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error("VPS unreachable");
    return res.json();
  },
  getAnalytics: async () => {
    const res = await fetch(`${API_BASE_URL}/analytics`, { headers });
    if (!res.ok) throw new Error("Failed to fetch ledger");
    return res.json();
  },
  getQueue: async () => {
    const res = await fetch(`${API_BASE_URL}/queue`, { headers });
    if (!res.ok) throw new Error("Failed to fetch queue");
    return res.json();
  },
  triggerRun: async () => {
    const res = await fetch(`${API_BASE_URL}/trigger-run`, { method: "POST", headers });
    return res.json();
  },
  updateConfig: async (payload: any) => {
    const res = await fetch(`${API_BASE_URL}/config`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};