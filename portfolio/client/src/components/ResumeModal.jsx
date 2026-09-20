import React, { useEffect } from 'react';
import { X, Download, Printer, ExternalLink, Mail, Phone, MapPin, Github, Linkedin, CheckCircle2 } from 'lucide-react';
import { resumeData } from '../data/resumeData';
import { sendTelemetryEvent } from '../lib/api';

export default function ResumeModal({ isOpen, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      sendTelemetryEvent('resume_view');
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-canvas/90 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-surface border border-border rounded-lg shadow-2xl overflow-y-auto flex flex-col focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Modal Controls Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-surface/98 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-text-primary text-xs sm:text-sm">Resume Document &bull; {resumeData.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-text-primary bg-surface-subtle border border-border hover:border-ochre-400 rounded transition focus-ring"
            >
              <Printer className="w-3.5 h-3.5 text-ochre-400" />
              <span>Print / PDF Export</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-elevated transition focus-ring"
              aria-label="Close resume modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Document Preview */}
        <div className="p-6 sm:p-10 bg-white text-slate-900 font-sans space-y-6">
          
          {/* Resume Header */}
          <div className="text-center space-y-1.5 border-b border-slate-300 pb-5">
            <h1 id="resume-modal-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 uppercase">
              {resumeData.name}
            </h1>
            <p className="text-sm font-semibold text-slate-700 italic font-serif">
              {resumeData.role}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1 font-mono">
              <span>{resumeData.phone}</span>
              <span>&bull;</span>
              <span>{resumeData.email}</span>
              <span>&bull;</span>
              <span>{resumeData.location}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-blue-700 font-medium font-mono">
              <a href={resumeData.github} target="_blank" rel="noopener noreferrer">
                github.com/{resumeData.githubUsername}
              </a>
              <span>&bull;</span>
              <a href={resumeData.linkedin} target="_blank" rel="noopener noreferrer">
                linkedin.com/in/{resumeData.linkedinUsername}
              </a>
            </div>
          </div>

          {/* Career Objective */}
          <div className="space-y-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 font-mono">
              Career Objective
            </h2>
            <p className="text-xs leading-relaxed text-slate-700">
              {resumeData.summary}
            </p>
          </div>

          {/* Education */}
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 font-mono">
              Education
            </h2>
            {resumeData.education.map((edu, idx) => (
              <div key={idx} className="text-xs space-y-0.5">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{edu.degree} — {edu.institution}</span>
                  <span className="font-semibold text-slate-700 font-mono">{edu.score}</span>
                </div>
                <div className="text-slate-600 italic">
                  {edu.timeline}
                </div>
              </div>
            ))}
          </div>

          {/* Technical Skills */}
          <div className="space-y-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 font-mono">
              Technical Skills
            </h2>
            <div className="text-xs text-slate-800 space-y-1">
              <div><strong>Front-End:</strong> HTML, CSS, JavaScript, React, UI/UX Design, Tailwind CSS</div>
              <div><strong>Back-End:</strong> Node.js, Express.js, REST API Development, Mongoose Transactions, Cron Jobs</div>
              <div><strong>Database:</strong> MongoDB, Basic SQL Query</div>
              <div><strong>Programming Languages:</strong> Java, Python, JavaScript</div>
              <div><strong>AI Tools:</strong> Antigravity, Claude — used to accelerate development, with generated code reviewed, debugged, and validated before integration</div>
              <div><strong>Tools:</strong> Git, GitHub, VS Code, Postman</div>
            </div>
          </div>

          {/* Projects */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 font-mono">
              Projects
            </h2>
            
            {/* Project 1 */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Community Surplus Food Ingredient Routing Portal</span>
                <span className="font-normal italic text-slate-600 font-serif">MERN Stack (React.js, Node.js, Express.js, MongoDB)</span>
              </div>
              <ul className="list-disc list-outside pl-4 text-slate-700 space-y-1">
                <li>Built a full-stack hyper-local food redistribution platform connecting venues such as hotels and catering halls with soup kitchens to route surplus perishable ingredients before spoilage, with role-based access for donors, kitchens, and administrators, and OSRM-based map routing for pickup navigation.</li>
                <li>Implemented atomic Mongoose transactions across claim, pickup, and delivery updates to prevent double-claiming and race conditions on shared inventory listings.</li>
                <li>Designed a secure handover verification protocol using HMAC-SHA256 hashing with timing-safe comparison (<code>crypto.timingSafeEqual</code>) and a 3-attempt lockout policy, alongside FEFO (First-Expired, First-Out) inventory batching and a background cron job for reservation lifecycle monitoring.</li>
              </ul>
            </div>

            {/* Project 2 */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Syllabus Management System</span>
                <span className="font-normal italic text-slate-600 font-serif">MERN Stack</span>
              </div>
              <ul className="list-disc list-outside pl-4 text-slate-700 space-y-1">
                <li>Built a full-stack web application using React on the front end and Node.js/Express on the back end to help manage academic syllabus content, with login-based access for different types of users.</li>
                <li>Designed role-based access control so Admins can create user roles and manage permissions and upload syllabus documents, Faculty can view subjects along with enrolled students, and Students can view subjects specific to their department plus general subjects.</li>
                <li>Implemented server-side session handling, authentication, and file upload/storage logic connected to a database backend.</li>
              </ul>
            </div>

            {/* Project 3 */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Warranty Tracker</span>
                <span className="font-normal italic text-slate-600 font-serif">Full Stack Dashboard</span>
              </div>
              <ul className="list-disc list-outside pl-4 text-slate-700 space-y-1">
                <li>Built a full-stack dashboard application to track warranty and asset details, with a React front end and a Node.js/Express back end handling file uploads and data storage.</li>
                <li>Developed backend logic for automatic email reminders sent a month before a policy's expiry date, along with category-wise data aggregation for charts.</li>
                <li>Designed a responsive, card-based and list-based UI for browsing assets, backed by REST APIs for data retrieval and updates.</li>
              </ul>
            </div>

          </div>

          {/* Certifications */}
          <div className="space-y-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 font-mono">
              Certifications
            </h2>
            <ul className="list-disc list-outside pl-4 text-xs text-slate-700 space-y-0.5">
              <li><strong>Introduction to Modern AI</strong> — Cisco Networking Academy, Feb 2026</li>
              <li><strong>Python Essentials 1</strong> — Cisco Networking Academy / Python Institute, Jun 2026</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
