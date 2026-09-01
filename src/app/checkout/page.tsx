"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Check, CreditCard, ArrowLeft, Eye, EyeOff } from "lucide-react";

const plans: Record<string, { name: string; price: string; period: string; features: string[] }> = {
  free: { name: "Starter", price: "Free", period: "forever", features: ["100 messages/mo", "20 products", "1 user"] },
  pro: { name: "Growth", price: "$29", period: "/mo", features: ["5,000 messages/mo", "500 products", "5 users", "Custom branding", "WhatsApp"] },
  enterprise: { name: "Business", price: "$99", period: "/mo", features: ["Unlimited messages", "Unlimited products", "Unlimited users", "Priority support", "Custom AI"] },
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const planKey = searchParams.get("plan") || "pro";
  const plan = plans[planKey] || plans.pro;
  const [step, setStep] = useState<"form" | "processing" | "success">("form");
  const [form, setForm] = useState({ name: "", email: "", password: "", card: "", expiry: "", cvc: "" });
  const [showPassword, setShowPassword] = useState(false);

  const formatCard = (v: string) => {
    const nums = v.replace(/\D/g, "").slice(0, 16);
    return nums.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (v: string) => {
    const nums = v.replace(/\D/g, "").slice(0, 4);
    if (nums.length >= 3) return nums.slice(0, 2) + " / " + nums.slice(2);
    return nums;
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const luhnCheck = (num: string): boolean => {
    let sum = 0;
    let isEven = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num[i], 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const cardNum = form.card.replace(/\s/g, "");
    const expiry = form.expiry.replace(/\s/g, "");

    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Valid email is required";
    if (!form.password || form.password.length < 6) e.password = "Password must be at least 6 characters";

    if (cardNum.length < 16) {
      e.card = "Card number must be 16 digits";
    } else if (!luhnCheck(cardNum)) {
      e.card = "Invalid card number";
    } else if (!/^(4|5|3|6)/.test(cardNum)) {
      e.card = "Use Visa (4), Mastercard (5), Amex (3), or Discover (6)";
    }

    if (expiry.length < 4) {
      e.expiry = "Expiry is required";
    } else {
      const clean = expiry.replace(/\D/g, "");
      const month = parseInt(clean.slice(0, 2), 10);
      const year = parseInt("20" + clean.slice(2), 10);
      const now = new Date();

      if (month < 1 || month > 12) {
        e.expiry = "Invalid month";
      } else {
        const expEnd = new Date(year, month, 0, 23, 59, 59);
        if (expEnd < now) {
          e.expiry = "Card has expired";
        }
      }
    }

    if (form.cvc.length < 3) e.cvc = "CVC must be 3-4 digits";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePay = async () => {
    if (!validate()) return;
    setStep("processing");
    try {
      const tenantId = localStorage.getItem("tenant_id");
      if (tenantId) {
        await fetch("/api/tenant", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
          body: JSON.stringify({ plan: planKey }),
        });
        const tenant = JSON.parse(localStorage.getItem("tenant") || "{}");
        tenant.plan = planKey;
        localStorage.setItem("tenant", JSON.stringify(tenant));
      } else {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register",
            name: form.name,
            email: form.email,
            password: form.password,
            plan: planKey,
          }),
        });
        const data = await res.json();
        if (data.ok && data.tenant) {
          localStorage.setItem("tenant", JSON.stringify(data.tenant));
          localStorage.setItem("tenant_id", data.tenant.id);
        }
      }
    } catch {}
    setTimeout(() => setStep("success"), 1800);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        <a href="/landing#pricing" className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
          <ArrowLeft className="h-3 w-3" />
          Back to pricing
        </a>

        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="mb-6">
                <h1 className="text-[20px] font-bold text-white tracking-tight mb-1">Checkout</h1>
                <p className="text-[13px] text-zinc-500">
                  {plan.name} Plan — {plan.price}{plan.period}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#111] p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-medium text-zinc-200">{plan.name}</span>
                  <span className="text-[13px] font-bold text-white">{plan.price}{plan.period}</span>
                </div>
                <ul className="space-y-1.5 pt-3 border-t border-white/[0.04]">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12px] text-zinc-400">
                      <Check className="h-3 w-3 text-cyan-500/50 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#111] p-4 space-y-4">
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 mb-1">
                  <Lock className="h-3 w-3" />
                  <span>Secured by Stripe</span>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500 mb-1.5 block">Full name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Sarah Kim"
                    className={`w-full bg-white/[0.04] border rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none transition-colors ${
                      errors.name ? "border-red-500/50" : "border-white/[0.06] focus:border-cyan-500/30"
                    }`}
                  />
                  {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500 mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="sarah@company.com"
                    className={`w-full bg-white/[0.04] border rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none transition-colors ${
                      errors.email ? "border-red-500/50" : "border-white/[0.06] focus:border-cyan-500/30"
                    }`}
                  />
                  {errors.email && <p className="text-[10px] text-red-400 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500 mb-1.5 block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min 6 characters"
                      autoComplete="new-password"
                      className={`w-full bg-white/[0.04] border rounded-lg px-3 py-2.5 pr-10 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none transition-colors ${
                        errors.password ? "border-red-500/50" : "border-white/[0.06] focus:border-cyan-500/30"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[10px] text-red-400 mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500 mb-1.5 block">Card number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.card}
                      onChange={(e) => setForm({ ...form, card: formatCard(e.target.value) })}
                      placeholder="4242 4242 4242 4242"
                      className={`w-full bg-white/[0.04] border rounded-lg px-3 py-2.5 pr-10 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none transition-colors ${
                        errors.card ? "border-red-500/50" : "border-white/[0.06] focus:border-cyan-500/30"
                      }`}
                    />
                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  </div>
                  {errors.card && <p className="text-[10px] text-red-400 mt-1">{errors.card}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-500 mb-1.5 block">Expiry</label>
                    <input
                      type="text"
                      value={form.expiry}
                      onChange={(e) => setForm({ ...form, expiry: formatExpiry(e.target.value) })}
                      placeholder="MM / YY"
                      className={`w-full bg-white/[0.04] border rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none transition-colors ${
                        errors.expiry ? "border-red-500/50" : "border-white/[0.06] focus:border-cyan-500/30"
                      }`}
                    />
                    {errors.expiry && <p className="text-[10px] text-red-400 mt-1">{errors.expiry}</p>}
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 mb-1.5 block">CVC</label>
                    <input
                      type="text"
                      value={form.cvc}
                      onChange={(e) => setForm({ ...form, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      placeholder="123"
                      className={`w-full bg-white/[0.04] border rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none transition-colors ${
                        errors.cvc ? "border-red-500/50" : "border-white/[0.06] focus:border-cyan-500/30"
                      }`}
                    />
                    {errors.cvc && <p className="text-[10px] text-red-400 mt-1">{errors.cvc}</p>}
                  </div>
                </div>

                <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-lg p-3 mt-1">
                  <p className="text-[10px] text-cyan-400/70 font-medium mb-1">Demo Mode — Test Cards:</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    <span className="text-[10px] text-zinc-500"><span className="text-zinc-400">4242 4242 4242 4242</span> — Visa</span>
                    <span className="text-[10px] text-zinc-500"><span className="text-zinc-400">5555 5555 5555 4444</span> — Mastercard</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Any future expiry, any 3-digit CVC</p>
                </div>

                <button
                  onClick={handlePay}
                  className="w-full py-3 bg-cyan-500 text-zinc-950 font-semibold text-[14px] rounded-lg hover:bg-cyan-400 transition-colors mt-2"
                >
                  {plan.price === "Free" ? "Start Free" : `Pay ${plan.price}`}
                </button>

                <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
                  By subscribing, you agree to our Terms of Service.
                  <br />
                  Cancel anytime from your dashboard.
                </p>
              </div>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-10 w-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full mx-auto mb-4"
              />
              <p className="text-[14px] text-zinc-300 font-medium">Processing payment...</p>
              <p className="text-[12px] text-zinc-600 mt-1">Setting up your account</p>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                <Check className="h-7 w-7 text-emerald-500" />
              </div>
              <h2 className="text-[20px] font-bold text-white mb-2">Payment successful!</h2>
              <p className="text-[13px] text-zinc-500 mb-8">
                Your {plan.name} plan is now active.
              </p>
              <a
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-zinc-950 font-semibold text-[13px] rounded-lg hover:bg-cyan-400 transition-colors"
              >
                Go to Dashboard
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <CheckoutContent />
    </Suspense>
  );
}
