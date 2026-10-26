"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import {
  Wifi,
  Radio,
  HardDrive,
  Cpu,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  QrCode,
  Smartphone,
  Monitor,
  Laptop,
  Share2,
  FileText,
  FileArchive,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  File as FileGeneric,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Send,
  X,
  PlusCircle,
  DownloadCloud,
} from "lucide-react";
import AuthorSection from "./AuthorSection";

// Helper: Format bytes to human readable
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Helper: Detect Device Info
function detectDeviceInfo(): { type: "mobile" | "desktop" | "tablet"; name: string; platform: string } {
  if (typeof window === "undefined" || !navigator) {
    return { type: "desktop", name: "Web Browser", platform: "Web" };
  }
  const ua = navigator.userAgent;
  let type: "mobile" | "desktop" | "tablet" = "desktop";
  let platform = "Desktop";

  if (/iPad|Tablet/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    type = "tablet";
    platform = "iPadOS";
  } else if (/iPhone|iPod/i.test(ua)) {
    type = "mobile";
    platform = "iOS";
  } else if (/Android/i.test(ua)) {
    type = "mobile";
    platform = "Android";
  } else if (/Mac/i.test(ua)) {
    platform = "macOS";
  } else if (/Win/i.test(ua)) {
    platform = "Windows";
  } else if (/Linux/i.test(ua)) {
    platform = "Linux";
  }

  let browser = "Browser";
  if (/Chrome|CriOS/i.test(ua) && !/Edge|Edg|OPR/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
  else if (/Edg/i.test(ua)) browser = "Edge";

  return { type, name: `${browser} on ${platform}`, platform };
}

// Synthesize pleasant sound cue
function playSound(type: "connect" | "complete" | "receive") {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "connect") {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "complete") {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === "receive") {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Ignore audio errors on muted browser policies
  }
}

// File icon selector helper
function getFileIcon(mimeType: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext || "")) {
    return <FileImage className="w-6 h-6 text-emerald-400" />;
  }
  if (mimeType.startsWith("video/") || ["mp4", "webm", "mkv", "mov"].includes(ext || "")) {
    return <FileVideo className="w-6 h-6 text-purple-400" />;
  }
  if (mimeType.startsWith("audio/") || ["mp3", "wav", "flac", "aac", "ogg"].includes(ext || "")) {
    return <FileAudio className="w-6 h-6 text-pink-400" />;
  }
  if (["zip", "tar", "gz", "7z", "rar"].includes(ext || "")) {
    return <FileArchive className="w-6 h-6 text-amber-400" />;
  }
  if (["js", "ts", "tsx", "py", "rs", "json", "html", "css"].includes(ext || "")) {
    return <FileCode className="w-6 h-6 text-sky-400" />;
  }
  if (["pdf", "txt", "md", "doc", "docx"].includes(ext || "")) {
    return <FileText className="w-6 h-6 text-blue-400" />;
  }
  return <FileGeneric className="w-6 h-6 text-cyan-400" />;
}

interface TransferItem {
  id: string;
  name: string;
  size: number;
  type: string;
  direction: "sending" | "receiving";
  progress: number;
  speedMBps: number;
  status: "transferring" | "completed" | "error";
  downloadUrl?: string;
  error?: string;
}

interface TextDropItem {
  id: string;
  text: string;
  direction: "sent" | "received";
  timestamp: string;
}

const CHUNK_SIZE = 32 * 1024; // 32 KB chunk for resilient mobile WebRTC data channel

