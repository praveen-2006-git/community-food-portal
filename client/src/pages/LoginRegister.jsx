import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LeafletMap from '../components/LeafletMap';
import { API_BASE_URL } from '../config/api';

export default function LoginRegister({ onLogin }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('donor');
  const [lat, setLat] = useState(11.5034);
  const [lng, setLng] = useState(77.2444);
  const [contactPerson, setContactPerson] = useState('');
  const [authorityToDonate, setAuthorityToDonate] = useState(false);

  // Common UI State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleQuickFill = (roleType) => {
    setActiveTab('login');
    setError('');
    setSuccess('');
    if (roleType === 'donor') {
      setLoginEmail('freshfarm@example.com');
      setLoginPassword('password123');
    } else if (roleType === 'kitchen') {
      setLoginEmail('hopekitchen@example.com');
      setLoginPassword('password123');
    } else if (roleType === 'admin') {
      setLoginEmail('admin@foodportal.org');
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
      
      // Redirect based on role
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

      setSuccess('Registration successful! You can now log in.');
      setActiveTab('login');
      // Autofill login email
      setLoginEmail(email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '1100px', width: '100%', display: 'grid', gridTemplateColumns: activeTab === 'register' ? '1fr' : 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
        
        {/* Left Side: Hero Brand & Impact Highlights */}
        {activeTab === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.4rem 0.9rem', borderRadius: '9999px', width: 'fit-content' }}>
              <span style={{ fontSize: '0.9rem' }}>🌱</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Next-Gen Surplus Food Routing
              </span>
            </div>

            <div>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
                Connecting Surplus Food with Soup Kitchens
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: '1rem', lineHeight: 1.6 }}>
                Real-time surplus inventory matching, geospatial route optimization, and cryptographic verification to eliminate hunger and food waste.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.2rem' }}>⚡</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Zero Food Waste</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Instant matching of expiring perishables</span>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📍</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Smart Routing</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>OSRM proximity-optimized pickups</span>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🔐</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>HMAC Verification</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Secure 6-digit OTP delivery handovers</span>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.2rem' }}>⭐</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Reputation Ledger</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Community trust & quality inspections</span>
              </div>
            </div>

            {/* Quick Demo Logins */}
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quick Demo Access
              </span>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => handleQuickFill('donor')}
                >
                  🌾 Donor Demo
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => handleQuickFill('kitchen')}
                >
                  🍲 Kitchen Demo
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => handleQuickFill('admin')}
                >
                  🛡️ Admin Demo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Authentication Card */}
        <div className="glass-panel" style={{ padding: '2.25rem 2rem', width: '100%', maxWidth: activeTab === 'register' ? '680px' : '460px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {activeTab === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
              {activeTab === 'login' ? 'Enter your credentials to access your portal' : 'Join our network to donate or receive surplus ingredients'}
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '0.3rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
            <button 
              type="button"
              style={{ flex: 1, padding: '0.6rem', border: 'none', background: activeTab === 'login' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'login' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.88rem', borderRadius: '9px', cursor: 'pointer', boxShadow: activeTab === 'login' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none', transition: 'all 0.18s ease' }}
              onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
            >
              Sign In
            </button>
            <button 
              type="button"
              style={{ flex: 1, padding: '0.6rem', border: 'none', background: activeTab === 'register' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'register' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.88rem', borderRadius: '9px', cursor: 'pointer', boxShadow: activeTab === 'register' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none', transition: 'all 0.18s ease' }}
              onClick={() => { setActiveTab('register'); setError(''); setSuccess(''); }}
            >
              Register
            </button>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  required 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  required 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In to Portal'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name / Organization</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Fresh Supermarket"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select 
                    className="form-control" 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="donor">Donor (Surplus Food Supplier)</option>
                    <option value="soup_kitchen">Soup Kitchen (Food Recipient)</option>
                  </select>
                </div>
              </div>

              {role === 'donor' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                    />
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0.75rem 0 1.25rem 0' }}>
                    <input 
                      type="checkbox" 
                      id="auth-to-donate"
                      required
                      checked={authorityToDonate}
                      onChange={(e) => setAuthorityToDonate(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="auth-to-donate" className="form-label" style={{ margin: 0, cursor: 'pointer', textTransform: 'none', fontSize: '0.85rem' }}>
                      I confirm that I have the authority to donate this surplus food.
                    </label>
                  </div>
                </>
              )}
              
              <div className="form-group">
                <label className="form-label">Facility Location (Click on map or adjust coordinates)</label>
                <div className="map-container" style={{ height: '220px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <LeafletMap 
                    lat={lat} 
                    lng={lng} 
                    onChange={(newLat, newLng) => {
                      setLat(newLat);
                      setLng(newLng);
                    }}
                    markerLabel="Your Center Location"
                  />
                </div>
                <div className="form-row" style={{ marginTop: '0.5rem' }}>
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

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }} disabled={loading}>
                {loading ? 'Registering Account...' : 'Complete Registration'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
