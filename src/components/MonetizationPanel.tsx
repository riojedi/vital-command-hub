import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Target, 
  TrendingUp, 
  FileCode, 
  ExternalLink, 
  Globe, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

// Interfaces mapping directly to schema-v2.sql and api_server.py
interface MonetizationCampaign {
  item_id: number;
  partner_name: string;
  monetization_type: 'affiliate' | 'ppc_ad_unit' | 'sponsored_placement';
  targeting_keywords: string[];
  destination_url: string | null;
  ad_code_html: string | null;
  status: 'active' | 'paused';
  created_at: string;
}

interface RevenueTelemetry {
  monetization_type: string;
  total_events: number;
  total_earnings: number;
}

export default function MonetizationPanel() {
  const [campaigns, setCampaigns] = useState<MonetizationCampaign[]>([]);
  const [telemetry, setTelemetry] = useState<RevenueTelemetry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  
  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MonetizationCampaign | null>(null);
  
  // Form fields
  const [partnerName, setPartnerName] = useState('');
  const [monetizationType, setMonetizationType] = useState<'affiliate' | 'ppc_ad_unit' | 'sponsored_placement'>('affiliate');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [adCodeHtml, setAdCodeHtml] = useState('');
  const [status, setStatus] = useState<'active' | 'paused'>('active');

  // Load API config from localStorage (matches setup specification)
  const getApiConfig = () => {
    let baseUrl = localStorage.getItem('v4l_api_url') || 'http://localhost:8000';
    // Remove trailing slash if present
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    const token = localStorage.getItem('v4l_api_token') || '';
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      baseURL: baseUrl
    };
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const config = getApiConfig();
      
      const [campaignsRes, telemetryRes] = await Promise.all([
        fetch(`${config.baseURL}/api/monetization`, { headers: config.headers }),
        fetch(`${config.baseURL}/api/analytics/revenue`, { headers: config.headers })
      ]);

      if (!campaignsRes.ok || !telemetryRes.ok) {
        throw new Error('API server returned a failed network response.');
      }

      const campaignsData = await campaignsRes.json();
      const telemetryData = await telemetryRes.json();

      // Handle array vs object responses
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
      setTelemetry(Array.isArray(telemetryData) ? telemetryData : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch monetization data. Please check your VPS connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setPartnerName('');
    setMonetizationType('affiliate');
    setKeywordsInput('');
    setDestinationUrl('');
    setAdCodeHtml('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (item: MonetizationCampaign) => {
    setEditingItem(item);
    setPartnerName(item.partner_name);
    setMonetizationType(item.monetization_type);
    setKeywordsInput(item.targeting_keywords.join(', '));
    setDestinationUrl(item.destination_url || '');
    setAdCodeHtml(item.ad_code_html || '');
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Parse comma-separated keywords into clean array
    const keywordsArray = keywordsInput
      .split(',')
      .map(kw => kw.trim())
      .filter(kw => kw.length > 0);

    const payload = {
      partner_name: partnerName,
      monetization_type: monetizationType,
      targeting_keywords: keywordsArray,
      destination_url: monetizationType !== 'ppc_ad_unit' ? destinationUrl : null,
      ad_code_html: monetizationType === 'ppc_ad_unit' ? adCodeHtml : null,
      status: status
    };

    try {
      const config = getApiConfig();
      const url = editingItem
        ? `${config.baseURL}/api/monetization/${editingItem.item_id}`
        : `${config.baseURL}/api/monetization`;
      
      const method = editingItem ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: config.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error saving campaign. Verify your data formats.');
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error saving campaign. Verify your data formats.');
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to delete this monetization partnership? This will permanently stop its dynamic injection into article copies.')) return;
    
    try {
      const config = getApiConfig();
      const response = await fetch(`${config.baseURL}/api/monetization/${itemId}`, {
        method: 'DELETE',
        headers: config.headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete campaign.');
      }

      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete campaign.');
    }
  };

  const toggleStatus = async (item: MonetizationCampaign) => {
    const newStatus = item.status === 'active' ? 'paused' : 'active';
    try {
      const config = getApiConfig();
      const response = await fetch(`${config.baseURL}/api/monetization/${item.item_id}`, {
        method: 'PATCH',
        headers: config.headers,
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle status.');
      }

      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status.');
    }
  };

  // Aggregated calculations for Stats Header
  const totalEarnings = telemetry.reduce((acc, curr) => acc + Number(curr.total_earnings || 0), 0);
  const affiliateEarnings = telemetry.filter(t => t.monetization_type === 'affiliate_click').reduce((acc, curr) => acc + Number(curr.total_earnings || 0), 0);
  const ppcEarnings = telemetry.filter(t => t.monetization_type.includes('ppc')).reduce((acc, curr) => acc + Number(curr.total_earnings || 0), 0);
  const totalConversions = telemetry.reduce((acc, curr) => acc + Number(curr.total_events || 0), 0);

  // Filter lists
  const filteredCampaigns = campaigns.filter(item => {
    const matchesSearch = item.partner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.targeting_keywords.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'all' || item.monetization_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex-1 bg-slate-900 text-slate-100 min-h-screen p-6 md:p-8 font-sans">
      
      {/* Header Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-emerald-400 bg-emerald-950 p-1.5 rounded-lg border border-emerald-800" />
            Monetization & Ad Inventory
          </h1>
          <p className="text-slate-400 mt-1">
            Configure dynamic affiliate keyword injectors, landing destination templates, and contextual AdSense layouts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData} 
            className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition flex items-center justify-center text-slate-300"
            title="Refresh Data"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={openAddModal}
            className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition"
          >
            <Plus className="h-5 w-5" />
            Add Partnership
          </button>
        </div>
      </div>

      {/* Error Alert Bar */}
      {error && (
        <div className="bg-red-950/60 border border-red-800/80 rounded-xl p-4 mb-8 flex items-start gap-3 text-red-300 shadow-md">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-white">System Error</h4>
            <p className="text-sm text-red-200 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Telemetry Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Metric A: Total Revenue */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total Revenue</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">
                ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-900/60">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 border-t border-slate-900 pt-3">
            <span className="text-emerald-400 font-semibold">${affiliateEarnings.toFixed(2)}</span> affiliate | 
            <span className="text-cyan-400 font-semibold"> ${ppcEarnings.toFixed(2)}</span> ad units
          </div>
        </div>

        {/* Metric B: Total Conversions */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total Conversions</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">
                {totalConversions.toLocaleString()}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-900/60">
              <CheckCircle2 className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 border-t border-slate-900 pt-3">
            Recorded outbound affiliate clicks & ad telemetry events
          </p>
        </div>

        {/* Metric C: Active Partnerships */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm font-medium">Active Integrations</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">
                {campaigns.filter(c => c.status === 'active').length}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-violet-950/60 border border-violet-900/60">
              <Globe className="h-6 w-6 text-violet-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 border-t border-slate-900 pt-3">
            <span className="text-violet-400 font-semibold">{campaigns.filter(c => c.monetization_type === 'affiliate').length}</span> affiliate partners
          </div>
        </div>

        {/* Metric D: Active Ad Targets */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm font-medium">Global Key-Targets</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">
                {Array.from(new Set(campaigns.flatMap(c => c.targeting_keywords))).length}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-900/60">
              <Target className="h-6 w-6 text-amber-400" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 border-t border-slate-900 pt-3">
            Unique triggers routing products & hardshell/softgoods ads
          </p>
        </div>
      </div>

      {/* Filter and Search Bar Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 text-slate-500 h-4.5 w-4.5" />
          <input
            type="text"
            placeholder="Search by partner or target keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-200 placeholder-slate-500 focus:outline-none transition text-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Filter Type:</span>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-full md:w-auto">
            {['all', 'affiliate', 'ppc_ad_unit', 'sponsored_placement'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold capitalize transition whitespace-nowrap ${
                  typeFilter === type 
                    ? 'bg-slate-800 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Campaign Grid */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-3 bg-slate-950/40 border border-slate-800 rounded-2xl">
          <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
          <p className="text-slate-400 text-sm">Fetching active monetization records...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 gap-3 bg-slate-950/40 border border-slate-800 rounded-2xl text-center px-4">
          <Target className="h-12 w-12 text-slate-600" />
          <h3 className="text-lg font-bold text-slate-300">No Inventory Rules Found</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            Configure partnerships or keywords to initiate automatic link routing and banner injection in drafted technical content.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCampaigns.map((item) => (
            <div 
              key={item.item_id}
              className={`bg-slate-950 border rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                item.status === 'paused' ? 'border-slate-900 opacity-60' : 'border-slate-800'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border ${
                      item.monetization_type === 'affiliate' 
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60'
                        : item.monetization_type === 'ppc_ad_unit'
                        ? 'bg-cyan-950/40 text-cyan-400 border-cyan-900/60'
                        : 'bg-violet-950/40 text-violet-400 border-violet-900/60'
                    }`}>
                      {item.monetization_type === 'ppc_ad_unit' ? <FileCode className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                      {item.monetization_type.replace('_', ' ')}
                    </span>
                    <h3 className="text-lg font-extrabold text-white tracking-tight">{item.partner_name}</h3>
                  </div>
                  
                  {/* Status Toggle / Actions */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleStatus(item)} 
                      className="text-slate-400 hover:text-white transition"
                      title={item.status === 'active' ? 'Pause Campaign' : 'Activate Campaign'}
                    >
                      {item.status === 'active' ? (
                        <ToggleRight className="h-8 w-8 text-emerald-400 cursor-pointer" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-slate-600 cursor-pointer" />
                      )}
                    </button>
                    <button 
                      onClick={() => openEditModal(item)} 
                      className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                      title="Edit Campaign"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.item_id)} 
                      className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition border-transparent"
                      title="Delete Campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Targeted Keywords Pill Array */}
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">Targeting Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.targeting_keywords.map((kw, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300"
                      >
                        <Target className="h-3 w-3 text-amber-500/70" />
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Details Section */}
              <div className="border-t border-slate-900 pt-4 mt-4 bg-slate-950">
                {item.monetization_type === 'ppc_ad_unit' ? (
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1 flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5 text-cyan-400" /> Ad Injection Snippet
                    </p>
                    <pre className="text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg overflow-x-auto text-slate-400 max-h-24 font-mono">
                      {item.ad_code_html}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1 flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5 text-emerald-400" /> Destination Affiliate Template
                    </p>
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                      <span className="text-xs text-slate-400 font-mono overflow-x-hidden text-ellipsis whitespace-nowrap flex-1">
                        {item.destination_url}
                      </span>
                      <a 
                        href={item.destination_url || '#'} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-emerald-400 hover:text-emerald-300 flex-shrink-0 transition"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center mt-3 text-2xs text-slate-600">
                  <span>ID: {item.item_id}</span>
                  <span>Configured: {new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dynamic Slide-Over Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl relative animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {editingItem ? <Edit3 className="h-5.5 w-5.5 text-emerald-400" /> : <Plus className="h-5.5 w-5.5 text-emerald-400" />}
                {editingItem ? 'Modify Partnership Campaign' : 'Register New Partnership'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Field A: Partner Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Partner / Network Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., AvantLink - Patagonia, AdSense Mobile"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 placeholder-slate-600 focus:outline-none transition text-sm"
                  />
                </div>

                {/* Field B: Monetization Type Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Campaign Type
                  </label>
                  <select
                    value={monetizationType}
                    onChange={(e) => setMonetizationType(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 focus:outline-none transition text-sm"
                  >
                    <option value="affiliate">Affiliate Link</option>
                    <option value="ppc_ad_unit">PPC Ad Unit (Script Block)</option>
                    <option value="sponsored_placement">Sponsored Placement</option>
                  </select>
                </div>
              </div>

              {/* Field C: Targeting Keywords (Comma-Separated Input) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex justify-between">
                  <span>Targeting Keywords</span>
                  <span className="text-slate-500 font-normal">Comma-separated</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., hardshell, gore-tex, waterproof zipper, DWR"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 placeholder-slate-600 focus:outline-none transition text-sm"
                />
                <p className="text-2xs text-slate-500 mt-1">
                  Matched keywords automatically trigger link overlays or dynamic banner insertions in live copies.
                </p>
              </div>

              {/* Conditional Input Rendering based on Selected Type */}
              {monetizationType !== 'ppc_ad_unit' ? (
                /* Affiliate Template Link Input */
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Target Affiliate Deep-Link URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://partner.avantlink.com/click?merchantId=10234&url=..."
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 placeholder-slate-600 focus:outline-none transition text-sm font-mono"
                  />
                  <p className="text-2xs text-slate-500 mt-1">
                    Your unique network tracking link redirecting outbound traffic to merchant stores.
                  </p>
                </div>
              ) : (
                /* PPC Script Block Snippet Textarea */
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Responsive Ad Code HTML/JS Snippet
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="<div class='ads-container'><script>...</script></div>"
                    value={adCodeHtml}
                    onChange={(e) => setAdCodeHtml(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 placeholder-slate-600 focus:outline-none transition text-sm font-mono"
                  />
                  <p className="text-2xs text-slate-500 mt-1">
                    Pasted scripts are injected contextually between paragraphs to serve programmatic Google Ads.
                  </p>
                </div>
              )}

              {/* Field D: Status Toggle */}
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-850 p-3 rounded-xl">
                <input
                  type="checkbox"
                  id="modal-status-checkbox"
                  checked={status === 'active'}
                  onChange={(e) => setStatus(e.target.checked ? 'active' : 'paused')}
                  className="rounded bg-slate-900 border-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 h-4.5 w-4.5 cursor-pointer"
                />
                <label htmlFor="modal-status-checkbox" className="text-sm font-semibold text-slate-200 cursor-pointer">
                  Activate campaign immediately for automated content distribution loops.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition shadow-md shadow-emerald-950/20"
                >
                  {editingItem ? 'Save Updates' : 'Add Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}