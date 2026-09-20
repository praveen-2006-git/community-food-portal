import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Github, Linkedin, FileText, ArrowUpRight, Terminal } from 'lucide-react';
import { resumeData } from '../data/resumeData';

export default function Navbar({ onOpenResume }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('flagship');
  const [currentTime, setCurrentTime] = useState('');

  // Track scroll position for header blur
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      setCurrentTime(new Intl.DateTimeFormat('en-GB', options).format(now));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // ScrollSpy to track active section
  useEffect(() => {
    const sections = ['overview', 'flagship', 'works', 'skills', 'chronology', 'contact'];
    const handleScrollSpy = () => {
      const scrollPos = window.scrollY + 200;
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScrollSpy, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollSpy);
  }, []);

  const navLinks = [
    { id: 'flagship', name: '01. Flagship', href: '#flagship' },
    { id: 'works', name: '02. Selected Works', href: '#works' },
    { id: 'skills', name: '03. Stack Matrix', href: '#skills' },
    { id: 'chronology', name: '04. Chronology', href: '#chronology' },
    { id: 'contact', name: '05. Dispatch', href: '#contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-canvas/94 backdrop-blur-md border-b border-border py-3 shadow-lg shadow-black/20'
          : 'bg-transparent py-4 border-b border-border/40'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* Brand & Studio Telemetry */}
        <div className="flex items-center gap-4">
          <a
            href="#"
            className="flex items-center gap-2.5 group focus-ring rounded"
            aria-label="Praveen M Homepage"
          >
            <div className="w-7 h-7 rounded bg-surface border border-border flex items-center justify-center font-mono font-bold text-xs text-text-primary group-hover:border-ochre-400 group-hover:text-ochre-300 transition duration-200">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-text-primary text-xs tracking-tight">
                {resumeData.name}
              </span>
              <span className="text-[10px] text-text-muted font-mono">
                B.E. CSE &bull; BIT '27
              </span>
            </div>
          </a>

          {/* Telemetry Status Pill */}
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-border text-[11px] font-mono text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-mint-400 animate-pulse"></span>
            <span>Erode, TN &bull; UTC+5:30</span>
            {currentTime && (
              <span className="text-text-primary font-semibold font-tabular">[{currentTime}]</span>
            )}
          </div>
        </div>

        {/* Desktop Navigation Links with Active Highlighting */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-mono" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                className={`relative py-1 transition-colors duration-200 focus-ring rounded ${
                  isActive
                    ? 'text-ochre-300 font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {link.name}
                {isActive && (
                  <motion.div
                    layoutId="activeNavLine"
                    className="absolute -bottom-1 left-0 right-0 h-[1.5px] bg-ochre-400"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Action Elements */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href={resumeData.github}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface border border-transparent hover:border-border rounded transition"
            aria-label="GitHub Profile"
            title="GitHub Profile"
          >
            <Github className="w-4 h-4" />
          </a>
          
          <a
            href={resumeData.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-text-muted hover:text-ochre-300 hover:bg-surface border border-transparent hover:border-border rounded transition"
            aria-label="LinkedIn Profile"
            title="LinkedIn Profile"
          >
            <Linkedin className="w-4 h-4" />
          </a>

          <button
            onClick={onOpenResume}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-text-primary bg-surface hover:bg-surface-elevated border border-border hover:border-ochre-400/50 rounded transition active:scale-95 focus-ring"
          >
            <FileText className="w-3.5 h-3.5 text-ochre-400" />
            <span>Resume.pdf</span>
          </button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onOpenResume}
            className="px-2.5 py-1.5 text-xs font-mono font-semibold text-text-primary bg-surface border border-border rounded focus-ring"
            aria-label="Resume"
          >
            Resume
          </button>
          
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-text-secondary hover:text-text-primary bg-surface border border-border rounded focus-ring"
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden px-4 pt-3 pb-6 bg-surface border-b border-border space-y-3 font-mono text-xs overflow-hidden"
          >
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-3 py-2 rounded transition ${
                  activeSection === link.id
                    ? 'bg-canvas text-ochre-300 font-bold border-l-2 border-l-ochre-400'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                }`}
              >
                {link.name}
              </a>
            ))}

            <div className="pt-3 border-t border-border flex items-center justify-around text-xs text-text-secondary">
              <a
                href={resumeData.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-text-primary"
              >
                <Github className="w-4 h-4" /> GitHub
              </a>
              <a
                href={resumeData.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-ochre-300"
              >
                <Linkedin className="w-4 h-4" /> LinkedIn
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
