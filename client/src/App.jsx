import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import LoginRegister from './pages/LoginRegister';
import DonorDashboard from './pages/DonorDashboard';
import KitchenDashboard from './pages/KitchenDashboard';
import AdminDashboard from './pages/AdminDashboard';
import RoutingMap from './pages/RoutingMap';

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const className = theme === 'light' ? 'light-theme' : '';
    document.body.className = className;
    document.documentElement.className = className;
    document.documentElement.style.backgroundColor = theme === 'light' ? '#FFFFFF' : '#000000';
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(16, 185, 129, 0.2)', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Loading application...</p>
      </div>
    );
  }

  // Route protection helper
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirect to correct dashboard based on actual role
      const redirectPath = user.role === 'donor' ? '/donor' : user.role === 'soup_kitchen' ? '/kitchen' : '/admin';
      return <Navigate to={redirectPath} replace />;
    }
    return children;
  };

  return (
    <div className="app-container">
      {user && (
        <header className="navbar glass-panel">
          <Link to="/" className="brand">
            <span style={{ fontSize: '1.4rem' }}>🌱</span>
            <span>Community Food Portal</span>
          </Link>
          <nav className="nav-links">
            {user.role === 'donor' && (
              <Link to="/donor" className={`nav-link ${location.pathname === '/donor' ? 'active' : ''}`}>
                My Listings
              </Link>
            )}
            {user.role === 'soup_kitchen' && (
              <>
                <Link to="/kitchen" className={`nav-link ${location.pathname === '/kitchen' ? 'active' : ''}`}>
                  Dashboard
                </Link>
                <Link to="/map" className={`nav-link ${location.pathname === '/map' ? 'active' : ''}`}>
                  Pickup Route Support
                </Link>
              </>
            )}
            {user.role === 'admin' && (
              <>
                <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
                  Admin Panel
                </Link>
                <Link to="/map" className={`nav-link ${location.pathname === '/map' ? 'active' : ''}`}>
                  Pickup Route Support
                </Link>
              </>
            )}
            <div className="user-badge">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
              <span className="role-tag">{user.role.replace('_', ' ')}</span>
            </div>
            <button 
              onClick={toggleTheme} 
              className="btn btn-secondary" 
              style={{ padding: '0.45rem 0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem', minWidth: '40px' }}
              title={theme === 'light' ? 'Switch to Obsidian Dark' : 'Switch to Clean Light'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.45rem 0.95rem' }} onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </header>
      )}

      {!user && (
        <button 
          onClick={toggleTheme} 
          className="theme-toggle-floating"
          title={theme === 'light' ? 'Toggle Dark Mode' : 'Toggle Light Mode'}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      )}

      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to={user.role === 'donor' ? '/donor' : user.role === 'soup_kitchen' ? '/kitchen' : '/admin'} replace /> : <LoginRegister onLogin={handleLogin} />} 
        />
        
        <Route 
          path="/donor" 
          element={
            <ProtectedRoute allowedRoles={['donor']}>
              <DonorDashboard user={user} />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/kitchen" 
          element={
            <ProtectedRoute allowedRoles={['soup_kitchen']}>
              <KitchenDashboard user={user} />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard user={user} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/map" 
          element={
            <ProtectedRoute allowedRoles={['soup_kitchen', 'admin']}>
              <RoutingMap user={user} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="*" 
          element={<Navigate to={user ? (user.role === 'donor' ? '/donor' : user.role === 'soup_kitchen' ? '/kitchen' : '/admin') : '/login'} replace />} 
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
