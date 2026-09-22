import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LeafletMap from '../components/LeafletMap';
import CustodyRibbon from '../components/CustodyRibbon';
import { CategoryChip, StorageChip } from '../utils/categoryIcons';
import { API_BASE_URL } from '../config/api';
import {
  Leaf, Truck, CheckCircle2, Search, MapPin, Clock,
  AlertCircle, RefreshCw, UtensilsCrossed, Package, X, Key, Compass, Copy
} from 'lucide-react';

const CATEGORIES = ['All', 'Vegetables', 'Fruits', 'Bakery', 'Dairy', 'Grains', 'Cooked', 'Other'];
const STORAGE_TYPES = ['All', 'Ambient', 'Chilled', 'Frozen'];

export default function KitchenDashboard({ user }) {
  const [ingredients, setIngredients] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [storageFilter, setStorageFilter] = useState('All');
  const [sortBy, setSortBy] = useState('distance');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedResId, setCopiedResId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [requestedQuantity, setRequestedQuantity] = useState('');
  const [pickupMode, setPickupMode] = useState('self');
  const [volunteerName, setVolunteerName] = useState('');

  // Issue Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [reason, setReason] = useState('');
  const [proofDescription, setProofDescription] = useState('');

  // Active OTP codes map: { [resId]: code }
  const [activePickupCodes, setActivePickupCodes] = useState({});

  const token = localStorage.getItem('token');

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowRequestModal(false);
        setShowIssueModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchIngredients = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/kitchen/ingredients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch available surplus.');
      setIngredients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async () => {
    setReservationsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/kitchen/reservations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setReservations(data);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setReservationsLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
    fetchReservations();
  }, []);

  const handleOpenRequestModal = (ing) => {
    setSelectedIngredient(ing);
    setRequestedQuantity(ing.quantity);
    setPickupMode('self');
    setVolunteerName('');
    setError('');
    setSuccess('');
    setShowRequestModal(true);
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const qty = parseFloat(requestedQuantity);
    if (!qty || qty <= 0 || qty > selectedIngredient.quantity) {
      setError(`Please enter a valid quantity between 0.1 and ${selectedIngredient.quantity}.`);
      return;
    }
    if (pickupMode === 'volunteer' && !volunteerName.trim()) {
      setError('Please provide the volunteer’s full name.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/kitchen/ingredients/${selectedIngredient._id}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestedQuantity: qty,
          pickupMode,
          volunteerName: pickupMode === 'volunteer' ? volunteerName.trim() : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit request.');

      setSuccess(`Reservation confirmed for ${qty} ${selectedIngredient.unit}! Check "My Reservations" tab for pickup OTP.`);
      setShowRequestModal(false);
      fetchIngredients();
      fetchReservations();
      setActiveTab('reservations');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegenerateCode = async (resId) => {
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/reservations/${resId}/regenerate-code`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to regenerate code.');
      setActivePickupCodes(prev => ({ ...prev, [resId]: data.pickupCode }));
      fetchReservations();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenIssueModal = (res) => {
    setSelectedReservation(res);
    setReason('');
    setProofDescription('');
    setError('');
    setSuccess('');
    setShowIssueModal(true);
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!reason) { setError('Please provide a reason for the report.'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/issue-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reservationRef: selectedReservation._id, reason, proofDescription })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit report.');
      setSuccess('Issue reported. Administration will review your complaint.');
      setShowIssueModal(false);
      fetchReservations();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (resId, newStatus) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/kitchen/reservations/${resId}/delivery-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ deliveryStatus: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update delivery status.');
      setSuccess(`Status updated to "${newStatus.replace('_', ' ')}"`);
      fetchReservations();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  const getUrgency = (expiryDate) => {
    const diffHours = (new Date(expiryDate) - new Date()) / (1000 * 60 * 60);
    if (diffHours < 24) return { label: `Expires in ${Math.max(0, Math.floor(diffHours))} hrs`, className: 'urgency-critical' };
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 3) return { label: `Expires in ${diffDays} days`, className: 'urgency-warning' };
    return { label: `${diffDays} days left`, className: 'urgency-safe' };
  };

  const activeReservationsCount = reservations.filter(r => ['claimed', 'pickup_scheduled'].includes(r.deliveryStatus)).length;
  const completedReservationsCount = reservations.filter(r => r.deliveryStatus === 'completed').length;

  // Filtered and sorted ingredients
  const filteredIngredients = ingredients.filter(ing => {
    const matchCat = categoryFilter === 'All' || ing.category?.toLowerCase() === categoryFilter.toLowerCase();
    const matchStorage = storageFilter === 'All' || ing.storageType?.toLowerCase() === storageFilter.toLowerCase();
    const matchSearch = !searchQuery || 
      ing.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ing.donorRef?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchStorage && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'distance') return (a.distance ?? 999) - (b.distance ?? 999);
    if (sortBy === 'expiry') return new Date(a.expiryDate) - new Date(b.expiryDate);
    if (sortBy === 'quantity') return (b.quantity ?? 0) - (a.quantity ?? 0);
    return 0;
  });

  return (
    <div className="main-content">
      {/* Workspace Header */}
      <div className="workspace-header animate-fade-up">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <span className="chip chip-green" style={{ fontSize: '0.7rem', fontWeight: 800 }}>
              ● Verified Community Kitchen
            </span>
            <span className="chip chip-neutral" style={{ fontSize: '0.7rem' }}>
              📍 15 km Radius Proximity
            </span>
          </div>
          <h1 className="dashboard-title">Soup Kitchen Portal</h1>
          <p className="dashboard-subtitle" style={{ maxWidth: '600px' }}>
            Welcome back, <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong>. Browse nearby surplus food, reserve batches, and coordinate soup kitchen pickups.
          </p>
        </div>
        <div>
          <Link to="/map" className="btn btn-secondary btn-lg" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Compass size={18} color="var(--primary-500)" />
            <span>Open Routing Map</span>
          </Link>
        </div>
      </div>

      {/* Telemetry Cards Grid */}
      <div className="telemetry-grid animate-fade-up-delay-1" style={{ marginBottom: '1.75rem' }}>
        <div className="telemetry-card">
          <div className="telemetry-top">
            <div className="telemetry-icon-well" style={{ background: 'var(--surface-active)', color: 'var(--accent-green)' }}>
              <Leaf size={20} />
            </div>
            <span className="telemetry-trend" style={{ background: 'var(--surface-active)', color: 'var(--primary-600)' }}>15km Radius</span>
          </div>
          <div>
            <div className="telemetry-val">{ingredients.length}</div>
            <div className="telemetry-lbl">Surplus Near You</div>
          </div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-top">
            <div className="telemetry-icon-well" style={{ background: 'var(--surface-info)', color: 'var(--accent-blue)' }}>
              <Truck size={20} />
            </div>
            <span className="telemetry-trend" style={{ background: 'var(--surface-info)', color: 'var(--accent-blue)' }}>Awaiting Collection</span>
          </div>
          <div>
            <div className="telemetry-val" style={{ color: 'var(--accent-blue)' }}>{activeReservationsCount}</div>
            <div className="telemetry-lbl">Active Reservations</div>
          </div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-top">
            <div className="telemetry-icon-well" style={{ background: 'var(--surface-active)', color: 'var(--primary-500)' }}>
              <CheckCircle2 size={20} />
            </div>
            <span className="telemetry-trend" style={{ background: 'var(--surface-active)', color: 'var(--primary-600)' }}>Verified Custody</span>
          </div>
          <div>
            <div className="telemetry-val" style={{ color: 'var(--primary-500)' }}>{completedReservationsCount}</div>
            <div className="telemetry-lbl">Completed Pickups</div>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="segmented-control-modern animate-fade-up-delay-2" role="tablist" style={{ marginBottom: '1.5rem' }}>
        <button role="tab" aria-selected={activeTab === 'available'} className={`segmented-btn-modern ${activeTab === 'available' ? 'active' : ''}`} onClick={() => setActiveTab('available')}>
          Available Surplus <span className="segmented-count">{ingredients.length}</span>
        </button>
        <button role="tab" aria-selected={activeTab === 'reservations'} className={`segmented-btn-modern ${activeTab === 'reservations' ? 'active' : ''}`} onClick={() => setActiveTab('reservations')}>
          My Reservations <span className="segmented-count">{reservations.length}</span>
        </button>
      </div>

      {error && <div className="alert alert-danger animate-fade-up-delay-2">{error}</div>}
      {success && <div className="alert alert-success animate-fade-up-delay-2">{success}</div>}
      
      {activeTab === 'available' && loading && (
        <div className="listings-grid animate-fade-up-delay-2" style={{ marginBottom: '1.5rem' }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      )}

      {/* ── AVAILABLE SURPLUS TAB ── */}
      {activeTab === 'available' && !loading && (
        <div className="animate-fade-up-delay-3">
          {/* Search + Multi-Factor Filter bar */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Top row: search + category pills */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '320px' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by ingredient or donor…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.2rem', fontSize: '0.87rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', flex: 1 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`chip ${categoryFilter === cat ? 'chip-green' : 'chip-neutral'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom row: storage type pills + sort dropdown */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Storage:</span>
                {STORAGE_TYPES.map(st => (
                  <button
                    key={st}
                    onClick={() => setStorageFilter(st)}
                    className={`chip ${storageFilter === st ? 'chip-cyan' : 'chip-neutral'}`}
                    style={{ fontSize: '0.74rem', fontWeight: 600 }}
                  >
                    {st === 'All' ? 'All Conditions' : st}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Sort:</span>
                <select
                  className="form-control"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', height: 'auto', minWidth: '150px' }}
                >
                  <option value="distance">Nearest Distance</option>
                  <option value="expiry">Expires Soonest (FEFO)</option>
                  <option value="quantity">Largest Quantity</option>
                </select>
                <span className="status-badge" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{filteredIngredients.length} batches</span>
              </div>
            </div>
          </div>

          {filteredIngredients.length === 0 ? (
            <div className="empty-state">
              <UtensilsCrossed size={40} className="empty-state-icon" />
              <h3 className="empty-state-title">No Surplus Food Found</h3>
              <p className="empty-state-desc">
                {searchQuery || categoryFilter !== 'All' || storageFilter !== 'All'
                  ? 'No surplus batches match your current filter criteria. Try adjusting or clearing your filters.'
                  : 'No approved surplus currently available within your 15 km routing zone. Check back soon or refresh the grid.'}
              </p>
              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {(Boolean(searchQuery) || categoryFilter !== 'All' || storageFilter !== 'All') && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('All');
                      setStorageFilter('All');
                    }}
                  >
                    Clear All Filters
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={fetchIngredients}
                >
                  <RefreshCw size={13} />
                  <span>Refresh Grid</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Available Surplus Ingredients ({filteredIngredients.length})
                </h3>
              </div>
              <div className="listings-grid">
                {filteredIngredients.map((ing) => {
                  const urgency = getUrgency(ing.expiryDate);
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
                            <span className="chip chip-neutral" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <MapPin size={11} color="var(--accent-blue)" /> {ing.distance} km
                            </span>
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
                            Expires In
                          </span>
                          <span className={`urgency-badge ${urgency.className}`}>{urgency.label}</span>
                        </div>
                        <div className="expiry-track" title={`Expires: ${formatDate(ing.expiryDate)}`}>
                          <div className={fillClass} style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Pickup Deadline:</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(ing.pickupDeadline)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.35rem', marginTop: '0.1rem' }}>
                          <span>Donor:</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ing.donorRef?.name || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Donor Reputation:</span>
                          <span style={{ fontWeight: 700, color: 'var(--primary-400)' }}>⭐ {ing.donorRef?.reputationScore ?? 0} pts</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <button className="btn btn-primary" style={{ flex: 1, padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} onClick={() => handleOpenRequestModal(ing)}>
                          <UtensilsCrossed size={14} />
                          <span>Request Batch</span>
                        </button>
                        <Link to="/map" className="btn btn-secondary" style={{ padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} title="View pickup route on map">
                          <MapPin size={14} color="var(--primary-600)" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── RESERVATIONS TAB ── */}
      {activeTab === 'reservations' && (
        <div className="animate-fade-up-delay-3">
          {reservationsLoading ? (
            <div className="listings-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton skeleton-card" />
              ))}
            </div>
          ) : reservations.length === 0 ? (
            <div className="empty-state">
              <Package size={40} className="empty-state-icon" />
              <h3 className="empty-state-title">No Reservations Yet</h3>
              <p className="empty-state-desc">
                You haven't reserved any surplus food ingredients yet.
              </p>
              <button className="btn btn-primary" onClick={() => setActiveTab('available')}>Browse Available Food</button>
            </div>
          ) : (
            <div className="listings-grid">
              {reservations.map((res) => {
                const req = res.requestRef;
                const ing = req?.ingredientRef;
                return (
                  <div key={res._id} className="modern-food-card">
                    <div className="modern-food-header">
                      <div className="food-title-group">
                        <h3>{ing?.name || 'Unknown Ingredient'}</h3>
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                          <span className="chip chip-green">
                            {ing?.category || 'N/A'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: req?.status === 'fulfilled' ? 'var(--accent-green)' : 'var(--text-secondary)', fontWeight: 600, alignSelf: 'center' }}>
                            Request: {req?.status}
                          </span>
                        </div>
                      </div>
                      <span className={`status-badge status-${res.deliveryStatus}`} style={{ fontSize: '0.7rem', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                        {res.deliveryStatus.replace('_', ' ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.84rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="info-label">Reserved Qty:</span>
                        <span className="food-quantity-badge" style={{ fontSize: '0.95rem', padding: '0.2rem 0.6rem' }}>
                          {res.reservedQuantity} {ing?.unit || ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="info-label">Pickup Mode:</span>
                        <span className="info-value" style={{ textTransform: 'capitalize', fontWeight: 600 }}>{req?.pickupMode}</span>
                      </div>
                      {req?.pickupMode === 'volunteer' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="info-label">Volunteer:</span>
                          <span className="info-value" style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{req?.volunteerName}</span>
                        </div>
                      )}
                      
                      <div style={{ marginTop: '0.5rem', marginBottom: '0.35rem' }}>
                        <CustodyRibbon status={ing?.status} deliveryStatus={res.deliveryStatus} />
                      </div>

                      {/* OTP Capsule */}
                      {(() => {
                        const codeToShow = activePickupCodes[res._id] || (res.pickupCode?.length === 6 ? res.pickupCode : null);
                        if (codeToShow && ['claimed', 'pickup_scheduled'].includes(res.deliveryStatus)) {
                          return (
                            <div className="otp-capsule-container" style={{ marginTop: '0.65rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <Key size={11} /> Pickup OTP
                                </span>
                                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    style={{ background: 'none', border: 'none', color: copiedResId === res._id ? 'var(--primary-600)' : 'var(--text-tertiary)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
                                    onClick={() => {
                                      navigator.clipboard.writeText(codeToShow);
                                      setCopiedResId(res._id);
                                      setTimeout(() => setCopiedResId(null), 2000);
                                    }}
                                  >
                                    <Copy size={11} /> {copiedResId === res._id ? 'Copied!' : 'Copy'}
                                  </button>
                                  <button
                                    type="button"
                                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    onClick={() => handleRegenerateCode(res._id)}
                                  >
                                    <RefreshCw size={11} /> Regenerate
                                  </button>
                                </div>
                              </div>
                              <div className="otp-digit-row">
                                {codeToShow.slice(0, 3).split('').map((digit, idx) => (
                                  <div key={`d1-${idx}`} className="otp-digit-box">{digit}</div>
                                ))}
                                <span className="otp-separator">—</span>
                                {codeToShow.slice(3, 6).split('').map((digit, idx) => (
                                  <div key={`d2-${idx}`} className="otp-digit-box">{digit}</div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '0.2rem' }}>
                                <span className="otp-timer-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Clock size={10} /> Valid for collection
                                </span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Show to donor</span>
                              </div>
                            </div>
                          );
                        }
                        if (['claimed', 'pickup_scheduled'].includes(res.deliveryStatus)) {
                          return (
                            <div style={{ marginTop: '0.65rem' }}>
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ width: '100%', padding: '0.55rem', fontSize: '0.84rem', borderColor: 'var(--accent-cyan-border)', color: 'var(--accent-blue)', background: 'var(--surface-info)', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
                                onClick={() => handleRegenerateCode(res._id)}
                              >
                                <Key size={14} /> View 6-Digit Pickup OTP
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                      {res.deliveryStatus === 'claimed' && (
                        <>
                          <button className="btn btn-primary" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }} onClick={() => handleUpdateStatus(res._id, 'pickup_scheduled')}>
                            Schedule Pickup
                          </button>
                          <button className="btn btn-secondary" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-rose)' }} onClick={() => handleUpdateStatus(res._id, 'cancelled')}>
                            Cancel Claim
                          </button>
                        </>
                      )}
                      {res.deliveryStatus === 'pickup_scheduled' && (
                        <>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Awaiting donor code verification</span>
                          <button className="btn btn-secondary" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-rose)' }} onClick={() => handleUpdateStatus(res._id, 'cancelled')}>
                            Cancel Claim
                          </button>
                        </>
                      )}
                      {res.deliveryStatus === 'handed_over' && (
                        <>
                          <button className="btn btn-primary" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }} onClick={() => handleUpdateStatus(res._id, 'completed')}>
                            <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
                            Confirm Receipt &amp; Complete
                          </button>
                          <button className="btn btn-danger" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }} onClick={() => handleOpenIssueModal(res)}>
                            <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
                            Report Quality Issue
                          </button>
                        </>
                      )}
                      {res.deliveryStatus === 'completed' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                            <CheckCircle2 size={14} /> Completed Successfully
                          </span>
                          <button className="btn btn-outline" style={{ width: '100%', padding: '0.4rem', fontSize: '0.82rem', color: 'var(--accent-rose)', borderColor: 'var(--accent-rose-border)' }} onClick={() => handleOpenIssueModal(res)}>
                            Report Food Issue
                          </button>
                        </div>
                      )}
                      {res.deliveryStatus === 'expired' && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-rose)', fontWeight: 600, textAlign: 'center' }}>Reservation Expired</span>
                      )}
                      {res.deliveryStatus === 'cancelled' && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: 600, textAlign: 'center' }}>Reservation Cancelled</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── REQUEST MODAL ── */}
      {showRequestModal && selectedIngredient && (
        <div className="modal-backdrop">
          <div className="modal-content animate-fade-up">
            <div className="modal-header">
              <h2 className="modal-title">Request Ingredient</h2>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem' }} onClick={() => setShowRequestModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRequestSubmit}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)', marginBottom: '1.25rem', fontSize: '0.87rem' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>Item: <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.name}</strong> ({selectedIngredient.category})</p>
                  <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>Available: <strong style={{ color: 'var(--primary-500)' }}>{selectedIngredient.quantity} {selectedIngredient.unit}</strong></p>
                  <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>Distance: <strong style={{ color: 'var(--accent-cyan)' }}>{selectedIngredient.distance} km</strong></p>
                </div>
                {error && <div className="alert alert-danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>{error}</div>}

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Requested Quantity ({selectedIngredient.unit})</label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Available: {selectedIngredient.quantity} {selectedIngredient.unit}</span>
                  </div>
                  <input type="number" min="0.1" max={selectedIngredient.quantity} step="0.1" className="form-control" required value={requestedQuantity} onChange={e => setRequestedQuantity(e.target.value)} placeholder={`Max: ${selectedIngredient.quantity}`} />
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    {[0.25, 0.5, 0.75, 1.0].map(fraction => {
                      const qty = Math.round(selectedIngredient.quantity * fraction * 10) / 10;
                      return (
                        <button
                          key={fraction}
                          type="button"
                          className="chip chip-neutral"
                          style={{ cursor: 'pointer', fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                          onClick={() => setRequestedQuantity(String(qty))}
                        >
                          {fraction === 1.0 ? `All (${qty} ${selectedIngredient.unit})` : `${Math.round(fraction * 100)}% (${qty})`}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Pickup Mode</label>
                  <select className="form-control" value={pickupMode} onChange={e => setPickupMode(e.target.value)}>
                    <option value="self">Self — Kitchen staff will pick up</option>
                    <option value="volunteer">Volunteer — Assign someone to pick up</option>
                  </select>
                </div>
                {pickupMode === 'volunteer' && (
                  <div className="form-group">
                    <label className="form-label">Volunteer Full Name</label>
                    <input type="text" className="form-control" required value={volunteerName} onChange={e => setVolunteerName(e.target.value)} placeholder="Enter volunteer's full name" />
                  </div>
                )}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Pickup Location (Donor Premises)</label>
                  <div className="map-container" style={{ height: '170px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <LeafletMap lat={selectedIngredient.location.lat} lng={selectedIngredient.location.lng} readOnly={true} markerLabel={`${selectedIngredient.name} Pickup`} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ISSUE MODAL ── */}
      {showIssueModal && selectedReservation && (
        <div className="modal-backdrop">
          <div className="modal-content animate-fade-up">
            <div className="modal-header">
              <h2 className="modal-title">Report Quality Issue</h2>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem' }} onClick={() => setShowIssueModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleIssueSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>{error}</div>}
                <div style={{ background: 'var(--surface-critical)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--accent-rose-border)', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={14} />
                  Reporting issue for: <strong>{selectedReservation.requestRef?.ingredientRef?.name || 'Ingredient'}</strong>
                </div>
                <div className="form-group">
                  <label className="form-label">Reason for Complaint <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                  <textarea className="form-control" required rows="3" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Food spoiled, incorrect quantity, packaging torn…" style={{ resize: 'vertical' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Proof / Reference Link <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(Optional)</span></label>
                  <input type="text" className="form-control" value={proofDescription} onChange={e => setProofDescription(e.target.value)} placeholder="Link to image or description of defect…" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
