"use client";

import { useState, useEffect, useCallback } from "react";

type Tab = "analytics" | "crm" | "tickets" | "campaigns" | "knowledge" | "handoffs";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-xl font-semibold text-gray-600 dark:text-gray-300">
          Loading Admin Dashboard...
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "crm", label: "Customers", icon: "👥" },
    { id: "tickets", label: "Tickets", icon: "🎫" },
    { id: "campaigns", label: "Campaigns", icon: "📢" },
    { id: "knowledge", label: "Knowledge Base", icon: "📚" },
    { id: "handoffs", label: "Live Agents", icon: "🧑‍💼" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Ay Cosmetics AI Admin
              </h1>
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full dark:bg-green-900 dark:text-green-200">
                v2.0
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                ← Back to Chat
              </a>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="AI Agent Online" />
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "analytics" && <AnalyticsPanel />}
        {activeTab === "crm" && <CRMPanel />}
        {activeTab === "tickets" && <TicketsPanel />}
        {activeTab === "campaigns" && <CampaignsPanel />}
        {activeTab === "knowledge" && <KnowledgePanel />}
        {activeTab === "handoffs" && <HandoffsPanel />}
      </main>
    </div>
  );
}

// ==================== ANALYTICS PANEL ====================
function AnalyticsPanel() {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetch(`/api/admin/analytics?days=${days}`)
      .then((r) => r.json())
      .then(setSnapshot)
      .catch(console.error);
  }, [days]);

  if (!snapshot) {
    return <div className="text-gray-500 dark:text-gray-400">Loading analytics...</div>;
  }

  const statCards = [
    { label: "Total Messages", value: snapshot.totalMessages, icon: "💬", color: "blue" },
    { label: "Tool Calls", value: snapshot.totalToolCalls, icon: "🔧", color: "purple" },
    { label: "Tickets Created", value: snapshot.totalTickets, icon: "🎫", color: "orange" },
    { label: "Orders", value: snapshot.totalOrders, icon: "🛒", color: "green" },
    { label: "Active Sessions", value: snapshot.activeSessions, icon: "👥", color: "pink" },
    { label: "Satisfaction", value: `${snapshot.satisfactionRate}%`, icon: "😊", color: "yellow" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          📊 Analytics Dashboard
        </h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {card.value}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Intents */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🎯 Top Intents
          </h3>
          <div className="space-y-3">
            {snapshot.topIntents.map((item: any) => (
              <div key={item.intent} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300 capitalize">
                      {item.intent.replace("_", " ")}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(item.count / Math.max(...snapshot.topIntents.map((i: any) => i.count))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            💭 Sentiment Distribution
          </h3>
          <div className="space-y-4">
            {[
              { label: "Positive", value: snapshot.sentimentDistribution.positive, color: "bg-green-500", emoji: "😊" },
              { label: "Neutral", value: snapshot.sentimentDistribution.neutral, color: "bg-yellow-500", emoji: "😐" },
              { label: "Negative", value: snapshot.sentimentDistribution.negative, color: "bg-red-500", emoji: "😞" },
            ].map((item) => {
              const total = snapshot.sentimentDistribution.positive + snapshot.sentimentDistribution.neutral + snapshot.sentimentDistribution.negative;
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                      <span className="text-gray-500 dark:text-gray-400">{item.value} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div className={`${item.color} h-3 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🛍️ Most Searched Products
          </h3>
          {snapshot.topProducts.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No product searches yet</p>
          ) : (
            <div className="space-y-2">
              {snapshot.topProducts.map((p: any, i: number) => (
                <div key={p.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-400 dark:text-gray-500">#{i + 1}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{p.name}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">
                    {p.count} searches
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity by Hour */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ⏰ Activity by Hour (PKT)
          </h3>
          <div className="flex items-end gap-1 h-40">
            {snapshot.messagesByHour.map((h: any) => {
              const max = Math.max(...snapshot.messagesByHour.map((x: any) => x.count), 1);
              const height = (h.count / max) * 100;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${h.hour}:00 - ${h.count} messages`}
                  />
                  {h.hour % 6 === 0 && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">{h.hour}h</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== CRM PANEL ====================
function CRMPanel() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/crm").then((r) => r.json()),
      fetch("/api/admin/crm?action=stats").then((r) => r.json()),
    ]).then(([crmData, statsData]) => {
      setCustomers(crmData.customers ?? []);
      setStats(statsData);
    });
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        👥 Customer CRM
      </h2>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Customers", value: stats.total, icon: "👥" },
            { label: "New This Month", value: stats.newThisMonth, icon: "🆕" },
            { label: "Repeat Rate", value: `${stats.repeatRate}%`, icon: "🔄" },
            { label: "VIP Customers", value: stats.vipCount, icon: "⭐" },
            { label: "Avg Satisfaction", value: stats.avgSatisfaction.toFixed(1), icon: "😊" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Customer List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            All Customers ({customers.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
          {customers.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No customers yet. Customers will appear here after chat interactions.
            </div>
          ) : (
            customers.map((c) => (
              <div
                key={c.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                onClick={() => setSelectedCustomer(c)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                      {c.tags.includes("vip") && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded dark:bg-yellow-900 dark:text-yellow-200">VIP</span>
                      )}
                      {c.repeatCustomer && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded dark:bg-green-900 dark:text-green-200">Repeat</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {c.phone} • {c.interactions.length} interactions • {c.loyaltyPoints} pts
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      c.sentiment === "positive" ? "text-green-600" :
                      c.sentiment === "negative" ? "text-red-600" : "text-gray-600"
                    }`}>
                      {c.sentiment === "positive" ? "😊" : c.sentiment === "negative" ? "😞" : "😐"} {(c.satisfactionScore * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-400">Rs. {(c.totalSpent ?? 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCustomer(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedCustomer.name}</h3>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">Phone:</span> {selectedCustomer.phone}</div>
                <div><span className="text-gray-500">City:</span> {selectedCustomer.city ?? "N/A"}</div>
                <div><span className="text-gray-500">Total Orders:</span> {selectedCustomer.totalOrders}</div>
                <div><span className="text-gray-500">Total Spent:</span> Rs. {(selectedCustomer.totalSpent ?? 0).toLocaleString()}</div>
                <div><span className="text-gray-500">Loyalty Points:</span> {selectedCustomer.loyaltyPoints}</div>
                <div><span className="text-gray-500">Sentiment:</span> {selectedCustomer.sentiment}</div>
              </div>
              {selectedCustomer.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {selectedCustomer.tags.map((t: string) => (
                    <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs dark:bg-blue-900 dark:text-blue-200">{t}</span>
                  ))}
                </div>
              )}
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Interactions</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedCustomer.interactions.slice(-5).reverse().map((i: any) => (
                    <div key={i.id} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span className="capitalize">{i.type}</span>
                        <span>{new Date(i.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{i.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== TICKETS PANEL ====================
function TicketsPanel() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/tickets")
      .then((r) => r.json())
      .then((data) => {
        setTickets(data.tickets ?? []);
        setStats(data.stats);
      });
  }, []);

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        🎫 Smart Ticket Router
      </h2>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Tickets</div>
          </div>
          {Object.entries(stats.byCategory ?? {}).map(([cat, count]) => (
            <div key={cat} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{String(count)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{cat.replace("_", " ")}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No tickets yet. Tickets will appear here when customers create complaints.
            </div>
          ) : (
            tickets.map((t) => (
              <div key={t.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{t.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[t.priority]}`}>
                          {t.priority}
                        </span>
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white mt-1">{t.subject}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        → {t.department} • Assigned: {t.assignedTo}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    t.status === "Open" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                  }`}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== CAMPAIGNS PANEL ====================
function CampaignsPanel() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", message: "", targetAudience: "all" });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/campaigns").then((r) => r.json()),
      fetch("/api/admin/campaigns?action=templates").then((r) => r.json()),
    ]).then(([c, t]) => {
      setCampaigns(c.campaigns ?? []);
      setTemplates(t.templates ?? []);
    });
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.message) return;
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCampaigns([...campaigns, data.campaign]);
    setShowCreate(false);
    setForm({ name: "", message: "", targetAudience: "all" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          📢 Campaign Manager
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + New Campaign
        </button>
      </div>

      {/* Templates */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Message Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t) => (
            <div
              key={t.name}
              className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setForm({ ...form, message: t.template, name: t.name })}
            >
              <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">{t.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{t.template}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">New Campaign</h3>
            <div className="space-y-4">
              <input
                placeholder="Campaign name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <textarea
                placeholder="Message content"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Customers</option>
                <option value="vip">VIP Customers</option>
                <option value="new">New Customers</option>
                <option value="inactive">Inactive Customers</option>
              </select>
              <div className="flex gap-3">
                <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Create Campaign
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg dark:border-gray-600">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {campaigns.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No campaigns yet. Create one to start messaging customers.
            </div>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{c.message}</div>
                    <div className="text-xs text-gray-400 mt-1">Target: {c.targetAudience}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.status === "sent" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                    c.status === "scheduled" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                  }`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== KNOWLEDGE BASE PANEL ====================
function KnowledgePanel() {
  const [entries, setEntries] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", content: "", category: "general", tags: "" });

  useEffect(() => {
    fetch("/api/admin/knowledge").then((r) => r.json()).then((d) => setEntries(d.entries ?? []));
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    const res = await fetch(`/api/admin/knowledge?q=${encodeURIComponent(searchQuery)}`);
    const data = await res.json();
    setSearchResults(data.results ?? []);
  };

  const handleAdd = async () => {
    if (!form.title || !form.content) return;
    const res = await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) }),
    });
    const data = await res.json();
    setEntries([...entries, data.entry]);
    setShowAdd(false);
    setForm({ title: "", content: "", category: "general", tags: "" });
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/knowledge?id=${id}`, { method: "DELETE" });
    setEntries(entries.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          📚 Knowledge Base
        </h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Add Entry
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <input
          placeholder="Search knowledge base..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <button onClick={handleSearch} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700">
          Search
        </button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Search Results ({searchResults.length})
          </h3>
          <div className="space-y-2">
            {searchResults.map((e) => (
              <div key={e.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                <div className="font-medium text-sm text-gray-900 dark:text-white">{e.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{e.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Knowledge Entry</h3>
            <div className="space-y-4">
              <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <textarea placeholder="Content (supports markdown)" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <input placeholder="Category (e.g. delivery, returns, products)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <div className="flex gap-3">
                <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Entry</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg dark:border-gray-600">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            No knowledge entries yet. Add your first entry to help the AI answer customer questions better.
          </div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="font-medium text-gray-900 dark:text-white">{e.title}</div>
                <button onClick={() => handleDelete(e.id)} className="text-red-500 hover:text-red-700 text-sm">✕</button>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-3">{e.content}</div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded dark:bg-gray-700 dark:text-gray-300">{e.category}</span>
                {e.tags?.map((t: string) => (
                  <span key={t} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded dark:bg-blue-900 dark:text-blue-200">{t}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ==================== HANDOFFS PANEL ====================
function HandoffsPanel() {
  const [handoffs, setHandoffs] = useState<any[]>([]);
  const [activeHandoffs, setActiveHandoffs] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/handoffs").then((r) => r.json()),
      fetch("/api/admin/handoffs?action=active").then((r) => r.json()),
    ]).then(([all, active]) => {
      setHandoffs(all.handoffs ?? []);
      setActiveHandoffs(active.handoffs ?? []);
    });
  }, []);

  const handleConnect = async (id: string) => {
    await fetch("/api/admin/handoffs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect", handoffId: id, agentName: "Admin Agent" }),
    });
    setHandoffs(handoffs.map((h) => h.id === id ? { ...h, status: "connected", assignedAgent: "Admin Agent" } : h));
  };

  const handleResolve = async (id: string) => {
    await fetch("/api/admin/handoffs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", handoffId: id }),
    });
    setHandoffs(handoffs.map((h) => h.id === id ? { ...h, status: "resolved" } : h));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        🧑‍💼 Live Agent Handoff
      </h2>

      {/* Active Handoffs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          ⚡ Waiting for Agent ({activeHandoffs.length})
        </h3>
        {activeHandoffs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No active handoff requests. Customers will be routed here when AI cannot resolve their issue.</p>
        ) : (
          <div className="space-y-3">
            {activeHandoffs.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-500">{h.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      h.urgency === "high" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}>{h.urgency}</span>
                  </div>
                  <div className="font-medium text-gray-900 dark:text-white mt-1">{h.customerName}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Reason: {h.reason}</div>
                </div>
                <button
                  onClick={() => handleConnect(h.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  Take Call
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Handoffs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">All Handoff Requests</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
          {handoffs.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No handoff requests yet.
            </div>
          ) : (
            handoffs.map((h) => (
              <div key={h.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-500">{h.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      h.status === "waiting" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                      h.status === "connected" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    }`}>{h.status}</span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{h.customerName} — {h.reason}</div>
                </div>
                {h.status === "connected" && (
                  <button
                    onClick={() => handleResolve(h.id)}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                  >
                    Resolve
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
