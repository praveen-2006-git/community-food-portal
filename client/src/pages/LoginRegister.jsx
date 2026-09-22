import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout,
  Zap,
  MapPin,
  ShieldCheck,
  UtensilsCrossed,
  Building2,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import LeafletMap from '../components/LeafletMap';
import { API_BASE_URL } from '../config/api';

export default function LoginRegister({ onLogin }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [selectedQuickRole, setSelectedQuickRole] = useState('');

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register State
  const [regStep, setRegStep] = useState(1); // 1 = Organization Info, 2 = Facility Location Pin
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [role, setRole] = useState('donor');
  const [lat, setLat] = useState(11.5034);
  const [lng, setLng] = useState(77.2444);
  const [contactPerson, setContactPerson] = useState('');
  const [authorityToDonate, setAuthorityToDonate] = useState(false);

  // UI State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleQuickFill = (roleType) => {
    setActiveTab('login');
    setError('');
    setSuccess('');
    setSelectedQuickRole(roleType);
    if (roleType === 'donor') {
      setLoginEmail('donor1@portal.com');
      setLoginPassword('password123');
    } else if (roleType === 'kitchen') {
      setLoginEmail('kitchen1@portal.com');
      setLoginPassword('password123');
    } else if (roleType === 'admin') {
      setLoginEmail('admin@portal.com');
      setLoginPassword('password123');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);

      if (data.user.role === 'donor') {
        navigate('/donor');
      } else if (data.user.role === 'soup_kitchen') {
        navigate('/kitchen');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToStep2 = (e) => {
    if (e) e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Please enter your organization name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid official email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (role === 'donor') {
      if (!contactPerson.trim()) {
        setError('Please provide an authorized contact person name.');
        return;
      }
      if (!authorityToDonate) {
        setError('Please certify legal authorization to donate surplus food.');
        return;
      }
    }
    setRegStep(2);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        password,
        role,
        location: { lat: parseFloat(lat), lng: parseFloat(lng) }
      };

      if (role === 'donor') {
        payload.contactPerson = contactPerson;
        payload.authorityToDonate = authorityToDonate;
      }

      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      setSuccess('Account created successfully! Please sign in with your credentials.');
      setActiveTab('login');
      setLoginEmail(email);
      setLoginPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-viewport">
      <div className="auth-shell">
        
        {/* Main Grid: Left Value Prop + Right Auth Card */}
        <div className={`auth-split-grid ${activeTab === 'register' ? 'register-mode' : ''}`}>
          
          {/* Left Side: Authentic Purpose & Capabilities */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', background: 'var(--surface-active)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.4rem 0.95rem', borderRadius: 'var(--radius-full)', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)' }}>
                <Sprout size={16} color="var(--primary-500)" />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  SurplusLink Food Rescue
                </span>
              </div>
              <div className="hub-live-badge">
                <span className="hub-live-dot" />
                <span>Regional Logistics Grid Live</span>
              </div>
            </div>

            <div>
              <h1 style={{ fontSize: activeTab === 'register' ? '2rem' : '2.65rem', fontWeight: 800, lineHeight: 1.18, color: 'var(--text-primary)', letterSpacing: '-0.035em' }}>
                Connecting Surplus Food with <span className="brand-gradient-text">Community Kitchens</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '1rem', lineHeight: 1.65, maxWidth: '520px' }}>
                A coordinate-aware food recovery logistics network empowering commercial food donors to route perishable surplus ingredients to nearby hunger-relief centers in real time.
              </p>
            </div>

            {/* Vertical Workflow Stack */}
            <div className="auth-workflow-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card-pro" style={{ padding: '1.15rem 1.25rem', borderLeft: '4px solid var(--accent-green)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--surface-active)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)' }}>
                  <Zap size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-primary)' }}>1. Nothing goes to waste</div>
                    <span className="chip chip-green" style={{ fontSize: '0.68rem', padding: '0.2rem 0.6rem' }}>FEFO Priority</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: 1.55 }}>
                    Surplus closest to expiry gets matched and routed first, preventing safe commercial ingredients from spoiling.
                  </div>
                </div>
              </div>

              <div className="card-pro" style={{ padding: '1.15rem 1.25rem', borderLeft: '4px solid var(--accent-blue)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--surface-info)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(37, 99, 235, 0.15)' }}>
                  <MapPin size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-primary)' }}>2. Only nearby kitchens see it</div>
                    <span className="chip chip-cyan" style={{ fontSize: '0.68rem', padding: '0.2rem 0.6rem' }}>15 km Safe Radius</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: 1.55 }}>
                    Listings are matched strictly within a 15km geographic threshold so cold chains remain intact and transit stays under 30 minutes.
                  </div>
                </div>
              </div>

              <div className="card-pro" style={{ padding: '1.15rem 1.25rem', borderLeft: '4px solid #8B5CF6', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(139, 92, 246, 0.15)' }}>
                  <ShieldCheck size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-primary)' }}>3. Verified in person, every time</div>
                    <span className="chip chip-purple" style={{ fontSize: '0.68rem', padding: '0.2rem 0.6rem' }}>Cryptographic OTP</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: 1.55 }}>
                    A single-use 6-digit code securely seals the physical handoff on pickup, preventing quantity disputes and double-bookings.
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Impact Ticker */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>100%</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chain of Custody</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-600)' }}>15 km</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Proximity Radius</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-blue)' }}>&lt; 30 min</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Average Response</div>
              </div>
            </div>
          </div>

          {/* Right Side: Authentication Card */}
          <div className="card-pro" style={{ padding: '2.5rem', width: '100%', borderRadius: '16px', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
                {activeTab === 'login' ? 'Sign In to Portal' : 'Register Organization'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                {activeTab === 'login' ? 'Access your food recovery operations dashboard' : 'Join our verified community network to donate or receive surplus'}
              </p>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="segmented-control-modern" style={{ width: '100%', marginBottom: '1.5rem', display: 'flex' }}>
              <button
                type="button"
                className={`segmented-btn-modern ${activeTab === 'login' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setActiveTab('login'); setRegStep(1); setError(''); setSuccess(''); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`segmented-btn-modern ${activeTab === 'register' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setActiveTab('register'); setRegStep(1); setError(''); setSuccess(''); }}
              >
                Create Account
              </button>
            </div>

            {/* Demo Accounts Panel */}
            {activeTab === 'login' && (
              <div style={{
                background: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Sparkles size={14} color="var(--primary-500)" />
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Instant Demo Sign-In
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>No signup needed</span>
                </div>

                {/* Donor Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  background: 'var(--bg-surface)',
                  border: selectedQuickRole === 'donor' ? '1px solid var(--accent-green)' : '1px solid var(--border-default)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.18s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--surface-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <UtensilsCrossed size={15} color="var(--accent-green)" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Food Donor Facility</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        donor1@portal.com · password123
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('donor')}
                    className={`btn btn-sm ${selectedQuickRole === 'donor' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.74rem', padding: '0.35rem 0.75rem', borderRadius: '8px' }}
                  >
                    {selectedQuickRole === 'donor' ? '✓ Loaded' : 'Use'}
                  </button>
                </div>

                {/* Kitchen Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  background: 'var(--bg-surface)',
                  border: selectedQuickRole === 'kitchen' ? '1px solid var(--accent-blue)' : '1px solid var(--border-default)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.18s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--surface-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={15} color="var(--accent-blue)" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Community Soup Kitchen</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        kitchen1@portal.com · password123
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('kitchen')}
                    className={`btn btn-sm ${selectedQuickRole === 'kitchen' ? 'btn-primary' : 'btn-outline'}`}
                    style={{
                      fontSize: '0.74rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      ...(selectedQuickRole === 'kitchen' ? { background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' } : {})
                    }}
                  >
                    {selectedQuickRole === 'kitchen' ? '✓ Loaded' : 'Use'}
                  </button>
                </div>

                {selectedQuickRole && (
                  <div style={{ fontSize: '0.76rem', color: 'var(--accent-green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', paddingTop: '0.35rem' }}>
                    <CheckCircle2 size={13} />
                    <span>Credentials auto-filled — click below to enter dashboard</span>
                  </div>
                )}
              </div>
            )}

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {activeTab === 'login' ? (
              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-icon-wrapper">
                    <Mail size={16} className="input-icon-prefix" />
                    <input
                      type="email"
                      className="form-control input-with-icon"
                      required
                      value={loginEmail}
                      onChange={(e) => { setLoginEmail(e.target.value); setSelectedQuickRole(''); }}
                      placeholder="name@organization.org"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-icon-wrapper">
                    <Lock size={16} className="input-icon-prefix" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      className="form-control input-with-icon"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
                  style={{ width: '100%', marginTop: '0.85rem', padding: '0.85rem', fontSize: '0.92rem' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner spinner-sm" />
                      <span>Signing in…</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit}>
                {/* 2-Step Registration Progress Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', padding: '0.5rem 0.85rem', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Step {regStep} of 2: {regStep === 1 ? 'Organization & Credentials' : 'Facility Location & Dispatch Point'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <div style={{ width: '26px', height: '4px', borderRadius: '2px', background: 'var(--primary-500)' }} />
                    <div style={{ width: '26px', height: '4px', borderRadius: '2px', background: regStep === 2 ? 'var(--primary-500)' : 'var(--border-strong)', transition: 'background 0.2s ease' }} />
                  </div>
                </div>

                {/* ── STEP 1: Organization & Identity ── */}
                {regStep === 1 && (
                  <div className="animate-fade-up">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Organization Name</label>
                        <div className="input-icon-wrapper">
                          <Building2 size={16} className="input-icon-prefix" />
                          <input
                            type="text"
                            className="form-control input-with-icon"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Sathy Community Care"
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Official Email</label>
                        <div className="input-icon-wrapper">
                          <Mail size={16} className="input-icon-prefix" />
                          <input
                            type="email"
                            className="form-control input-with-icon"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="contact@org.in"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <div className="input-icon-wrapper">
                        <Lock size={16} className="input-icon-prefix" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          className="form-control input-with-icon"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 8 characters"
                          style={{ paddingRight: '2.5rem' }}
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          title={showRegPassword ? 'Hide password' : 'Show password'}
                        >
                          {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Select Organization Type</label>
                      <div className="role-cards-grid">
                        <button
                          type="button"
                          className={`role-select-card ${role === 'donor' ? 'active' : ''}`}
                          onClick={() => setRole('donor')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <UtensilsCrossed size={15} color="var(--accent-green)" />
                              <span>Food Donor</span>
                            </div>
                            {role === 'donor' && <CheckCircle2 size={16} color="var(--primary-500)" />}
                          </div>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            Restaurant, hotel, bakery, or retail food distributor
                          </span>
                        </button>

                        <button
                          type="button"
                          className={`role-select-card ${role === 'soup_kitchen' ? 'active' : ''}`}
                          onClick={() => setRole('soup_kitchen')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Building2 size={15} color="var(--accent-blue)" />
                              <span>Soup Kitchen</span>
                            </div>
                            {role === 'soup_kitchen' && <CheckCircle2 size={16} color="var(--accent-blue)" />}
                          </div>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            Relief center, shelter, or community charity dining
                          </span>
                        </button>
                      </div>
                    </div>

                    {role === 'donor' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Authorized Contact Person</label>
                          <input
                            type="text"
                            className="form-control"
                            required
                            value={contactPerson}
                            onChange={(e) => setContactPerson(e.target.value)}
                            placeholder="e.g. Anand Kumar (General Manager)"
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0.75rem 0 1.25rem 0', background: 'var(--bg-surface-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <input
                            type="checkbox"
                            id="auth-to-donate"
                            required
                            checked={authorityToDonate}
                            onChange={(e) => setAuthorityToDonate(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-green)' }}
                          />
                          <label htmlFor="auth-to-donate" style={{ margin: 0, cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            I confirm legal authorization to represent this donor facility and verify all surplus donations meet safe edible standards.
                          </label>
                        </div>
                      </>
                    )}

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', gap: '0.5rem' }}
                      onClick={handleProceedToStep2}
                    >
                      <span>Continue to Facility Location</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                )}

                {/* ── STEP 2: Facility Location & Map Pin ── */}
                {regStep === 2 && (
                  <div className="animate-fade-up">
                    <div style={{ marginBottom: '0.85rem' }}>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Click anywhere on the map to pinpoint your facility coordinates. This pin sets the safe 15 km routing center for matching nearby surplus.
                      </p>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Facility GPS Location Pin</label>
                      <div style={{ height: '220px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-default)', marginBottom: '0.65rem' }}>
                        <LeafletMap
                          lat={lat}
                          lng={lng}
                          onChange={(newLat, newLng) => {
                            setLat(newLat);
                            setLng(newLng);
                          }}
                          markerLabel="Your Organization Location"
                        />
                      </div>
                      <div className="form-row">
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Latitude</label>
                          <input
                            type="number"
                            step="0.000001"
                            className="form-control"
                            required
                            value={lat}
                            onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Longitude</label>
                          <input
                            type="number"
                            step="0.000001"
                            className="form-control"
                            required
                            value={lng}
                            onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: '0 0 auto' }}
                        onClick={() => { setError(''); setRegStep(1); }}
                        disabled={loading}
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
                        style={{ flex: 1, padding: '0.75rem' }}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner spinner-sm" />
                            <span>Creating Account…</span>
                          </>
                        ) : 'Complete Registration'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
