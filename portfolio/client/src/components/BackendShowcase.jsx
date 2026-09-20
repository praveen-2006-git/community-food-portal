import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Terminal, 
  RefreshCw, 
  Lock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  Database, 
  Code2,
  Check,
  Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApi } from '../hooks/useApi';
import SpotlightCard from './ui/SpotlightCard';

export default function BackendShowcase() {
  const [activeTab, setActiveTab] = useState('hmac');
  const { request, loading } = useApi();

  // HMAC Sandbox State
  const [tokenInput, setTokenInput] = useState('food-claim-12345');
  const [signatureInput, setSignatureInput] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [hmacResult, setHmacResult] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  // Transaction Visualizer State
  const [txSteps, setTxSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isTxRunning, setIsTxRunning] = useState(false);
  const [txFinished, setTxFinished] = useState(false);

  useEffect(() => {
    fetchSampleSignature();
  }, []);

  const fetchSampleSignature = async () => {
    try {
      const data = await request(`/api/demo/generate-hmac?token=${encodeURIComponent(tokenInput)}`);
      if (data.signature) {
        setSignatureInput(data.signature);
      }
    } catch {
      setSignatureInput('e7b4f2c98d61350a41785e2b69c4f0391d8a7c2b5e6f8a9d0c1b2e3f4a5b6c7d');
    }
  };

  const generateRandomHex = () => {
    const chars = '0123456789abcdef';
    let hex = '';
    for (let i = 0; i < 64; i++) {
      hex += chars[Math.floor(Math.random() * chars.length)];
    }
    setSignatureInput(hex);
    setHmacResult(null);
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
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#10b981', '#3b82f6', '#ffffff'],
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

  const handleRunTransaction = async () => {
    setIsTxRunning(true);
    setTxFinished(false);
    setCurrentStepIndex(-1);

    try {
      const data = await request('/api/demo/transaction-demo');
      const steps = data.steps || [];
      setTxSteps(steps);

      for (let i = 0; i < steps.length; i++) {
        setCurrentStepIndex(i);
        await new Promise((r) => setTimeout(r, 450));
      }

      setTxFinished(true);
      setIsTxRunning(false);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6'],
        });
      } catch {}
    } catch {
      setIsTxRunning(false);
    }
  };

  return (
    <section id="sandbox" className="py-24 bg-canvas border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <span className="text-xs font-semibold text-accent-400 uppercase tracking-wider block mb-2">
              Interactive Tech Demo
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
              Backend Architecture Sandbox
            </h2>
            <p className="text-sm text-text-secondary mt-2 max-w-xl">
              Live demonstrations of cryptographic handover tokens and multi-document ACID transaction safety.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-surface border border-border rounded-lg self-start md:self-auto">
            <button
              onClick={() => setActiveTab('hmac')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition focus-ring ${
                activeTab === 'hmac'
                  ? 'bg-surface-elevated text-text-primary shadow-sm border border-border'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-accent-400" />
                HMAC Verification
              </span>
            </button>

            <button
              onClick={() => setActiveTab('transaction')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition focus-ring ${
                activeTab === 'transaction'
                  ? 'bg-surface-elevated text-text-primary shadow-sm border border-border'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-mint-400" />
                Atomic Transactions
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: HMAC VERIFIER */}
        {activeTab === 'hmac' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Control Panel (7 cols) */}
            <SpotlightCard className="lg:col-span-7 p-6 sm:p-7 space-y-5 bg-surface border-border">
              <div className="flex items-center justify-between pb-3 border-b border-border text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-400"></span>
                  <span className="text-text-primary font-mono font-medium">POST /api/demo/verify-hmac</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={fetchSampleSignature}
                    className="text-text-secondary hover:text-accent-400 transition"
                  >
                    Load Valid Signature
                  </button>
                  <span className="text-border">&bull;</span>
                  <button
                    onClick={generateRandomHex}
                    className="text-text-secondary hover:text-signal-400 transition"
                  >
                    Simulate Tampered
                  </button>
                </div>
              </div>

              <form onSubmit={handleVerifyHmac} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Token Payload:
                  </label>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-border focus:border-accent text-xs font-mono text-text-primary focus-ring"
                    placeholder="food-claim-12345"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-text-secondary">
                      HMAC-SHA256 Signature (64 Hex Characters):
                    </label>
                    <span className="text-[11px] text-text-metadata font-mono">{signatureInput.length} / 64</span>
                  </div>
                  <input
                    type="text"
                    value={signatureInput}
                    onChange={(e) => setSignatureInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-border focus:border-accent text-xs font-mono text-accent-300 focus-ring"
                    placeholder="64-char hex signature"
                  />
                </div>

                {/* Result Alert */}
                {hmacResult && (
                  <div
                    className={`p-4 rounded-lg border text-xs flex items-start gap-3 ${
                      hmacResult.success
                        ? 'bg-mint-950/30 border-mint-500/40 text-mint-300'
                        : 'bg-red-950/30 border-red-500/40 text-red-300'
                    }`}
                  >
                    {hmacResult.success ? (
                      <CheckCircle className="w-4 h-4 text-mint-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="font-semibold">
                        {hmacResult.success ? 'Signature Verified (200 OK)' : 'Verification Failed'}
                      </div>
                      <div className="text-[11px] text-text-secondary">{hmacResult.message}</div>
                      {hmacResult.locked && (
                        <div className="text-[11px] text-red-400 font-semibold pt-1">
                          Lockout Triggered: 3 consecutive failed attempts reached.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={loading || isLocked}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-600 text-white font-medium text-xs tracking-tight shadow transition active:scale-95 disabled:opacity-50 focus-ring"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{loading ? 'Verifying...' : 'Verify Signature'}</span>
                  </button>

                  <span className="text-xs text-text-metadata font-mono">
                    Attempt count: <strong className="text-text-primary">{attemptCount} / 3</strong>
                  </span>
                </div>
              </form>
            </SpotlightCard>

            {/* Technical Context Panel (5 cols) */}
            <SpotlightCard className="lg:col-span-5 p-6 space-y-4 bg-surface border-border">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent-400" />
                How the Protocol Works
              </h3>

              <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
                <div className="p-3 rounded-lg bg-surface-subtle border border-border/80 space-y-1">
                  <div className="font-semibold text-text-primary">1. Secret Salt Ingestion</div>
                  <p className="text-[11px]">The server securely loads the secret key from environment variables without exposing it to the client.</p>
                </div>

                <div className="p-3 rounded-lg bg-surface-subtle border border-border/80 space-y-1">
                  <div className="font-semibold text-text-primary">2. Timing-Safe Comparison</div>
                  <p className="text-[11px]">Uses <code className="text-accent-400 font-mono text-[11px]">crypto.timingSafeEqual()</code> to prevent side-channel timing attacks when checking tokens.</p>
                </div>

                <div className="p-3 rounded-lg bg-surface-subtle border border-border/80 space-y-1">
                  <div className="font-semibold text-text-primary">3. 3-Attempt Lockout Defense</div>
                  <p className="text-[11px]">Automatically locks token verification after 3 consecutive invalid attempts to stop brute-force attacks.</p>
                </div>
              </div>
            </SpotlightCard>

          </div>
        )}

        {/* TAB 2: MONGOOSE TRANSACTION */}
        {activeTab === 'transaction' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Visualizer Flow (7 cols) */}
            <SpotlightCard className="lg:col-span-7 p-6 sm:p-7 space-y-5 bg-surface border-border">
              <div className="flex items-center justify-between pb-3 border-b border-border text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-mint-400"></span>
                  <span className="text-text-primary font-mono font-medium">GET /api/demo/transaction-demo</span>
                </div>
                <span className="text-text-metadata text-[11px]">MongoDB 2-Phase Commit</span>
              </div>

              {/* Sequential Steps List */}
              <div className="space-y-2.5">
                {[
                  { step: 1, action: 'Start Mongoose Session', desc: 'session = await mongoose.startSession(); session.startTransaction();' },
                  { step: 2, action: 'Query Listing with Read Lock', desc: 'FoodListing.findOne({ _id: batchId }).session(session)' },
                  { step: 3, action: 'Validate Stock Quantity', desc: 'Ensure requested portion count is available in real-time' },
                  { step: 4, action: 'Atomic Stock Decrement', desc: 'listing.availableQuantity -= requestedQty; await listing.save({ session })' },
                  { step: 5, action: 'Create Claim Record', desc: 'Claim.create([{ listingId, status: "RESERVED" }], { session })' },
                  { step: 6, action: 'Commit Transaction & End Session', desc: 'await session.commitTransaction(); session.endSession();' },
                ].map((item, idx) => {
                  const isPassed = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;

                  return (
                    <div
                      key={item.step}
                      className={`p-3 rounded-lg border text-xs transition-all ${
                        isCurrent
                          ? 'bg-mint-500/10 border-mint-500 text-text-primary shadow-sm'
                          : isPassed
                          ? 'bg-surface-subtle border-mint-500/40 text-text-primary'
                          : 'bg-surface-subtle border-border/80 text-text-metadata'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Step {item.step}: {item.action}</span>
                        {isPassed && <Check className="w-3.5 h-3.5 text-mint-400" />}
                      </div>
                      <div className="text-[11px] font-mono text-text-secondary mt-1">{item.desc}</div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={handleRunTransaction}
                  disabled={isTxRunning}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-mint-500 hover:bg-mint-600 text-canvas font-medium text-xs tracking-tight shadow transition active:scale-95 disabled:opacity-50 focus-ring"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isTxRunning ? 'Processing Commit...' : 'Simulate Claim Transaction'}</span>
                </button>

                {txFinished && (
                  <span className="text-xs text-mint-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Transaction Completed (200 OK)
                  </span>
                )}
              </div>
            </SpotlightCard>

            {/* Explanatory Code Panel (5 cols) */}
            <SpotlightCard className="lg:col-span-5 p-6 space-y-4 bg-surface border-border">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-mint-400" />
                ACID Rollback Safety
              </h3>

              <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
                <p>
                  In high-demand scenarios, multiple kitchens might simultaneously attempt to claim the last batch of meals. Without transactions, this causes negative inventory race conditions.
                </p>
                <p>
                  Mongoose transactions ensure that both the inventory decrement and the claim record creation succeed together, or the entire operation is rolled back with zero orphaned data.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-subtle border border-border font-mono text-[11px] text-text-secondary space-y-1">
                <div className="text-text-metadata">// Atomic Rollback Pattern</div>
                <div>try &#123;</div>
                <div className="pl-3 text-mint-400">await session.commitTransaction();</div>
                <div>&#125; catch (error) &#123;</div>
                <div className="pl-3 text-red-400">await session.abortTransaction();</div>
                <div className="pl-3 text-text-secondary">throw error;</div>
                <div>&#125;</div>
              </div>
            </SpotlightCard>

          </div>
        )}

      </div>
    </section>
  );
}
