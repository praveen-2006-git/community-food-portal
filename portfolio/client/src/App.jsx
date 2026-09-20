import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FlagshipCaseStudy from './components/FlagshipCaseStudy';
import ProjectsLedger from './components/ProjectsLedger';
import Skills from './components/Skills';
import Education from './components/Education';
import Contact from './components/Contact';
import Footer from './components/Footer';
import ResumeModal from './components/ResumeModal';
import ErrorFallback from './components/ErrorFallback';

export default function App() {
  const [isResumeOpen, setIsResumeOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-canvas text-text-primary flex flex-col font-sans selection:bg-ochre-400/20 selection:text-ochre-300">
        
        {/* Architectural Navigation */}
        <Navbar onOpenResume={() => setIsResumeOpen(true)} />

        {/* Main Landmark */}
        <main id="main-content" className="flex-grow pt-16">
          
          {/* Hero / Studio Manifesto */}
          <Hero onOpenResume={() => setIsResumeOpen(true)} />

          {/* 01. Flagship Architecture Case Study & Live Sandbox */}
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <FlagshipCaseStudy />
          </ErrorBoundary>

          {/* 02. Selected Works Dossier Ledger */}
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <ProjectsLedger />
          </ErrorBoundary>

          {/* 03. Capabilities & Technical Depth Matrix */}
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Skills />
          </ErrorBoundary>

          {/* 04. Academic Foundations & Verified Credentials Chronology */}
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Education />
          </ErrorBoundary>

          {/* 05. Direct Studio Dispatch & Message Transmission */}
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Contact />
          </ErrorBoundary>

        </main>

        {/* Footer & Colophon */}
        <Footer />

        {/* Accessible Resume Modal */}
        <ResumeModal
          isOpen={isResumeOpen}
          onClose={() => setIsResumeOpen(false)}
        />

      </div>
    </BrowserRouter>
  );
}
