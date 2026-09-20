import React, { useState } from 'react';
import { 
  FolderGit2, 
  ArrowUpRight, 
  Github, 
  ShieldCheck, 
  Lock, 
  Clock, 
  Database,
  ExternalLink
} from 'lucide-react';
import { projectsData } from '../data/projectsData';
import ProjectModal from './ProjectModal';
import SpotlightCard from './ui/SpotlightCard';

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState(null);

  const getMetricIcon = (iconName) => {
    switch (iconName) {
      case 'Lock':
        return <Lock className="w-3.5 h-3.5 text-accent-400" />;
      case 'Clock':
        return <Clock className="w-3.5 h-3.5 text-signal-400" />;
      case 'Database':
        return <Database className="w-3.5 h-3.5 text-accent-400" />;
      case 'ShieldCheck':
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-mint-400" />;
    }
  };

  return (
    <section id="projects" className="py-24 bg-canvas border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
          <div>
            <span className="text-xs font-semibold text-accent-400 uppercase tracking-wider block mb-2">
              Portfolio
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
              Featured Projects
            </h2>
            <p className="text-sm text-text-secondary mt-2 max-w-xl">
              Production-focused web applications built with React, Node.js, Express, and MongoDB.
            </p>
          </div>
          <div className="text-xs text-text-metadata font-medium px-3 py-1 rounded-full bg-surface border border-border self-start md:self-auto">
            3 Case Studies
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {projectsData.map((project, idx) => (
            <SpotlightCard
              key={project.id}
              className="p-6 flex flex-col justify-between space-y-6 bg-surface border-border hover:border-border-hover"
            >
              <div className="space-y-4">
                
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-accent-400 uppercase tracking-wider">
                    {project.category.split('/')[0].trim()}
                  </span>
                  <span className="text-xs text-text-metadata font-mono">
                    0{idx + 1}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-lg font-bold text-text-primary tracking-tight">
                    {project.title}
                  </h3>
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                    {project.shortDescription}
                  </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {project.metrics.map((m, mIdx) => (
                    <div
                      key={mIdx}
                      className="p-2.5 rounded-lg bg-surface-subtle border border-border/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 text-text-secondary">
                        {getMetricIcon(m.icon)}
                        <span>{m.label}</span>
                      </div>
                      <span className="font-semibold text-text-primary">{m.value}</span>
                    </div>
                  ))}
                </div>

                {/* Tech Stack Pills */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {project.stack.slice(0, 5).map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-md bg-surface-subtle border border-border text-[11px] font-medium text-text-secondary"
                    >
                      {t}
                    </span>
                  ))}
                  {project.stack.length > 5 && (
                    <span className="px-2 py-1 rounded-md text-[11px] text-text-metadata font-medium">
                      +{project.stack.length - 5}
                    </span>
                  )}
                </div>

              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <button
                  onClick={() => setSelectedProject(project)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-400 hover:text-accent-300 transition focus-ring rounded"
                >
                  <span>Read Case Study</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>

                {project.github && (
                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition focus-ring inline-flex"
                    aria-label={`GitHub repo for ${project.title}`}
                    title="View Source Code"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                )}
              </div>

            </SpotlightCard>
          ))}
        </div>

      </div>

      {/* Case Study Modal */}
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </section>
  );
}
