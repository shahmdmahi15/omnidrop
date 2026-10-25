"use client";

import React from "react";
import { Mail, Phone, Globe, MessageSquare, Send, ShieldCheck, Award } from "lucide-react";

function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export default function AuthorSection() {
  const socialLinks = [
    {
      name: "Personal Website",
      url: "https://shahmdmahi.dpdns.org",
      label: "shahmdmahi.dpdns.org",
      icon: <Globe className="w-4 h-4 text-cyan-400" />,
    },
    {
      name: "GitHub",
      url: "https://github.com/shahmdmahi15",
      label: "@shahmdmahi15",
      icon: <GithubIcon className="w-4 h-4 text-slate-200" />,
    },
    {
      name: "LinkedIn",
      url: "https://linkedin.com/in/shahmdmahi27",
      label: "shahmdmahi27",
      icon: <LinkedinIcon className="w-4 h-4 text-blue-400" />,
    },
    {
      name: "Telegram",
      url: "https://t.me/shahmdmahi",
      label: "@shahmdmahi",
      icon: <Send className="w-4 h-4 text-sky-400" />,
    },
    {
      name: "WhatsApp",
      url: "https://wa.me/8801757290258",
      label: "+8801757290258",
      icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
    },
    {
      name: "Email",
      url: "mailto:shahmdmahi15@gmail.com",
      label: "shahmdmahi15@gmail.com",
      icon: <Mail className="w-4 h-4 text-rose-400" />,
    },
    {
      name: "Discord",
      url: "https://discord.com",
      label: "shahmdmahi27",
      icon: <Award className="w-4 h-4 text-indigo-400" />,
    },
    {
      name: "Phone",
      url: "tel:+8801757290258",
      label: "+8801757290258",
      icon: <Phone className="w-4 h-4 text-teal-400" />,
    },
  ];

  return (
    <section id="author" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-[#090F1E] to-[#04070F] border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row items-center gap-10">
            {/* Author Avatar & Status */}
            <div className="flex flex-col items-center text-center shrink-0">
              <div className="relative w-36 h-36 rounded-full overflow-hidden border-2 border-cyan-500/40 p-1 bg-gradient-to-tr from-cyan-500/20 to-sky-500/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <img
                  src="https://github.com/shahmdmahi15.png"
                  alt="Shah Md. Mahi"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <div className="mt-4">
                <h3 className="text-xl font-bold text-white flex items-center justify-center space-x-1.5">
                  <span>Shah Md. Mahi</span>
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                </h3>
                <p className="text-xs font-mono text-cyan-400 mt-0.5">Architect &amp; Lead Systems Engineer</p>
                <div className="mt-2 inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>Available for Engineering Collaboration</span>
                </div>
              </div>
            </div>

            {/* Author Bio & Social Matrix */}
            <div className="flex-1">
              <div className="border-b border-slate-800/80 pb-6 mb-6">
                <h4 className="text-lg font-bold text-white tracking-tight">
                  About the Creator
                </h4>
                <p className="mt-2 text-slate-300 text-sm leading-relaxed">
                  Shah Md. Mahi is a full-spectrum systems and distributed networking engineer specializing in multi-path link aggregation, content-defined deduplication algorithms (FastCDC), Noise Protocol zero-trust cryptography, and zero-allocation high-speed data fabrics. He created OmniDrop to deliver cloud-independent, multi-gigabit file sovereignty across all operating systems.
                </p>
              </div>

              {/* Social Link Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 transition-all text-xs group shadow-sm"
                  >
                    <div className="p-1 rounded-lg bg-slate-800 border border-slate-700/60 group-hover:scale-110 transition-transform">
                      {link.icon}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-[10px] text-slate-400">{link.name}</span>
                      <span className="font-semibold text-white group-hover:text-cyan-400 truncate">
                        {link.label}
                      </span>
                    </div>
                  </a>
                ))}
              </div>

              {/* Ecosystem Cross-Navigation */}
              <div className="mt-6 pt-6 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
                <span className="text-xs font-mono text-slate-400">Engineering Portfolio:</span>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <a href="https://rt-mpbc.shahmdmahi.dpdns.org" target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:border-cyan-500/40 hover:text-white transition-colors">RT-MPBC (Multi-Physics)</a>
                  <a href="https://omnidrop.shahmdmahi.dpdns.org" className="px-2.5 py-1 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-800 font-semibold">OmniDrop (P2P Mesh)</a>
                  <a href="https://silentmic-rt.shahmdmahi.dpdns.org" target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:border-emerald-500/40 hover:text-white transition-colors">SilentMic-RT (Neural Audio)</a>
                  <a href="https://omnibrain.shahmdmahi.dpdns.org" target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:border-purple-500/40 hover:text-white transition-colors">OmniBrain (Web Memory)</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
