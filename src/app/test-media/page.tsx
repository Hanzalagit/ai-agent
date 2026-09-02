"use client";

import { useState } from "react";

const IMAGE_MODELS = [
  { id: "flux-2-dev", name: "Flux 2 Dev (High Quality)" },
  { id: "imagen-4", name: "Imagen 4 (Google)" },
  { id: "gptimage-large", name: "GPT Image 1.5 (Best)" },
  { id: "kontext", name: "Kontext (Enhanced)" },
  { id: "nanobanana-2", name: "Gemini 3.1 Flash" },
  { id: "flux", name: "Flux Schnell (Fast)" },
];

const VIDEO_MODELS = [
  { id: "seedance", name: "Seedance (Best Quality)" },
  { id: "veo", name: "Veo 3.1 Fast" },
  { id: "grok-video", name: "Grok Video" },
  { id: "ltx-2", name: "LTX-2 (With Audio)" },
];

export default function TestMediaPage() {
  const [email, setEmail] = useState("admin@urbanhive.com");
  const [password, setPassword] = useState("admin@123");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [imageModel, setImageModel] = useState("flux-2-dev");
  const [videoModel, setVideoModel] = useState("seedance");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [resultType, setResultType] = useState<"image" | "video" | null>(null);
  const [loading, setLoading] = useState(false);

  async function login() {
    setStatus("Logging in...");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("Logged in! Getting tenant info...");
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();

        if (meData.organizations && meData.organizations.length > 0) {
          setTenantId(meData.organizations[0].id);
          setStatus("Ready!");
        } else {
          setStatus("No organization found");
        }
      } else {
        setStatus("Login failed: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      setStatus("Login error");
    }
  }

  async function generate(type: "image" | "video") {
    if (!prompt.trim()) {
      setStatus("Please enter a prompt");
      return;
    }
    if (!tenantId) {
      setStatus("Please login first");
      return;
    }

    setLoading(true);
    setStatus(`Generating ${type} with ${type === "image" ? imageModel : videoModel}... Please wait 15-60 seconds`);
    setResult(null);

    try {
      const body: any = { prompt: prompt.trim(), type };
      if (type === "image") body.model = imageModel;
      if (type === "video") body.model = videoModel;

      const res = await fetch("/api/tenant/media", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.ok && data.asset) {
        setStatus("Done!");
        setResult(data.asset.url);
        setResultType(type);
      } else {
        setStatus("Failed: " + (data.error || "Unknown error"));
      }
    } catch (e: any) {
      setStatus("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-emerald-400">Media Generator</h1>
        <p className="text-zinc-500 mb-8">Free AI image & video generation via Pollinations.ai</p>

        {!tenantId ? (
          <div className="bg-zinc-900 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Login</h2>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
              className="w-full p-3 mb-3 bg-zinc-800 rounded border border-zinc-700" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
              className="w-full p-3 mb-3 bg-zinc-800 rounded border border-zinc-700" />
            <button onClick={login} className="w-full p-3 bg-emerald-600 hover:bg-emerald-700 rounded font-semibold">Login</button>
          </div>
        ) : (
          <div className="bg-zinc-900 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Generate</h2>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
              placeholder="Describe what you want to generate..."
              className="w-full p-3 mb-3 bg-zinc-800 rounded border border-zinc-700 resize-none" />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Image Model</label>
                <select value={imageModel} onChange={(e) => setImageModel(e.target.value)}
                  className="w-full p-3 bg-zinc-800 rounded border border-zinc-700">
                  {IMAGE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Video Model</label>
                <select value={videoModel} onChange={(e) => setVideoModel(e.target.value)}
                  className="w-full p-3 bg-zinc-800 rounded border border-zinc-700">
                  {VIDEO_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => generate("image")} disabled={loading}
                className="flex-1 p-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold disabled:opacity-50">
                {loading ? "Generating..." : "Generate Image"}
              </button>
              <button onClick={() => generate("video")} disabled={loading}
                className="flex-1 p-3 bg-purple-600 hover:bg-purple-700 rounded font-semibold disabled:opacity-50">
                {loading ? "Generating..." : "Generate Video"}
              </button>
            </div>
          </div>
        )}

        {status && (
          <p className={`text-sm mb-4 ${status.includes("Done") || status.includes("Ready") ? "text-green-400" : status.includes("Failed") || status.includes("Error") ? "text-red-400" : "text-yellow-400"}`}>
            {status}
          </p>
        )}

        {result && resultType === "image" && (
          <div className="mt-4">
            <img src={result} alt="Generated" className="w-full rounded-lg border border-zinc-700" />
          </div>
        )}

        {result && resultType === "video" && (
          <div className="mt-4">
            <video src={result} controls className="w-full rounded-lg border border-zinc-700" />
          </div>
        )}
      </div>
    </div>
  );
}
