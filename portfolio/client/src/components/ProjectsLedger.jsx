import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderGit2, 
  ArrowUpRight, 
  Github, 
  ShieldCheck, 
  Lock, 
  Clock, 
  Database,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCode2,
  GitBranch,
  Layers
} from 'lucide-react';
import { projectsData } from '../data/projectsData';
import ProjectModal from './ProjectModal';

export default function ProjectsLedger() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Remaining projects (Syllabus Management & Warranty Tracker)
  const secondaryProjects = projectsData.slice(1);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <section id="works" className="py-24 bg-canvas border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 pb-6 border-b border-border gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="micro-label text-ochre-400">02 / Selected Works</span>
              <span className="text-border">&bull;</span>
              <span className="micro-label text-text-muted">Engineering Dossier</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary tracking-tight font-sans">
              Production Systems & <span className="font-serif italic font-normal text-ochre-300">Utility Platforms</span>
            </h2>
          </div>

          <div className="text-xs font-mono text-text-muted">
            [ 02 Recorded Case Studies ]
          </div>
        </div>

        {/* Ledger Table / Dossier Rows */}
        <div className="space-y-6">
          {secondaryProjects.map((project, idx) => {
            const isExpanded = expandedId === project.id;
            const indexNumber = `0${idx + 2}`;

            return (
              <div
                key={project.id}
                className="dossier-row rounded-lg bg-surface border border-border overflow-hidden transition-all duration-200 hover:border-border-hover"
              >
                {/* Primary Row Header */}
                <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  
                  {/* Left: Index + Title + Short narrative */}
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-ochre-400 font-bold">{indexNumber}</span>
                      <span className="text-border">&bull;</span>
                      <span className="micro-label text-text-muted">{project.category}</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight font-sans">
                      {project.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-sans">
                      {project.shortDescription}
                    </p>
                  </div>

                  {/* Middle: Metrics Chips */}
                  <div className="flex flex-wrap lg:flex-col gap-2 min-w-[200px]">
                    {project.metrics.map((m, mIdx) => (
                      <div
                        key={mIdx}
                        className="px-3 py-1.5 rounded bg-canvas border border-border flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="text-text-muted text-[11px] font-mono">{m.label}</span>
                        <span className="font-mono font-bold text-text-primary text-[11px]">{m.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-border">
                    <button
                      onClick={() => toggleExpand(project.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-surface-subtle hover:bg-surface-elevated border border-border hover:border-ochre-400/40 text-xs font-mono text-text-primary transition focus-ring"
                      aria-expanded={isExpanded}
                    >
                      <span>{isExpanded ? 'Collapse' : 'Quick Spec'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-ochre-400" /> : <ChevronDown className="w-3.5 h-3.5 text-ochre-400" />}
                    </button>

                    <button
                      onClick={() => setSelectedProject(project)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-text-primary hover:bg-white text-canvas text-xs font-mono font-bold transition active:scale-95 focus-ring"
                    >
                      <span>Blueprint</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded bg-surface-subtle hover:bg-surface-elevated border border-border text-text-muted hover:text-text-primary transition focus-ring"
                        aria-label={`GitHub repo for ${project.title}`}
                        title="View GitHub Repository"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                </div>

                {/* Tech Stack Pills in Row Bottom */}
                <div className="px-6 sm:px-8 pb-6 flex flex-wrap gap-2">
                  {project.stack.map((tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-1 rounded bg-canvas border border-border text-xs font-mono text-text-muted hover:border-ochre-400/40 transition"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Smooth Animated Expandable Drawer */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="border-t border-border p-6 sm:p-8 bg-surface-subtle/50 space-y-6 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans">
                        <div className="space-y-2 p-4 rounded bg-surface border border-border">
                          <span className="micro-label text-signal-400 font-bold block">Problem Specification</span>
                          <p className="text-text-secondary leading-relaxed">
                            {project.problem}
                          </p>
                        </div>

                        <div className="space-y-2 p-4 rounded bg-surface border border-border">
                          <span className="micro-label text-mint-400 font-bold block">Engineering Architecture</span>
                          <p className="text-text-secondary leading-relaxed">
                            {project.solution}
                          </p>
                        </div>
                      </div>

                      {/* Architecture Flow & Key Decision */}
                      {project.architecture?.diagram && (
                        <div className="space-y-2">
                          <span className="micro-label text-text-muted flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-ochre-400" /> Data & Permission Pipeline
                          </span>
                          <div className="p-4 rounded bg-canvas border border-border overflow-x-auto">
                            <pre className="font-mono text-xs text-text-secondary leading-relaxed whitespace-pre">
                              <code>{project.architecture.diagram}</code>
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Technical Highlights */}
                      {project.technicalHighlights && (
                        <div className="space-y-2">
                          <span className="micro-label text-text-muted block">Implementation Points</span>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-secondary font-sans">
                            {project.technicalHighlights.map((hl, hIdx) => (
                              <li key={hIdx} className="p-2.5 rounded bg-surface border border-border flex items-start gap-2">
                                <span className="text-ochre-400 font-bold">&bull;</span>
                                <span>{hl}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Code Snippet */}
                      {project.codeSnippet && (
                        <div className="space-y-2">
                          <span className="micro-label text-text-muted flex items-center gap-1.5">
                            <FileCode2 className="w-3.5 h-3.5 text-ochre-400" /> Verified Core Logic
                          </span>
                          <div className="p-4 rounded bg-canvas border border-border overflow-x-auto">
                            <pre className="font-mono text-xs text-text-primary leading-relaxed">
                              <code>{project.codeSnippet}</code>
                            </pre>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            );
          })}
        </div>

      </div>

      {/* Full Modal Blueprint View */}
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </section>
  );
}
