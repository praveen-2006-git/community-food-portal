import React, { useState } from 'react';
import { 
  ArrowDown, 
  Mail, 
  Phone, 
  MapPin, 
  Copy, 
  Check, 
  ArrowRight, 
  Shield, 
  Database, 
  Server, 
  Layers, 
  FileText,
  Terminal
} from 'lucide-react';
import { resumeData } from '../data/resumeData';

export default function Hero({ onOpenResume }) {
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const engineeringPillars = [
    {
      index: "01",
      domain: "SERVER ARCHITECTURE",
      title: "Node.js & Express REST APIs",
      detail: "Clean layered route controllers, custom middleware pipelines, and robust session validation.",
      icon: Server,
      tag: "V8 Runtime",
      accent: "text-ochre-400",
      borderHover: "hover:border-ochre-400/50",
    },
    {
      index: "02",
      domain: "DATA INTEGRITY",
      title: "MongoDB & ACID Transactions",
      detail: "Multi-document 2-phase commits with rollback safety, preventing inventory race conditions.",
      icon: Database,
      tag: "ACID Isolation",
      accent: "text-mint-400",
      borderHover: "hover:border-mint-400/50",
    },
    {
      index: "03",
      domain: "CRYPTOGRAPHY",
      title: "HMAC-SHA256 Handover Protocol",
      detail: "Constant-time token verification (crypto.timingSafeEqual) with 3-attempt lockout defense.",
      icon: Shield,
      tag: "Timing-Safe",
      accent: "text-ochre-300",
      borderHover: "hover:border-ochre-300/50",
    },
    {
      index: "04",
      domain: "INTERFACE ENGINEERING",
      title: "React 18 & Reactive UI",
      detail: "Accessible component architecture, Tailwind styling, and smooth tactile micro-interactions.",
      icon: Layers,
      tag: "Client State",
      accent: "text-slate-200",
      borderHover: "hover:border-slate-400/50",
    },
  ];

  return (
    <section id="overview" className="relative pt-24 pb-20 md:pt-32 md:pb-28 border-b border-border bg-canvas overflow-hidden">
      
      {/* Background Blueprint Grid Texture */}
      <div className="absolute inset-0 bg-blueprint-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-canvas/60 to-canvas pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Studio Dossier Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-border text-xs font-mono text-text-muted">
          <div className="flex items-center gap-2">
            <span className="text-text-primary font-bold">[ PRAVEEN M // ENGINEERING LEDGER ]</span>
            <span>&bull;</span>
            <span className="text-ochre-400">FULL-STACK SYSTEMS ENGINEER (MERN)</span>
          </div>
          <div className="flex items-center gap-3">
            <span>BIT CSE 2023&ndash;2027</span>
            <span>&bull;</span>
            <span className="text-text-primary font-bold">{resumeData.education[0].score}</span>
          </div>
        </div>

        {/* Main Headline & Narrative Layout */}
        <div className="py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          
          {/* Left Column: Expressive Headline (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-text-primary tracking-tightest leading-[1.08]">
              Engineering <span className="font-serif italic font-normal text-ochre-300">resilient full-stack systems</span> with atomic data integrity & modern web interfaces.
            </h1>

            <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-2xl text-balance font-sans">
              I am a Computer Science undergraduate at <strong className="text-text-primary font-semibold">Bannari Amman Institute of Technology</strong> specializing in the MERN stack. I build fault-tolerant backend architectures, transaction-safe APIs, and intuitive user experiences for real-world platforms.
            </p>

            {/* Direct Contact Bar */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs font-mono">
              <button
                onClick={() => copyToClipboard(resumeData.email, 'hero-email')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-surface hover:bg-surface-elevated border border-border hover:border-ochre-400/50 text-text-primary transition focus-ring"
                title="Click to copy email address"
              >
                <Mail className="w-3.5 h-3.5 text-ochre-400" />
                <span>{resumeData.email}</span>
                {copiedField === 'hero-email' ? (
                  <span className="text-mint-400 font-bold text-[10px]">COPIED!</span>
                ) : (
                  <Copy className="w-3 h-3 text-text-muted" />
                )}
              </button>

              <button
                onClick={() => copyToClipboard(resumeData.phone, 'hero-phone')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-surface hover:bg-surface-elevated border border-border hover:border-mint-400/50 text-text-primary transition focus-ring"
                title="Click to copy phone number"
              >
                <Phone className="w-3.5 h-3.5 text-mint-400" />
                <span>{resumeData.phone}</span>
                {copiedField === 'hero-phone' ? (
                  <span className="text-mint-400 font-bold text-[10px]">COPIED!</span>
                ) : (
                  <Copy className="w-3 h-3 text-text-muted" />
                )}
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface border border-border text-text-secondary">
                <MapPin className="w-3.5 h-3.5 text-text-muted" />
                <span>{resumeData.location}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-4">
              <a
                href="#flagship"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-text-primary hover:bg-white text-canvas font-mono font-bold text-xs tracking-tight transition active:scale-95 focus-ring"
              >
                <span>Explore Flagship Case Study</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </a>

              <a
                href="#works"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-surface hover:bg-surface-elevated border border-border hover:border-border-hover text-text-primary font-mono text-xs font-semibold transition active:scale-95 focus-ring"
              >
                <span>Selected Works</span>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
              </a>

              <button
                onClick={onOpenResume}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-surface hover:bg-surface-elevated border border-border hover:border-ochre-400/50 text-text-secondary hover:text-text-primary font-mono text-xs font-medium transition focus-ring"
              >
                <FileText className="w-3.5 h-3.5 text-ochre-400" />
                <span>View Resume</span>
              </button>
            </div>
          </div>

          {/* Right Column: Quick Status & Candidate Highlights (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 rounded-lg bg-surface border border-border space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="micro-label text-text-muted uppercase">Candidate Status</span>
                <span className="text-mint-400 flex items-center gap-1.5 font-bold text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-mint-400 animate-pulse" />
                  AVAILABLE
                </span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <div className="text-[10px] text-text-muted uppercase">Target Engineering Roles</div>
                  <div className="font-semibold text-text-primary mt-0.5 font-sans">Full-Stack Engineer / Backend Developer</div>
                </div>

                <div>
                  <div className="text-[10px] text-text-muted uppercase">Core Focus</div>
                  <div className="font-semibold text-text-primary mt-0.5 font-sans">MERN Architecture &amp; Database Consistency</div>
                </div>

                <div>
                  <div className="text-[10px] text-text-muted uppercase">Academic Degree</div>
                  <div className="font-semibold text-text-primary mt-0.5 font-sans">B.E. Computer Science (2027) &bull; {resumeData.education[0].score}</div>
                </div>

                <div>
                  <div className="text-[10px] text-text-muted uppercase">Industry Certifications</div>
                  <div className="font-semibold text-ochre-300 mt-0.5 font-sans">Cisco Modern AI &bull; Cisco Python Essentials</div>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
                <span>3 Production Platforms</span>
                <a href="#flagship" className="text-ochre-400 hover:text-ochre-300 font-bold transition flex items-center gap-1">
                  Read Case Studies &darr;
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom 4-Pillar Engineering DNA Matrix */}
        <div className="pt-10 border-t border-border">
          <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-6 flex items-center justify-between">
            <span>// 04 ARCHITECTURAL PILLARS</span>
            <span>SYSTEM FOUNDATIONS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {engineeringPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.index}
                  className={`p-5 rounded-lg bg-surface border border-border ${pillar.borderHover} transition duration-200 space-y-3`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-text-muted">{pillar.index}</span>
                    <span className={`px-2 py-0.5 rounded bg-canvas border border-border text-[10px] ${pillar.accent} font-semibold`}>
                      {pillar.tag}
                    </span>
                  </div>

                  <div>
                    <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider">{pillar.domain}</div>
                    <h3 className="text-sm font-bold text-text-primary mt-1 font-sans">{pillar.title}</h3>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed font-sans">
                    {pillar.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
