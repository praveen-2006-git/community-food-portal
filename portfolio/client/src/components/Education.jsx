import React from 'react';
import { GraduationCap, Award, Calendar, ExternalLink, CheckCircle2, ShieldCheck } from 'lucide-react';
import { resumeData } from '../data/resumeData';

export default function Education() {
  const { education, certifications } = resumeData;

  return (
    <section id="chronology" className="py-24 bg-canvas border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 pb-6 border-b border-border gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="micro-label text-ochre-400">04 / Chronology</span>
              <span className="text-border">&bull;</span>
              <span className="micro-label text-text-muted">Education & Credentials</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary tracking-tight font-sans">
              Academic Foundations & <span className="font-serif italic font-normal text-ochre-300">Verified Credentials</span>
            </h2>
          </div>

          <div className="text-xs font-mono text-text-muted">
            [ Bannari Amman Institute of Technology &bull; Cisco Verified ]
          </div>
        </div>

        {/* 2-Column Ledger: Education (Left) & Certifications (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Column 1: Academic Education Timeline (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <GraduationCap className="w-4 h-4 text-ochre-400" />
              <span className="micro-label text-text-primary">Formal Academic Milestones</span>
            </div>

            <div className="relative border-l border-border pl-6 space-y-8 ml-2">
              {education.map((item, idx) => (
                <div
                  key={idx}
                  className="relative group"
                >
                  {/* Timeline Node */}
                  <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-surface border-2 border-ochre-400 group-hover:bg-ochre-400 transition" />

                  <div className="p-6 rounded-lg bg-surface border border-border hover:border-border-hover transition duration-200 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-xs font-mono text-ochre-400 font-bold block">{item.type}</span>
                        <h3 className="text-lg font-bold text-text-primary font-sans">
                          {item.degree}
                        </h3>
                        <div className="text-xs text-text-secondary font-sans">
                          {item.institution}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-2.5 py-1 rounded bg-canvas border border-border font-mono text-xs font-bold text-text-primary">
                          {item.score}
                        </span>
                        <div className="text-[11px] font-mono text-text-muted mt-1 flex items-center gap-1 justify-end">
                          <Calendar className="w-3 h-3" />
                          {item.timeline}
                        </div>
                      </div>
                    </div>

                    {item.highlights && (
                      <ul className="pt-3 border-t border-border space-y-1.5 text-xs text-text-secondary font-sans">
                        {item.highlights.map((h, hIdx) => (
                          <li key={hIdx} className="flex items-start gap-2">
                            <span className="text-ochre-400 font-bold">&bull;</span>
                            <span className="leading-relaxed">{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Industry Certifications (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Award className="w-4 h-4 text-mint-400" />
              <span className="micro-label text-text-primary">Verified Industry Credentials</span>
            </div>

            <div className="space-y-6">
              {certifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-lg bg-surface border border-border hover:border-mint-500/40 transition duration-200 space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded bg-canvas border border-mint-500/30 text-mint-400 text-[10px] font-mono uppercase font-bold">
                        {cert.badge}
                      </span>
                      <h4 className="text-base font-bold text-text-primary font-sans mt-1.5">
                        {cert.title}
                      </h4>
                      <p className="text-xs font-mono text-text-muted mt-0.5">
                        {cert.issuer}
                      </p>
                    </div>

                    <span className="text-xs font-mono text-text-muted shrink-0">
                      {cert.date}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed pt-2 border-t border-border font-sans">
                    {cert.description}
                  </p>

                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-mint-400 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified Completion Record</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
