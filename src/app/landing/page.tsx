"use client";

import { useState, useRef, ReactNode, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  MessageSquare, BarChart3, Globe, Bot, ArrowRight, Check, Users,
  TrendingUp, Clock, Zap, Shield, Package, Search, Headphones,
  FileText, BarChart, ChevronDown, ChevronRight,
} from "lucide-react";

/* ═══════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════ */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Product", href: "#product" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Resources", href: "#faq" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-cyan-500" />
            </div>
            <span className="text-[14px] font-semibold text-white tracking-tight">Agent</span>
          </a>
          <div className="hidden md:flex items-center gap-6">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-[13px] text-zinc-400 hover:text-white transition-colors duration-200"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <a href="/login" className="text-[13px] text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
            Log in
          </a>
          <a
            href="/login?plan=free"
            className="text-[13px] px-4 py-1.5 bg-cyan-500 text-zinc-950 font-medium rounded-lg hover:bg-cyan-400 transition-colors"
          >
            Start Free
          </a>
        </div>
        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-zinc-400 hover:text-white"
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-black/95 backdrop-blur-xl border-b border-white/[0.06]"
          >
            <div className="px-6 py-4 space-y-3">
              {links.map((l) => (
                <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="block text-[14px] text-zinc-300 hover:text-white transition-colors">
                  {l.label}
                </a>
              ))}
              <div className="pt-3 border-t border-white/[0.06] space-y-3">
                <a href="/login" className="block text-[14px] text-zinc-400 hover:text-white transition-colors">
                  Log in
                </a>
                <a href="/login?plan=free" className="block text-center text-[14px] px-4 py-2.5 bg-cyan-500 text-zinc-950 font-medium rounded-lg hover:bg-cyan-400 transition-colors">
                  Start Free
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════ */

