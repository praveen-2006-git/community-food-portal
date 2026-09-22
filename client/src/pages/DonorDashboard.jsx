import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit3, UtensilsCrossed, HeartHandshake, Leaf, ShieldCheck, Clock, Calendar, MapPin, Thermometer, CheckCircle2, AlertTriangle, X, Search } from 'lucide-react';
import LeafletMap from '../components/LeafletMap';
import CustodyRibbon from '../components/CustodyRibbon';
import ConfirmDialog from '../components/ConfirmDialog';
import { CategoryChip, StorageChip } from '../utils/categoryIcons';
import { API_BASE_URL } from '../config/api';

export default function DonorDashboard({ user }) {
  const [ingredients, setIngredients] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Current Editing Ingredient
  const [currentIngredient, setCurrentIngredient] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Vegetables');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [expiryDate, setExpiryDate] = useState('');
  const [pickupDeadline, setPickupDeadline] = useState('');
  const [storageType, setStorageType] = useState('Ambient');
  const [lat, setLat] = useState(user?.location?.lat || 11.5034);
  const [lng, setLng] = useState(user?.location?.lng || 77.2444);
  const [donorDeclaration, setDonorDeclaration] = useState(false);

  const token = localStorage.getItem('token');
  const [stats, setStats] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [enteredCodes, setEnteredCodes] = useState({});
  const [confirmedChecks, setConfirmedChecks] = useState({});

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/stats/donor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) {
      console.error('Error fetching donor stats:', err);
    }
  };

  const fetchReservations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reservations/donor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setReservations(data);
    } catch (err) {
      console.error('Error fetching donor reservations:', err);
    }
  };

  const fetchMyIngredients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ingredients/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch ingredients.');
      setIngredients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPickup = async (resId) => {
    setError('');
    setSuccess('');
    const code = enteredCodes[resId];
    if (!code) {
      setError('Please enter the 6-digit pickup OTP provided by the collector.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/reservations/${resId}/verify-pickup`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enteredCode: code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed.');
      
      setSuccess('Pickup OTP verified successfully! Please tick the confirmation checkbox to complete the handover.');
      fetchReservations();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkPickedUp = async (resId) => {
    setError('');
    setSuccess('');
    if (!confirmedChecks[resId]) {
      setError('You must confirm the handover checkbox first.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/reservations/${resId}/delivery-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deliveryStatus: 'picked_up' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status.');

      setSuccess('Food handover recorded successfully. Custody logged in ledger.');
      fetchReservations();
      fetchMyIngredients();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchMyIngredients();
    fetchStats();
    fetchReservations();
  }, []);

  // Escape key closes modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showAddModal) setShowAddModal(false);
        if (showEditModal) setShowEditModal(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAddModal, showEditModal]);

  const resetForm = () => {
    setName('');
    setCategory('Vegetables');
    setQuantity('');
    setUnit('kg');
    setExpiryDate('');
    setPickupDeadline('');
    setStorageType('Ambient');
    setLat(user?.location?.lat || 11.5034);
    setLng(user?.location?.lng || 77.2444);
    setDonorDeclaration(false);
    setError('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          category,
          quantity: parseFloat(quantity),
          unit,
          expiryDate: new Date(expiryDate),
          pickupDeadline: new Date(pickupDeadline),
          storageType,
          location: { lat: parseFloat(lat), lng: parseFloat(lng) },
          donorDeclaration
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to create listing.');

      setSuccess('Surplus ingredient listed successfully! Awaiting admin quality validation.');
      setShowAddModal(false);
      fetchMyIngredients();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenEditModal = (ing) => {
    setError('');
    setSuccess('');
    setCurrentIngredient(ing);
    setName(ing.name);
    setCategory(ing.category);
    setQuantity(ing.quantity);
    setUnit(ing.unit);
    setExpiryDate(new Date(ing.expiryDate).toISOString().split('T')[0]);
    setPickupDeadline(new Date(ing.pickupDeadline).toISOString().split('T')[0]);
    setStorageType(ing.storageType);
    setLat(ing.location.lat);
    setLng(ing.location.lng);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/ingredients/${currentIngredient._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          category,
          quantity: parseFloat(quantity),
          unit,
          expiryDate: new Date(expiryDate),
          pickupDeadline: new Date(pickupDeadline),
          storageType,
          location: { lat: parseFloat(lat), lng: parseFloat(lng) }
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to update listing.');

      setSuccess('Surplus listing updated successfully.');
      setShowEditModal(false);
      fetchMyIngredients();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setError('');
    setSuccess('');
    setDeleteLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ingredients/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to delete listing.');

      setSuccess('Listing removed successfully.');
      setDeleteConfirmId(null);
      fetchMyIngredients();
      fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getUrgency = (dateStr) => {
    if (!dateStr) return null;
    const diffHours = (new Date(dateStr) - new Date()) / (1000 * 60 * 60);
    if (diffHours < 0) return { label: 'Expired', className: 'urgency-critical' };
    if (diffHours < 24) return { label: `Expires in ${Math.max(1, Math.round(diffHours))}h`, className: 'urgency-critical' };
    const diffDays = Math.round(diffHours / 24);
    if (diffDays <= 3) return { label: `Expires in ${diffDays}d`, className: 'urgency-warning' };
    return { label: `${diffDays}d left`, className: 'urgency-safe' };
  };

  const pendingPickupsCount = reservations.filter(r => ['claimed', 'pickup_scheduled'].includes(r.deliveryStatus)).length;

  return (
    <div className="main-content">
      {/* Workspace Header */}
      <div className="workspace-header animate-fade-up">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <span className="chip chip-green" style={{ fontSize: '0.7rem', fontWeight: 800 }}>
              ● Verified Food Donor
            </span>
          </div>
          <h1 className="dashboard-title">Food Donor Operations</h1>
          <p className="dashboard-subtitle" style={{ maxWidth: '600px' }}>
            Manage surplus inventory, coordinate kitchen collections, and confirm verified handovers to local soup kitchens.
          </p>
        </div>
        <div>
          <button 
            className="btn btn-primary btn-lg" 
            onClick={handleOpenAddModal}
            disabled={stats && stats.isActive === false}
          >
            <Plus size={18} />
            <span>Post Surplus Batch</span>
          </button>
        </div>
      </div>

      {/* Action Banner for Pending Pickups */}
      {pendingPickupsCount > 0 && (
        <div className="alert animate-fade-up" style={{ background: 'var(--accent-amber-bg)', border: '1px solid var(--accent-amber-border)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Clock size={18} style={{ flexShrink: 0, color: 'var(--accent-amber)' }} />
            <span><strong>Action Required:</strong> You have {pendingPickupsCount} reserved batch{pendingPickupsCount > 1 ? 'es' : ''} awaiting OTP verification and physical handover.</span>
          </div>
          <a href="#pickup-queue" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Jump to Pickup Station
          </a>
        </div>
      )}

      {/* Account Alerts */}
      {stats && stats.isActive === false && (
        <div className="alert alert-danger">
          <AlertTriangle size={18} />
          <span><strong>Account Suspended:</strong> Your donor account has been deactivated due to low reputation or quality infractions. Please contact the administrator.</span>
        </div>
      )}
      {stats && stats.isActive !== false && stats.reputationScore >= 40 && stats.reputationScore <= 60 && (
        <div className="alert" style={{ background: 'var(--accent-amber-bg)', border: '1px solid var(--accent-amber-border)', color: '#B45309' }}>
          <AlertTriangle size={18} />
          <span><strong>Low Reputation Advisory:</strong> Your current trust score is {stats.reputationScore}/100. Please ensure all donated items strictly comply with storage and expiry standards.</span>
        </div>
      )}

      {/* Community Activity & Impact Overview */}
      {!stats ? (
        <div className="telemetry-grid animate-fade-up-delay-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton skeleton-stat" style={{ height: '110px' }} />
          ))}
        </div>
      ) : (
        <div className="telemetry-grid animate-fade-up-delay-1">
          <div className="telemetry-card">
            <div className="telemetry-top">
              <div className="telemetry-icon-well" style={{ background: 'var(--surface-active)', color: 'var(--primary-500)' }}>
                <UtensilsCrossed size={20} />
              </div>
              <span className="telemetry-trend" style={{ background: 'var(--surface-active)', color: 'var(--primary-600)' }}>Active Inventory</span>
            </div>
            <div>
              <div className="telemetry-val">{stats.totalIngredients}</div>
              <div className="telemetry-lbl">Active Surplus Batches</div>
            </div>
          </div>

          <div className="telemetry-card">
            <div className="telemetry-top">
              <div className="telemetry-icon-well" style={{ background: 'var(--surface-info)', color: 'var(--accent-blue)' }}>
                <CheckCircle2 size={20} />
              </div>
              <span className="telemetry-trend" style={{ background: 'var(--surface-info)', color: 'var(--accent-blue)' }}>Confirmed Handover</span>
            </div>
            <div>
              <div className="telemetry-val" style={{ color: 'var(--accent-blue)' }}>{stats.totalFulfilled}</div>
              <div className="telemetry-lbl">Fulfilled Distributions</div>
            </div>
          </div>

          <div className="telemetry-card">
            <div className="telemetry-top">
              <div className="telemetry-icon-well" style={{ background: 'var(--surface-warning)', color: 'var(--accent-amber)' }}>
                <Clock size={20} />
              </div>
              <span className="telemetry-trend" style={{ background: 'var(--surface-warning)', color: 'var(--accent-amber)' }}>Pickup Scheduled</span>
            </div>
            <div>
              <div className="telemetry-val" style={{ color: 'var(--accent-amber)' }}>
                {reservations.filter(r => r.deliveryStatus !== 'completed' && r.deliveryStatus !== 'cancelled').length}
              </div>
              <div className="telemetry-lbl">Active Reservations</div>
            </div>
          </div>

          <div className="telemetry-card">
            <div className="telemetry-top">
              <div className="telemetry-icon-well" style={{ background: stats.reputationScore >= 60 ? 'var(--surface-active)' : 'var(--surface-warning)', color: stats.reputationScore >= 60 ? 'var(--primary-500)' : 'var(--accent-amber)' }}>
                <ShieldCheck size={20} />
              </div>
              <span className="telemetry-trend" style={{ background: stats.reputationScore >= 60 ? 'var(--surface-active)' : 'var(--surface-warning)', color: stats.reputationScore >= 60 ? 'var(--primary-600)' : 'var(--accent-amber)' }}>
                {stats.reputationScore >= 60 ? 'Certified Trusted' : 'Needs Attention'}
              </span>
            </div>
            <div>
              <div className="telemetry-val" style={{ color: stats.reputationScore >= 60 ? 'var(--primary-500)' : stats.reputationScore >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                {stats.reputationScore} <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>/ 100</span>
              </div>
              <div className="telemetry-lbl">Community Trust Score</div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Active Listings Section */}
      <div className="animate-fade-up" style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Your Surplus Food Batches</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '0.15rem' }}>Currently active, pending, and reserved food batches</p>
          </div>
          <span className="status-badge" style={{ fontSize: '0.75rem' }}>
            {ingredients.length} Total Batches
          </span>
        </div>

        {/* Filter and Search Toolbar */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="segmented-control-modern" role="tablist">
            <button
              type="button"
              className={`segmented-btn-modern ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Batches ({ingredients.length})
            </button>
            <button
              type="button"
              className={`segmented-btn-modern ${statusFilter === 'available' ? 'active' : ''}`}
              onClick={() => setStatusFilter('available')}
            >
              Available ({ingredients.filter(i => i.status === 'available').length})
            </button>
            <button
              type="button"
              className={`segmented-btn-modern ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending ({ingredients.filter(i => i.status === 'pending').length})
            </button>
            <button
              type="button"
              className={`segmented-btn-modern ${statusFilter === 'claimed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('claimed')}
            >
              Reserved ({ingredients.filter(i => ['claimed', 'pickup_scheduled'].includes(i.status)).length})
            </button>
          </div>

          <div style={{ position: 'relative', minWidth: '200px', maxWidth: '280px', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search your batches…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.1rem', fontSize: '0.82rem', height: '34px' }}
            />
          </div>
        </div>

        {loading && (
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
          </div>
        )}

        {!loading && ingredients.length === 0 ? (
          <div className="glass-panel empty-state">
            <div className="empty-state-icon"><UtensilsCrossed size={24} /></div>
            <p className="empty-state-title">No Active Surplus Batches</p>
            <p className="empty-state-desc">
              You haven't listed any food surplus yet. Upload ingredients from your kitchen, bakery, or store to connect with nearby hunger-relief centers.
            </p>
            <button className="btn btn-primary btn-sm" onClick={handleOpenAddModal} style={{ marginTop: '0.5rem' }}>
              <Plus size={15} />
              <span>Post Your First Batch</span>
            </button>
          </div>
        ) : !loading && ingredients.length > 0 && (() => {
          const filtered = ingredients.filter(ing => {
            let matchStatus = true;
            if (statusFilter === 'available') matchStatus = ing.status === 'available';
            else if (statusFilter === 'pending') matchStatus = ing.status === 'pending';
            else if (statusFilter === 'claimed') matchStatus = ['claimed', 'pickup_scheduled'].includes(ing.status);
            const matchSearch = !searchQuery || 
              ing.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
              ing.category?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchStatus && matchSearch;
          });

          if (filtered.length === 0) {
            return (
              <div className="glass-panel empty-state" style={{ padding: '2rem 1rem' }}>
                <p className="empty-state-title">No matching batches</p>
                <p className="empty-state-desc">Try clearing your search query or status filter.</p>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}>
                  Reset Filters
                </button>
              </div>
            );
          }

          return (
            <div className="listings-grid">
              {filtered.map((ing) => {
                const urg = getUrgency(ing.expiryDate);
                const diffHours = (new Date(ing.expiryDate) - new Date()) / (1000 * 60 * 60);
                const pct = Math.max(8, Math.min(100, (diffHours / 72) * 100));
                const fillClass = diffHours < 24 ? 'expiry-fill-critical' : diffHours < 48 ? 'expiry-fill-warning' : 'expiry-fill-safe';

                return (
                  <div key={ing._id} className="modern-food-card">
                    <div className="modern-food-header">
                      <div className="food-title-group">
                        <h3>{ing.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                          <CategoryChip category={ing.category} />
                          <StorageChip condition={ing.storageType} />
                          {urg && <span className={`urgency-badge ${urg.className}`}>{urg.label}</span>}
                        </div>
                      </div>
                      <div className="food-quantity-badge">
                        {ing.quantity} {ing.unit}
                      </div>
                    </div>

                    {/* Expiry Timeline countdown box */}
                    <div className="expiry-timeline-box">
                      <div className="expiry-timeline-labels">
                        <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                          Decay Timeline (FEFO)
                        </span>
                        <span style={{ color: diffHours < 24 ? 'var(--accent-rose)' : diffHours < 48 ? 'var(--accent-amber)' : 'var(--primary-600)' }}>
                          {formatDate(ing.expiryDate)}
                        </span>
                      </div>
                      <div className="expiry-track" title={`Shelf life: ~${Math.max(0, Math.round(diffHours))}h remaining`}>
                        <div className={fillClass} style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Status:</span>
                        <span className={`status-badge status-${ing.status}`}>
                          {ing.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Pickup Deadline:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(ing.pickupDeadline)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.45rem', marginTop: '0.2rem' }}>
                        <span>Facility Dispatch:</span>
                        <a
                          href={`https://www.google.com/maps?q=${ing.location.lat},${ing.location.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`GPS: ${ing.location.lat.toFixed(4)}, ${ing.location.lng.toFixed(4)}`}
                          style={{ fontSize: '0.78rem', color: 'var(--primary-600)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
                        >
                          <MapPin size={12} />
                          <span>Dispatch Pin</span>
                        </a>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.45rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                        onClick={() => handleOpenEditModal(ing)}
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                      <Link
                        to="/map"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                        title="View on routing map"
                      >
                        <MapPin size={13} color="var(--primary-600)" />
                      </Link>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-rose)' }}
                        onClick={() => handleDelete(ing._id)}
                        title="Delete batch"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        );
      })()}
      </div>

      {/* Pending Pickups & Verified Handover Section */}
      <div id="pickup-queue" className="card-pro animate-fade-up animate-fade-up-delay-1" style={{ padding: '1.75rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <span className="chip chip-green" style={{ fontSize: '0.7rem', fontWeight: 800 }}>
                ● Verified Handover Station
              </span>
              <span className="chip chip-neutral" style={{ fontSize: '0.7rem' }}>
                Cryptographic Custody
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Live Pickup &amp; Custody Verification
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.25rem' }}>
              Verify collector 6-digit OTP codes and confirm physical transfer of reserved surplus food.
            </p>
          </div>
          <span className="status-badge status-pickup_scheduled" style={{ fontSize: '0.8rem' }}>
            {reservations.length} Pending Handover{reservations.length === 1 ? '' : 's'}
          </span>
        </div>

        {reservations.length === 0 ? (
          <div className="glass-panel empty-state">
            <div className="empty-state-icon"><Clock size={24} /></div>
            <p className="empty-state-title">No Active Reservations</p>
            <p className="empty-state-desc">No soup kitchen reservations currently pending pickup.</p>
          </div>
        ) : (
          <div className="listings-grid">
            {reservations.map((res) => {
              const req = res.requestRef;
              const ing = req?.ingredientRef;
              const isConfirmed = res.pickupConfirmedByDonor;
              const isChecked = !!confirmedChecks[res._id];

              return (
                <div key={res._id} className="modern-food-card" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
                  <div className="modern-food-header">
                    <div className="food-title-group">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <h3>{ing?.name || 'Surplus Ingredient'}</h3>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                        <span className="chip chip-neutral" style={{ fontSize: '0.72rem' }}>{ing?.category || 'General'}</span>
                        <span style={{ color: isConfirmed ? 'var(--accent-green)' : 'var(--accent-amber)', fontSize: '0.74rem', fontWeight: 700 }}>
                          {isConfirmed ? '✓ OTP Validated' : '⏳ Awaiting Code'}
                        </span>
                      </div>
                    </div>
                    <span className={`status-badge status-${res.deliveryStatus}`}>
                      {res.deliveryStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="card-body" style={{ padding: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.4rem 0' }}>
                      <span className="info-label">Claimed Quantity:</span>
                      <span className="food-quantity-badge" style={{ fontSize: '0.95rem', padding: '0.2rem 0.6rem' }}>
                        {res.reservedQuantity} {ing?.unit}
                      </span>
                    </div>
                    <div className="info-item" style={{ marginBottom: '0.65rem' }}>
                      <span className="info-label">Receiving Kitchen:</span>
                      <span className="info-value" style={{ fontWeight: 700 }}>{req?.kitchenRef?.name || 'Local Kitchen'}</span>
                    </div>

                    {/* Timeline Ribbon */}
                    <CustodyRibbon status={ing?.status} deliveryStatus={res.deliveryStatus} />

                    {/* OTP Entry Verification Form */}
                    {['claimed', 'pickup_scheduled'].includes(res.deliveryStatus) && !isConfirmed && (
                      <div style={{ marginTop: '0.9rem', background: 'var(--bg-surface-hover)', padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                        <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Enter Collector 6-Digit Pickup OTP</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                          <input 
                            type="text"
                            maxLength={6}
                            placeholder="e.g. 839201"
                            className="form-control"
                            value={enteredCodes[res._id] || ''}
                            onChange={(e) => setEnteredCodes({ ...enteredCodes, [res._id]: e.target.value })}
                            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 800, textAlign: 'center', padding: '0.45rem' }}
                          />
                          <button 
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0.45rem 1rem' }}
                            onClick={() => handleVerifyPickup(res._id)}
                          >
                            Verify
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Handover Completion Confirmation */}
                    {res.deliveryStatus === 'pickup_scheduled' && isConfirmed && (
                      <div style={{ marginTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', background: 'var(--surface-active)', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(30, 122, 74, 0.25)' }}>
                          <input 
                            type="checkbox" 
                            id={`confirm-${res._id}`}
                            checked={isChecked}
                            onChange={(e) => setConfirmedChecks({ ...confirmedChecks, [res._id]: e.target.checked })}
                            style={{ marginTop: '0.2rem', cursor: 'pointer', accentColor: 'var(--accent-green)', width: '16px', height: '16px' }}
                          />
                          <label htmlFor={`confirm-${res._id}`} style={{ fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer', lineHeight: 1.4 }}>
                            I confirm physical handover of <strong>{res.reservedQuantity} {ing?.unit}</strong> to the verified collector.
                          </label>
                        </div>
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', padding: '0.6rem' }}
                          disabled={!isChecked}
                          onClick={() => handleMarkPickedUp(res._id)}
                        >
                          Complete Handover
                        </button>
                      </div>
                    )}

                    {res.deliveryStatus === 'handed_over' && (
                      <div style={{ marginTop: '0.65rem', background: 'var(--surface-active)', border: '1px solid rgba(30, 122, 74, 0.25)', padding: '0.6rem', borderRadius: '8px', color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.84rem', textAlign: 'center' }}>
                        ✓ Handed Over to Driver
                      </div>
                    )}

                    {res.deliveryStatus === 'completed' && (
                      <div style={{ marginTop: '0.65rem', background: 'var(--surface-active)', border: '1px solid rgba(30, 122, 74, 0.25)', padding: '0.6rem', borderRadius: '8px', color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.84rem', textAlign: 'center' }}>
                        ✓ Delivery Fulfilled Successfully
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Add Listing Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Upload Surplus Ingredient Batch</h2>
              <button className="btn btn-outline btn-sm" style={{ minWidth: '32px', padding: '0.25rem' }} onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ingredient Title</label>
                    <input type="text" className="form-control" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fresh Tomatoes" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Food Category</label>
                    <select className="form-control" value={category} onChange={e => setCategory(e.target.value)}>
                      <option value="Vegetables">Vegetables</option>
                      <option value="Fruits">Fruits</option>
                      <option value="Bakery">Bakery & Breads</option>
                      <option value="Dairy">Dairy Products</option>
                      <option value="Grains">Rice & Grains</option>
                      <option value="Meat">Cooked Meat</option>
                      <option value="Canned Goods">Canned Goods</option>
                      <option value="Spices">Spices & Condiments</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Available Quantity</label>
                    <input type="number" min="1" step="1" className="form-control" required value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 25" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Measurement Unit</label>
                    <input type="text" className="form-control" required value={unit} onChange={e => setUnit(e.target.value)} placeholder="kg, liters, loaves" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Safe Expiry Date</label>
                    <input type="date" min={new Date().toISOString().split('T')[0]} className="form-control" required value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pickup Deadline</label>
                    <input type="date" min={expiryDate || new Date().toISOString().split('T')[0]} className="form-control" required value={pickupDeadline} onChange={e => setPickupDeadline(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Required Storage Condition</label>
                  <select className="form-control" value={storageType} onChange={e => setStorageType(e.target.value)}>
                    <option value="Ambient">Ambient (Room Temperature)</option>
                    <option value="Chilled">Chilled (Refrigerated 4°C)</option>
                    <option value="Frozen">Frozen (-18°C)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Pickup Location Pin</label>
                  <div style={{ height: '180px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-default)', marginBottom: '0.4rem' }}>
                    <LeafletMap lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} markerLabel="Pickup Coordinates" />
                  </div>
                  <div className="form-row">
                    <div>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Latitude</label>
                      <input type="number" step="0.000001" className="form-control" required value={lat} onChange={e => setLat(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Longitude</label>
                      <input type="number" step="0.000001" className="form-control" required value={lng} onChange={e => setLng(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <input 
                      type="checkbox" 
                      required 
                      checked={donorDeclaration} 
                      onChange={e => setDonorDeclaration(e.target.checked)} 
                      style={{ marginTop: '0.2rem', cursor: 'pointer', accentColor: '#10B981' }}
                    />
                    <span>I declare this surplus food is hygienically packaged, unadulterated, accurately weighed, and safe for consumption.</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Publish Listing</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Edit Surplus Batch</h2>
              <button className="btn btn-outline btn-sm" style={{ minWidth: '32px', padding: '0.25rem' }} onClick={() => setShowEditModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ingredient Title</label>
                    <input type="text" className="form-control" required value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" value={category} onChange={e => setCategory(e.target.value)}>
                      <option value="Vegetables">Vegetables</option>
                      <option value="Fruits">Fruits</option>
                      <option value="Bakery">Bakery</option>
                      <option value="Dairy">Dairy</option>
                      <option value="Grains">Grains</option>
                      <option value="Meat">Meat</option>
                      <option value="Canned Goods">Canned Goods</option>
                      <option value="Spices">Spices</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input type="number" min="1" step="1" className="form-control" required value={quantity} onChange={e => setQuantity(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <input type="text" className="form-control" required value={unit} onChange={e => setUnit(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Safe Expiry Date</label>
                    <input type="date" min={new Date().toISOString().split('T')[0]} className="form-control" required value={expiryDate} onChange={e => setExpiryDate(e.target.value)} disabled={user?.role === 'donor'} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pickup Deadline</label>
                    <input type="date" min={expiryDate || new Date().toISOString().split('T')[0]} className="form-control" required value={pickupDeadline} onChange={e => setPickupDeadline(e.target.value)} disabled={user?.role === 'donor'} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Storage Condition</label>
                  <select className="form-control" value={storageType} onChange={e => setStorageType(e.target.value)}>
                    <option value="Ambient">Ambient</option>
                    <option value="Chilled">Chilled</option>
                    <option value="Frozen">Frozen</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.75rem', background: 'var(--bg-surface-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <input 
                    type="checkbox" 
                    id="edit-donor-decl"
                    checked={donorDeclaration}
                    onChange={(e) => setDonorDeclaration(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: 'var(--accent-green)' }}
                  />
                  <label htmlFor="edit-donor-decl" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', margin: 0 }}>
                    I confirm this batch meets food safety quality standards.
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        title="Delete Surplus Batch?"
        message="Are you sure you want to permanently remove this surplus ingredient batch from the distribution network? This action cannot be undone."
        confirmLabel="Delete Batch"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleteLoading && setDeleteConfirmId(null)}
      />
    </div>
  );
}
