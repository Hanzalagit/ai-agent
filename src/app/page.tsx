"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const tenant = localStorage.getItem("tenant");
    if (tenant) {
      router.replace("/dashboard");
    } else {
      router.replace("/landing");
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-sm font-bold text-zinc-950">
          {"</>"}
        </div>
        <div className="flex gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.3s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.15s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" />
        </div>
      </div>
    </div>
  );
}
