import { useState, useEffect, lazy, Suspense, createContext, useContext, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LoginRegister from './pages/LoginRegister';
import { Home, MapPin, BarChart3, LogOut, Menu, X, Sun, Moon } from 'lucide-react';

const ToastContext = createContext(null);
const SearchContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

const DonorDashboard = lazy(() => import('./pages/DonorDashboard'));
const KitchenDashboard = lazy(() => import('./pages/KitchenDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const RoutingMap = lazy(() => import('./pages/RoutingMap'));
const ReputationLedgerPage = lazy(() => import('./pages/ReputationLedgerPage'));

// Error Boundary for dynamic chunk import failures and runtime crashes
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', marginTop: '4rem', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <h2 style={{ color: 'var(--danger-color)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>Failed to load section</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            We encountered a network or dynamic resource loading error.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.6rem 1rem' }}
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const navigate = useNavigate();
  const location = useLocation();
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'New listing "Basmati Rice" approved by Admin', type: 'info', time: '10m ago', unread: true },
    { id: 2, text: 'Reputation milestone! You reached 40 points', type: 'success', time: '1h ago', unread: true },
    { id: 3, text: 'System update: Geo-proximate sorting is active', type: 'info', time: '1d ago', unread: false }
  ]);
  const bellRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    addToast('All notifications marked as read', 'info');
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && ['donor', 'soup_kitchen', 'admin'].includes(parsed.role)) {
          setUser(parsed);
        } else {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    } else {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    addToast('Logged out successfully.', 'info');
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
    <ToastContext.Provider value={{ addToast }}>
      <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
        <div className="toast-notification-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast-notification-item ${t.type}`}>
            <span>{t.message}</span>
            <button 
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="app-container">
        {user && (
        <>
          {/* Mobile header bar */}
          <div className="mobile-header">
            <div className="brand">
              <span>🌱</span> Food Portal
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.6rem' }} 
                onClick={toggleTheme}
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.6rem' }}
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Left Sidebar navigation */}
          <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-brand">
              <span>🌱</span> Food Portal
            </div>

            <nav className="sidebar-nav">
              {user.role === 'donor' && (
                <Link to="/donor" className={`sidebar-link ${location.pathname === '/donor' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                  <Home size={18} />
                  <span>My Listings</span>
                </Link>
              )}
              {user.role === 'soup_kitchen' && (
                <>
                  <Link to="/kitchen" className={`sidebar-link ${location.pathname === '/kitchen' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                    <Home size={18} />
                    <span>Dashboard</span>
                  </Link>
                  <Link to="/map" className={`sidebar-link ${location.pathname === '/map' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                    <MapPin size={18} />
                    <span>Routing Map</span>
                  </Link>
                </>
              )}
              {user.role === 'admin' && (
                <>
                  <Link to="/admin" className={`sidebar-link ${location.pathname === '/admin' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                    <Home size={18} />
                    <span>Admin Panel</span>
                  </Link>
                  <Link to="/map" className={`sidebar-link ${location.pathname === '/map' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                    <MapPin size={18} />
                    <span>Routing Map</span>
                  </Link>
                  <Link to="/ledger" className={`sidebar-link ${location.pathname === '/ledger' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                    <BarChart3 size={18} />
                    <span>Reputation Ledger</span>
                  </Link>
                </>
              )}
            </nav>

            <div className="theme-switch-container">
              <span className="theme-switch-label">
                {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
              </span>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={theme === 'light'} 
                  onChange={toggleTheme} 
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="sidebar-user">
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role-badge">{user.role.replace('_', ' ')}</span>
              </div>
              <button className="btn btn-secondary" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }} onClick={handleLogout}>
                <LogOut size={14} style={{ marginRight: '0.25rem' }} />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="main-viewport" style={!user ? { marginLeft: 0, width: '100vw', padding: 0 } : {}}>
        {user && (
          <header className="top-header">
            <div className="search-container">
              <input 
                ref={searchInputRef}
                type="text" 
                className="search-input" 
                placeholder="Search anything..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery ? (
                <button 
                  className="search-clear-btn" 
                  onClick={() => setSearchQuery('')}
                  style={{ 
                    position: 'absolute', 
                    right: '10px', 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--text-tertiary)', 
                    cursor: 'pointer', 
                    fontSize: '0.8rem',
                    padding: '4px'
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              ) : (
                <kbd className="search-kbd">Ctrl /</kbd>
              )}
            </div>
            <div className="header-right">
              {/* Notification Bell Container */}
              <div className="header-dropdown-wrapper" ref={bellRef}>
                <button 
                  className={`notification-bell-btn ${showNotifications ? 'active' : ''}`} 
                  title="Notifications"
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowProfileMenu(false);
                  }}
                >
                  <span>🔔</span>
                  {notifications.filter(n => n.unread).length > 0 && (
                    <span className="bell-badge">{notifications.filter(n => n.unread).length}</span>
                  )}
                </button>

                {showNotifications && (
                  <div className="header-dropdown-menu notification-menu">
                    <div className="dropdown-header">
                      <h3>Notifications</h3>
                      {notifications.filter(n => n.unread).length > 0 && (
                        <button onClick={markAllNotificationsRead} className="btn-text-link">Mark all as read</button>
                      )}
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-list">
                      {notifications.length === 0 ? (
                        <div className="dropdown-empty-state">
                          <p>No new notifications</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`dropdown-item notification-item ${n.unread ? 'unread' : ''}`}>
                            <div className="notification-icon">
                              {n.type === 'success' ? '✅' : n.type === 'warning' ? '⚠️' : 'ℹ️'}
                            </div>
                            <div className="notification-content">
                              <p className="notification-text">{n.text}</p>
                              <span className="notification-time">{n.time}</span>
                            </div>
                            {n.unread && <span className="unread-dot"></span>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Avatar Container */}
              <div className="header-dropdown-wrapper" ref={profileRef}>
                <div 
                  className={`profile-avatar-block clickable ${showProfileMenu ? 'active' : ''}`}
                  onClick={() => {
                    setShowProfileMenu(!showProfileMenu);
                    setShowNotifications(false);
                  }}
                >
                  <div className="avatar-circle-green">
                    {user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                  </div>
                  <div className="profile-meta">
                    <span className="profile-name-lbl">{user.name}</span>
                    <span className="profile-role-lbl">{user.role.replace('_', ' ')}</span>
                  </div>
                  <span className="profile-chevron" style={{ marginLeft: '0.4rem', fontSize: '0.65rem', opacity: 0.7 }}>▼</span>
                </div>

                {showProfileMenu && (
                  <div className="header-dropdown-menu profile-menu">
                    <div className="profile-dropdown-user-details">
                      <p className="user-name-full">{user.name}</p>
                      <p className="user-email-full">{user.email || 'user@portal.com'}</p>
                      <span className="user-role-badge-pill">{user.role.replace('_', ' ')}</span>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-menu-item" onClick={() => addToast('Profile settings are managed by your administrator.', 'info')}>
                      👤 My Profile
                    </button>
                    <button className="dropdown-menu-item" onClick={() => addToast('System is up to date and secured.', 'info')}>
                      ⚙️ Account Settings
                    </button>
                    <button className="dropdown-menu-item" onClick={toggleTheme}>
                      <span>{theme === 'dark' ? '☀️' : '🌙'}</span> {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    </button>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-menu-item logout-item" onClick={handleLogout}>
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}
        <div className={user ? "main-viewport-content" : ""}>
          <ErrorBoundary>
            <Suspense fallback={
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
              </div>
            }>
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
                path="/ledger" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ReputationLedgerPage user={user} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="*" 
                element={<Navigate to={user ? (user.role === 'donor' ? '/donor' : user.role === 'soup_kitchen' ? '/kitchen' : '/admin') : '/login'} replace />} 
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
        </div>
      </main>
    </div>
      </SearchContext.Provider>
    </ToastContext.Provider>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
