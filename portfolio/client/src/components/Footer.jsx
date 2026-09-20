import React from 'react';
import { Github, Linkedin, Mail, ArrowUp } from 'lucide-react';
import { resumeData } from '../data/resumeData';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-canvas py-14 text-text-secondary text-xs border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* Identity & Current Studio Status */}
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded bg-surface border border-border flex items-center justify-center font-bold text-xs text-text-primary font-mono">
              P
            </div>
            <div>
              <div className="font-bold text-text-primary text-xs font-mono">{resumeData.name}</div>
              <div className="text-[11px] text-text-muted">
                Full-Stack Systems Engineer &bull; Bannari Amman Institute of Technology
              </div>
            </div>
          </div>

          {/* Socials & Scroll to Top */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
            <a
              href={resumeData.github}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded bg-surface hover:bg-surface-elevated border border-border text-text-muted hover:text-text-primary transition"
              aria-label="GitHub Profile"
            >
              <Github className="w-4 h-4" />
            </a>

            <a
              href={resumeData.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded bg-surface hover:bg-surface-elevated border border-border text-text-muted hover:text-ochre-300 transition"
              aria-label="LinkedIn Profile"
            >
              <Linkedin className="w-4 h-4" />
            </a>

            <a
              href={`mailto:${resumeData.email}`}
              className="p-2 rounded bg-surface hover:bg-surface-elevated border border-border text-text-muted hover:text-mint-400 transition"
              aria-label="Direct Email"
            >
              <Mail className="w-4 h-4" />
            </a>

            <button
              onClick={scrollToTop}
              className="p-2 rounded bg-surface hover:bg-surface-elevated border border-border text-text-muted hover:text-text-primary transition"
              aria-label="Scroll back to top"
              title="Return to top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Bottom Colophon */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] font-mono text-text-muted">
          <div>
            &copy; {new Date().getFullYear()} Praveen M. Engineered with React 18, Node.js, Express & MongoDB.
          </div>
          <div className="flex items-center gap-2">
            <span>Precision Materiality</span>
            <span>&bull;</span>
            <span className="text-mint-400">Zero AI Clichés</span>
            <span>&bull;</span>
            <span>Living Ledger</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
