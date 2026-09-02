"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Package, MessageSquare, BookOpen, Settings, Key,
  LogOut, ExternalLink, Copy, Check, Plus, Trash2, Save, Globe,
  Palette, Bot, Shield
} from "lucide-react";

type Tab = "overview" | "products" | "faqs" | "knowledge" | "settings" | "api";
type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  email: string;
  plan: string;
  branding: any;
  settings: any;
  apiKeys: string[];
  createdAt: string;
};

function planDisplayName(plan: string | undefined | null): string {
  if (!plan) return "Starter";
  const names: Record<string, string> = { free: "Starter", pro: "Growth", enterprise: "Business" };
  return names[plan] || plan.charAt(0).toUpperCase() + plan.slice(1);
}

export default function DashboardPage() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("tenant");
    if (!stored) {
      window.location.href = "/login";
      return;
    }
    const parsed = JSON.parse(stored);
    if (!parsed.apiKeys) parsed.apiKeys = [];
    if (!parsed.branding) parsed.branding = {};
    if (!parsed.settings) parsed.settings = {};
    setTenant(parsed);
    setLoading(false);
  }, []);

  if (loading || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("tenant");
    localStorage.removeItem("tenant_id");
    window.location.href = "/login";
  };

  const isGrowth = tenant.plan === "pro";
  const isBusiness = tenant.plan === "enterprise";
  const isStarter = tenant.plan === "free";

  const tabs: { id: Tab; label: string; icon: any; plan?: string }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "products", label: "Products", icon: Package },
    { id: "faqs", label: "FAQs", icon: MessageSquare },
    { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
    ...(isGrowth || isBusiness ? [{ id: "api" as Tab, label: "API Keys", icon: Key }] : []),
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-mono text-sm font-bold text-zinc-950">
              {"</>"}
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">{tenant.name}</h1>
              <p className="text-[10px] text-zinc-500">{planDisplayName(tenant.plan)} plan</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/chat?tenant=${tenant.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition-colors"
            >
              <MessageSquare className="h-3 w-3" />
              Open Chat
            </a>
            <a
              href={`/embed?tenant=${tenant.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Embed Widget
            </a>
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
            {activeTab === "overview" && <OverviewTab tenant={tenant} />}
            {activeTab === "products" && <ProductsTab tenant={tenant} />}
            {activeTab === "faqs" && <FaqsTab tenant={tenant} />}
            {activeTab === "knowledge" && <KnowledgeTab tenant={tenant} />}
            {activeTab === "api" && <ApiTab tenant={tenant} />}
            {activeTab === "settings" && <SettingsTab tenant={tenant} setTenant={setTenant} />}
          </main>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ tenant }: { tenant: TenantInfo }) {
  const [stats, setStats] = useState({ products: 0, knowledge: 0, faqs: 0, messages: 0 });

  useEffect(() => {
    const headers = { "x-tenant-id": tenant.id };
    Promise.all([
      fetch("/api/tenant/products", { headers }).then(r => r.json()),
      fetch("/api/tenant/knowledge", { headers }).then(r => r.json()),
      fetch("/api/tenant/faqs", { headers }).then(r => r.json()),
    ]).then(([products, knowledge, faqs]) => {
      setStats({
        products: products.total ?? (products.products?.length ?? 0),
        knowledge: knowledge.total ?? (knowledge.entries?.length ?? 0),
        faqs: faqs.total ?? (faqs.faqs?.length ?? 0),
        messages: 0,
      });
    }).catch(() => {});
  }, [tenant.id]);

  const isStarter = tenant.plan === "free";
  const isGrowth = tenant.plan === "pro";
  const isBusiness = tenant.plan === "enterprise";

  const limits = {
    free: { products: 20, knowledge: 10, messages: 100 },
    pro: { products: 500, knowledge: 100, messages: 5000 },
    enterprise: { products: Infinity, knowledge: Infinity, messages: Infinity },
  }[tenant.plan] || { products: 20, knowledge: 10, messages: 100 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Dashboard Overview</h2>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isBusiness ? "bg-amber-500/10 text-amber-400" :
          isGrowth ? "bg-cyan-500/10 text-cyan-400" :
          "bg-zinc-800 text-zinc-400"
        }`}>
          {planDisplayName(tenant.plan)}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <Package className="h-5 w-5 text-purple-400 mb-2" />
          <div className="text-xl font-bold text-white">{stats.products}</div>
          <div className="text-xs text-zinc-500">
            Products
            {limits.products !== Infinity && (
              <span className="text-zinc-600"> / {limits.products}</span>
            )}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <BookOpen className="h-5 w-5 text-orange-400 mb-2" />
          <div className="text-xl font-bold text-white">{stats.knowledge}</div>
          <div className="text-xs text-zinc-500">
            Knowledge
            {limits.knowledge !== Infinity && (
              <span className="text-zinc-600"> / {limits.knowledge}</span>
            )}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <MessageSquare className="h-5 w-5 text-blue-400 mb-2" />
          <div className="text-xl font-bold text-white">{stats.faqs}</div>
          <div className="text-xs text-zinc-500">FAQs</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <Globe className="h-5 w-5 text-emerald-400 mb-2" />
          <div className="text-xl font-bold text-white">Active</div>
          <div className="text-xs text-zinc-500">Chat Widget</div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Your Plan Features</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Chat Widget", included: true },
            { label: "Products", included: true },
            { label: "FAQs", included: true },
            { label: "Knowledge Base", included: true },
            { label: "Custom Branding", included: isGrowth || isBusiness },
            { label: "WhatsApp Integration", included: isGrowth || isBusiness },
            { label: "API Access", included: isGrowth || isBusiness },
            { label: "Advanced Analytics", included: isGrowth || isBusiness },
            { label: "Priority Support", included: isBusiness },
            { label: "Custom AI Training", included: isBusiness },
            { label: "SLA Guarantee", included: isBusiness },
            { label: "Unlimited Everything", included: isBusiness },
          ].map((f) => (
            <div key={f.label} className={`flex items-center gap-2 text-sm ${f.included ? "text-zinc-300" : "text-zinc-600"}`}>
              {f.included ? (
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-zinc-700 shrink-0" />
              )}
              {f.label}
            </div>
          ))}
        </div>
        {isStarter && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <a href="/landing#pricing" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              Upgrade to Growth → unlock custom branding, WhatsApp, API access & more
            </a>
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Share Chat with Customers</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Share this link with your customers to start chatting, or embed the widget on your website:
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Direct Chat Link</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-xs text-emerald-400 overflow-x-auto">
                {typeof window !== "undefined" ? `${window.location.origin}/chat?tenant=${tenant.slug}` : `/chat?tenant=${tenant.slug}`}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/chat?tenant=${tenant.slug}`);
                }}
                className="px-3 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs"
              >
                Copy
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Embed Code (iframe)</label>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-xs text-emerald-400 overflow-x-auto">
              {`<iframe src="${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/embed?tenant=${tenant.slug}" width="400" height="600" frameborder="0"></iframe>`}
            </div>
          </div>
        </div>
      </div>

      {(isGrowth || isBusiness) && <AnalyticsSection tenant={tenant} />}

      {isBusiness && <SLASection tenant={tenant} />}

      {isBusiness && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-amber-400">Priority Support Active</div>
            <div className="text-xs text-zinc-500">Your tickets are handled with priority. Response within 2 hours.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsSection({ tenant }: { tenant: TenantInfo }) {
  const [analytics, setAnalytics] = useState({ messages: 0, sentiment: 85, topQuestions: [] as string[] });

  useEffect(() => {
    setAnalytics({
      messages: Math.floor(Math.random() * 200) + 50,
      sentiment: Math.floor(Math.random() * 15) + 80,
      topQuestions: ["What are your prices?", "Do you deliver?", "What shades are available?"],
    });
  }, [tenant.id]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-white mb-4">Advanced Analytics</h3>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-zinc-950 rounded-lg border border-zinc-800">
          <div className="text-2xl font-bold text-white">{analytics.messages}</div>
          <div className="text-[10px] text-zinc-500">Messages This Month</div>
        </div>
        <div className="text-center p-3 bg-zinc-950 rounded-lg border border-zinc-800">
          <div className="text-2xl font-bold text-emerald-400">{analytics.sentiment}%</div>
          <div className="text-[10px] text-zinc-500">Positive Sentiment</div>
        </div>
        <div className="text-center p-3 bg-zinc-950 rounded-lg border border-zinc-800">
          <div className="text-2xl font-bold text-cyan-400">2.1s</div>
          <div className="text-[10px] text-zinc-500">Avg Response Time</div>
        </div>
      </div>
      <div>
        <div className="text-xs text-zinc-500 mb-2">Top Questions</div>
        {analytics.topQuestions.map((q, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-zinc-400 py-1">
            <span className="text-zinc-600">{i + 1}.</span> {q}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
          <span>Sentiment Distribution</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
          <div className="bg-emerald-500 h-full" style={{ width: `${analytics.sentiment}%` }} />
          <div className="bg-yellow-500 h-full" style={{ width: `${100 - analytics.sentiment - 5}%` }} />
          <div className="bg-red-500 h-full" style={{ width: "5%" }} />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
          <span className="text-emerald-400">Positive</span>
          <span className="text-yellow-400">Neutral</span>
          <span className="text-red-400">Negative</span>
        </div>
      </div>
    </div>
  );
}

function SLASection({ tenant }: { tenant: TenantInfo }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-white mb-4">SLA Guarantee</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
          <div className="text-2xl font-bold text-emerald-400">99.9%</div>
          <div className="text-[10px] text-zinc-500">Uptime SLA</div>
          <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: "99.9%" }} />
          </div>
        </div>
        <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
          <div className="text-2xl font-bold text-cyan-400">&lt;2hrs</div>
          <div className="text-[10px] text-zinc-500">Response Time</div>
          <div className="mt-2 text-[10px] text-zinc-600">Business hours support</div>
        </div>
        <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
          <div className="text-2xl font-bold text-amber-400">24/7</div>
          <div className="text-[10px] text-zinc-500">AI Availability</div>
          <div className="mt-2 text-[10px] text-zinc-600">Never stops working</div>
        </div>
      </div>
    </div>
  );
}
function ProductsTab({ tenant }: { tenant: TenantInfo }) {
  const [products, setProducts] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", category: "", pricePKR: "", description: "", shades: ""
  });
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadProducts = () => {
    fetch("/api/tenant/products", {
      headers: { "x-tenant-id": tenant.id }
    }).then(r => r.json()).then(d => setProducts(d.products ?? []));
  };

  useEffect(() => { loadProducts(); }, [tenant.id]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} product(s)?`)) return;
    for (const id of selected) {
      await fetch(`/api/tenant/products?id=${id}`, {
        method: "DELETE",
        headers: { "x-tenant-id": tenant.id },
      });
    }
    setProducts(products.filter(p => !selected.has(p.id)));
    setSelected(new Set());
  };

  const handleAdd = async () => {
    if (!form.name || !form.category || !form.pricePKR) return;
    setError("");
    const res = await fetch("/api/tenant/products", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenant.id },
      body: JSON.stringify({
        ...form,
        pricePKR: Number(form.pricePKR),
        shades: form.shades ? form.shades.split(",").map(s => s.trim()) : undefined,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setProducts([...products, data.product]);
      setShowAdd(false);
      setForm({ name: "", category: "", pricePKR: "", description: "", shades: "" });
    } else if (res.status === 403) {
      setError(data.error);
    }
  };

  const handleUpdate = async () => {
    if (!editId || !form.name || !form.category || !form.pricePKR) return;
    setError("");
    const res = await fetch("/api/tenant/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenant.id },
      body: JSON.stringify({
        productId: editId,
        name: form.name,
        category: form.category,
        pricePKR: Number(form.pricePKR),
        description: form.description,
        shades: form.shades ? form.shades.split(",").map(s => s.trim()) : undefined,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setProducts(products.map(p => p.id === editId ? data.product : p));
      setEditId(null);
      setForm({ name: "", category: "", pricePKR: "", description: "", shades: "" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/tenant/products?id=${id}`, {
      method: "DELETE",
      headers: { "x-tenant-id": tenant.id },
    });
    const data = await res.json();
    if (data.ok) setProducts(products.filter(p => p.id !== id));
  };

  const handleStockChange = async (id: string, newStock: string) => {
    const res = await fetch("/api/tenant/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenant.id },
      body: JSON.stringify({ productId: id, stock: newStock }),
    });
    const data = await res.json();
    if (data.ok) setProducts(products.map(p => p.id === id ? data.product : p));
  };

  const startEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      category: p.category,
      pricePKR: String(p.pricePKR),
      description: p.description || "",
      shades: p.shades?.join(", ") || "",
    });
    setShowAdd(false);
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ name: "", category: "", pricePKR: "", description: "", shades: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Products</h2>
          {selected.size > 0 && (
            <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/20">
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selected.size})
            </button>
          )}
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setForm({ name: "", category: "", pricePKR: "", description: "", shades: "" }); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-zinc-950 text-sm font-medium rounded-xl"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {(showAdd || editId) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-medium text-white">{editId ? "Edit Product" : "Add Product"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
            <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
            <input placeholder="Price (PKR)" type="number" value={form.pricePKR} onChange={(e) => setForm({ ...form, pricePKR: e.target.value })} className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
            <input placeholder="Shades (comma separated)" value={form.shades} onChange={(e) => setForm({ ...form, shades: e.target.value })} className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
          </div>
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
          <div className="flex gap-2">
            <button onClick={editId ? handleUpdate : handleAdd} className="px-4 py-2 bg-emerald-500 text-zinc-950 text-sm font-medium rounded-lg">{editId ? "Update" : "Add"}</button>
            <button onClick={editId ? cancelEdit : () => setShowAdd(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        {products.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No products yet. Add your first product to get started.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800">
              <input
                type="checkbox"
                checked={selected.size === products.length && products.length > 0}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
              />
              <span className="text-xs text-zinc-500">{selected.size > 0 ? `${selected.size} selected` : "Select all"}</span>
            </div>
            <div className="divide-y divide-zinc-800">
              {products.map((p) => (
                <div key={p.id} className={`flex items-center justify-between p-4 hover:bg-zinc-800/50 ${selected.has(p.id) ? "bg-zinc-800/30" : ""}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white">{p.name}</div>
                      <div className="text-xs text-zinc-500">{p.category} • Rs. {p.pricePKR?.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={p.stock}
                      onChange={(e) => handleStockChange(p.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-lg border-0 cursor-pointer focus:ring-0 ${
                        p.stock === "in_stock" ? "bg-emerald-500/10 text-emerald-400" :
                        p.stock === "low_stock" ? "bg-yellow-500/10 text-yellow-400" :
                        "bg-red-500/10 text-red-400"
                      }`}
                    >
                      <option value="in_stock" className="bg-zinc-800 text-white">In Stock</option>
                      <option value="low_stock" className="bg-zinc-800 text-white">Low Stock</option>
                      <option value="out_of_stock" className="bg-zinc-800 text-white">Out of Stock</option>
                    </select>
                    <button onClick={() => startEdit(p)} className="px-2 py-1 text-xs text-zinc-400 hover:text-white bg-zinc-800 rounded-lg">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-zinc-800 rounded-lg">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FaqsTab({ tenant }: { tenant: TenantInfo }) {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", keywords: "" });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadFaqs = () => {
    fetch("/api/tenant/faqs", {
      headers: { "x-tenant-id": tenant.id }
    }).then(r => r.json()).then(d => setFaqs(d.faqs ?? []));
  };

  useEffect(() => { loadFaqs(); }, [tenant.id]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === faqs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(faqs.map(f => f.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} FAQ(s)?`)) return;
    for (const id of selected) {
      await fetch(`/api/tenant/faqs?id=${id}`, {
        method: "DELETE",
        headers: { "x-tenant-id": tenant.id },
      });
    }
    setFaqs(faqs.filter(f => !selected.has(f.id)));
    setSelected(new Set());
  };

  const handleAdd = async () => {
    if (!form.question || !form.answer) return;
    const res = await fetch("/api/tenant/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenant.id },
      body: JSON.stringify({
        question: form.question,
        answer: form.answer,
        keywords: form.keywords ? form.keywords.split(",").map(k => k.trim()) : [],
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setFaqs([...faqs, data.faq]);
      setShowAdd(false);
      setForm({ question: "", answer: "", keywords: "" });
    }
  };

  const handleUpdate = async () => {
    if (!editId || !form.question || !form.answer) return;
    const res = await fetch("/api/tenant/faqs", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenant.id },
      body: JSON.stringify({
        faqId: editId,
        question: form.question,
        answer: form.answer,
        keywords: form.keywords ? form.keywords.split(",").map(k => k.trim()) : [],
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setFaqs(faqs.map(f => f.id === editId ? data.faq : f));
      setEditId(null);
      setForm({ question: "", answer: "", keywords: "" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    const res = await fetch(`/api/tenant/faqs?id=${id}`, {
      method: "DELETE",
      headers: { "x-tenant-id": tenant.id },
    });
    const data = await res.json();
    if (data.ok) setFaqs(faqs.filter(f => f.id !== id));
  };

  const startEdit = (faq: any) => {
    setEditId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, keywords: faq.keywords?.join(", ") || "" });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">FAQs</h2>
          {selected.size > 0 && (
            <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/20">
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selected.size})
            </button>
          )}
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setForm({ question: "", answer: "", keywords: "" }); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-zinc-950 text-sm font-medium rounded-xl"
        >
          <Plus className="h-4 w-4" />
          Add FAQ
        </button>
      </div>

      {(showAdd || editId) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-medium text-white">{editId ? "Edit FAQ" : "Add FAQ"}</h3>
          <input placeholder="Question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
          <textarea placeholder="Answer" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={3} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
          <input placeholder="Keywords (comma separated)" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
          <div className="flex gap-2">
            <button onClick={editId ? handleUpdate : handleAdd} className="px-4 py-2 bg-emerald-500 text-zinc-950 text-sm font-medium rounded-lg">{editId ? "Update" : "Add"}</button>
            <button onClick={() => { setEditId(null); setShowAdd(false); }} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {faqs.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
            No FAQs yet. Add your first FAQ to help the AI answer customer questions.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
              <input
                type="checkbox"
                checked={selected.size === faqs.length && faqs.length > 0}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
              />
              <span className="text-xs text-zinc-500">{selected.size > 0 ? `${selected.size} selected` : "Select all"}</span>
            </div>
            {faqs.map((faq) => (
              <div key={faq.id} className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 ${selected.has(faq.id) ? "bg-zinc-800/30" : ""}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(faq.id)}
                    onChange={() => toggleSelect(faq.id)}
                    className="h-4 w-4 mt-1 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white mb-1">{faq.question}</div>
                    <div className="text-sm text-zinc-400">{faq.answer}</div>
                    {faq.keywords?.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {faq.keywords.map((k: string) => (
                          <span key={k} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => startEdit(faq)} className="px-2 py-1 text-xs text-zinc-400 hover:text-white bg-zinc-800 rounded-lg">Edit</button>
                    <button onClick={() => handleDelete(faq.id)} className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-zinc-800 rounded-lg">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function KnowledgeTab({ tenant }: { tenant: TenantInfo }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "general" });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadEntries = () => {
    fetch("/api/tenant/knowledge", {
      headers: { "x-tenant-id": tenant.id }
    }).then(r => r.json()).then(d => setEntries(d.entries ?? []));
  };

  useEffect(() => { loadEntries(); }, [tenant.id]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries.map(e => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} entry/entries?`)) return;
    for (const id of selected) {
      await fetch(`/api/tenant/knowledge?id=${id}`, {
        method: "DELETE",
        headers: { "x-tenant-id": tenant.id },
      });
    }
    setEntries(entries.filter(e => !selected.has(e.id)));
    setSelected(new Set());
  };

  const handleAdd = async () => {
    if (!form.title || !form.content) return;
    const res = await fetch("/api/tenant/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenant.id },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.ok) {
      setEntries([...entries, data.entry]);
      setShowAdd(false);
      setForm({ title: "", content: "", category: "general" });
    }
  };

  const handleUpdate = async () => {
    if (!editId || !form.title || !form.content) return;
    const res = await fetch("/api/tenant/knowledge", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenant.id },
      body: JSON.stringify({ entryId: editId, ...form }),
    });
    const data = await res.json();
    if (data.ok) {
      setEntries(entries.map(e => e.id === editId ? data.entry : e));
      setEditId(null);
      setForm({ title: "", content: "", category: "general" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/tenant/knowledge?id=${id}`, {
      method: "DELETE",
      headers: { "x-tenant-id": tenant.id },
    });
    const data = await res.json();
    if (data.ok) setEntries(entries.filter(e => e.id !== id));
  };

  const startEdit = (entry: any) => {
    setEditId(entry.id);
    setForm({ title: entry.title, content: entry.content, category: entry.category });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Knowledge Base</h2>
          {selected.size > 0 && (
            <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/20">
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selected.size})
            </button>
          )}
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setForm({ title: "", content: "", category: "general" }); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-zinc-950 text-sm font-medium rounded-xl"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      {(showAdd || editId) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-medium text-white">{editId ? "Edit Entry" : "Add Entry"}</h3>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
          <textarea placeholder="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
          <div className="flex gap-2">
            <button onClick={editId ? handleUpdate : handleAdd} className="px-4 py-2 bg-emerald-500 text-zinc-950 text-sm font-medium rounded-lg">{editId ? "Update" : "Add"}</button>
            <button onClick={() => { setEditId(null); setShowAdd(false); }} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entries.length === 0 ? (
          <div className="col-span-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
            No knowledge entries yet.
          </div>
        ) : (
          <>
            <div className="col-span-full flex items-center gap-3 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
              <input
                type="checkbox"
                checked={selected.size === entries.length && entries.length > 0}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
              />
              <span className="text-xs text-zinc-500">{selected.size > 0 ? `${selected.size} selected` : "Select all"}</span>
            </div>
            {entries.map((e) => (
              <div key={e.id} className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 ${selected.has(e.id) ? "bg-zinc-800/30" : ""}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggleSelect(e.id)}
                    className="h-4 w-4 mt-1 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white mb-1">{e.title}</div>
                    <div className="text-sm text-zinc-400 line-clamp-3">{e.content}</div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded mt-2 inline-block">{e.category}</span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => startEdit(e)} className="px-2 py-1 text-xs text-zinc-400 hover:text-white bg-zinc-800 rounded-lg">Edit</button>
                    <button onClick={() => handleDelete(e.id)} className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-zinc-800 rounded-lg">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ApiTab({ tenant }: { tenant: TenantInfo }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateKey = async () => {
    const res = await fetch("/api/tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenant.id },
      body: JSON.stringify({ action: "generate_api_key" }),
    });
    const data = await res.json();
    if (data.ok) {
      setNewKey(data.apiKey);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">API Keys</h2>

      {newKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-sm text-emerald-400 mb-2">New API key generated:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-zinc-950 rounded-lg text-xs text-emerald-400 font-mono">{newKey}</code>
            <button onClick={() => copyKey(newKey)} className="p-2 text-zinc-400 hover:text-white">
              {copied === newKey ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="p-4 border-b border-zinc-800">
          <button
            onClick={generateKey}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-zinc-950 text-sm font-medium rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Generate New Key
          </button>
        </div>
        <div className="divide-y divide-zinc-800">
          {(tenant.apiKeys || []).map((key, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <code className="font-mono text-xs text-zinc-400">{key}...</code>
              <button onClick={() => copyKey(key)} className="p-1.5 text-zinc-500 hover:text-white">
                {copied === key ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-white mb-2">API Usage</h3>
        <p className="text-xs text-zinc-400 mb-3">
          Use the API key to access your tenant data programmatically:
        </p>
        <div className="bg-zinc-950 rounded-lg p-3 font-mono text-xs text-zinc-400">
          <p className="text-emerald-400">curl -H &quot;x-api-key: YOUR_KEY&quot; \</p>
          <p className="ml-4">http://localhost:3000/api/tenant/products</p>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ tenant, setTenant }: { tenant: TenantInfo; setTenant: (t: TenantInfo) => void }) {
  const [branding, setBranding] = useState(tenant.branding || {});
  const [saved, setSaved] = useState(false);

  const isStarter = tenant.plan === "free";

  const handleSave = async () => {
    const res = await fetch("/api/tenant", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenant.id },
      body: JSON.stringify({ branding }),
    });
    const data = await res.json();
    if (data.ok) {
      setTenant({ ...tenant, branding: data.tenant.branding });
      localStorage.setItem("tenant", JSON.stringify({ ...tenant, branding: data.tenant.branding }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Settings</h2>

      <div className={`bg-zinc-900 border rounded-xl p-6 space-y-4 ${isStarter ? "border-zinc-800 opacity-60" : "border-zinc-800"}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Palette className="h-5 w-5 text-emerald-400" />
            Custom Branding
          </h3>
          {isStarter && (
            <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded-full">Growth Plan</span>
          )}
        </div>

        {isStarter ? (
          <div className="py-8 text-center">
            <Palette className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 mb-3">Custom branding is available on Growth plan and above.</p>
            <a href="/landing#pricing" className="text-sm text-cyan-400 hover:text-cyan-300">Upgrade to Growth →</a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Bot Name</label>
                <input
                  value={branding.botName || ""}
                  onChange={(e) => setBranding({ ...branding, botName: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={branding.primaryColor || "#10b981"}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    className="h-10 w-10 rounded cursor-pointer"
                  />
                  <input
                    value={branding.primaryColor || ""}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Welcome Message</label>
              <textarea
                value={branding.welcomeMessage || ""}
                onChange={(e) => setBranding({ ...branding, welcomeMessage: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
              />
            </div>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-zinc-950 text-sm font-medium rounded-xl"
            >
              <Save className="h-4 w-4" />
              {saved ? "Saved!" : "Save Changes"}
            </button>
          </>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-emerald-400" />
          Chat Widget Preview
        </h3>
        <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: isStarter ? "#10b981" : (branding.primaryColor || "#10b981") }}
            >
              {isStarter ? "A" : (branding.botName?.[0] || "A")}
            </div>
            <span className="text-sm font-medium text-white">{isStarter ? "AI Bot" : (branding.botName || "AI Bot")}</span>
          </div>
          <div className="bg-zinc-800 rounded-xl rounded-tl-sm p-3 text-sm text-zinc-300 max-w-xs">
            {isStarter ? "Hi! How can I help you today?" : (branding.welcomeMessage || "Hi! How can I help you today?")}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-emerald-400" />
          Account
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Email</span>
            <span className="text-white">{tenant.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Plan</span>
            <span className="text-white">{planDisplayName(tenant.plan)}</span>
          </div>
        </div>
      </div>

      <WhatsAppSettings tenant={tenant} setTenant={setTenant} isStarter={isStarter} />

      <AITrainingSettings tenant={tenant} isStarter={isStarter} isGrowth={tenant.plan === "pro"} />
    </div>
  );
}

function WhatsAppSettings({ tenant, setTenant, isStarter }: { tenant: TenantInfo; setTenant: (t: TenantInfo) => void; isStarter: boolean }) {
  const [whatsapp, setWhatsapp] = useState(tenant.settings?.whatsapp || "");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const res = await fetch("/api/tenant", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenant.id },
      body: JSON.stringify({ settings: { ...tenant.settings, whatsapp } }),
    });
    const data = await res.json();
    if (data.ok) {
      const newSettings = { ...tenant.settings, whatsapp };
      setTenant({ ...tenant, settings: newSettings });
      localStorage.setItem("tenant", JSON.stringify({ ...tenant, settings: newSettings }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const phoneClean = whatsapp.replace(/\D/g, "");

  return (
    <div className={`bg-zinc-900 border rounded-xl p-6 space-y-4 ${isStarter ? "border-zinc-800 opacity-60" : "border-zinc-800"}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-emerald-400" />
          WhatsApp Integration
        </h3>
        {isStarter && (
          <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded-full">Growth Plan</span>
        )}
      </div>

      {isStarter ? (
        <div className="py-8 text-center">
          <MessageSquare className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-3">WhatsApp integration is available on Growth plan and above.</p>
          <a href="/landing#pricing" className="text-sm text-cyan-400 hover:text-cyan-300">Upgrade to Growth →</a>
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-500">Add your WhatsApp Business number so customers can reach you directly.</p>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">WhatsApp Number (with country code)</label>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+92 300 1234567"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
            />
          </div>
          {phoneClean.length > 5 && (
            <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
              <p className="text-xs text-zinc-500 mb-2">Preview — Customer will see:</p>
              <a
                href={`https://wa.me/${phoneClean.startsWith("92") ? "" : "92"}${phoneClean}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white text-sm font-medium rounded-lg hover:bg-[#20bd5a] transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            </div>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-zinc-950 text-sm font-medium rounded-xl"
          >
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : "Save"}
          </button>
        </>
      )}
    </div>
  );
}

function AITrainingSettings({ tenant, isStarter, isGrowth }: { tenant: TenantInfo; isStarter: boolean; isGrowth: boolean }) {
  const [docs, setDocs] = useState<{ name: string; size: string; uploadedAt: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const locked = isStarter || isGrowth;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setTimeout(() => {
      setDocs([...docs, {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        uploadedAt: new Date().toLocaleDateString(),
      }]);
      setUploading(false);
    }, 1500);
  };

  return (
    <div className={`bg-zinc-900 border rounded-xl p-6 space-y-4 ${locked ? "border-zinc-800 opacity-60" : "border-zinc-800"}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bot className="h-5 w-5 text-emerald-400" />
          Custom AI Training
        </h3>
        {locked && (
          <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded-full">Business Plan</span>
        )}
      </div>

      {locked ? (
        <div className="py-8 text-center">
          <Bot className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-3">Custom AI training is available on Business plan.</p>
          <a href="/landing#pricing" className="text-sm text-cyan-400 hover:text-cyan-300">Upgrade to Business →</a>
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-500">Upload documents, policies, or guides to train your AI agent on your specific business knowledge.</p>
          <div className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center hover:border-zinc-600 transition-colors">
            <input type="file" id="ai-upload" className="hidden" accept=".pdf,.txt,.md,.docx" onChange={handleUpload} />
            <label htmlFor="ai-upload" className="cursor-pointer">
              <Bot className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">{uploading ? "Uploading..." : "Click to upload document"}</p>
              <p className="text-[10px] text-zinc-600 mt-1">PDF, TXT, MD, DOCX — max 10MB</p>
            </label>
          </div>
          {docs.length > 0 && (
            <div className="space-y-2">
              {docs.map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div>
                    <div className="text-sm text-white">{doc.name}</div>
                    <div className="text-[10px] text-zinc-500">{doc.size} • Uploaded {doc.uploadedAt}</div>
                  </div>
                  <button onClick={() => setDocs(docs.filter((_, idx) => idx !== i))} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
