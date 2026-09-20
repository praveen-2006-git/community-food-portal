import React, { useState } from 'react';
import { 
  Server, 
  Database, 
  Layers, 
  Wrench, 
  ShieldCheck,
  Terminal,
  Cpu,
  Check,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import { resumeData } from '../data/resumeData';

export default function Skills() {
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  const capabilityQuadrants = [
    {
      id: "SERVER",
      quadrant: "01",
      title: "Server Architecture & Protocols",
      icon: Server,
      description: "High-reliability backend runtimes, REST APIs, and multi-collection transactional workflows.",
      items: [
        { name: "Node.js (v20+)", note: "Asynchronous event loop, cluster & worker pipelines" },
        { name: "Express.js", note: "Centralized route middleware, error boundaries & sanitizers" },
        { name: "REST API Design", note: "Strict HTTP status conventions, pagination & idempotency" },
        { name: "Session Auth & RBAC", note: "3-tier permission control & secure cookie sessions" },
        { name: "Background Cron Workers", note: "Automated reservation expiry & pre-expiry notification queues" },
        { name: "HMAC-SHA256 Verification", note: "timingSafeEqual constant-time token validation" },
      ],
    },
    {
      id: "DATABASE",
      quadrant: "02",
      title: "Data Storage & ACID Isolation",
      icon: Database,
      description: "Document modeling, transactional consistency, and database aggregation pipelines.",
      items: [
        { name: "MongoDB", note: "Flexible document store & schema indexing strategies" },
        { name: "Mongoose Multi-Doc Transactions", note: "Atomic multi-collection commits with 0 partial writes" },
        { name: "Aggregation Framework", note: "Multi-stage $facet, $match, and $group analytics" },
        { name: "FEFO Inventory Batching", note: "First-Expired, First-Out priority reservation queries" },
        { name: "Indexing & Query Optimization", note: "Compound keys and TTL expiration indexes" },
        { name: "Relational SQL Fundamentals", note: "Relational schema structures, joins, and filtering" },
      ],
    },
    {
      id: "FRONTEND",
      quadrant: "03",
      title: "Frontend Architecture & Systems",
      icon: Layers,
      description: "Fast, accessible user interfaces built with React 18, Tailwind CSS, and Framer Motion.",
      items: [
        { name: "React 18", note: "SPA architectures, state lifecycles, and custom hooks" },
        { name: "Tailwind CSS", note: "Utility-first design token architecture & hairline rules" },
        { name: "Framer Motion", note: "Physics-based springs & state transition choreography" },
        { name: "JavaScript (ES6+)", note: "Modern asynchronous workflows, closures, and modules" },
        { name: "Vite Build Tooling", note: "Fast HMR and tree-shaken production bundles" },
        { name: "Accessible UI/UX", note: "Keyboard navigable, WCAG contrast, and screen-reader labels" },
      ],
    },
    {
      id: "TOOLS",
      quadrant: "04",
      title: "Core Languages & Tooling",
      icon: Wrench,
      description: "Foundational programming languages, API testing environments, and version control.",
      items: [
        { name: "JavaScript (Node & Browser)", note: "Primary language for full-stack systems engineering" },
        { name: "Java", note: "OOP design patterns, algorithms & data structures" },
        { name: "Python", note: "Scripting, Cisco AI fundamentals & automation" },
        { name: "Git & GitHub", note: "Branching strategies, commit hygiene & PR review" },
        { name: "Postman", note: "API contract testing & automated endpoint collections" },
        { name: "Jest & Supertest", note: "Unit testing & integration test suites" },
      ],
    },
  ];

  const filteredQuadrants = selectedFilter === 'ALL'
    ? capabilityQuadrants
    : capabilityQuadrants.filter(q => q.id === selectedFilter);

  return (
    <section id="skills" className="py-24 bg-canvas border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 pb-6 border-b border-border gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="micro-label text-ochre-400">03 / Stack Matrix</span>
              <span className="text-border">&bull;</span>
              <span className="micro-label text-text-muted">Engineering Capabilities</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary tracking-tight font-sans">
              Capabilities & <span className="font-serif italic font-normal text-ochre-300">Technical Depth</span>
            </h2>
          </div>

          {/* Quadrant Quick Filter */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface border border-border rounded">
            {['ALL', 'SERVER', 'DATABASE', 'FRONTEND', 'TOOLS'].map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setSelectedFilter(filterKey)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition focus-ring ${
                  selectedFilter === filterKey
                    ? 'bg-canvas text-ochre-300 font-bold border border-border'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {filterKey}
              </button>
            ))}
          </div>
        </div>

        {/* Split Layout: Philosophy Sidebar + 4-Quadrant Capability Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Sticky Sidebar: Engineering Philosophy (4 Cols) */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            
            <div className="p-6 rounded-lg bg-surface border border-border space-y-4">
              <span className="micro-label text-ochre-400 font-bold block">Engineering Principles</span>
              
              <p className="text-sm font-serif italic text-text-primary leading-relaxed">
                "I focus on deterministic backend reliability, atomic state synchronization, and clean interface boundaries. I avoid unnecessary framework bloat in favor of native primitives, strict contracts, and verified system security."
              </p>

              <div className="pt-4 border-t border-border space-y-3 text-xs font-mono text-text-secondary">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Primary Stack</span>
                  <span className="text-text-primary font-bold">MERN Production</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Data Isolation</span>
                  <span className="text-mint-400 font-bold">ACID Multi-Doc</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Security Layer</span>
                  <span className="text-ochre-300 font-bold">Timing-Safe HMAC</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Build Performance</span>
                  <span className="text-text-primary font-bold">0ms HMR (Vite)</span>
                </div>
              </div>
            </div>

            {/* Core Directives */}
            <div className="p-5 rounded-lg bg-surface border border-border space-y-3 text-xs">
              <span className="micro-label text-text-muted font-bold block">Engineering Guardrails</span>
              <ul className="space-y-2 text-text-muted font-mono text-[11px]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-mint-400"></span>
                  <span>Zero Unhandled Promise Rejections</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ochre-400"></span>
                  <span>Idempotent Worker Queue Execution</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  <span>Sanitized Body & Header Middleware</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Right Column: Capability Quadrants (8 Cols) */}
          <div className="lg:col-span-8 space-y-8">
            {filteredQuadrants.map((quad) => {
              const Icon = quad.icon;

              return (
                <div
                  key={quad.quadrant}
                  className="p-6 sm:p-8 rounded-lg bg-surface border border-border hover:border-border-hover transition duration-200 space-y-6"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-border pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-ochre-400">{quad.quadrant}</span>
                        <span className="text-border">&bull;</span>
                        <h3 className="text-lg font-bold text-text-primary font-sans">{quad.title}</h3>
                      </div>
                      <p className="text-xs text-text-secondary font-sans">{quad.description}</p>
                    </div>

                    <div className="p-2 rounded bg-canvas border border-border text-ochre-400">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Capability Grid with Annotations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {quad.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded bg-canvas border border-border hover:border-ochre-400/40 transition duration-150 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-text-primary">{item.name}</span>
                          <Check className="w-3.5 h-3.5 text-mint-400" />
                        </div>
                        <div className="text-[11px] text-text-muted font-sans leading-tight">{item.note}</div>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
