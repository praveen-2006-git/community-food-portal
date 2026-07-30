import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LeafletMap from '../components/LeafletMap';
import { useToast } from '../App';

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

  // Common UI State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
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
      addToast('Welcome back, ' + data.user.name + '!', 'success');
      
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
      addToast(err.message, 'error');
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
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          location: { lat: parseFloat(lat), lng: parseFloat(lng) }
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      setSuccess('Registration successful! You can now log in.');
      addToast('Registration successful! You can now sign in.', 'success');
      setActiveTab('login');
      // Autofill login email
      setLoginEmail(email);
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left split screen column - branding & stats */}
      <div className="auth-left">
        <div className="auth-left-content">
          <h1 className="auth-left-title">
            Rescuing Food. <br />
            Supporting <span>Communities</span>.
          </h1>
          <p className="auth-left-text">
            Connecting local grocery stores, farms, and food donors with soup kitchens and shelters to reduce waste and eliminate local food insecurity.
          </p>

          <div className="auth-stats-grid">
            <div className="auth-stat-card">
              <span className="auth-stat-value">34k kg+</span>
              <span className="auth-stat-label">Food Rescued</span>
            </div>
            <div className="auth-stat-card">
              <span className="auth-stat-value">65k+</span>
              <span className="auth-stat-label">Meals Provided</span>
            </div>
            <div className="auth-stat-card">
              <span className="auth-stat-value">124</span>
              <span className="auth-stat-label">Active Donors</span>
            </div>
            <div className="auth-stat-card">
              <span className="auth-stat-value">45</span>
              <span className="auth-stat-label">Soup Kitchens</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right split screen column - form widget */}
      <div className="auth-right">
        <div className="auth-card">
          <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Welcome back
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
              Please enter your details to sign in
            </p>
          </div>

          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
            >
              Sign In
            </button>
            <button 
              className={`tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => { setActiveTab('register'); setError(''); setSuccess(''); }}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="badge badge-rejected" style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'block', textAlign: 'center', textTransform: 'none' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="badge badge-approved" style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'block', textAlign: 'center', textTransform: 'none' }}>
              {success}
            </div>
          )}

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
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name / Organization</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Local Harvest Coop"
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
              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Account Role</label>
                <select 
                  className="form-control" 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="donor">Food Donor (Stores, Farms)</option>
                  <option value="soup_kitchen">Soup Kitchen (Recipient)</option>
                </select>
              </div>
              
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Select Base Geolocation Coordinates</label>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                  Click on the map to set your location pin
                </p>
                <div className="map-container">
                  <LeafletMap 
                    lat={lat} 
                    lng={lng} 
                    onChange={(newLat, newLng) => {
                      setLat(newLat);
                      setLng(newLng);
                    }}
                    markerLabel="Registration Location"
                  />
                </div>
                <div className="form-row" style={{ marginTop: '0.75rem' }}>
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

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} disabled={loading}>
                {loading ? 'Creating Account...' : 'Register Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
