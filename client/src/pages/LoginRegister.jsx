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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-active)', border: '1px solid rgba(30, 122, 74, 0.25)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)' }}>
                <Sprout size={16} color="var(--primary-500)" />
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  SurplusLink Food Rescue
                </span>
              </div>
              <div className="hub-live-badge">
                <span className="hub-live-dot" />
                <span>Regional Grid Live</span>
              </div>
            </div>

            <div>
              <h1 style={{ fontSize: activeTab === 'register' ? '1.85rem' : '2.45rem', fontWeight: 800, lineHeight: 1.2, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                Connecting Surplus Food with <span className="brand-gradient-text">Community Kitchens</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', marginTop: '0.85rem', lineHeight: 1.6, maxWidth: '480px' }}>
                A coordinate-aware food recovery logistics network empowering commercial food donors to route surplus ingredients to nearby hunger-relief centers in real time.
              </p>
            </div>

            {/* Vertical Workflow Stack */}
            <div className="auth-workflow-list">
              <div className="auth-workflow-item" style={{ borderLeft: '3px solid var(--accent-green)' }}>
                <div className="auth-workflow-icon" style={{ background: 'var(--surface-active)', color: 'var(--accent-green)' }}>
                  <Zap size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>1. Nothing goes to waste</div>
                    <span className="chip chip-green" style={{ fontSize: '0.65rem' }}>FEFO Sorting</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                    Surplus closest to expiry gets matched and routed first, so food gets rescued before it spoils.
                  </div>
                </div>
              </div>

              <div className="auth-workflow-item" style={{ borderLeft: '3px solid var(--accent-blue)' }}>
                <div className="auth-workflow-icon" style={{ background: 'var(--surface-info)', color: 'var(--accent-blue)' }}>
                  <MapPin size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>2. Only nearby kitchens see it</div>
                    <span className="chip chip-cyan" style={{ fontSize: '0.65rem' }}>15 km Radius</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                    Listings are automatically matched to kitchens within a safe delivery radius (~15km), so pickups stay fast and food stays fresh.
                  </div>
                </div>
              </div>

              <div className="auth-workflow-item" style={{ borderLeft: '3px solid var(--primary-500)' }}>
                <div className="auth-workflow-icon" style={{ background: 'var(--surface-active)', color: 'var(--accent-green)' }}>
                  <ShieldCheck size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>3. Verified in person, every time</div>
                    <span className="chip chip-green" style={{ fontSize: '0.65rem' }}>6-Digit OTP</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                    A one-time code confirms the handoff actually happened, so there's never a dispute about what was picked up.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Authentication Card */}
          <div className="card-panel" style={{ padding: '2.5rem', width: '100%', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-level-3)', border: '1px solid var(--border-default)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {activeTab === 'login' ? 'Sign In to Portal' : 'Register Organization'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {activeTab === 'login' ? 'Access your food rescue routing dashboard' : 'Join our verified community network to donate or receive surplus'}
              </p>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="segmented-control" style={{ width: '100%', marginBottom: '1.25rem' }}>
              <button
                type="button"
                className={`segmented-btn ${activeTab === 'login' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setActiveTab('login'); setRegStep(1); setError(''); setSuccess(''); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`segmented-btn ${activeTab === 'register' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setActiveTab('register'); setRegStep(1); setError(''); setSuccess(''); }}
              >
                Create Account
              </button>
            </div>

            {/* Demo Accounts — always visible so anyone (recruiters, judges) can try the app */}
            {activeTab === 'login' && (
              <div style={{
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                  <Sparkles size={13} color="var(--primary-500)" />
                  <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Try a Demo Account
                  </span>
                </div>

                {/* Donor Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <UtensilsCrossed size={14} color="var(--accent-green)" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>Food Donor</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        donor1@portal.com · password123
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('donor')}
                    style={{
                      flexShrink: 0,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--accent-green)',
                      background: selectedQuickRole === 'donor' ? 'var(--accent-green)' : 'transparent',
                      color: selectedQuickRole === 'donor' ? '#fff' : 'var(--accent-green)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {selectedQuickRole === 'donor' ? '✓ Loaded' : 'Use'}
                  </button>
                </div>

                {/* Kitchen Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <Building2 size={14} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>Soup Kitchen</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        kitchen1@portal.com · password123
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('kitchen')}
                    style={{
                      flexShrink: 0,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--accent-blue)',
                      background: selectedQuickRole === 'kitchen' ? 'var(--accent-blue)' : 'transparent',
                      color: selectedQuickRole === 'kitchen' ? '#fff' : 'var(--accent-blue)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {selectedQuickRole === 'kitchen' ? '✓ Loaded' : 'Use'}
                  </button>
                </div>

                {selectedQuickRole && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', paddingTop: '0.25rem', borderTop: '1px dashed var(--border-subtle)' }}>
                    <CheckCircle2 size={12} />
                    <span>Credentials auto-filled — click Sign In to enter</span>
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
