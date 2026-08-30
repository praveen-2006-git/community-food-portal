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
    <div className="auth-page">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <h2 className="auth-title">Community Food Portal</h2>
          <p className="auth-subtitle">Connecting surplus food with soup kitchens</p>
        </div>

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
          >
            Login
          </button>
          <button 
            className={`tab ${activeTab === 'register' ? 'active' : ''}`}
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
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
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
                placeholder="e.g. Local Supermarket"
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
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
                  <input 
                    type="checkbox" 
                    id="auth-to-donate"
                    required
                    checked={authorityToDonate}
                    onChange={(e) => setAuthorityToDonate(e.target.checked)}
                  />
                  <label htmlFor="auth-to-donate" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    I confirm that I have the authority to donate this food.
                  </label>
                </div>
              </>
            )}
            
            <div className="form-group">
              <label className="form-label">Select Location (Click on map or type manually)</label>
              <div className="map-container">
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
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Latitude</label>
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
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Longitude</label>
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
