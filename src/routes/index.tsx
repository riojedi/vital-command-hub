// src/pages/Index.tsx
import React, { useEffect, useState } from 'react';
import { vitalApi } from '../lib/vitalApi';
import { Activity, Zap, FileText, Play, Terminal, AlertTriangle } from 'lucide-react';

export default function Index() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [status, setStatus] = useState("Initializing Bridge...");
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    vitalApi.checkHealth()
      .then(() => setStatus("Connected: 15.204.83.117"))
      .catch(() => setStatus("VPS Connection Failed"));

    vitalApi.getAnalytics().then(setAnalytics).catch(console.error);
    // vitalApi.getQueue().then(setQueue).catch(console.error); // Uncomment when /queue is live on VPS
  }, []);

  const handleTrigger = async () => {
    try {
      await vitalApi.triggerRun();
      alert("Agent run triggered successfully on VPS.");
    } catch (e) {
      alert("Failed to spawn process. Verify FastAPI bridge is running.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans flex">
      {/* Main Dashboard Area */}
      <div className="flex-1 pr-6">
        <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vital4Living Autonomy Hub</h1>
            <p className={`text-[19px] mt-2 ${status.includes('Failed') ? 'text-[#ff4a00]' : 'text-green-400'}`}>
              {status}
            </p>
          </div>
          <button 
            onClick={() => setChatOpen(!chatOpen)}
            className="bg-gray-800 hover:bg-gray-700 text-[19px] px-6 rounded-lg flex items-center min-h-[48px]"
          >
            <Terminal className="mr-2 w-5 h-5" />
            Toggle Autopilot
          </button>
        </header>

        {/* Metric Cards - Monitoring the $0.18 SLA Target */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <p className="text-gray-400 text-[19px]">Token Usage</p>
              <Zap className="text-[#ff4a00] w-8 h-8" />
            </div>
            <h2 className="text-4xl font-bold">{analytics?.total_token_usage || '0'}</h2>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <p className="text-gray-400 text-[19px]">Est. Pipeline Cost</p>
              <Activity className="text-blue-400 w-8 h-8" />
            </div>
            <h2 className="text-4xl font-bold">${analytics?.total_estimated_cost?.toFixed(2) || '0.00'}</h2>
          </div>

          <button 
            onClick={handleTrigger}
            className="bg-[#ff4a00] hover:bg-orange-600 transition-colors p-6 rounded-lg flex items-center justify-center min-h-[48px] w-full"
          >
            <Play className="text-white w-8 h-8 mr-3" />
            <h2 className="text-2xl font-bold text-white">Execute Agents</h2>
          </button>
        </div>

        {/* Dynamic Task Queue (editorial_queue mapping) */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-2xl font-bold mb-4 flex items-center">
            <FileText className="mr-2" /> Active Editorial Queue
          </h3>
          <div className="space-y-4">
            {/* Mocked visual representation of states as defined in Vital4Living- Current */}
            <div className="border-l-4 border-gray-500 pl-4 py-3 bg-black rounded">
              <p className="text-[19px] font-bold">Wren Calloway: Altitude Physiology</p>
              <p className="text-gray-400 text-sm mt-1 uppercase tracking-wider">Status: RESEARCHING</p>
            </div>
            <div className="border-l-4 border-[#ff4a00] pl-4 py-3 bg-black rounded flex justify-between items-center">
              <div>
                <p className="text-[19px] font-bold">Sierra Marlowe: Mondo Boot Sizing Spec</p>
                <p className="text-[#ff4a00] text-sm mt-1 uppercase tracking-wider">Status: VERIFICATION_FAILED</p>
              </div>
              <AlertTriangle className="text-[#ff4a00] w-6 h-6 mr-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Chat Sidebar (System Command Logic) */}
      {chatOpen && (
        <div className="w-96 bg-gray-900 border-l border-gray-800 p-6 flex flex-col">
          <h3 className="text-2xl font-bold mb-4">Autopilot Assistant</h3>
          <div className="flex-1 bg-black rounded border border-gray-800 p-4 mb-4 overflow-y-auto">
            <p className="text-gray-400 text-[19px] italic">System ready. Enter natural language commands to update operational_strategy parameters.</p>
          </div>
          <input 
            type="text" 
            placeholder="e.g., Make Sierra more opinionated..." 
            className="w-full bg-black border border-gray-700 rounded p-3 text-[19px] text-white min-h-[48px]"
          />
        </div>
      )}
    </div>
  );
}