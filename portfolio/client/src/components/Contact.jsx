import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  Phone, 
  MapPin, 
  Copy, 
  Check, 
  Github, 
  Linkedin, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { resumeData } from '../data/resumeData';
import { useApi } from '../hooks/useApi';

export default function Contact() {
  const { request, loading } = useApi();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    website: '', // Honeypot
  });

  const [formStatus, setFormStatus] = useState({
    success: false,
    error: null,
  });

  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ success: false, error: null });

    // Client-side validation
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setFormStatus({ success: false, error: 'Please enter a valid name (minimum 2 characters).' });
      return;
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setFormStatus({ success: false, error: 'Please enter a valid email address.' });
      return;
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      setFormStatus({ success: false, error: 'Message must be at least 10 characters long.' });
      return;
    }

    try {
      const res = await request('/api/contact', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (res.success) {
        setFormStatus({ success: true, error: null });
        setFormData({ name: '', email: '', message: '', website: '' });

        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#30c283', '#d9943b', '#eaeef4'],
          });
        } catch {}
      }
    } catch (err) {
      setFormStatus({
        success: false,
        error: err.message || 'Failed to submit inquiry. Please reach out to praveen.cs23@bitsathy.ac.in directly.',
      });
    }
  };

  return (
    <section id="contact" className="py-24 bg-canvas border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 pb-6 border-b border-border gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="micro-label text-ochre-400">05 / Dispatch</span>
              <span className="text-border">&bull;</span>
              <span className="micro-label text-text-muted">Direct Communication</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary tracking-tight font-sans">
              Initiate Direct <span className="font-serif italic font-normal text-ochre-300">Transmission</span>
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
            <span className="w-2 h-2 rounded-full bg-mint-400 animate-pulse"></span>
            <span>Response SLA: &lt; 24 Hours</span>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Direct Studio Channels (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="p-6 sm:p-7 rounded-lg bg-surface border border-border space-y-6">
              <div>
                <span className="micro-label text-ochre-400 font-bold block mb-1">Direct Channels</span>
                <p className="text-xs text-text-secondary leading-relaxed font-sans">
                  Open to full-stack software engineering roles, backend systems design, and technical internships.
                </p>
              </div>

              {/* Channels List */}
              <div className="space-y-3 text-xs">
                
                {/* Email */}
                <div className="p-3.5 rounded bg-canvas border border-border hover:border-ochre-400/40 transition flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-surface border border-border text-ochre-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-text-muted uppercase">Email Transmission</div>
                      <a 
                        href={`mailto:${resumeData.email}`} 
                        className="text-text-primary hover:text-ochre-300 transition text-xs font-mono"
                      >
                        {resumeData.email}
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(resumeData.email, 'contact-email')}
                    className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface transition focus-ring"
                    title="Copy email to clipboard"
                  >
                    {copiedField === 'contact-email' ? <Check className="w-3.5 h-3.5 text-mint-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Phone */}
                <div className="p-3.5 rounded bg-canvas border border-border hover:border-mint-400/40 transition flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-surface border border-border text-mint-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-text-muted uppercase">Direct Phone</div>
                      <a 
                        href={`tel:${resumeData.phone}`} 
                        className="text-text-primary hover:text-mint-400 transition text-xs font-mono"
                      >
                        {resumeData.phone}
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(resumeData.phone, 'contact-phone')}
                    className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface transition focus-ring"
                    title="Copy phone to clipboard"
                  >
                    {copiedField === 'contact-phone' ? <Check className="w-3.5 h-3.5 text-mint-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Location */}
                <div className="p-3.5 rounded bg-canvas border border-border flex items-center gap-3">
                  <div className="p-2 rounded bg-surface border border-border text-text-muted">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-text-muted uppercase">Base Coordinates</div>
                    <div className="text-text-primary text-xs font-mono">{resumeData.location}</div>
                  </div>
                </div>

              </div>

              {/* Profiles */}
              <div className="pt-2 flex items-center gap-3">
                <a
                  href={resumeData.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-canvas hover:bg-surface-elevated border border-border text-xs font-mono text-text-primary transition"
                >
                  <Github className="w-3.5 h-3.5 text-text-muted" />
                  <span>GitHub</span>
                  <ArrowUpRight className="w-3 h-3 text-text-muted" />
                </a>

                <a
                  href={resumeData.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-canvas hover:bg-surface-elevated border border-border text-xs font-mono text-ochre-300 transition"
                >
                  <Linkedin className="w-3.5 h-3.5 text-ochre-400" />
                  <span>LinkedIn</span>
                  <ArrowUpRight className="w-3 h-3 text-text-muted" />
                </a>
              </div>

            </div>

          </div>

          {/* Right Column: Message Transmission Form (7 Cols) */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-lg bg-surface border border-border space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <span className="micro-label text-ochre-400 font-bold block">Transmission Dispatch</span>
                  <p className="text-xs text-text-secondary mt-0.5 font-sans">
                    Direct message channel with strict server validation.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-text-muted">POST /api/contact</span>
              </div>

              {/* Success Alert */}
              {formStatus.success && (
                <div className="p-4 rounded bg-mint-950/30 border border-mint-500/40 text-mint-300 text-xs flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-mint-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold font-mono">Transmission Dispatched Successfully</div>
                    <p className="text-[11px] mt-0.5 text-text-secondary font-sans">Thank you. Praveen will respond to your message promptly.</p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {formStatus.error && (
                <div className="p-4 rounded bg-signal-950/30 border border-signal-500/40 text-signal-300 text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-signal-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold font-mono">Transmission Error</div>
                    <p className="text-[11px] mt-0.5 text-text-secondary font-sans">{formStatus.error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot */}
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-[11px] font-mono text-text-muted mb-1.5">
                      Sender Name <span className="text-ochre-400">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Alex Morgan"
                      className="w-full px-3.5 py-2.5 rounded bg-canvas border border-border focus:border-ochre-400 text-xs text-text-primary placeholder:text-text-muted/50 focus-ring font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block text-[11px] font-mono text-text-muted mb-1.5">
                      Return Email Address <span className="text-ochre-400">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. alex@company.com"
                      className="w-full px-3.5 py-2.5 rounded bg-canvas border border-border focus:border-ochre-400 text-xs text-text-primary placeholder:text-text-muted/50 focus-ring font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="contact-message" className="block text-[11px] font-mono text-text-muted">
                      Message Body <span className="text-ochre-400">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-text-muted">
                      {formData.message.length} chars (min 10)
                    </span>
                  </div>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Describe your project, role, or technical inquiry..."
                    className="w-full px-3.5 py-2.5 rounded bg-canvas border border-border focus:border-ochre-400 text-xs text-text-primary placeholder:text-text-muted/50 focus-ring resize-none font-sans"
                  ></textarea>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded bg-text-primary hover:bg-white text-canvas font-mono font-bold text-xs tracking-tight transition active:scale-95 disabled:opacity-50 focus-ring"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{loading ? 'Transmitting...' : 'Dispatch Message'}</span>
                  </button>
                </div>
              </form>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
