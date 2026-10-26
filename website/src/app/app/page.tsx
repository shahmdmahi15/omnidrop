import React, { Suspense } from "react";
import RealWebDrop from "@/components/RealWebDrop";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "OmniDrop Web App — Real In-Browser P2P File Transfer (Phone to PC)",
  description:
    "Direct in-browser Peer-to-Peer file drop between iPhone, Android, Windows, Mac, and Linux without installing software. Powered by WebRTC DataChannels.",
  keywords: [
    "P2P file transfer",
    "AirDrop alternative",
    "WebRTC drop",
    "send files to phone",
    "browser file sharing",
    "OmniDrop",
    "Shah Md. Mahi",
  ],
};

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center text-slate-400 gap-4">
          <div className="w-12 h-12 rounded-2xl border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-sm font-mono text-cyan-300">Initializing OmniDrop WebRTC Engine...</span>
        </div>
      }
    >
      <RealWebDrop />
    </Suspense>
  );
}
