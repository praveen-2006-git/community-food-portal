import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Lock, 
  Clock, 
  Layers, 
  GitBranch, 
  CheckCircle, 
  XCircle, 
  Play, 
  RotateCcw,
  StepForward,
  Check, 
  Github, 
  ExternalLink,
  Cpu,
  ArrowRight,
  Terminal,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { projectsData } from '../data/projectsData';
import { useApi } from '../hooks/useApi';

export default function FlagshipCaseStudy({ onOpenProjectModal }) {
  const flagship = projectsData[0]; // Community Surplus Food Routing Portal
  const { request, loading } = useApi();

  // Active Interactive Demo Tab: 'hmac' | 'acid'
  const [activeSandboxTab, setActiveSandboxTab] = useState('hmac');

  // HMAC Sandbox State
  const [tokenInput, setTokenInput] = useState('food-claim-12345');
  const [signatureInput, setSignatureInput] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [hmacResult, setHmacResult] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [validSampleSignature, setValidSampleSignature] = useState('');

  // ACID Transaction Visualizer State
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isTxRunning, setIsTxRunning] = useState(false);
  const [txFinished, setTxFinished] = useState(false);
  const [simulatedStock, setSimulatedStock] = useState(50);
  const [claimStatus, setClaimStatus] = useState('UNCLAIMED');

  const txSteps = [
    { 
      step: 1, 
      action: 'Start Mongoose Session', 
      desc: 'const session = await mongoose.startSession(); session.startTransaction();',
      stateNote: 'Session Isolation Active (Read Committed)'
    },
    { 
      step: 2, 
      action: 'Query Listing with Read Lock', 
      desc: 'const listing = await FoodListing.findOne({ _id: batchId, status: "AVAILABLE" }).session(session);',
      stateNote: 'Lock acquired on document batchId'
    },
    { 
      step: 3, 
      action: 'Validate Stock Quantity', 
      desc: 'if (!listing || listing.availableQuantity < 15) throw new Error("Stock exhausted");',
      stateNote: 'Verified: 50 portions available >= 15 portions requested'
    },
    { 
      step: 4, 
      action: 'Atomic Stock Decrement', 
      desc: 'listing.availableQuantity -= 15; if (listing.availableQuantity === 0) listing.status = "CLAIMED";',
      stateNote: 'Stock decremented: 50 -> 35 portions'
    },
    { 
      step: 5, 
      action: 'Create Claim Record', 
      desc: 'await Claim.create([{ listingId, kitchenId, quantity: 15, status: "RESERVED" }], { session });',
      stateNote: 'Claim #CLM-894 created with status RESERVED'
    },
    { 
      step: 6, 
      action: 'Commit Transaction & End Session', 
      desc: 'await session.commitTransaction(); session.endSession();',
      stateNote: 'Multi-document write committed to replica set with zero race conditions'
    },
  ];

  useEffect(() => {
    fetchSampleSignature();
  }, []);

  const fetchSampleSignature = async () => {
    try {
      const data = await request(`/api/demo/generate-hmac?token=${encodeURIComponent(tokenInput)}`);
      if (data.signature) {
        setSignatureInput(data.signature);
        setValidSampleSignature(data.signature);
      }
    } catch {
      const fallback = 'e7b4f2c98d61350a41785e2b69c4f0391d8a7c2b5e6f8a9d0c1b2e3f4a5b6c7d';
      setSignatureInput(fallback);
      setValidSampleSignature(fallback);
    }
  };

  const setPreset = (type) => {
    if (type === 'valid') {
      fetchSampleSignature();
      setHmacResult(null);
    } else if (type === 'tampered') {
      const chars = '0123456789abcdef';
      let hex = '';
      for (let i = 0; i < 64; i++) {
        hex += chars[Math.floor(Math.random() * chars.length)];
      }
      setSignatureInput(hex);
      setHmacResult(null);
    } else if (type === 'malformed') {
      setSignatureInput('invalid_hex_length_token');
      setHmacResult(null);
    }
  };

  const handleVerifyHmac = async (e) => {
    if (e) e.preventDefault();
    if (!tokenInput || !signatureInput) return;

    try {
      const res = await request('/api/demo/verify-hmac', {
        method: 'POST',
        body: JSON.stringify({
          token: tokenInput,
          signature: signatureInput,
          attempt: attemptCount + 1,
        }),
      });

      setHmacResult(res);
      setAttemptCount(res.attempt || attemptCount + 1);
      setIsLocked(res.locked || false);

      if (res.success) {
        try {
          confetti({
            particleCount: 45,
            spread: 55,
            origin: { y: 0.65 },
            colors: ['#30c283', '#d9943b', '#eaeef4'],
          });
        } catch {}
      }
    } catch (err) {
      setAttemptCount((prev) => prev + 1);
      const locked = attemptCount + 1 >= 3;
      setIsLocked(locked);
      setHmacResult({
        success: false,
        message: err.message || 'Signature verification failed (401 Unauthorized)',
        locked,
      });
    }
  };

  const handleResetLockout = () => {
    setAttemptCount(0);
    setIsLocked(false);
    setHmacResult(null);
    fetchSampleSignature();
  };

  const handleStepNextTx = () => {
    if (currentStepIndex < txSteps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      if (nextIdx >= 3) setSimulatedStock(35);
      if (nextIdx >= 4) setClaimStatus('RESERVED');
      if (nextIdx === txSteps.length - 1) {
        setTxFinished(true);
        try {
          confetti({
            particleCount: 40,
            spread: 50,
            origin: { y: 0.65 },
            colors: ['#30c283', '#d9943b'],
          });
        } catch {}
      }
    }
  };

  const handleResetTx = () => {
    setCurrentStepIndex(-1);
    setIsTxRunning(false);
    setTxFinished(false);
    setSimulatedStock(50);
    setClaimStatus('UNCLAIMED');
  };

  const handleRunTransaction = async () => {
    handleResetTx();
    setIsTxRunning(true);

    try {
      await request('/api/demo/transaction-demo');
      for (let i = 0; i < txSteps.length; i++) {
        setCurrentStepIndex(i);
        if (i >= 3) setSimulatedStock(35);
        if (i >= 4) setClaimStatus('RESERVED');
        await new Promise((r) => setTimeout(r, 480));
      }

      setTxFinished(true);
      setIsTxRunning(false);

      try {
        confetti({
          particleCount: 45,
          spread: 55,
          origin: { y: 0.65 },
          colors: ['#30c283', '#d9943b'],
        });
      } catch {}
    } catch {
      setIsTxRunning(false);
    }
  };

  return (
    <section id="flagship" className="py-24 bg-canvas border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 pb-6 border-b border-border gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="micro-label text-ochre-400">01 / Flagship Architecture</span>
              <span className="text-border">&bull;</span>
              <span className="micro-label text-text-muted">Distributed Logistics & Security</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary tracking-tight font-sans">
              Surplus Ingredient <span className="font-serif italic font-normal text-ochre-300">Routing Platform</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={flagship.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-surface hover:bg-surface-elevated border border-border hover:border-ochre-400/50 text-xs font-mono text-text-primary transition"
            >
              <Github className="w-4 h-4 text-text-muted" />
              <span>Source Repository</span>
              <ExternalLink className="w-3 h-3 text-text-muted" />
            </a>
          </div>
        </div>

        {/* 2-Column Editorial Magazine Spread */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Deep Architectural Dossier (7 Cols) */}
          <div className="lg:col-span-7 space-y-10">
            
            {/* Lead Narrative & Problem Statement */}
            <div className="space-y-4">
              <p className="text-base sm:text-lg text-text-primary font-serif italic leading-relaxed text-slate-200">
                "Connecting commercial hotel kitchens with local soup kitchens to route edible surplus before spoilage, backed by multi-document atomic guarantees and cryptographic verification."
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {flagship.metrics.map((m, idx) => (
                  <div key={idx} className="p-3.5 rounded bg-surface border border-border hover:border-border-hover transition">
                    <span className="micro-label text-text-muted block">{m.label}</span>
                    <span className="text-xs font-mono font-bold text-ochre-300 mt-1 block">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Problem & Solution Contrast */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              <div className="p-4 rounded bg-surface border-l-2 border-l-signal-400 border border-border space-y-2">
                <span className="micro-label text-signal-400 font-bold block">The Bottleneck</span>
                <p className="text-text-secondary leading-relaxed font-sans">
                  {flagship.problem}
                </p>
              </div>

              <div className="p-4 rounded bg-surface border-l-2 border-l-mint-400 border border-border space-y-2">
                <span className="micro-label text-mint-400 font-bold block">The Solution</span>
                <p className="text-text-secondary leading-relaxed font-sans">
                  {flagship.solution}
                </p>
              </div>
            </div>

            {/* Hyper-Local Routing Architecture Diagram */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="micro-label text-text-muted flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-ochre-400" /> System Routing Flow & Verification Pipe
                </span>
                <span className="text-[10px] font-mono text-text-muted">OSRM Turn-by-Turn + FEFO Queue</span>
              </div>

              <div className="p-4 rounded bg-surface border border-border overflow-x-auto">
                <pre className="font-mono text-xs text-text-secondary leading-relaxed whitespace-pre">
                  <code>{flagship.architecture.diagram}</code>
                </pre>
              </div>
            </div>

            {/* Key Engineering Decisions & Trade-Offs */}
            <div className="space-y-3">
              <span className="micro-label text-text-muted flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-ochre-400" /> Architectural Decisions & Trade-Offs
              </span>

              <div className="space-y-2.5">
                {flagship.architecture.keyDecisions.map((item, idx) => (
                  <div key={idx} className="p-4 rounded bg-surface border border-border text-xs space-y-1.5">
                    <div className="font-bold text-text-primary font-mono">{item.decision}</div>
                    <div className="text-text-secondary font-sans">
                      <strong className="text-mint-400 font-mono">Rationale:</strong> {item.rationale}
                    </div>
                    <div className="text-text-muted text-[11px] font-sans">
                      <strong className="text-ochre-400 font-mono">Trade-Off:</strong> {item.tradeoff}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Production Tech Stack Chips */}
            <div className="space-y-2 pt-2">
              <span className="micro-label text-text-muted">Production Technology Stack</span>
              <div className="flex flex-wrap gap-2">
                {flagship.stack.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 rounded bg-surface border border-border text-xs font-mono text-text-primary hover:border-ochre-400/40 transition"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Live Proof & Interactive Sandbox (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="p-6 rounded-lg bg-surface border border-border space-y-6">
              
              {/* Sandbox Tab Switcher */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-mint-400 animate-pulse"></span>
                  <span className="micro-label text-text-primary">Live Backend Sandbox</span>
                </div>

                <div className="flex items-center gap-1 p-0.5 bg-canvas border border-border rounded">
                  <button
                    onClick={() => setActiveSandboxTab('hmac')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                      activeSandboxTab === 'hmac'
                        ? 'bg-surface text-text-primary font-bold border border-border'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    HMAC-SHA256
                  </button>
                  <button
                    onClick={() => setActiveSandboxTab('acid')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                      activeSandboxTab === 'acid'
                        ? 'bg-surface text-text-primary font-bold border border-border'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    ACID 2PC
                  </button>
                </div>
              </div>

              {/* TAB 1: HMAC VERIFIER */}
              {activeSandboxTab === 'hmac' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-ochre-400 font-semibold">POST /api/demo/verify-hmac</span>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <button
                        onClick={() => setPreset('valid')}
                        className="px-2 py-0.5 rounded bg-canvas border border-border text-text-muted hover:text-mint-400 hover:border-mint-400/50 transition"
                      >
                        Valid
                      </button>
                      <button
                        onClick={() => setPreset('tampered')}
                        className="px-2 py-0.5 rounded bg-canvas border border-border text-text-muted hover:text-signal-400 hover:border-signal-400/50 transition"
                      >
                        Tampered
                      </button>
                      <button
                        onClick={() => setPreset('malformed')}
                        className="px-2 py-0.5 rounded bg-canvas border border-border text-text-muted hover:text-red-400 hover:border-red-400/50 transition"
                      >
                        Malformed
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleVerifyHmac} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-mono text-text-muted mb-1">
                        Token Payload Identifier
                      </label>
                      <input
                        type="text"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-canvas border border-border focus:border-ochre-400 text-xs font-mono text-text-primary focus-ring"
                        placeholder="food-claim-12345"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-mono text-text-muted">
                          HMAC-SHA256 Signature (64 Hex Characters)
                        </label>
                        <span className="text-[10px] font-mono text-text-muted">{signatureInput.length} / 64</span>
                      </div>
                      <input
                        type="text"
                        value={signatureInput}
                        onChange={(e) => setSignatureInput(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-canvas border border-border focus:border-ochre-400 text-xs font-mono text-ochre-300 focus-ring"
                        placeholder="64-char hex signature"
                      />
                    </div>

                    {/* Result Alert Box */}
                    {hmacResult && (
                      <div
                        className={`p-3.5 rounded border text-xs flex items-start gap-2.5 ${
                          hmacResult.success
                            ? 'bg-mint-950/30 border-mint-500/40 text-mint-300'
                            : 'bg-signal-950/30 border-signal-500/40 text-signal-300'
                        }`}
                      >
                        {hmacResult.success ? (
                          <CheckCircle className="w-4 h-4 text-mint-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-signal-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-0.5 flex-1">
                          <div className="font-bold font-mono text-xs">
                            {hmacResult.success ? '200 OK — Cryptographically Verified' : '401 Unauthorized — Signature Mismatch'}
                          </div>
                          <div className="text-[11px] text-text-secondary">{hmacResult.message}</div>
                          {hmacResult.locked && (
                            <div className="text-[11px] text-signal-400 font-bold font-mono pt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>[SECURITY] 3-Attempt Lockout Activated</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={loading || isLocked}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-text-primary hover:bg-white text-canvas font-mono font-bold text-xs transition active:scale-95 disabled:opacity-40 focus-ring"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{loading ? 'Verifying...' : 'Verify Token'}</span>
                        </button>

                        {isLocked && (
                          <button
                            type="button"
                            onClick={handleResetLockout}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-canvas border border-border text-xs font-mono text-text-muted hover:text-text-primary transition"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Lock</span>
                          </button>
                        )}
                      </div>

                      <span className="text-[11px] font-mono text-text-muted">
                        Failed count: <strong className={attemptCount >= 3 ? 'text-signal-400' : 'text-text-primary'}>{attemptCount} / 3</strong>
                      </span>
                    </div>
                  </form>

                  {/* Security Explanatory Note */}
                  <div className="pt-4 border-t border-border space-y-2 text-[11px] text-text-secondary">
                    <span className="micro-label text-text-muted">Security Architecture Note</span>
                    <ul className="space-y-1.5 list-disc list-inside text-text-muted font-sans">
                      <li>Uses <code className="text-ochre-300 font-mono">crypto.timingSafeEqual()</code> to block side-channel byte leakage.</li>
                      <li>Server secret salted per node deployment environment.</li>
                      <li>Automatic rate-limited lockout defense against brute force.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 2: ACID TRANSACTION VISUALIZER */}
              {activeSandboxTab === 'acid' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-mint-400 font-semibold">GET /api/demo/transaction-demo</span>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-text-muted">Stock: <strong className="text-text-primary">{simulatedStock} portions</strong></span>
                      <span className="text-border">&bull;</span>
                      <span className="text-text-muted">Claim: <strong className={claimStatus === 'RESERVED' ? 'text-mint-400' : 'text-ochre-300'}>{claimStatus}</strong></span>
                    </div>
                  </div>

                  {/* Step List */}
                  <div className="space-y-2">
                    {txSteps.map((item, idx) => {
                      const isPassed = currentStepIndex >= idx;
                      const isCurrent = currentStepIndex === idx;

                      return (
                        <div
                          key={item.step}
                          className={`p-2.5 rounded border text-xs font-mono transition-all duration-200 ${
                            isCurrent
                              ? 'bg-mint-950/30 border-mint-500 text-text-primary shadow-sm'
                              : isPassed
                              ? 'bg-surface border-mint-500/40 text-text-primary'
                              : 'bg-canvas border-border text-text-muted'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold">0{item.step}. {item.action}</span>
                            {isPassed && <Check className="w-3.5 h-3.5 text-mint-400" />}
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5 truncate">{item.desc}</div>
                          {isCurrent && (
                            <div className="text-[10px] text-mint-400 mt-1 font-sans font-semibold">
                              &rarr; {item.stateNote}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Transaction Controls */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRunTransaction}
                        disabled={isTxRunning}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-mint-500 hover:bg-mint-600 text-canvas font-mono font-bold text-xs transition active:scale-95 disabled:opacity-50 focus-ring"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{isTxRunning ? 'Committing...' : 'Auto-Simulate'}</span>
                      </button>

                      <button
                        onClick={handleStepNextTx}
                        disabled={isTxRunning || txFinished}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-surface hover:bg-surface-elevated border border-border text-xs font-mono text-text-primary transition disabled:opacity-40"
                      >
                        <StepForward className="w-3 h-3 text-ochre-400" />
                        <span>Next Step</span>
                      </button>

                      {(currentStepIndex >= 0 || txFinished) && (
                        <button
                          onClick={handleResetTx}
                          className="p-2 rounded bg-canvas border border-border text-text-muted hover:text-text-primary transition"
                          title="Reset Simulation"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {txFinished && (
                      <span className="text-[11px] font-mono text-mint-400 flex items-center gap-1 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        ACID Committed
                      </span>
                    )}
                  </div>

                  {/* Rollback Safety Preview */}
                  <div className="pt-3 border-t border-border font-mono text-[10px] text-text-muted space-y-0.5">
                    <div>try &#123; await session.commitTransaction(); &#125;</div>
                    <div className="text-signal-400">catch (err) &#123; await session.abortTransaction(); &#125;</div>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
