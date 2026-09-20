import React, { useEffect } from 'react';
import { 
  X, 
  Github, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  Code2, 
  GitBranch, 
  ExternalLink 
} from 'lucide-react';

export default function ProjectModal({ project, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  if (!project) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-canvas/90 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-surface border border-border rounded-lg shadow-2xl overflow-y-auto flex flex-col focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Sticky Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-5 bg-surface/98 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3">
            <span className="micro-label text-ochre-400">
              {project.category}
            </span>
            <span className="text-border">&bull;</span>
            <span className="text-xs font-mono text-text-muted">Technical Blueprint</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-elevated transition focus-ring"
            aria-label="Close case study modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Title & Short Description */}
          <div>
            <h2 id="modal-title" className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight font-sans">
              {project.title}
            </h2>
            <p className="text-sm font-serif italic text-text-secondary mt-2 leading-relaxed">
              "{project.shortDescription}"
            </p>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {project.metrics.map((m, idx) => (
              <div key={idx} className="p-3.5 rounded bg-canvas border border-border">
                <span className="micro-label text-text-muted block">{m.label}</span>
                <span className="text-xs font-mono font-bold text-ochre-300 mt-1 block">{m.value}</span>
              </div>
            ))}
          </div>

          {/* Tech Stack List */}
          <div className="flex flex-wrap gap-2">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 rounded bg-canvas border border-border text-xs font-mono text-text-primary"
              >
                {tech}
              </span>
            ))}
          </div>

          {/* Problem vs Solution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded bg-surface-subtle border-l-2 border-l-signal-400 border border-border space-y-2">
              <div className="flex items-center gap-2 micro-label text-signal-400 font-bold">
                <AlertCircle className="w-4 h-4" /> System Bottlenecks
              </div>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                {project.problem}
              </p>
            </div>

            <div className="p-4 rounded bg-surface-subtle border-l-2 border-l-mint-400 border border-border space-y-2">
              <div className="flex items-center gap-2 micro-label text-mint-400 font-bold">
                <CheckCircle2 className="w-4 h-4" /> Architectural Solution
              </div>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                {project.solution}
              </p>
            </div>
          </div>

          {/* Architecture Diagram (ASCII) */}
          {project.architecture?.diagram && (
            <div className="space-y-2">
              <div className="micro-label text-text-muted flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-ochre-400" />
                Data & Security Pipeline
              </div>
              <div className="p-4 rounded bg-canvas border border-border overflow-x-auto">
                <pre className="font-mono text-xs text-text-secondary leading-relaxed whitespace-pre">
                  <code>{project.architecture.diagram}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Key Decisions & Tradeoffs */}
          {project.architecture?.keyDecisions && (
            <div className="space-y-3">
              <div className="micro-label text-text-muted flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-ochre-400" />
                Engineering Trade-Offs
              </div>
              <div className="space-y-2.5">
                {project.architecture.keyDecisions.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded bg-surface-subtle border border-border text-xs space-y-1.5">
                    <div className="font-bold text-text-primary font-mono">{item.decision}</div>
                    <div className="text-text-secondary">
                      <strong className="text-mint-400 font-mono">Rationale:</strong> {item.rationale}
                    </div>
                    <div className="text-text-muted text-[11px]">
                      <strong className="text-ochre-400 font-mono">Trade-Off:</strong> {item.tradeoff}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Highlights */}
          {project.technicalHighlights && (
            <div className="space-y-3">
              <div className="micro-label text-text-muted flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-mint-400" />
                Technical Highlights
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-secondary">
                {project.technicalHighlights.map((hl, idx) => (
                  <li key={idx} className="p-2.5 rounded bg-surface-subtle border border-border flex items-start gap-2">
                    <span className="text-mint-400 font-bold">&bull;</span>
                    <span>{hl}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Verified Backend Code Snippet */}
          {project.codeSnippet && (
            <div className="space-y-2">
              <div className="micro-label text-text-muted flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-ochre-400" />
                Implementation Logic
              </div>
              <div className="p-4 rounded bg-canvas border border-border overflow-x-auto">
                <pre className="font-mono text-xs text-text-primary leading-relaxed">
                  <code>{project.codeSnippet}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Modal Actions Footer */}
          <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded bg-surface-subtle hover:bg-surface-elevated border border-border text-text-primary text-xs font-mono transition focus-ring"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub Repository</span>
                  <ExternalLink className="w-3 h-3 text-text-muted" />
                </a>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-surface-subtle hover:bg-surface-elevated border border-border text-xs font-mono text-text-secondary hover:text-text-primary transition focus-ring"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
