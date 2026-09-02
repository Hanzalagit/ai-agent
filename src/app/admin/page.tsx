"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Users, Ticket, Megaphone, BookOpen, Headphones,
  Settings, Shield, LogOut, Search, Plus, Trash2, ChevronDown,
  Activity, DollarSign, UserPlus, TrendingUp, Globe, Mail,
  Phone, MapPin, Star, Clock, AlertTriangle, CheckCircle,
  XCircle, Eye, EyeOff, Save, ExternalLink, Copy, RefreshCw,
  Package, MessageSquare
} from "lucide-react";

type Tab = "overview" | "tenants" | "analytics" | "tickets" | "campaigns" | "knowledge" | "handoffs" | "settings";

type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  email: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branding: any;
  settings: any;
  limits: any;
  apiKeys: string[];
  stats: { productCount: number; faqCount: number; knowledgeCount: number; messageCount: number };
};

type AdminSession = { email: string };

function planBadgeClass(plan: string): string {
  if (plan === "enterprise") return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
  if (plan === "pro") return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
  return "bg-zinc-800 text-zinc-400 border border-zinc-700";
}

function planDisplayName(plan: string | undefined | null): string {
  if (!plan) return "Starter";
  const names: Record<string, string> = { free: "Starter", pro: "Growth", enterprise: "Business" };
  return names[plan] || plan.charAt(0).toUpperCase() + plan.slice(1);
}

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function AdminPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = document.cookie
      .split("; ")
      .find((c) => c.startsWith("admin_session="))
      ?.split("=")[1];
    if (!stored) {
      window.location.replace("/admin/login");
      return;
    }
    try {
      setSession(JSON.parse(decodeURIComponent(stored)));
    } catch {
      window.location.replace("/admin/login");
      return;
    }
    setLoading(false);

    const handleUnload = () => {
      document.cookie = "admin_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  const handleLogout = () => {
    document.cookie = "admin_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "admin_session=; path=/admin; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.removeItem("admin_session");
    sessionStorage.removeItem("admin_session");
    window.history.replaceState(null, "", "/admin/login");
    window.location.replace("/admin/login");
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "tenants", label: "Tenants", icon: Users },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "tickets", label: "Tickets", icon: Ticket },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "knowledge", label: "Knowledge", icon: BookOpen },
    { id: "handoffs", label: "Live Agents", icon: Headphones },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Admin Panel</h1>
              <p className="text-[10px] text-zinc-500">Platform Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg">
              <div className="h-2 w-2 bg-emerald-500 rounded-full" />
              <span className="text-xs text-zinc-400">{session.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-red-400 bg-zinc-800 rounded-lg transition-colors"
            >
              <LogOut className="h-3 w-3" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <nav className="lg:w-56 flex lg:flex-col gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>

          <main className="flex-1 min-w-0">
            {activeTab === "overview" && <OverviewTab />}
            {activeTab === "tenants" && <TenantsTab />}
            {activeTab === "analytics" && <AnalyticsTab />}
            {activeTab === "tickets" && <TicketsTab />}
            {activeTab === "campaigns" && <CampaignsTab />}
            {activeTab === "knowledge" && <KnowledgeTab />}
            {activeTab === "handoffs" && <HandoffsTab />}
            {activeTab === "settings" && <SettingsTab email={session.email} />}
          </main>
        </div>
      </div>
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Tenants", value: stats.totalTenants ?? 0, icon: Users, color: "text-emerald-400" },
    { label: "Total Messages", value: stats.totalMessages ?? 0, icon: MessageSquare, color: "text-blue-400" },
    { label: "Monthly Revenue", value: `Rs. ${(stats.monthlyRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-amber-400" },
    { label: "Active Today", value: stats.activeToday ?? 0, icon: Activity, color: "text-purple-400" },
  ];

  const planDist = stats.planDistribution ?? { free: 0, pro: 0, enterprise: 0 };
  const maxPlan = Math.max(planDist.free, planDist.pro, planDist.enterprise, 1);

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
      <h2 className="text-xl font-bold text-white">Platform Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <card.icon className={`h-5 w-5 ${card.color} mb-2`} />
            <div className="text-xl font-bold text-white">{card.value}</div>
            <div className="text-xs text-zinc-500">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Plan Distribution</h3>
          <div className="space-y-3">
            {[
              { label: "Starter", count: planDist.free, color: "bg-zinc-500" },
              { label: "Growth", count: planDist.pro, color: "bg-cyan-500" },
              { label: "Business", count: planDist.enterprise, color: "bg-amber-500" },
            ].map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-400">{p.label}</span>
                  <span className="text-zinc-500">{p.count}</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div
                    className={`${p.color} h-2 rounded-full transition-all`}
                    style={{ width: `${(p.count / maxPlan) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Tenants</h3>
          <div className="space-y-3">
            {(stats.recentTenants ?? []).length === 0 ? (
              <p className="text-sm text-zinc-500">No tenants yet</p>
            ) : (
              (stats.recentTenants ?? []).slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-white">{t.name}</div>
                    <div className="text-xs text-zinc-500">{t.email}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${planBadgeClass(t.plan)}`}>
                    {planDisplayName(t.plan)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <Package className="h-5 w-5 text-purple-400 mb-2" />
          <div className="text-xl font-bold text-white">{stats.totalOrders ?? 0}</div>
          <div className="text-xs text-zinc-500">Total Orders</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <Ticket className="h-5 w-5 text-orange-400 mb-2" />
          <div className="text-xl font-bold text-white">{stats.totalTickets ?? 0}</div>
          <div className="text-xs text-zinc-500">Total Tickets</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <UserPlus className="h-5 w-5 text-blue-400 mb-2" />
          <div className="text-xl font-bold text-white">{stats.newThisMonth ?? 0}</div>
          <div className="text-xs text-zinc-500">New This Month</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <Globe className="h-5 w-5 text-emerald-400 mb-2" />
          <div className="text-xl font-bold text-white">{stats.activeToday ?? 0}</div>
          <div className="text-xs text-zinc-500">Active Today</div>
        </div>
      </div>
    </motion.div>
  );
}

function TenantsTab() {
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(null);
  const [tenantAnalytics, setTenantAnalytics] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", plan: "free" });
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadTenants = useCallback(() => {
    fetch("/api/admin/tenants")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.tenants)) {
          setTenants(d.tenants);
        }
      })
      .catch((err) => console.error("Failed to load tenants:", err));
  }, []);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  useEffect(() => {
    if (selectedTenant) {
      fetch(`/api/admin/tenants/analytics?tenantId=${selectedTenant.id}&days=7`)
        .then((r) => r.json())
        .then(setTenantAnalytics)
        .catch(() => {});
    }
  }, [selectedTenant]);

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) return;
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Create tenant failed:", data.error);
        alert(data.error || "Failed to create tenant");
        setCreateLoading(false);
        return;
      }
      loadTenants();
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "", plan: "free" });
    } catch (err) {
      console.error("Create tenant error:", err);
      alert("Failed to create tenant. Please try again.");
    }
    setCreateLoading(false);
  };

  const handleUpdatePlan = async (tenantId: string, plan: string) => {
    await fetch("/api/admin/tenants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tenantId, plan }),
    });
    setTenants(tenants.map((t) => t.id === tenantId ? { ...t, plan } : t));
    if (selectedTenant?.id === tenantId) setSelectedTenant({ ...selectedTenant, plan });
  };

  const handleToggleActive = async (tenantId: string, isActive: boolean) => {
    await fetch("/api/admin/tenants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tenantId, isActive: !isActive }),
    });
    setTenants(tenants.map((t) => t.id === tenantId ? { ...t, isActive: !isActive } : t));
    if (selectedTenant?.id === tenantId) setSelectedTenant({ ...selectedTenant, isActive: !isActive });
  };

  const handleDelete = async (tenantId: string) => {
    await fetch(`/api/admin/tenants?id=${tenantId}`, { method: "DELETE" });
    setTenants(tenants.filter((t) => t.id !== tenantId));
    setDeleteConfirm(null);
    if (selectedTenant?.id === tenantId) setSelectedTenant(null);
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Tenant Management</h2>
        <div className="flex gap-2">
          <button
            onClick={loadTenants}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Tenant
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          placeholder="Search tenants by name, email, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Products</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Messages</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium">Created</th>
                <th className="text-left px-4 py-3 text-zinc-500 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    No tenants found
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedTenant(t)}
                  >
                    <td className="px-4 py-3 text-white font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{t.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${planBadgeClass(t.plan)}`}>
                        {planDisplayName(t.plan)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs ${t.isActive ? "text-emerald-400" : "text-zinc-500"}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${t.isActive ? "bg-emerald-500" : "bg-zinc-600"}`} />
                        {t.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{t.stats?.productCount ?? 0}</td>
                    <td className="px-4 py-3 text-zinc-400">{t.stats?.messageCount ?? 0}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTenant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTenant(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedTenant.name}</h3>
                <p className="text-xs text-zinc-500">{selectedTenant.id}</p>
              </div>
              <button onClick={() => setSelectedTenant(null)} className="text-zinc-500 hover:text-white">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Email</div>
                  <div className="text-sm text-white flex items-center gap-2">
                    <Mail className="h-3 w-3 text-zinc-500" />
                    {selectedTenant.email}
                  </div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Plan</div>
                  <select
                    value={selectedTenant.plan}
                    onChange={(e) => handleUpdatePlan(selectedTenant.id, e.target.value)}
                    className="text-sm bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="free">Starter (Free)</option>
                    <option value="pro">Growth (Pro)</option>
                    <option value="enterprise">Business (Enterprise)</option>
                  </select>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Status</div>
                  <button
                    onClick={() => handleToggleActive(selectedTenant.id, selectedTenant.isActive)}
                    className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      selectedTenant.isActive
                        ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                    }`}
                  >
                    {selectedTenant.isActive ? "Active - Click to Suspend" : "Suspended - Click to Activate"}
                  </button>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-1">Created</div>
                  <div className="text-sm text-white flex items-center gap-2">
                    <Clock className="h-3 w-3 text-zinc-500" />
                    {new Date(selectedTenant.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Products", value: selectedTenant.stats?.productCount ?? 0, icon: Package, color: "text-purple-400" },
                  { label: "FAQs", value: selectedTenant.stats?.faqCount ?? 0, icon: BookOpen, color: "text-orange-400" },
                  { label: "Knowledge", value: selectedTenant.stats?.knowledgeCount ?? 0, icon: MessageSquare, color: "text-blue-400" },
                  { label: "Messages", value: selectedTenant.stats?.messageCount ?? 0, icon: BarChart3, color: "text-emerald-400" },
                ].map((s) => (
                  <div key={s.label} className="bg-zinc-800/50 rounded-xl p-3 text-center">
                    <s.icon className={`h-4 w-4 ${s.color} mx-auto mb-1`} />
                    <div className="text-lg font-bold text-white">{s.value}</div>
                    <div className="text-[10px] text-zinc-500">{s.label}</div>
                  </div>
                ))}
              </div>

              {tenantAnalytics && (
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-white mb-3">7-Day Analytics</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-zinc-500">Messages</div>
                      <div className="text-sm font-bold text-white">{tenantAnalytics.totalMessages ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Orders</div>
                      <div className="text-sm font-bold text-white">{tenantAnalytics.totalOrders ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Satisfaction</div>
                      <div className="text-sm font-bold text-white">{tenantAnalytics.satisfactionRate ?? 0}%</div>
                    </div>
                  </div>
                </div>
              )}

              {deleteConfirm === selectedTenant.id ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Delete {selectedTenant.name}? This cannot be undone.
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(selectedTenant.id)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
                    >
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-xs hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(selectedTenant.id)}
                  className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Tenant
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">Create New Tenant</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Business Name</label>
                <input
                  placeholder="e.g. Urban Hive"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Email</label>
                <input
                  placeholder="admin@example.com"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Password</label>
                <input
                  placeholder="Minimum 6 characters"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Plan</label>
                <select
                  value={createForm.plan}
                  onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="free">Starter (Free)</option>
                  <option value="pro">Growth (Pro)</option>
                  <option value="enterprise">Business (Enterprise)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={createLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {createLoading ? "Creating..." : "Create Tenant"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-xl text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function AnalyticsTab() {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    setSnapshot(null);
    fetch(`/api/admin/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => setSnapshot(d.snapshot))
      .catch(() => {});
  }, [days]);

  if (!snapshot) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: "Messages", value: snapshot.totalMessages ?? 0, icon: MessageSquare, color: "text-blue-400" },
    { label: "Tool Calls", value: snapshot.totalToolCalls ?? 0, icon: Activity, color: "text-purple-400" },
    { label: "Tickets", value: snapshot.totalTickets ?? 0, icon: Ticket, color: "text-orange-400" },
    { label: "Orders", value: snapshot.totalOrders ?? 0, icon: Package, color: "text-emerald-400" },
    { label: "Active Sessions", value: snapshot.activeSessions ?? 0, icon: Users, color: "text-pink-400" },
    { label: "Satisfaction", value: `${snapshot.satisfactionRate ?? 0}%`, icon: Star, color: "text-amber-400" },
  ];

  const sentimentTotal = (snapshot.sentimentDistribution?.positive ?? 0) + (snapshot.sentimentDistribution?.neutral ?? 0) + (snapshot.sentimentDistribution?.negative ?? 0);

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Analytics Dashboard</h2>
        <div className="flex gap-2">
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                days === d
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {d === 1 ? "24h" : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <card.icon className={`h-5 w-5 ${card.color} mb-2`} />
            <div className="text-xl font-bold text-white">{card.value}</div>
            <div className="text-xs text-zinc-500">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Top Intents</h3>
          <div className="space-y-3">
            {(snapshot.topIntents ?? []).length === 0 ? (
              <p className="text-sm text-zinc-500">No intent data yet</p>
            ) : (
              (snapshot.topIntents ?? []).map((item: any) => {
                const maxCount = Math.max(...(snapshot.topIntents ?? []).map((i: any) => i.count), 1);
                return (
                  <div key={item.intent}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-300 capitalize">{item.intent.replace(/_/g, " ")}</span>
                      <span className="text-zinc-500">{item.count}</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all"
                        style={{ width: `${(item.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Sentiment Distribution</h3>
          <div className="space-y-4">
            {[
              { label: "Positive", value: snapshot.sentimentDistribution?.positive ?? 0, color: "bg-emerald-500", icon: CheckCircle },
              { label: "Neutral", value: snapshot.sentimentDistribution?.neutral ?? 0, color: "bg-zinc-500", icon: AlertTriangle },
              { label: "Negative", value: snapshot.sentimentDistribution?.negative ?? 0, color: "bg-red-500", icon: XCircle },
            ].map((item) => {
              const pct = sentimentTotal > 0 ? Math.round((item.value / sentimentTotal) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 text-zinc-300">
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </span>
                    <span className="text-zinc-500">{item.value} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2.5">
                    <div className={`${item.color} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Activity by Hour (PKT)</h3>
          <div className="flex items-end gap-1 h-40">
            {(snapshot.messagesByHour ?? []).map((h: any) => {
              const max = Math.max(...(snapshot.messagesByHour ?? []).map((x: any) => x.count), 1);
              const height = (h.count / max) * 100;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-400"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${h.hour}:00 - ${h.count} messages`}
                  />
                  {h.hour % 6 === 0 && (
                    <span className="text-[10px] text-zinc-500">{h.hour}h</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Most Searched Products</h3>
          {(snapshot.topProducts ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No product searches yet</p>
          ) : (
            <div className="space-y-2">
              {(snapshot.topProducts ?? []).map((p: any, i: number) => (
                <div key={p.name} className="flex items-center justify-between p-2.5 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-600">#{i + 1}</span>
                    <span className="text-sm text-zinc-300">{p.name}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full">
                    {p.count} searches
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TicketsTab() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/tickets")
      .then((r) => r.json())
      .then((data) => {
        setTickets(data.tickets ?? []);
        setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-500/10 text-red-400 border border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    low: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
      <h2 className="text-xl font-bold text-white">Support Tickets</h2>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <Ticket className="h-5 w-5 text-orange-400 mb-2" />
            <div className="text-xl font-bold text-white">{stats.total ?? 0}</div>
            <div className="text-xs text-zinc-500">Total Tickets</div>
          </div>
          {Object.entries(stats.byCategory ?? {}).map(([cat, count]) => (
            <div key={cat} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-xl font-bold text-white">{String(count)}</div>
              <div className="text-xs text-zinc-500 capitalize">{cat.replace(/_/g, " ")}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="divide-y divide-zinc-800/50 max-h-[600px] overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">
              No tickets yet. Tickets will appear here when customers create complaints.
            </div>
          ) : (
            tickets.map((t) => (
              <div key={t.id} className="p-4 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Ticket className="h-5 w-5 text-zinc-600 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-500">{t.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[t.priority] ?? "bg-zinc-800 text-zinc-400"}`}>
                          {t.priority}
                        </span>
                      </div>
                      <div className="font-medium text-white mt-1">{t.subject}</div>
                      <div className="text-sm text-zinc-500 mt-0.5">
                        {t.department} - Assigned: {t.assignedTo}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    t.status === "Open"
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", message: "", targetAudience: "all" });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/campaigns").then((r) => r.json()),
      fetch("/api/admin/campaigns?action=templates").then((r) => r.json()),
    ])
      .then(([c, t]) => {
        setCampaigns(c.campaigns ?? []);
        setTemplates(t.templates ?? []);
      })
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.message) return;
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.campaign) setCampaigns([...campaigns, data.campaign]);
    setShowCreate(false);
    setForm({ name: "", message: "", targetAudience: "all" });
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Campaign Manager</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {templates.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Message Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t: any) => (
              <div
                key={t.name}
                className="p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors border border-zinc-800 hover:border-zinc-700"
                onClick={() => setForm({ ...form, message: t.template, name: t.name })}
              >
                <div className="font-medium text-sm text-white mb-1">{t.name}</div>
                <div className="text-xs text-zinc-500 line-clamp-2">{t.template}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="divide-y divide-zinc-800/50">
          {campaigns.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">
              No campaigns yet. Create one to start messaging customers.
            </div>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="p-4 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{c.name}</div>
                    <div className="text-sm text-zinc-500 mt-0.5 line-clamp-1">{c.message}</div>
                    <div className="text-xs text-zinc-600 mt-1">Target: {c.targetAudience}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.status === "sent"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : c.status === "scheduled"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">New Campaign</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Campaign Name</label>
                <input
                  placeholder="e.g. Summer Sale 2026"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Message</label>
                <textarea
                  placeholder="Write your campaign message..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Target Audience</label>
                <select
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="all">All Customers</option>
                  <option value="vip">VIP Customers</option>
                  <option value="new">New Customers</option>
                  <option value="inactive">Inactive Customers</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  Create Campaign
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-xl text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function KnowledgeTab() {
  const [entries, setEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "general", tags: "" });

  useEffect(() => {
    fetch("/api/admin/knowledge")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) {
      setSearchResults(null);
      return;
    }
    const res = await fetch(`/api/admin/knowledge?q=${encodeURIComponent(searchQuery)}`);
    const data = await res.json();
    setSearchResults(data.results ?? []);
  };

  const handleAdd = async () => {
    if (!form.title || !form.content) return;
    const res = await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (data.entry) setEntries([...entries, data.entry]);
    setShowAdd(false);
    setForm({ title: "", content: "", category: "general", tags: "" });
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/knowledge?id=${id}`, { method: "DELETE" });
    setEntries(entries.filter((e) => e.id !== id));
  };

  const displayEntries = searchResults ?? entries;

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Knowledge Base</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-sm font-medium transition-colors"
        >
          Search
        </button>
        {searchResults !== null && (
          <button
            onClick={() => { setSearchResults(null); setSearchQuery(""); }}
            className="px-4 py-2.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-sm font-medium transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {searchResults !== null && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <h3 className="text-sm font-medium text-emerald-400 mb-2">
            Search Results ({searchResults.length})
          </h3>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayEntries.length === 0 ? (
          <div className="col-span-full text-center py-12 text-zinc-500">
            {searchResults !== null ? "No matching entries found" : "No knowledge entries yet. Add your first entry to help the AI answer customer questions."}
          </div>
        ) : (
          displayEntries.map((e) => (
            <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 group hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="font-medium text-white text-sm">{e.title}</div>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-xs text-zinc-500 mt-2 line-clamp-3">{e.content}</div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">{e.category}</span>
                {e.tags?.map((t: string) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">Add Knowledge Entry</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Title</label>
                <input
                  placeholder="e.g. Return Policy"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Content</label>
                <textarea
                  placeholder="Write detailed content (supports markdown)..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Category</label>
                <input
                  placeholder="e.g. delivery, returns, products"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Tags (comma separated)</label>
                <input
                  placeholder="e.g. shipping, policy, refund"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  Add Entry
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-xl text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function HandoffsTab() {
  const [handoffs, setHandoffs] = useState<any[]>([]);
  const [activeHandoffs, setActiveHandoffs] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/handoffs").then((r) => r.json()),
      fetch("/api/admin/handoffs?action=active").then((r) => r.json()),
    ])
      .then(([all, active]) => {
        setHandoffs(all.handoffs ?? []);
        setActiveHandoffs(active.handoffs ?? []);
      })
      .catch(() => {});
  }, []);

  const handleConnect = async (id: string) => {
    await fetch("/api/admin/handoffs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect", handoffId: id, agentName: "Admin Agent" }),
    });
    const updated = handoffs.map((h) =>
      h.id === id ? { ...h, status: "connected", assignedAgent: "Admin Agent" } : h
    );
    setHandoffs(updated);
    setActiveHandoffs(activeHandoffs.filter((h) => h.id !== id));
  };

  const handleResolve = async (id: string) => {
    await fetch("/api/admin/handoffs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", handoffId: id }),
    });
    setHandoffs(handoffs.map((h) => (h.id === id ? { ...h, status: "resolved" } : h)));
  };

  const urgencyBadge = (urgency: string) => {
    if (urgency === "high") return "bg-red-500/10 text-red-400 border border-red-500/20";
    return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
  };

  const statusBadge = (status: string) => {
    if (status === "waiting") return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    if (status === "connected") return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
      <h2 className="text-xl font-bold text-white">Live Agent Handoffs</h2>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">
          Waiting for Agent ({activeHandoffs.length})
        </h3>
        {activeHandoffs.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No active handoff requests. Customers will be routed here when AI cannot resolve their issue.
          </p>
        ) : (
          <div className="space-y-3">
            {activeHandoffs.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between p-4 bg-amber-500/5 rounded-xl border border-amber-500/10"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-500">{h.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${urgencyBadge(h.urgency)}`}>
                      {h.urgency}
                    </span>
                  </div>
                  <div className="font-medium text-white mt-1">{h.customerName}</div>
                  <div className="text-sm text-zinc-500">Reason: {h.reason}</div>
                </div>
                <button
                  onClick={() => handleConnect(h.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Headphones className="h-3.5 w-3.5" />
                  Take Call
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-white">All Handoff Requests</h3>
        </div>
        <div className="divide-y divide-zinc-800/50 max-h-[400px] overflow-y-auto">
          {handoffs.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">No handoff requests yet.</div>
          ) : (
            handoffs.map((h) => (
              <div key={h.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-500">{h.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(h.status)}`}>
                      {h.status}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-300 mt-1">
                    {h.customerName} - {h.reason}
                  </div>
                </div>
                {h.status === "connected" && (
                  <button
                    onClick={() => handleResolve(h.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Resolve
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SettingsTab({ email }: { email: string }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
      <h2 className="text-xl font-bold text-white">Settings</h2>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">Admin Account</div>
            <div className="text-xs text-zinc-500">{email}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-2">Platform Version</div>
            <div className="text-sm text-white">v2.0</div>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-2">Status</div>
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
              All systems operational
            </div>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <div className="text-xs text-zinc-500 mb-2">Platform Settings</div>
            <div className="text-sm text-zinc-400">Advanced platform configuration coming soon.</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
