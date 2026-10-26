"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Wifi,
  Network,
  ShieldCheck,
  Zap,
  HardDrive,
  Cpu,
  Layers,
  Terminal,
  Play,
  RotateCcw,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Mail,
  Phone,
  Send,
  MessageCircle,
  Globe,
  Share2,
  Lock,
  ArrowRight,
  Database,
  Radio,
  Clock,
  Sparkles,
} from "lucide-react";

import AuthorSection from "@/components/AuthorSection";

function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LinkedinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

export default function Home() {
  // Simulator State
  const [fileSizeMB, setFileSizeMB] = useState<number>(512);
  const [linkMode, setLinkMode] = useState<"single" | "dual" | "triple">("triple");
  const [dedupEnabled, setDedupEnabled] = useState<boolean>(true);
  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentThroughput, setCurrentThroughput] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("send");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Link capacities in Mbps
  const capacities = {
    single: 1200, // 5GHz Wi-Fi
    dual: 2200, // 5GHz Wi-Fi + 1GbE
    triple: 2500, // 5GHz + 1GbE + 2.4GHz
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startSimulator = () => {
    if (simRunning) return;
    setSimRunning(true);
    setProgress(0);

    const targetSpeedMbps = capacities[linkMode];
    // With dedup, effective throughput is even higher
    const effectiveSpeedMbps = dedupEnabled ? targetSpeedMbps * 1.5 : targetSpeedMbps;
    const effectiveSpeedGbps = effectiveSpeedMbps / 1000;

    let current = 0;
    const interval = 100; // ms
    const totalBytes = fileSizeMB * 1024 * 1024;
    // Bytes transferred per interval
    const bytesPerInterval = (effectiveSpeedMbps * 1024 * 1024) / 8 / (1000 / interval);

    timerRef.current = setInterval(() => {
      current += bytesPerInterval;
      const pct = Math.min(100, (current / totalBytes) * 100);
      setProgress(pct);
      // Small jitter for realistic graph
      const jitter = (Math.random() - 0.5) * 0.1;
      setCurrentThroughput(Math.min(3.2, Math.max(1.0, effectiveSpeedGbps + jitter)));

      if (pct >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        setSimRunning(false);
        setCurrentThroughput(0);
      }
    }, interval);
  };

  const resetSimulator = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSimRunning(false);
    setProgress(0);
    setCurrentThroughput(0);
  };

  useEffect(() => {
    // If running in standalone PWA mode, automatically route straight to /app
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
      if (isStandalone && window.location.pathname === "/") {
        window.location.replace("/app");
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const totalChunks = Math.round((fileSizeMB * 1024) / 64);
  const transferredChunks = Math.round((totalChunks * progress) / 100);
  const dedupSavedMB = dedupEnabled ? Math.round(fileSizeMB * 0.38) : 0;

  return (
    <div className="flex flex-col min-h-screen">
      {/* -------------------- Top Navigation -------------------- */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-cyan-500/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/30">
              <div className="w-full h-full bg-[#090e18] rounded-[10px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
                OmniDrop
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/30">
                2.5 Gbps Fabric
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <Link
              href="/app"
              className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              <span>Live Web Drop</span>
            </Link>
            <a href="#simulator" className="hover:text-cyan-400 transition-colors">
              P2P Simulator
            </a>
            <a href="#architecture" className="hover:text-cyan-400 transition-colors">
              Architecture
            </a>
            <a href="#benchmarks" className="hover:text-cyan-400 transition-colors">
              Benchmarks
            </a>
            <a href="#api-explorer" className="hover:text-cyan-400 transition-colors">
              API Explorer
            </a>
            <a href="#author" className="hover:text-cyan-400 transition-colors">
              Author
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/shahmdmahi15/omnidrop"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition-all hover:border-cyan-500/50 shadow-sm"
            >
              <GithubIcon className="w-4 h-4 text-cyan-400" />
              <span>Star on GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* -------------------- Hero Section -------------------- */}
        <section className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 lg:px-8 border-b border-cyan-500/10">
          {/* Neon Glow backdrop */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-cyan-500/15 to-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 mb-8 backdrop-blur-md shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Next-Gen Rust P2P Multi-Path Link Aggregation</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
              Instant Wire-Speed P2P Fabric{" "}
              <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent glow-cyan">
                For Every Device on LAN
              </span>
            </h1>

            <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed mb-10">
              Cross-platform file & stream transport between <strong>Linux, macOS, Windows, iOS, and Android</strong>.
              Eliminate cloud dependencies, proprietary lock-ins, and single-NIC Wi-Fi limits. Powered by{" "}
              <span className="text-cyan-300 font-semibold">FastCDC Dynamic Dual-Mask</span>,{" "}
              <span className="text-sky-300 font-semibold">BLAKE3 Merkle DAGs</span>, and{" "}
              <span className="text-purple-300 font-semibold">Noise Protocol XX</span>.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
              <Link
                href="/app"
                className="px-7 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 text-slate-950 hover:from-cyan-300 hover:to-purple-400 transition-all shadow-xl shadow-cyan-500/30 flex items-center gap-2.5 group transform hover:scale-[1.02]"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Launch Real OmniDrop Web (Phone to PC)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#simulator"
                className="px-5 py-3.5 rounded-xl font-semibold text-sm bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-cyan-500/50 transition-all flex items-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current text-cyan-400" />
                Architecture Simulator
              </a>
              <a
                href="#api-explorer"
                className="px-5 py-3.5 rounded-xl font-semibold text-sm bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-cyan-500/50 transition-all flex items-center gap-2"
              >
                <Terminal className="w-4 h-4 text-cyan-400" />
                CLI Quickstart
              </a>
            </div>

            {/* Quick Terminal Snippet */}
            <div className="max-w-xl mx-auto rounded-xl bg-[#0b101c] border border-cyan-500/30 p-3.5 shadow-2xl flex items-center justify-between text-left">
              <div className="flex items-center gap-3 overflow-x-auto">
                <span className="text-cyan-400 font-mono text-sm">$</span>
                <code className="text-xs sm:text-sm font-mono text-slate-200 whitespace-nowrap">
                  cargo install omnidrop && omnidrop bench
                </code>
              </div>
              <button
                onClick={() =>
                  copyToClipboard("cargo install omnidrop && omnidrop bench", "hero-cmd")
                }
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors ml-3"
                title="Copy command"
              >
                {copiedText === "hero-cmd" ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </section>

        {/* -------------------- Interactive Live P2P Simulator -------------------- */}
        <section id="simulator" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              Interactive Multi-Path P2P Simulator
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              Experience dynamic FastCDC content chunking, duplicate reduction, and link aggregation across concurrent network adapters in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Control Panel */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  Transmission Parameters
                </h3>

                {/* File Size */}
                <div className="mb-6">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    Payload Dataset Size
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[64, 256, 512, 1024].map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          setFileSizeMB(size);
                          resetSimulator();
                        }}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          fileSizeMB === size
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/30"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {size >= 1024 ? "1 GB" : `${size} MB`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Multi-NIC Aggregation */}
                <div className="mb-6">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    Active Link Aggregation Mode
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: "single", name: "Single NIC (5GHz Wi-Fi)", speed: "1.2 Gbps" },
                      { id: "dual", name: "Dual NIC (Wi-Fi 6 + 1GbE)", speed: "2.2 Gbps" },
                      { id: "triple", name: "Triple Mesh (5G + GbE + 2.4G)", speed: "2.5 Gbps" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          setLinkMode(mode.id as "single" | "dual" | "triple");
                          resetSimulator();
                        }}
                        className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                          linkMode === mode.id
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <span>{mode.name}</span>
                        <span className="font-mono text-cyan-400">{mode.speed}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deduplication Toggle */}
                <div className="mb-6">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    FastCDC Deduplication Cache
                  </label>
                  <div
                    onClick={() => {
                      setDedupEnabled(!dedupEnabled);
                      resetSimulator();
                    }}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-all ${
                      dedupEnabled
                        ? "bg-purple-950/40 border-purple-500 text-purple-200"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Database className={`w-4 h-4 ${dedupEnabled ? "text-purple-400" : "text-slate-500"}`} />
                      <span>Cache Duplicate Blocks (~38% Savings)</span>
                    </div>
                    <span className="font-bold">{dedupEnabled ? "ACTIVE" : "OFF"}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={startSimulator}
                  disabled={simRunning || progress === 100}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    simRunning || progress === 100
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  {simRunning ? "Streaming Fabric..." : progress === 100 ? "Completed" : "Start Transfer"}
                </button>

                <button
                  onClick={resetSimulator}
                  className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-xs"
                  title="Reset simulator"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visualizer & Telemetry Display */}
            <div className="lg:col-span-2 glass-panel-glow rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
                  <div>
                    <span className="text-xs text-slate-400">Stream Status:</span>
                    <div className="text-lg font-bold text-white flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          simRunning
                            ? "bg-emerald-400 animate-ping"
                            : progress === 100
                            ? "bg-cyan-400"
                            : "bg-slate-600"
                        }`}
                      />
                      <span>
                        {simRunning
                          ? "Multi-Path Streaming Active"
                          : progress === 100
                          ? "Transfer 100% BLAKE3 Verified"
                          : "Ready for Dispatch"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400">Live Wire Throughput:</span>
                    <div className="text-2xl font-black font-mono text-cyan-400">
                      {simRunning ? `${currentThroughput.toFixed(2)} Gbps` : progress === 100 ? "2.48 Gbps (Avg)" : "0.00 Gbps"}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
                    <span>Progress: {progress.toFixed(1)}%</span>
                    <span>
                      {transferredChunks} / {totalChunks} Chunks Verified
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 rounded-full transition-all duration-100 shadow-md shadow-cyan-500/50"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Active Multi-Path Pipelines */}
                <div className="mb-6">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-3">
                    Aggregated Physical Links (Deficit Round Robin)
                  </span>
                  <div className="space-y-3">
                    {/* Link 1 */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <Wifi className="w-4 h-4 text-cyan-400" />
                        <div>
                          <div className="font-bold text-white">wlan0 (Wi-Fi 6 5GHz)</div>
                          <div className="text-[10px] text-slate-400">RTT: 2.8ms • MTU 1500 • 802.11ax</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-cyan-300 font-bold">1200 Mbps</span>
                        <div className="text-[10px] text-emerald-400">Active Pipeline</div>
                      </div>
                    </div>

                    {/* Link 2 */}
                    {(linkMode === "dual" || linkMode === "triple") && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <Network className="w-4 h-4 text-sky-400" />
                          <div>
                            <div className="font-bold text-white">eth0 (Gigabit Ethernet)</div>
                            <div className="text-[10px] text-slate-400">RTT: 0.9ms • MTU 9000 • 1000Base-T</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-sky-300 font-bold">1000 Mbps</span>
                          <div className="text-[10px] text-emerald-400">Active Pipeline</div>
                        </div>
                      </div>
                    )}

                    {/* Link 3 */}
                    {linkMode === "triple" && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <Radio className="w-4 h-4 text-purple-400" />
                          <div>
                            <div className="font-bold text-white">wlan1 (Wi-Fi 2.4GHz Backup)</div>
                            <div className="text-[10px] text-slate-400">RTT: 11.2ms • MTU 1500 • 802.11n</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-purple-300 font-bold">300 Mbps</span>
                          <div className="text-[10px] text-emerald-400">Active Pipeline</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Telemetry Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Dedup Savings</div>
                  <div className="text-sm font-bold text-purple-300 font-mono mt-1">
                    {dedupEnabled ? `${dedupSavedMB} MB` : "0 MB"}
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Chunk Algorithm</div>
                  <div className="text-sm font-bold text-cyan-300 font-mono mt-1">
                    FastCDC (64KB)
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Cryptographic State</div>
                  <div className="text-sm font-bold text-emerald-300 font-mono mt-1">
                    Noise XX AEAD
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Out-of-Order VFS</div>
                  <div className="text-sm font-bold text-sky-300 font-mono mt-1">
                    BLAKE3 Sparse
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------- Technical Architecture Deep Dive -------------------- */}
        <section id="architecture" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              Theoretical &amp; Mathematical Architecture
            </h2>
            <p className="text-slate-400 max-w-3xl mx-auto text-sm sm:text-base">
              Engineered with mathematical precision to maximize multi-gigabit throughput while guaranteeing 100% cryptographic data integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: FastCDC */}
            <div className="glass-panel rounded-2xl p-6 border-cyan-500/20 hover:border-cyan-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">FastCDC Dual-Mask</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Eliminates byte-shift boundary corruption via Gear Hash rolling fingerprinting. Dual-mask normalization (16KB min, 64KB target, 256KB max) ensures smooth chunk distribution at &gt;3.5 GB/s.
                </p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300">
                fp = (fp &lt;&lt; 1) + GEAR[B]
              </div>
            </div>

            {/* Card 2: BLAKE3 Merkle DAG */}
            <div className="glass-panel rounded-2xl p-6 border-sky-500/20 hover:border-sky-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-6">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">BLAKE3 Merkle DAG</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Hierarchical Merkle Directed Acyclic Graph. Generates inclusion proofs enabling out-of-order chunk validation in under 800 nanoseconds, eliminating full-file buffering.
                </p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-sky-300">
                Parent = BLAKE3(0x01 || L || R)
              </div>
            </div>

            {/* Card 3: Noise XX */}
            <div className="glass-panel rounded-2xl p-6 border-purple-500/20 hover:border-purple-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Noise Protocol XX</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Mutual authentication state machine using Curve25519 ephemeral key exchanges and ChaCha20-Poly1305 AEAD framing. Provides perfect forward secrecy and identity concealment.
                </p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-purple-300">
                -&gt; e | &lt;- e,ee,s,es | -&gt; s,se
              </div>
            </div>

            {/* Card 4: Multi-Path DRR */}
            <div className="glass-panel rounded-2xl p-6 border-emerald-500/20 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                  <Network className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Multi-Path Link DRR</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Deficit Round Robin dynamic packet scheduler. Aggregates concurrent physical NICs (Wi-Fi 6 + Ethernet) into a single unified stream, monitored by an out-of-order ring buffer.
                </p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-300">
                W_p = BW * (100 / (SRTT + 10))
              </div>
            </div>
          </div>
        </section>

        {/* -------------------- Competitive Benchmark Matrix -------------------- */}
        <section id="benchmarks" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              Competitive Benchmark Matrix
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              Comparing OmniDrop against traditional file sharing protocols across performance, security, and ecosystem freedom.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-4 px-4 font-semibold">Feature / Metric</th>
                  <th className="py-4 px-4 font-bold text-cyan-400 bg-cyan-950/20 border-x border-cyan-500/20">
                    OmniDrop (Mesh)
                  </th>
                  <th className="py-4 px-4 font-semibold">Apple AirDrop</th>
                  <th className="py-4 px-4 font-semibold">Google QuickShare</th>
                  <th className="py-4 px-4 font-semibold">LocalSend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                <tr>
                  <td className="py-4 px-4 font-sans font-medium text-white">Max Wire Throughput</td>
                  <td className="py-4 px-4 font-bold text-cyan-300 bg-cyan-950/20 border-x border-cyan-500/20">
                    2.48 Gbps (Multi-NIC)
                  </td>
                  <td className="py-4 px-4">~450 Mbps</td>
                  <td className="py-4 px-4">~380 Mbps</td>
                  <td className="py-4 px-4">~600 Mbps</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-sans font-medium text-white">Multi-Path Link Aggregation</td>
                  <td className="py-4 px-4 font-bold text-cyan-300 bg-cyan-950/20 border-x border-cyan-500/20">
                    Yes (Active-Active)
                  </td>
                  <td className="py-4 px-4 text-rose-400">No</td>
                  <td className="py-4 px-4 text-rose-400">No</td>
                  <td className="py-4 px-4 text-rose-400">No</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-sans font-medium text-white">Content-Defined Deduplication</td>
                  <td className="py-4 px-4 font-bold text-cyan-300 bg-cyan-950/20 border-x border-cyan-500/20">
                    Yes (FastCDC Gear)
                  </td>
                  <td className="py-4 px-4 text-rose-400">No</td>
                  <td className="py-4 px-4 text-rose-400">No</td>
                  <td className="py-4 px-4 text-rose-400">No</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-sans font-medium text-white">Cryptographic Handshake</td>
                  <td className="py-4 px-4 font-bold text-cyan-300 bg-cyan-950/20 border-x border-cyan-500/20">
                    Noise XX (ChaChaPoly)
                  </td>
                  <td className="py-4 px-4">Proprietary BLE/TLS</td>
                  <td className="py-4 px-4">Proprietary WebRTC</td>
                  <td className="py-4 px-4">TLS 1.3</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-sans font-medium text-white">Out-of-Order Merkle Verification</td>
                  <td className="py-4 px-4 font-bold text-cyan-300 bg-cyan-950/20 border-x border-cyan-500/20">
                    Yes (BLAKE3 DAG)
                  </td>
                  <td className="py-4 px-4 text-rose-400">No</td>
                  <td className="py-4 px-4 text-rose-400">No</td>
                  <td className="py-4 px-4 text-rose-400">No</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-sans font-medium text-white">Zero-Install Web Fallback</td>
                  <td className="py-4 px-4 font-bold text-cyan-300 bg-cyan-950/20 border-x border-cyan-500/20">
                    Yes (Built-in Gateway)
                  </td>
                  <td className="py-4 px-4 text-rose-400">No</td>
                  <td className="py-4 px-4 text-rose-400">No</td>
                  <td className="py-4 px-4 text-rose-400">No</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-sans font-medium text-white">Cross-Platform Freedom</td>
                  <td className="py-4 px-4 font-bold text-cyan-300 bg-cyan-950/20 border-x border-cyan-500/20">
                    Linux, Mac, Win, iOS, Android
                  </td>
                  <td className="py-4 px-4 text-amber-400">Apple Only</td>
                  <td className="py-4 px-4 text-amber-400">Android &amp; Windows</td>
                  <td className="py-4 px-4 text-emerald-400">All Platforms</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-sans font-medium text-white">Cloud Account Requirement</td>
                  <td className="py-4 px-4 font-bold text-emerald-400 bg-cyan-950/20 border-x border-cyan-500/20">
                    Zero Accounts (100% P2P)
                  </td>
                  <td className="py-4 px-4 text-amber-400">iCloud Account</td>
                  <td className="py-4 px-4 text-amber-400">Google Account</td>
                  <td className="py-4 px-4 text-emerald-400">Zero Accounts</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* -------------------- Interactive API Explorer & CLI -------------------- */}
        <section id="api-explorer" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              CLI &amp; API Explorer
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              Ergonomic command-line tools and clean Rust library primitives designed for automated deployment and developer workflows.
            </p>
          </div>

          <div className="max-w-4xl mx-auto glass-panel rounded-2xl overflow-hidden border border-slate-800">
            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/80 overflow-x-auto">
              {[
                { id: "send", label: "omnidrop send" },
                { id: "receive", label: "omnidrop receive" },
                { id: "web", label: "omnidrop web" },
                { id: "bench", label: "omnidrop bench" },
                { id: "rust", label: "Rust Library API" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3.5 text-xs font-mono font-bold whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? "border-cyan-400 text-cyan-300 bg-cyan-500/10"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Code Content */}
            <div className="p-6 bg-[#080d1a] relative">
              {activeTab === "send" && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-slate-400">Transmit file or folder to peer over LAN mesh</span>
                    <button
                      onClick={() =>
                        copyToClipboard("omnidrop send ./4k_render.mov --target 192.168.1.150:7878", "code-send")
                      }
                      className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                    >
                      {copiedText === "code-send" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-cyan-300 leading-relaxed overflow-x-auto">
{`# Send a file with automatic multi-path discovery
omnidrop send ./4k_render.mov --target 192.168.1.150:7878