export default function RealWebDrop() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");

  // Room state
  const [roomCode, setRoomCode] = useState<string>("");
  const [manualCodeInput, setManualCodeInput] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Peer & Connection state
  const [myDeviceInfo, setMyDeviceInfo] = useState<{ type: string; name: string; platform: string }>({
    type: "desktop",
    name: "Detecting System...",
    platform: "Web",
  });
  const [peerStatus, setPeerStatus] = useState<"initializing" | "ready" | "connecting" | "connected" | "error">(
    "initializing"
  );
  const [remoteDeviceInfo, setRemoteDeviceInfo] = useState<{ type: string; name: string; platform: string } | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PWA & Standalone State
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIosInstallModal, setShowIosInstallModal] = useState<boolean>(false);
  const [isIosDevice, setIsIosDevice] = useState<boolean>(false);

  // Active transfers and messages
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [textDrops, setTextDrops] = useState<TextDropItem[]>([]);
  const [messageInput, setMessageInput] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Internal references
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const peerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeConnRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const receivingBuffers = useRef<
    Map<string, { chunks: ArrayBuffer[]; totalChunks: number; meta: any; receivedBytes: number; lastTime: number }>
  >(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Initialize Device Detection & PWA Standalone Status
  useEffect(() => {
    const devInfo = detectDeviceInfo();
    setMyDeviceInfo(devInfo);

    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
      setIsStandalone(standalone);

      const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setIsIosDevice(isIos);

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
      return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    }
  }, []);

  // 2. Room Code Resolution
  useEffect(() => {
    if (roomParam) {
      setRoomCode(roomParam.trim().toUpperCase());
    } else {
      // Generate clean 6-char alphanumeric room code
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setRoomCode(code);
    }
  }, [roomParam]);

  // 3. Generate QR Code when roomCode is ready
  useEffect(() => {
    if (!roomCode) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://omnidrop.shahmdmahi.dpdns.org";
    const shareUrl = `${origin}/app?room=${roomCode}`;
    QRCode.toDataURL(shareUrl, {
      width: 280,
      margin: 1.5,
      color: {
        dark: "#06b6d4", // Cyan
        light: "#040812", // Deep dark background
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Code Error:", err));
  }, [roomCode]);

  // 4. Setup PeerJS Connection Engine
  const setupConnection = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (conn: any) => {
      activeConnRef.current = conn;

      conn.on("open", () => {
        setPeerStatus("connected");
        playSound("connect");

        // Send local device info handshake
        conn.send({
          type: "handshake",
          deviceInfo: detectDeviceInfo(),
        });
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conn.on("data", (data: any) => {
        if (!data || typeof data !== "object") return;

        // Handshake received
        if (data.type === "handshake") {
          setRemoteDeviceInfo(data.deviceInfo);
          return;
        }

        // Text drop received
        if (data.type === "text-drop") {
          playSound("receive");
          setTextDrops((prev) => [
            {
              id: Math.random().toString(36).substring(7),
              text: data.text,
              direction: "received",
              timestamp: new Date().toLocaleTimeString(),
            },
            ...prev,
          ]);
          return;
        }

        // File Start Meta received
        if (data.type === "file-start") {
          receivingBuffers.current.set(data.fileId, {
            chunks: [],
            totalChunks: data.totalChunks,
            meta: data,
            receivedBytes: 0,
            lastTime: Date.now(),
          });

          setTransfers((prev) => [
            {
              id: data.fileId,
              name: data.name,
              size: data.size,
              type: data.mimeType,
              direction: "receiving",
              progress: 0,
              speedMBps: 0,
              status: "transferring",
            },
            ...prev,
          ]);
          return;
        }

        // File Chunk received
        if (data.type === "file-chunk") {
          const bufferInfo = receivingBuffers.current.get(data.fileId);
          if (!bufferInfo) return;

          bufferInfo.chunks[data.chunkIndex] = data.data;
          bufferInfo.receivedBytes += data.data.byteLength;

          const now = Date.now();
          const elapsedSec = (now - bufferInfo.lastTime) / 1000;
          let speed = 0;
          if (elapsedSec > 0.4) {
            speed = data.data.byteLength / elapsedSec / (1024 * 1024);
            bufferInfo.lastTime = now;
          }

          const progress = Math.min(100, Math.round((bufferInfo.receivedBytes / bufferInfo.meta.size) * 100));

          setTransfers((prev) =>
            prev.map((t) =>
              t.id === data.fileId
                ? {
                    ...t,
                    progress,
                    speedMBps: speed > 0 ? parseFloat(speed.toFixed(2)) : t.speedMBps,
                  }
                : t
            )
          );
          return;
        }

        // File Completed received
        if (data.type === "file-complete") {
          const bufferInfo = receivingBuffers.current.get(data.fileId);
          if (!bufferInfo) return;

          const blob = new Blob(bufferInfo.chunks, { type: bufferInfo.meta.mimeType || "application/octet-stream" });
          const downloadUrl = URL.createObjectURL(blob);

          setTransfers((prev) =>
            prev.map((t) =>
              t.id === data.fileId
                ? {
                    ...t,
                    progress: 100,
                    status: "completed",
                    downloadUrl,
                  }
                : t
            )
          );

          receivingBuffers.current.delete(data.fileId);
          playSound("complete");

          // Auto-trigger browser download for seamless experience
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = bufferInfo.meta.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      });

      conn.on("close", () => {
        setPeerStatus("ready");
        setRemoteDeviceInfo(null);
        activeConnRef.current = null;
      });

      conn.on("error", (err: unknown) => {
        console.error("DataConnection Error:", err);
      });
    },
    []
  );

  // Initialize PeerJS
  useEffect(() => {
    if (!roomCode) return;
    let isCancelled = false;

    // Dynamically import PeerJS on client
    import("peerjs").then(({ default: Peer }) => {
      if (isCancelled) return;

      // Clean up previous peer if any
      if (peerRef.current) {
        peerRef.current.destroy();
      }

      const isHost = !roomParam;
      const peerId = isHost ? `omnidrop-room-${roomCode.toLowerCase()}` : undefined;

      try {
        const peer = new Peer(peerId as string, {
          debug: 1,
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
              { urls: "stun:stun2.l.google.com:19302" },
            ],
          },
        });

        peerRef.current = peer;

        peer.on("open", () => {
          if (isCancelled) return;
          setPeerStatus("ready");
          setErrorMessage(null);

          // If guest, connect directly to host
          if (!isHost && roomParam) {
            setPeerStatus("connecting");
            const targetHostId = `omnidrop-room-${roomParam.trim().toLowerCase()}`;
            const conn = peer.connect(targetHostId, { reliable: true });
            setupConnection(conn);
          }
        });

        // Incoming connection handler (Host)
        peer.on("connection", (conn) => {
          setupConnection(conn);
        });

        peer.on("error", (err: unknown) => {
          console.warn("PeerJS Notification:", err);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pErr = err as any;
          if (pErr.type === "unavailable-id") {
            setPeerStatus("connecting");
            const guestPeer = new Peer({
              config: {
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
              },
            });
            peerRef.current = guestPeer;
            guestPeer.on("open", () => {
              const conn = guestPeer.connect(`omnidrop-room-${roomCode.toLowerCase()}`, { reliable: true });
              setupConnection(conn);
            });
            guestPeer.on("connection", (c) => setupConnection(c));
          } else if (pErr.type === "peer-unavailable") {
            setErrorMessage(`Room "${roomCode}" host not found. Verify the room code or ensure host device is open.`);
            setPeerStatus("ready");
          }
        });
      } catch (err: unknown) {
        console.error("Failed to initialize PeerJS:", err);
      }
    });

    return () => {
      isCancelled = true;
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [roomCode, roomParam, setupConnection]);

  // File Transfer Sender Engine with Backpressure
  const sendFiles = async (files: FileList | File[]) => {
    if (!activeConnRef.current || peerStatus !== "connected") {
      alert("No peer connected! Please scan the QR code or join the room on your other device first.");
      return;
    }

    const conn = activeConnRef.current;

    for (let fIdx = 0; fIdx < files.length; fIdx++) {
      const file = files[fIdx];
      const fileId = "file-" + Math.random().toString(36).substring(2, 9);
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      // Add to transfers UI
      setTransfers((prev) => [
        {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          direction: "sending",
          progress: 0,
          speedMBps: 0,
          status: "transferring",
        },
        ...prev,
      ]);

      // 1. Send file start metadata
      conn.send({
        type: "file-start",
        fileId,
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        totalChunks,
        chunkSize: CHUNK_SIZE,
      });

      let sentBytes = 0;
      let lastTime = Date.now();

      // 2. Stream chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const slice = file.slice(start, end);
        const arrayBuffer = await slice.arrayBuffer();

        conn.send({
          type: "file-chunk",
          fileId,
          chunkIndex,
          data: arrayBuffer,
        });

        sentBytes += arrayBuffer.byteLength;
        const now = Date.now();
        const elapsedSec = (now - lastTime) / 1000;
        let speed = 0;
        if (elapsedSec > 0.4) {
          speed = arrayBuffer.byteLength / elapsedSec / (1024 * 1024);
          lastTime = now;
        }

        const pct = Math.min(100, Math.round((sentBytes / file.size) * 100));

        setTransfers((prev) =>
          prev.map((t) =>
            t.id === fileId
              ? {
                  ...t,
                  progress: pct,
                  speedMBps: speed > 0 ? parseFloat(speed.toFixed(2)) : t.speedMBps,
                }
              : t
          )
        );

        // Backpressure throttling: keep RTCDataChannel buffer healthy
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawDc = (conn as any).dataChannel;
        if (rawDc && rawDc.bufferedAmount > 512 * 1024) {
          while (rawDc.bufferedAmount > 128 * 1024) {
            await new Promise((r) => setTimeout(r, 20));
          }
        }
      }

      // 3. Send file completion
      conn.send({
        type: "file-complete",
        fileId,
      });

      setTransfers((prev) =>
        prev.map((t) =>
          t.id === fileId
            ? {
                ...t,
                progress: 100,
                status: "completed",
              }
            : t
        )
      );

      playSound("complete");
    }
  };

  // Text Drop Sender
  const sendTextMessage = () => {
    if (!messageInput.trim()) return;
    if (!activeConnRef.current || peerStatus !== "connected") {
      alert("No peer connected! Pair your device first.");
      return;
    }

    activeConnRef.current.send({
      type: "text-drop",
      text: messageInput.trim(),
    });

    setTextDrops((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        text: messageInput.trim(),
        direction: "sent",
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);

    setMessageInput("");
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      sendFiles(e.dataTransfer.files);
    }
  };

  // Copy share link
  const copyShareLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://omnidrop.shahmdmahi.dpdns.org";
    const shareUrl = `${origin}/app?room=${roomCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Copy room code
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Join Room by Manual Code
  const joinManualRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    const cleanCode = manualCodeInput.trim().toUpperCase();
    if (typeof window !== "undefined") {
      window.location.href = `/app?room=${cleanCode}`;
    }
  };

  // PWA Install trigger
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIosDevice) {
      setShowIosInstallModal(true);
    } else {
      alert(
        "To install OmniDrop as a native app:\n1. Click browser settings (⋮ or ⊕)\n2. Select 'Install OmniDrop' or 'Add to Home screen'"
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050811] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ----------------- Top Header (Safezone Aware) ----------------- */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-cyan-500/20 backdrop-blur-md pt-[max(env(safe-area-inset-top,0px),0.5rem)] px-[max(env(safe-area-inset-left,0px),0.75rem)] transition-all">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#090e18] rounded-[10px] flex items-center justify-center">
                  <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
                  OmniDrop PWA
                </span>
                <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/30 font-mono">
                  {isStandalone ? "⚡ Native App" : "WebRTC Direct"}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Install PWA Button / Indicator */}
            {!isStandalone ? (
              <button
                onClick={handleInstallClick}
                className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-500/40 text-cyan-300 font-medium flex items-center gap-1.5 transition-all shadow-sm"
                title="Install OmniDrop as a Native App on your device"
              >
                <DownloadCloud className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="hidden xs:inline">Install App</span>
                <span className="xs:hidden">Install</span>
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] font-mono text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Installed PWA</span>
              </div>
            )}

            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Docs</span>
            </Link>

            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-xs text-cyan-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>{roomCode || "..."}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ----------------- Main Workspace (Safezone Container) ----------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 safe-container flex flex-col gap-6">
        {/* Device & PWA Status Bar */}
        <div className="pwa-header-spacer glass-panel p-4 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-lg ${
                peerStatus === "connected"
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20"
                  : peerStatus === "connecting"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse"
                  : "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
              }`}
            >
              {peerStatus === "connected" ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : peerStatus === "connecting" ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <Wifi className="w-6 h-6 animate-pulse" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm sm:text-base">
                  {peerStatus === "connected"
                    ? `Connected to ${remoteDeviceInfo?.name || "Peer Device"}`
                    : peerStatus === "connecting"
                    ? "Connecting to Peer..."
                    : "Ready for Direct P2P Transfer"}
                </h3>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-full border ${
                    peerStatus === "connected"
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : peerStatus === "connecting"
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                  }`}
                >
                  {peerStatus === "connected" ? "DTLS/SCTP ENCRYPTED" : "AWAITING PAIR"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>
                  Host: <strong className="text-cyan-300">{myDeviceInfo.name}</strong>
                </span>
                <span>•</span>
                <span>
                  Safezone: <span className="text-emerald-400 font-mono">Active (iOS/Android/Desktop)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={copyShareLink}
              className="text-xs px-3 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-all shadow-sm"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Link Copied!" : "Share Link"}</span>
            </button>

            <button
              onClick={copyRoomCode}
              className="text-xs px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 transition-all shadow-sm"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Code: {roomCode}</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => (window.location.href = "/app")}
              className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded text-rose-200 underline font-medium"
            >
              Create New Room
            </button>
          </div>
        )}

        {/* ----------------- Grid: Pairing & File Drop ----------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: QR Code & Pairing */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* QR Pairing Card */}
            <div className="glass-panel p-6 rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-[#090e1a]/80 to-[#040812]/90 shadow-xl flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-4">
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan from Phone Camera</span>
              </div>

              <h2 className="text-xl font-bold text-slate-100">Pair Instantly</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Point your phone camera (iOS / iPadOS / Android) at this QR code. Both devices connect directly over WebRTC.
              </p>

              {/* QR Image Box */}
              <div className="relative mt-6 p-4 rounded-2xl bg-[#03060d] border border-cyan-500/30 shadow-2xl shadow-cyan-950/60 group">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 opacity-20 blur-md group-hover:opacity-40 transition-opacity" />
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt={`OmniDrop Room ${roomCode} QR Code`}
                    width={220}
                    height={220}
                    className="relative rounded-xl border border-cyan-500/20"
                  />
                ) : (
                  <div className="w-[220px] h-[220px] flex items-center justify-center text-xs text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                  </div>
                )}
              </div>

              {/* Room Code Display */}
              <div className="mt-6 flex flex-col items-center gap-2 w-full">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">Room Passkey</span>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black font-mono tracking-wider bg-gradient-to-r from-cyan-400 to-sky-200 bg-clip-text text-transparent">
                    {roomCode}
                  </span>
                  <button
                    onClick={copyRoomCode}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Copy Room Code"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Join Existing Room Form */}
              <form onSubmit={joinManualRoom} className="mt-6 w-full pt-6 border-t border-slate-800/80 flex gap-2">
                <input
                  type="text"
                  placeholder="Or enter 6-digit code"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="flex-1 bg-slate-900/80 border border-slate-700/60 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs font-mono text-center tracking-widest uppercase outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!manualCodeInput.trim()}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md shadow-cyan-500/20"
                >
                  Join
                </button>
              </form>
            </div>

            {/* Quick Text / Link Drop */}
            <div className="glass-panel p-5 rounded-3xl border border-cyan-500/20 bg-[#090e1a]/60 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span>Instant Text & Link Drop</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Clipboard Bridge</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste URL, password, or note..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendTextMessage()}
                  className="flex-1 bg-slate-900/80 border border-slate-700/60 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition-colors"
                />
                <button
                  onClick={sendTextMessage}
                  disabled={!messageInput.trim() || peerStatus !== "connected"}
                  className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center shadow-md shadow-cyan-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Text Drops Feed */}
              {textDrops.length > 0 && (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {textDrops.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                        item.direction === "sent"
                          ? "bg-cyan-950/30 border-cyan-500/30 text-cyan-200"
                          : "bg-purple-950/30 border-purple-500/30 text-purple-200"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.direction === "sent" ? "You" : remoteDeviceInfo?.name || "Peer"} • {item.timestamp}
                        </span>
                        <p className="font-mono break-all select-all">{item.text}</p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(item.text)}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 shrink-0 transition-colors"
                        title="Copy text"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Drag & Drop Zone + Live Transfers */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Drop Zone Card */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`glass-panel p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center relative overflow-hidden group ${
                isDragOver
                  ? "border-cyan-400 bg-cyan-950/30 scale-[1.01] shadow-2xl shadow-cyan-500/20"
                  : "border-cyan-500/30 hover:border-cyan-400/60 bg-[#090e1a]/60 hover:bg-[#090e1a]/80"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    sendFiles(e.target.files);
                  }
                }}
              />

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-purple-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/10">
                <Upload className="w-8 h-8 animate-bounce" />
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-100">
                {isDragOver ? "Drop Files Here to Stream" : "Choose Files or Drag & Drop Here"}
              </h3>

              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md">
                Transfer photos, videos, ZIPs, or documents directly to your paired device.
                <br />
                <span className="text-cyan-400 font-mono text-xs">Direct WebRTC • 32KB Resilient Chunking • Zero Cloud Storage</span>
              </p>

              <button
                type="button"
                className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all"
              >
                Select Files from Device
              </button>
            </div>

            {/* Active & Completed Transfers Queue */}
            <div className="glass-panel p-6 rounded-3xl border border-cyan-500/20 bg-[#090e1a]/60 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold text-sm text-slate-200">Active File Transfers</h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-cyan-400">
                    {transfers.length}
                  </span>
                </div>

                {transfers.length > 0 && (
                  <button
                    onClick={() => setTransfers([])}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {transfers.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 gap-2">
                  <Wifi className="w-8 h-8 opacity-40 text-cyan-400" />
                  <p className="text-xs">No active transfers yet.</p>
                  <p className="text-[11px] text-slate-600">
                    Select a file or photo on either device to start streaming.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {transfers.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/30 transition-all flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
                            {getFileIcon(item.type, item.name)}
                          </div>

                          <div className="flex flex-col overflow-hidden">
                            <span className="font-medium text-xs sm:text-sm text-slate-200 truncate" title={item.name}>
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                              <span>{formatBytes(item.size)}</span>
                              <span>•</span>
                              <span
                                className={
                                  item.direction === "sending" ? "text-cyan-400" : "text-purple-400"
                                }
                              >
                                {item.direction === "sending" ? "Sending ↑" : "Receiving ↓"}
                              </span>
                              {item.speedMBps > 0 && item.status === "transferring" && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-400 font-semibold">{item.speedMBps} MB/s</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status / Download CTA */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.status === "completed" ? (
                            item.downloadUrl ? (
                              <a
                                href={item.downloadUrl}
                                download={item.name}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </a>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Sent</span>
                              </span>
                            )
                          ) : (
                            <span className="text-xs font-mono font-bold text-cyan-400">
                              {item.progress}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-150 ${
                            item.status === "completed"
                              ? "bg-emerald-400 shadow-sm shadow-emerald-400"
                              : "bg-gradient-to-r from-cyan-400 to-purple-500 shadow-sm shadow-cyan-400"
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ----------------- System Comparison Note ----------------- */}
        <div className="glass-panel p-6 rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-slate-900/60 to-[#080d1a]/80 backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Why OmniDrop Web RTC is Superior to Cloud Storage</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Unlike AirDrop (Apple-locked) or Google Drive (uploads to cloud servers first), OmniDrop establishes a
                  direct encrypted DTLS/SCTP data tunnel directly between your devices. No file size limits, zero bandwidth fees, and zero cloud retention.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/"
                className="text-xs px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                CLI Docs & Rust Engine
              </Link>
            </div>
          </div>
        </div>

        {/* ----------------- Author Profile Card ----------------- */}
        <AuthorSection />
      </main>

      {/* ----------------- iOS Add to Home Screen Instructions Modal ----------------- */}
      {showIosInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel p-6 rounded-3xl border border-cyan-500/30 bg-[#090e1a] max-w-sm w-full flex flex-col gap-4 text-center relative shadow-2xl">
            <button
              onClick={() => setShowIosInstallModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-100">Install on iPhone / iPad</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Install OmniDrop as a standalone app with full screen view and zero browser bars:
            </p>

            <div className="flex flex-col gap-3 text-left text-xs bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <span>
                  Tap the <strong className="text-cyan-300">Share button</strong> (box with arrow) at the bottom or top of Safari.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <span>
                  Scroll down and tap <strong className="text-cyan-300">Add to Home Screen</strong>.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <span>Tap <strong className="text-emerald-400">Add</strong>. Open OmniDrop directly from your home screen!</span>
              </div>
            </div>

            <button
              onClick={() => setShowIosInstallModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ----------------- Bottom Footer (Safezone Aware) ----------------- */}
      <footer className="w-full border-t border-slate-800/80 py-6 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] px-[max(env(safe-area-inset-left,0px),1rem)] text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} OmniDrop PWA — Architected by Shah Md. Mahi</p>
          <div className="flex items-center gap-4 text-xs font-mono">
            <Link href="/" className="hover:text-cyan-400 transition-colors">Documentation</Link>
            <a href="https://github.com/shahmdmahi15/omnidrop" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">GitHub</a>
            <a href="https://crates.io/crates/omnidrop" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">Crates.io</a>
            <a href="https://pypi.org/project/omnidrop/" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">PyPI</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