function Hero() {
  return (
    <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 overflow-hidden">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.06),transparent)]" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/15 bg-cyan-500/[0.04] mb-8"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-500" />
            </span>
            <span className="text-[11px] font-medium tracking-wide text-cyan-400/80">Now in public beta</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold tracking-[-0.035em] leading-[1.05] mb-6"
          >
            <span className="text-white">Customer Service,</span>
            <br />
            <span className="text-cyan-500">Automated by AI.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-[16px] text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Deploy an AI agent that handles customer support, FAQs, and orders 24/7.
            Set up in minutes, not months.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <a
              href="/login?plan=free"
              className="group flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-zinc-950 font-semibold text-[13px] rounded-lg hover:bg-cyan-400 transition-all"
            >
              Start Free
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#demo"
              className="flex items-center gap-2 px-6 py-2.5 text-zinc-400 text-[13px] font-medium hover:text-white transition-colors"
            >
              Book a Demo
            </a>
          </motion.div>
        </div>

        {/* Hero Product Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="mt-16 sm:mt-20 max-w-5xl mx-auto"
        >
          <HeroProductMockup />
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   HERO PRODUCT MOCKUP — realistic SaaS dashboard
   ═══════════════════════════════════════════════════ */

function HeroProductMockup() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden shadow-[0_0_80px_-20px_rgba(6,182,212,0.08)]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-[#0c0c0c]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-0.5 rounded-md bg-white/[0.03] text-[10px] text-zinc-500 font-medium">
            agent.app/dashboard
          </div>
        </div>
      </div>

      {/* Dashboard body */}
      <div className="flex min-h-[400px]">
        {/* Sidebar */}
        <div className="hidden sm:flex flex-col w-48 border-r border-white/[0.04] bg-[#080808] p-3">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-4">
            <div className="h-6 w-6 rounded-md bg-cyan-500/10 flex items-center justify-center">
              <Bot className="h-3 w-3 text-cyan-500/70" />
            </div>
            <span className="text-[11px] font-semibold text-zinc-200">Agent</span>
          </div>
          {[
            { label: "Inbox", icon: MessageSquare, active: true, count: 12 },
            { label: "Analytics", icon: BarChart3, active: false },
            { label: "Products", icon: Package, active: false },
            { label: "Knowledge", icon: FileText, active: false },
            { label: "Settings", icon: Zap, active: false },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] mb-0.5 ${
                item.active
                  ? "bg-white/[0.04] text-white"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
              } transition-colors cursor-pointer`}
            >
              <item.icon className="h-3.5 w-3.5" />
              <span className="flex-1">{item.label}</span>
              {item.count && (
                <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400/70 rounded-full">
                  {item.count}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 flex">
          {/* Conversation list */}
          <div className="hidden md:flex flex-col w-64 border-r border-white/[0.04] bg-[#080808]">
            <div className="px-3 py-2.5 border-b border-white/[0.04]">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/[0.03] text-[11px] text-zinc-500">
                <Search className="h-3 w-3" />
                <span>Search conversations...</span>
              </div>
            </div>
            {[
              { name: "Sarah Kim", msg: "Where is my order?", time: "2m", unread: true },
              { name: "James Lee", msg: "Return policy?", time: "5m", unread: true },
              { name: "Maria Garcia", msg: "Do you ship to EU?", time: "12m", unread: false },
              { name: "Alex Chen", msg: "Product availability", time: "1h", unread: false },
              { name: "Jordan Park", msg: "Bulk order inquiry", time: "3h", unread: false },
            ].map((c, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 px-3 py-2.5 border-b border-white/[0.03] cursor-pointer transition-colors ${
                  i === 0 ? "bg-white/[0.03]" : "hover:bg-white/[0.015]"
                }`}
              >
                <div className="h-7 w-7 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] text-zinc-400 font-medium shrink-0 mt-0.5">
                  {c.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-medium text-zinc-200 truncate">{c.name}</span>
                    <span className="text-[9px] text-zinc-600 shrink-0 ml-2">{c.time}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">{c.msg}</p>
                </div>
                {c.unread && <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col bg-[#060606]">
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] text-zinc-400 font-medium">
                  SK
                </div>
                <div>
                  <p className="text-[12px] font-medium text-zinc-200">Sarah Kim</p>
                  <p className="text-[9px] text-zinc-500">sarah@example.com · Shopify</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400/70 rounded-full border border-emerald-500/10">
                  AI Handling
                </span>
                <button className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.04] text-zinc-400 hover:text-white transition-colors border border-white/[0.04]">
                  Take Over
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-3 overflow-hidden">
              {[
                { from: "customer", name: "Sarah", text: "Hi, where is my order #48291?" },
                { from: "ai", text: "Let me look that up for you." },
                { from: "ai", text: "Your order #48291 is out for delivery and should arrive today by 5 PM. Would you like me to send you tracking updates?" },
                { from: "customer", name: "Sarah", text: "Yes please! Also, can I add another item to this order?" },
                { from: "ai", text: "I've set up tracking notifications for you. Unfortunately, orders that are out for delivery can't be modified. However, I can help you place a new order and I'll waive the shipping fee. Want me to do that?" },
                { from: "customer", name: "Sarah", text: "That would be great, thanks!" },
              ].map((m, i) => (
                <div key={i} className={`flex ${m.from === "customer" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] ${m.from === "customer" ? "order-1" : ""}`}>
                    {m.from === "ai" && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="h-4 w-4 rounded bg-cyan-500/10 flex items-center justify-center">
                          <Bot className="h-2.5 w-2.5 text-cyan-500/70" />
                        </div>
                        <span className="text-[9px] text-zinc-600">AI Agent</span>
                      </div>
                    )}
                    <div
                      className={`text-[12px] px-3 py-2 rounded-xl leading-relaxed ${
                        m.from === "customer"
                          ? "bg-cyan-500/90 text-white rounded-br-sm"
                          : "bg-white/[0.04] text-zinc-300 border border-white/[0.04] rounded-bl-sm"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Customer sidebar panel */}
            <div className="border-t border-white/[0.04] px-4 py-3 bg-[#080808]">
              <div className="flex items-center gap-4 text-[10px]">
                <div>
                  <span className="text-zinc-600">Order</span>
                  <span className="ml-1.5 text-zinc-300 font-medium">#48291</span>
                </div>
                <div className="w-px h-3 bg-white/[0.06]" />
                <div>
                  <span className="text-zinc-600">Status</span>
                  <span className="ml-1.5 text-emerald-400/70 font-medium">Out for Delivery</span>
                </div>
                <div className="w-px h-3 bg-white/[0.06]" />
                <div>
                  <span className="text-zinc-600">ETA</span>
                  <span className="ml-1.5 text-zinc-300 font-medium">Today, 5 PM</span>
                </div>
                <div className="w-px h-3 bg-white/[0.06]" />
                <div className="flex items-center gap-1">
                  <span className="text-zinc-600">Sentiment</span>
                  <span className="ml-1 text-zinc-300 font-medium">Positive</span>
                  <span className="text-emerald-400">●</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SOCIAL PROOF
   ═══════════════════════════════════════════════════ */

function SocialProof() {
  const logos = ["Acme Corp", "Globex", "Initech", "Umbrella", "Hooli", "Piedmont"];
  const metrics = [
    { value: "24/7", label: "Support coverage" },
    { value: "<2s", label: "Avg response time" },
    { value: "94%", label: "Customer satisfaction" },
    { value: "60%", label: "Reduced workload" },
  ];

  return (
    <section className="py-16 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-[11px] font-medium tracking-[0.2em] uppercase text-zinc-600 mb-8">
          Trusted by modern teams
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 mb-12">
          {logos.map((name) => (
            <span key={name} className="text-[13px] font-semibold text-zinc-700 tracking-tight">
              {name}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t border-white/[0.04]">
          {metrics.map((m) => (
            <div key={m.label} className="text-center">
              <div className="text-2xl font-bold text-white tracking-tight">{m.value}</div>
              <div className="text-[12px] text-zinc-500 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   FEATURES — varied layouts, not 6 identical cards
   ═══════════════════════════════════════════════════ */

function Features() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-cyan-500/60 mb-3">Features</p>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em] text-white leading-[1.1] mb-4">
            Everything you need to automate customer service
          </h2>
          <p className="text-[15px] text-zinc-500 leading-relaxed">
            One platform. Every channel. Your AI agent handles the rest.
          </p>
        </div>

        {/* Feature 1 — large */}
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <FeatureLarge
            icon={<Headphones className="h-5 w-5" />}
            title="AI Customer Support"
            description="Handles complex conversations, understands context, and resolves issues without human intervention. Learns from every interaction."
            visual={<SupportVisual />}
          />
          <FeatureLarge
            icon={<Search className="h-5 w-5" />}
            title="Instant FAQ Answers"
            description="Train on your help center, policies, and product docs. Customers get accurate answers in seconds, not minutes."
            visual={<FAQVisual />}
          />
        </div>

        {/* Feature 2 — 3 column */}
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <FeatureSmall
            icon={<Package className="h-4 w-4" />}
            title="Order Management"
            description="Track orders, process returns, handle shipping inquiries. The AI has full access to your order data."
          />
          <FeatureSmall
            icon={<Users className="h-4 w-4" />}
            title="Lead Qualification"
            description="Qualify leads, book demos, and route high-value conversations to your sales team automatically."
          />
          <FeatureSmall
            icon={<FileText className="h-4 w-4" />}
            title="Knowledge Base"
            description="Upload docs, FAQs, and product info. Your AI agent becomes an expert on your business overnight."
          />
        </div>

        {/* Feature 3 — large analytics */}
        <div className="grid lg:grid-cols-2 gap-4">
          <FeatureLarge
            icon={<BarChart3 className="h-5 w-5" />}
            title="Analytics & Insights"
            description="See what customers ask, track resolution rates, and identify gaps in your support. Data-driven decisions."
            visual={<AnalyticsVisual />}
            reverse
          />
          <FeatureLarge
            icon={<Globe className="h-5 w-5" />}
            title="Omnichannel"
            description="Web, WhatsApp, Instagram, email — one AI agent across every channel. Consistent experience everywhere."
            visual={<OmnichannelVisual />}
            reverse
          />
        </div>
      </div>
    </section>
  );
}

function FeatureLarge({ icon, title, description, visual, reverse }: {
  icon: ReactNode; title: string; description: string; visual: ReactNode; reverse?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden">
      <div className={`p-6 ${reverse ? "order-2" : ""}`}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-8 w-8 rounded-lg bg-cyan-500/8 border border-cyan-500/10 flex items-center justify-center text-cyan-500/60">
            {icon}
          </div>
          <h3 className="text-[14px] font-semibold text-white">{title}</h3>
        </div>
        <p className="text-[13px] text-zinc-500 leading-relaxed">{description}</p>
      </div>
      <div className="px-6 pb-6">{visual}</div>
    </div>
  );
}

function FeatureSmall({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-5 hover:border-white/[0.1] transition-colors">
      <div className="h-8 w-8 rounded-lg bg-cyan-500/8 border border-cyan-500/10 flex items-center justify-center text-cyan-500/60 mb-3">
        {icon}
      </div>
      <h3 className="text-[13px] font-semibold text-white mb-1">{title}</h3>
      <p className="text-[12px] text-zinc-500 leading-relaxed">{description}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   FEATURE VISUALS
   ═══════════════════════════════════════════════════ */

function SupportVisual() {
  return (
    <div className="bg-[#060606] rounded-lg border border-white/[0.04] p-3 space-y-2">
      {[
        { q: "Can I change my shipping address?", a: "Sure! What's the new address?" },
        { q: "123 Main St, Apt 4B, New York", a: "Done. Updated to 123 Main St, Apt 4B. Your order will ship there." },
      ].map((t, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex justify-end">
            <div className="bg-cyan-500/80 text-white text-[10px] px-2.5 py-1.5 rounded-lg rounded-br-sm max-w-[80%]">
              {t.q}
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-white/[0.04] text-zinc-300 text-[10px] px-2.5 py-1.5 rounded-lg rounded-bl-sm max-w-[80%] border border-white/[0.04]">
              {t.a}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FAQVisual() {
  return (
    <div className="bg-[#060606] rounded-lg border border-white/[0.04] p-3 space-y-1.5">
      {["What's your return policy?", "How long does shipping take?", "Do you offer international delivery?"].map((q, i) => (
        <div key={i} className="flex items-center gap-2 px-2.5 py-2 bg-white/[0.02] rounded-md border border-white/[0.03]">
          <Search className="h-3 w-3 text-zinc-600 shrink-0" />
          <span className="text-[10px] text-zinc-400">{q}</span>
          <span className="text-[9px] text-emerald-400/60 ml-auto shrink-0">Auto-resolved</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsVisual() {
  return (
    <div className="bg-[#060606] rounded-lg border border-white/[0.04] p-3">
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[
          { l: "Resolved", v: "847", c: "+23%" },
          { l: "Avg Time", v: "18s", c: "-40%" },
          { l: "CSAT", v: "4.8", c: "+0.3" },
        ].map((s) => (
          <div key={s.l} className="bg-white/[0.02] rounded-md p-2 border border-white/[0.03]">
            <p className="text-[8px] text-zinc-600">{s.l}</p>
            <p className="text-sm font-bold text-zinc-100">{s.v}</p>
            <p className="text-[8px] text-emerald-400/60">{s.c}</p>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-[2px] h-12">
        {[35, 50, 40, 65, 55, 80, 70, 90, 75, 95, 85, 100].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-cyan-500/20 border-t border-cyan-500/30" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function OmnichannelVisual() {
  const channels = [
    { name: "Web", status: "Active", color: "emerald" },
    { name: "WhatsApp", status: "Active", color: "emerald" },
    { name: "Instagram", status: "Active", color: "emerald" },
    { name: "Email", status: "Active", color: "emerald" },
    { name: "Slack", status: "Setup", color: "yellow" },
  ];
  return (
    <div className="bg-[#060606] rounded-lg border border-white/[0.04] p-3 space-y-1">
      {channels.map((ch) => (
        <div key={ch.name} className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.02] rounded-md border border-white/[0.03]">
          <span className="text-[10px] text-zinc-300 font-medium">{ch.name}</span>
          <span className={`text-[9px] ${ch.color === "emerald" ? "text-emerald-400/60" : "text-yellow-400/60"}`}>
            {ch.status}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════ */

function HowItWorks() {
  const steps = [
    { num: "01", title: "Connect your business", desc: "Link your store, upload your products, and import your FAQs. Takes about 5 minutes." },
    { num: "02", title: "Train your AI agent", desc: "The agent learns your products, policies, and brand voice. Customize responses to match your tone." },
    { num: "03", title: "Go live", desc: "Embed on your site or connect to WhatsApp. The AI handles conversations from day one." },
  ];

  return (
    <section className="py-24 sm:py-32 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-cyan-500/60 mb-3">How it works</p>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em] text-white leading-[1.1]">
            Three steps to automated support
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute top-5 left-[calc(100%+0.5rem)] w-[calc(100%-2rem)] h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
              )}
              <div className="text-[32px] font-bold text-white/[0.06] tracking-tight mb-3">{step.num}</div>
              <h3 className="text-[15px] font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-[13px] text-zinc-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   LIVE DEMO
   ═══════════════════════════════════════════════════ */

function LiveDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 2500);
    return () => clearInterval(t);
  }, []);

  const conversation = [
    { from: "customer", text: "Where is my order #48291?" },
    { from: "ai", text: "Your order is out for delivery and should arrive today by 5 PM. Would you like tracking updates?" },
    { from: "customer", text: "Yes please. Also, can I add another item?" },
    { from: "ai", text: "Tracking is set up! Orders in transit can't be modified, but I can place a new order with free shipping. Want me to do that?" },
  ];

  return (
    <section id="demo" className="py-24 sm:py-32 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-cyan-500/60 mb-3">See it in action</p>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em] text-white leading-[1.1]">
            Real conversations, real resolution
          </h2>
        </div>

        <div className="grid lg:grid-cols-5 gap-4">
          {/* Chat */}
          <div className="lg:col-span-3 rounded-xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-cyan-500/10 flex items-center justify-center">
                <Bot className="h-3 w-3 text-cyan-500/70" />
              </div>
              <span className="text-[12px] font-medium text-zinc-200">AI Agent</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400/60 rounded-full ml-auto">Live</span>
            </div>
            <div className="p-4 space-y-3 min-h-[300px]">
              <AnimatePresence>
                {conversation.slice(0, step + 1).map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.from === "customer" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`text-[12px] px-3 py-2 rounded-xl max-w-[80%] leading-relaxed ${
                      m.from === "customer"
                        ? "bg-cyan-500/90 text-white rounded-br-sm"
                        : "bg-white/[0.04] text-zinc-300 border border-white/[0.04] rounded-bl-sm"
                    }`}>
                      {m.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Sidebar info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4">
              <p className="text-[10px] font-medium text-zinc-500 mb-3 uppercase tracking-wider">Order Details</p>
              <div className="space-y-2">
                {[
                  { l: "Order", v: "#48291" },
                  { l: "Customer", v: "Sarah Kim" },
                  { l: "Status", v: "Out for Delivery" },
                  { l: "ETA", v: "Today, 5 PM" },
                  { l: "Total", v: "$127.00" },
                ].map((d) => (
                  <div key={d.l} className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-600">{d.l}</span>
                    <span className="text-[11px] text-zinc-200 font-medium">{d.v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4">
              <p className="text-[10px] font-medium text-zinc-500 mb-3 uppercase tracking-wider">AI Actions</p>
              <div className="space-y-1.5">
                {["Sent tracking notification", "Offered free shipping on next order", "Qualified as repeat customer"].map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <Check className="h-3 w-3 text-cyan-500/60 shrink-0" />
                    <span className="text-zinc-400">{a}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4">
              <p className="text-[10px] font-medium text-zinc-500 mb-3 uppercase tracking-wider">Sentiment</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div className="h-full w-[85%] rounded-full bg-emerald-500/40" />
                </div>
                <span className="text-[11px] text-emerald-400/70 font-medium">Positive</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   INTEGRATIONS
   ═══════════════════════════════════════════════════ */

function Integrations() {
  const items = [
    "Shopify", "WooCommerce", "WhatsApp", "Instagram",
    "Facebook", "Slack", "Google Sheets", "Email",
  ];

  return (
    <section className="py-24 sm:py-32 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-cyan-500/60 mb-3">Integrations</p>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em] text-white leading-[1.1]">
            Works with your stack
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {items.map((item) => (
            <div
              key={item}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/[0.06] bg-[#0a0a0a] hover:border-white/[0.1] transition-colors"
            >
              <div className="h-5 w-5 rounded bg-white/[0.06] flex items-center justify-center">
                <Globe className="h-3 w-3 text-zinc-500" />
              </div>
              <span className="text-[12px] text-zinc-300 font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   USE CASES
   ═══════════════════════════════════════════════════ */

function UseCases() {
  const cases = [
    { title: "E-commerce", desc: "Handle product questions, order tracking, returns, and sizing advice — automatically.", metric: "40% fewer support tickets" },
    { title: "SaaS", desc: "Onboard users, answer billing questions, and troubleshoot technical issues 24/7.", metric: "3x faster resolution" },
    { title: "Service Businesses", desc: "Book appointments, answer FAQs, and qualify leads while you focus on delivery.", metric: "60% more qualified leads" },
    { title: "Retail", desc: "In-store and online support. Product availability, store hours, and loyalty programs.", metric: "94% customer satisfaction" },
  ];

  return (
    <section className="py-24 sm:py-32 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-12">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-cyan-500/60 mb-3">Use cases</p>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em] text-white leading-[1.1]">
            Built for every business
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {cases.map((c, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-6 hover:border-white/[0.1] transition-colors">
              <h3 className="text-[15px] font-semibold text-white mb-2">{c.title}</h3>
              <p className="text-[13px] text-zinc-500 leading-relaxed mb-4">{c.desc}</p>
              <div className="text-[11px] text-cyan-400/60 font-medium">{c.metric}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   PRICING
   ═══════════════════════════════════════════════════ */

function Pricing() {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      name: "Starter",
      planKey: "free",
      price: annual ? 0 : 0,
      period: "Free forever",
      desc: "For small stores getting started with AI support.",
      features: ["100 messages/mo", "20 products", "1 user", "Basic analytics", "Web widget"],
      cta: "Start Free",
      popular: false,
    },
    {
      name: "Growth",
      planKey: "pro",
      price: annual ? 29 : 39,
      period: "/mo",
      desc: "For growing businesses that need more power.",
      features: ["5,000 messages/mo", "500 products", "5 users", "Custom branding", "WhatsApp", "Advanced analytics", "API access"],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Business",
      planKey: "enterprise",
      price: annual ? 99 : 129,
      period: "/mo",
      desc: "For teams that need unlimited scale and support.",
      features: ["Unlimited messages", "Unlimited products", "Unlimited users", "Priority support", "Custom AI training", "All integrations", "SLA guarantee"],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 sm:py-32 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-cyan-500/60 mb-3">Pricing</p>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em] text-white leading-[1.1] mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-[15px] text-zinc-500">Start free. Scale as you grow. No hidden fees.</p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={`text-[13px] ${!annual ? "text-white" : "text-zinc-500"}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-10 h-5 rounded-full transition-colors ${annual ? "bg-cyan-500" : "bg-white/[0.1]"}`}
          >
            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${annual ? "left-[22px]" : "left-0.5"}`} />
          </button>
          <span className={`text-[13px] ${annual ? "text-white" : "text-zinc-500"}`}>
            Annual <span className="text-[10px] text-cyan-400/60 ml-1">Save 25%</span>
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 ${
                plan.popular
                  ? "border-cyan-500/20 bg-[#0c0c0c]"
                  : "border-white/[0.06] bg-[#0a0a0a]"
              }`}
            >
              {plan.popular && (
                <div className="text-[9px] font-bold tracking-widest uppercase text-cyan-400/70 mb-2">Most Popular</div>
              )}
              <h3 className="text-[15px] font-semibold text-white mb-1">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white tracking-tight">
                  {plan.price === 0 ? "Free" : `$${plan.price}`}
                </span>
                {plan.price > 0 && <span className="text-zinc-500 text-sm">{plan.period}</span>}
                {plan.price === 0 && <span className="text-zinc-600 text-[11px] ml-1">{plan.period}</span>}
              </div>
              <p className="text-[12px] text-zinc-500 mb-5 leading-relaxed">{plan.desc}</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[12px] text-zinc-400">
                    <Check className="h-3 w-3 text-cyan-500/50 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.planKey === "free" ? "/login?plan=free" : `/checkout?plan=${plan.planKey}`}
                className={`block text-center py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  plan.popular
                    ? "bg-cyan-500 text-zinc-950 hover:bg-cyan-400"
                    : "bg-white/[0.04] text-zinc-300 hover:bg-white/[0.06]"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   TESTIMONIALS
   ═══════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════════════ */

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const items = [
    { q: "How does the AI agent work?", a: "The AI agent uses Google Gemini to understand customer questions, access your product catalog and knowledge base, and generate accurate responses. It learns from every conversation and improves over time." },
    { q: "Can I train it on my own data?", a: "Yes. Upload your product catalog, FAQs, help center articles, and policies. The AI uses this data to answer questions specific to your business. You can update it anytime." },
    { q: "Can it handle orders?", a: "The AI can look up order status, track shipments, process returns, and even help customers place new orders. Full order management is available on Growth and Business plans." },
    { q: "Which platforms are supported?", a: "We support web widgets, WhatsApp, Instagram, Facebook Messenger, email, and Slack. More integrations are added regularly." },
    { q: "Can humans take over conversations?", a: "Absolutely. Any conversation can be escalated to a human agent with one click. The AI provides context so the human agent can pick up seamlessly." },
    { q: "Is there a free trial?", a: "Yes. The Starter plan is free forever with 100 messages per month. Growth and Business plans come with a 14-day free trial, no credit card required." },
  ];

  return (
    <section id="faq" className="py-24 sm:py-32 border-t border-white/[0.04]">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-cyan-500/60 mb-3">FAQ</p>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em] text-white leading-[1.1]">
            Frequently asked questions
          </h2>
        </div>
        <div className="space-y-0 border-t border-white/[0.06]">
          {items.map((item, i) => (
            <div key={i} className="border-b border-white/[0.06]">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between py-4 text-left"
              >
                <span className="text-[14px] font-medium text-zinc-200 pr-4">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-500 shrink-0 transition-transform duration-200 ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-[13px] text-zinc-500 leading-relaxed pb-4">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════ */

function FinalCTA() {
  return (
    <section className="py-24 sm:py-32 border-t border-white/[0.04]">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.03em] text-white leading-[1.1] mb-4">
          Your customers are waiting.
          <br />
          <span className="text-cyan-500">Let AI handle the conversation.</span>
        </h2>
        <p className="text-[15px] text-zinc-500 mb-8">
          Deploy in under 5 minutes. No credit card required.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/login?plan=free"
            className="group flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-zinc-950 font-semibold text-[13px] rounded-lg hover:bg-cyan-400 transition-all"
          >
            Start Free
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a href="#demo" className="px-6 py-2.5 text-zinc-400 text-[13px] font-medium hover:text-white transition-colors">
            Book a Demo
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════ */

function Footer() {
  const columns = [
    { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog", "API"] },
    { title: "Solutions", links: ["E-commerce", "SaaS", "Retail", "Service Businesses"] },
    { title: "Resources", links: ["Documentation", "Blog", "Help Center", "Status"] },
    { title: "Company", links: ["About", "Careers", "Contact", "Privacy", "Terms"] },
  ];

  return (
    <footer className="border-t border-white/[0.04] py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Bot className="h-3 w-3 text-cyan-500/70" />
              </div>
              <span className="text-[13px] font-semibold text-zinc-300">Agent</span>
            </div>
            <p className="text-[12px] text-zinc-600 leading-relaxed max-w-[200px]">
              AI-powered customer service for modern businesses.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-[12px] text-zinc-600 hover:text-zinc-300 transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-white/[0.04]">
          <p className="text-[11px] text-zinc-700">© 2026 Agent. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-3 sm:mt-0">
            {["Twitter", "GitHub", "LinkedIn"].map((s) => (
              <a key={s} href="#" className="text-[11px] text-zinc-700 hover:text-zinc-400 transition-colors">
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <div className="bg-[#050505] text-white min-h-screen selection:bg-cyan-500/15 selection:text-cyan-50 font-[family-name:var(--font-geist-sans)]">
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <LiveDemo />
      <Integrations />
      <UseCases />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