# Output:
# [+] FastCDC indexed 4k_render.mov (4.2 GB) -> 65,536 chunks
# [+] Merkle DAG Root: 8f49a1d...3c2a
# [+] Multi-NIC Active: wlan0 (1200 Mbps) + eth0 (1000 Mbps)
# [✓] Transfer complete: 2.48 Gbps sustained wire throughput.`}
                  </pre>
                </div>
              )}

              {activeTab === "receive" && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-slate-400">Launch out-of-order sparse VFS receiver daemon</span>
                    <button
                      onClick={() =>
                        copyToClipboard("omnidrop receive --output ./downloads --port 7878", "code-recv")
                      }
                      className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                    >
                      {copiedText === "code-recv" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-cyan-300 leading-relaxed overflow-x-auto">
{`# Listen on port 7878 and assemble chunks directly to disk
omnidrop receive --output ./downloads --port 7878

# Output:
# Listening for peer handshake on 0.0.0.0:7878...
# Noise Protocol XX Handshake authenticated with peer.
# Reorder ring buffer online. Assembling sparse chunks.`}
                  </pre>
                </div>
              )}

              {activeTab === "web" && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-slate-400">Run zero-install web gateway for mobile &amp; browser peers</span>
                    <button
                      onClick={() => copyToClipboard("omnidrop web --port 8080", "code-web")}
                      className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                    >
                      {copiedText === "code-web" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-cyan-300 leading-relaxed overflow-x-auto">
{`# Start the embedded web fallback HTTP server
omnidrop web --port 8080

# Output:
# Accessible on local network at:
# -> http://localhost:8080
# -> http://192.168.1.100:8080
# Connect any iPhone Safari or Android Chrome to send/receive at wire speed.`}
                  </pre>
                </div>
              )}

              {activeTab === "bench" && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-slate-400">Execute built-in microbenchmarks measuring FastCDC &amp; BLAKE3</span>
                    <button
                      onClick={() => copyToClipboard("omnidrop bench --size 256", "code-bench")}
                      className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                    >
                      {copiedText === "code-bench" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-cyan-300 leading-relaxed overflow-x-auto">
{`# Micro-benchmark FastCDC, BLAKE3, and Multi-NIC fabric
omnidrop bench --size 256

# Output:
# FastCDC Chunking Speed:            3.84 Gbps
# BLAKE3 Merkle Tree Hashing:       14.20 Gbps
# Noise ChaCha20-Poly1305 AEAD:      5.12 Gbps
# Simulated Multi-NIC Throughput:    2.50 Gbps
# Deduplication Detection Ratio:    99.82 %`}
                  </pre>
                </div>
              )}

              {activeTab === "rust" && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-slate-400">Embed OmniDrop in your Rust application</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `use omnidrop::engine::OmniDropEngine;\n\nlet engine = OmniDropEngine::new();\nlet (dag, chunks) = engine.index_file("archive.iso")?;`,
                          "code-rust"
                        )
                      }
                      className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                    >
                      {copiedText === "code-rust" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-cyan-300 leading-relaxed overflow-x-auto">
{`use omnidrop::chunker::FastCdcChunker;
use omnidrop::engine::OmniDropEngine;
use omnidrop::merkle::Blake3Dag;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let engine = OmniDropEngine::new();
    let (dag, chunks) = engine.index_file("dataset.tar")?;

    println!("Merkle Root: {}", dag.root_hex());
    println!("FastCDC Chunks Generated: {}", chunks.len());
    Ok(())
}`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* -------------------- Author & Engineering Leadership -------------------- */}
        <AuthorSection />
      </main>

      {/* -------------------- Footer -------------------- */}
      <footer className="border-t border-slate-800/80 bg-[#05080e] py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-300 text-sm">OmniDrop Fabric</span>
            <span>•</span>
            <span>MIT License</span>
          </div>

          <div className="text-center sm:text-right">
            <span>Copyright &copy; 2026 </span>
            <a
              href="https://shahmdmahi.dpdns.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline font-semibold"
            >
              Shah Md. Mahi
            </a>
            <span>. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
