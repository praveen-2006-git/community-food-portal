import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading application...</p>
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
          <div className="brand">
            🌱 Community Food Portal
          </div>
          <nav className="nav-links">
            {user.role === 'donor' && (
              <Link to="/donor" className="nav-link">My Listings</Link>
            )}
            {user.role === 'soup_kitchen' && (
              <>
                <Link to="/kitchen" className="nav-link">Dashboard</Link>
                <Link to="/map" className="nav-link">Pickup Route Support</Link>
              </>
            )}
            {user.role === 'admin' && (
              <>
                <Link to="/admin" className="nav-link">Admin Panel</Link>
                <Link to="/map" className="nav-link">Pickup Route Support</Link>
              </>
            )}
            <div className="user-badge">
              <span>{user.name}</span>
              <span className="role-tag">{user.role.replace('_', ' ')}</span>
            </div>
            <button 
              onClick={toggleTheme} 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}
              title={theme === 'light' ? 'Toggle Dark Mode' : 'Toggle Light Mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={handleLogout}>
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
