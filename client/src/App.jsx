import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Sprout, LayoutDashboard, MapPin, Shield, Sun, Moon, LogOut, UtensilsCrossed, Award, Truck } from 'lucide-react';
import LoginRegister from './pages/LoginRegister';
import DonorDashboard from './pages/DonorDashboard';
import KitchenDashboard from './pages/KitchenDashboard';
import AdminDashboard from './pages/AdminDashboard';
import RoutingMap from './pages/RoutingMap';
import ReputationLedgerPage from './pages/ReputationLedgerPage';
import DispatchView from './pages/DispatchView';
import NotificationBell from './components/NotificationBell';

/* ── Animated page wrapper ── */
function PageTransition({ children, locationKey }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('page-enter');
    void el.offsetWidth; // force reflow
    el.classList.add('page-enter');
  }, [locationKey]);
  return (
    <div ref={ref} className="page-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}

function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function AppContent() {
  const [user, setUser]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token     = localStorage.getItem('token');
    if (savedUser && token) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  useEffect(() => {
    const cls = theme === 'dark' ? 'dark-theme' : 'light-theme';
    document.body.className            = cls;
    document.documentElement.className = cls;
    document.documentElement.style.backgroundColor = 'var(--bg-canvas)';
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(p => p === 'light' ? 'dark' : 'light');

  const handleLogin  = (userData) => setUser(userData);
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  /* Loading screen */
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1.25rem' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 500 }}>
          Loading SurplusLink…
        </p>
      </div>
    );
  }

  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      const to = user.role === 'donor' ? '/donor' : user.role === 'soup_kitchen' ? '/kitchen' : '/admin';
      return <Navigate to={to} replace />;
    }
    return children;
  };

  const homePath = !user ? '/login'
    : user.role === 'donor' ? '/donor'
    : user.role === 'soup_kitchen' ? '/kitchen'
    : '/admin';

  return (
    <div className="app-container">
      {/* ── Navbar ── */}
      {user && (
        <header className="navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to={homePath} className="brand">
              <div className="brand-icon"><Sprout size={18} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>SurplusLink</span>
                <span className="brand-badge" style={{ fontSize: '0.62rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Enterprise</span>
              </div>
            </Link>

            <div className="hub-live-badge" title="Real-time 15km Proximity Logistics Online">
              <span className="hub-live-dot" />
              <span>Regional Network Active</span>
            </div>
          </div>

          <nav className="nav-links">
            {user.role === 'donor' && (
              <>
                <Link to="/donor" className={`nav-link ${location.pathname === '/donor' ? 'active' : ''}`}>
                  <UtensilsCrossed size={15} />
                  <span>Donor Operations</span>
                </Link>
                <Link to="/map" className={`nav-link ${location.pathname === '/map' ? 'active' : ''}`}>
                  <MapPin size={15} />
                  <span>Routing Map</span>
                </Link>
                <Link to="/dispatch" className={`nav-link ${location.pathname === '/dispatch' ? 'active' : ''}`}>
                  <Truck size={15} />
                  <span>Dispatch Console</span>
                </Link>
                <Link to="/ledger" className={`nav-link ${location.pathname === '/ledger' ? 'active' : ''}`}>
                  <Award size={15} />
                  <span>Trust Directory</span>
                </Link>
              </>
            )}

            {user.role === 'soup_kitchen' && (
              <>
                <Link to="/kitchen" className={`nav-link ${location.pathname === '/kitchen' ? 'active' : ''}`}>
                  <LayoutDashboard size={15} />
                  <span>Kitchen Portal</span>
                </Link>
                <Link to="/map" className={`nav-link ${location.pathname === '/map' ? 'active' : ''}`}>
                  <MapPin size={15} />
                  <span>Routing Map</span>
                </Link>
                <Link to="/dispatch" className={`nav-link ${location.pathname === '/dispatch' ? 'active' : ''}`}>
                  <Truck size={15} />
                  <span>Dispatch Console</span>
                </Link>
                <Link to="/ledger" className={`nav-link ${location.pathname === '/ledger' ? 'active' : ''}`}>
                  <Award size={15} />
                  <span>Trust Directory</span>
                </Link>
              </>
            )}

            {user.role === 'admin' && (
              <>
                <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
                  <Shield size={15} />
                  <span>Governance</span>
                </Link>
                <Link to="/map" className={`nav-link ${location.pathname === '/map' ? 'active' : ''}`}>
                  <MapPin size={15} />
                  <span>Routing Map</span>
                </Link>
                <Link to="/dispatch" className={`nav-link ${location.pathname === '/dispatch' ? 'active' : ''}`}>
                  <Truck size={15} />
                  <span>Dispatch Console</span>
                </Link>
                <Link to="/ledger" className={`nav-link ${location.pathname === '/ledger' ? 'active' : ''}`}>
                  <Award size={15} />
                  <span>Trust Directory</span>
                </Link>
              </>
            )}

            {/* Notification Bell */}
            <NotificationBell />

            {/* User pill with initials avatar */}
            <div className="user-badge" title={`Signed in as ${user.name} (${user.role.replace('_', ' ')})`}>
              <div className="user-avatar">{getInitials(user.name)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: 700 }}>
                  {user.name}
                </span>
                <span className="role-tag" style={{ fontSize: '0.62rem', marginTop: '1px' }}>{user.role.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="btn btn-secondary btn-sm"
              style={{ minWidth: '34px', padding: '0.38rem 0.55rem' }}
              title={theme === 'light' ? 'Dark mode' : 'Light mode'}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>

            {/* Logout */}
            <button
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.38rem 0.75rem', gap: '0.35rem' }}
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </nav>
        </header>
      )}

      {/* Floating theme toggle (logged-out) */}
      {!user && (
        <button
          onClick={toggleTheme}
          className="theme-toggle-floating"
          title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
      )}

      {/* ── Routes with page transition ── */}
      <Routes>
        <Route
          path="/login"
          element={user
            ? <Navigate to={homePath} replace />
            : <PageTransition locationKey="login"><LoginRegister onLogin={handleLogin} /></PageTransition>}
        />

        <Route
          path="/donor"
          element={
            <ProtectedRoute allowedRoles={['donor']}>
              <PageTransition locationKey="donor"><DonorDashboard user={user} /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/kitchen"
          element={
            <ProtectedRoute allowedRoles={['soup_kitchen']}>
              <PageTransition locationKey="kitchen"><KitchenDashboard user={user} /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PageTransition locationKey="admin"><AdminDashboard user={user} /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/map"
          element={
            <ProtectedRoute allowedRoles={['donor', 'soup_kitchen', 'admin']}>
              <PageTransition locationKey="map"><RoutingMap user={user} /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dispatch"
          element={
            <ProtectedRoute allowedRoles={['donor', 'soup_kitchen', 'admin']}>
              <PageTransition locationKey="dispatch"><DispatchView user={user} /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ledger"
          element={
            <ProtectedRoute allowedRoles={['donor', 'soup_kitchen', 'admin']}>
              <PageTransition locationKey="ledger"><ReputationLedgerPage user={user} /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to={homePath} replace />} />
      </Routes>

      {/* Product Footer */}
      {user && (
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-left">
              <span className="footer-brand"><Sprout size={15} color="var(--primary-500)" /> SurplusLink Enterprise</span>
              <span className="footer-desc">Civic Surplus Food Routing &amp; Hunger-Relief Logistics Infrastructure</span>
            </div>
            <div className="footer-right">
              <span className="footer-status-tag">● Regional Hub Active (15 km Radius)</span>
              <span className="footer-cert">FEFO Decay Prioritization · Cryptographic OTP Custody</span>
            </div>
          </div>
        </footer>
      )}
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
