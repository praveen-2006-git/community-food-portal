import { useState, useEffect } from 'react';
import LeafletMap from '../components/LeafletMap';
import CustodyRibbon from '../components/CustodyRibbon';
import { useToast, useSearch } from '../App';

export default function DonorDashboard({ user }) {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionPending, setActionPending] = useState(false);
  const { addToast } = useToast();
  const { searchQuery } = useSearch();

  const localUser = JSON.parse(localStorage.getItem('user') || '{}') || user;

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Current Editing Ingredient
  const [currentIngredient, setCurrentIngredient] = useState(null);

  // Form State
  const [name, setName] = useState('Atta');
  const [namePreset, setNamePreset] = useState('Atta');
  const [category, setCategory] = useState('grain');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [expiryDate, setExpiryDate] = useState('');
  const [pickupDeadline, setPickupDeadline] = useState('');
  const [storageType, setStorageType] = useState('Ambient');
  const [lat, setLat] = useState(localUser?.location?.lat || 11.5034);
  const [lng, setLng] = useState(localUser?.location?.lng || 77.2444);
  const [donorDeclaration, setDonorDeclaration] = useState(false);
  const [allergens, setAllergens] = useState([]);
  const [prepState, setPrepState] = useState('raw');
  const [dietaryType, setDietaryType] = useState('veg');

  // Operational Profile State
  const [activeTab, setActiveTab] = useState('surplus');
  const [typicalDonationSchedule, setTypicalDonationSchedule] = useState(localUser?.typicalDonationSchedule || []);
  const [preferredPickupWindow, setPreferredPickupWindow] = useState(localUser?.preferredPickupWindow || '');
  const [typicalIngredientCategories, setTypicalIngredientCategories] = useState(localUser?.typicalIngredientCategories || []);

  const [activeNeeds, setActiveNeeds] = useState([]);

  const token = localStorage.getItem('token');
  const [stats, setStats] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [enteredCodes, setEnteredCodes] = useState({});
  const [confirmedChecks, setConfirmedChecks] = useState({});

  const getCategoryBadgeClass = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('veg') || cat.includes('fruit')) return 'badge-approved';
    if (cat.includes('bake') || cat.includes('bread')) return 'badge-attention';
    if (cat.includes('grain') || cat.includes('rice') || cat.includes('pasta')) return 'badge-reserved';
    if (cat.includes('dairy') || cat.includes('milk')) return 'badge-reserved';
    return 'badge-expired';
  };
  const renderDietaryIcon = (type) => {
    const t = (type || 'veg').toLowerCase();
    const color = t === 'veg' ? '#10b981' : t === 'egg' ? '#eab308' : '#b45309';
    const label = t === 'veg' ? 'Veg' : t === 'egg' ? 'Egg' : 'Non-Veg';
    
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
        <div style={{ 
          width: '14px', 
          height: '14px', 
          border: `2px solid ${color}`, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: '3px',
          padding: '1px'
        }}>
          <div style={{ 
            width: '6px', 
            height: '6px', 
            backgroundColor: color, 
            borderRadius: '50%' 
          }} />
        </div>
        <span>{label}</span>
      </div>
    );
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/stats/donor', {
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
      const res = await fetch('http://localhost:5000/api/reservations/donor', {
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
      const res = await fetch('http://localhost:5000/api/ingredients/my', {
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
      setError('Please enter the pickup code.');
      return;
    }
    setActionPending(true);
    try {
      const res = await fetch(`http://localhost:5000/api/reservations/${resId}/verify-pickup`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enteredCode: code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed.');
      
      addToast(`Pickup code verified — donor declaration unlocked`, 'success');
      fetchReservations();
    } catch (err) {
      setError(err.message);
      addToast(err.message || 'Verification failed', 'error');
    } finally {
      setActionPending(false);
    }
  };

  const handleMarkPickedUp = async (resId) => {
    setError('');
    setSuccess('');
    if (!confirmedChecks[resId]) {
      setError('You must tick the confirmation checkbox first.');
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/api/reservations/${resId}/delivery-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deliveryStatus: 'picked_up' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status.');

      addToast(`Listing fulfilled — reputation points added!`, 'success');
      fetchReservations();
      fetchMyIngredients();
      fetchStats();
    } catch (err) {
      setError(err.message);
      addToast(err.message || 'Failed to release ingredient', 'error');
    }
  };

  const fetchActiveNeeds = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/ingredients/active-needs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setActiveNeeds(data);
    } catch (err) {
      console.error('Error fetching active needs:', err);
    }
  };

  useEffect(() => {
    fetchMyIngredients();
    fetchStats();
    fetchReservations();
    fetchActiveNeeds();
  }, []);

  const handlePresetChange = (preset) => {
    setNamePreset(preset);
    if (preset !== 'Other') {
      setName(preset);
      const categoryMapping = {
        'Atta': 'grain',
        'Rice': 'grain',
        'Dal': 'grain',
        'Cooking Oil': 'oil',
        'Onions': 'vegetable',
        'Spices': 'condiment',
        'Vegetables': 'vegetable',
        'Packaged Goods': 'other'
      };
      setCategory(categoryMapping[preset] || 'other');
    } else {
      setName('');
      setCategory('vegetable');
    }
  };

  const resetForm = () => {
    setName('Atta');
    setNamePreset('Atta');
    setCategory('grain');
    setQuantity('');
    setUnit('kg');
    setExpiryDate('');
    setPickupDeadline('');
    setStorageType('Ambient');
    setLat(localUser?.location?.lat || 11.5034);
    setLng(localUser?.location?.lng || 77.2444);
    setDonorDeclaration(false);
    setAllergens([]);
    setPrepState('raw');
    setError('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setActionPending(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          typicalDonationSchedule,
          preferredPickupWindow,
          typicalIngredientCategories
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile.');
      
      addToast('Operational profile settings saved successfully!', 'success');
      const updatedUser = { ...localUser, ...data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      addToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setActionPending(false);
    }
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
      const res = await fetch('http://localhost:5000/api/ingredients', {
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
          donorDeclaration,
          allergens: allergens.length > 0 ? allergens : ['none'],
          prepState,
          dietaryType
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to create listing.');

      addToast(`Ingredient listing "${name}" created successfully!`, 'success');
      setShowAddModal(false);
      fetchMyIngredients();
      fetchStats();
    } catch (err) {
      setError(err.message);
      addToast(err.message || 'Failed to upload ingredient', 'error');
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
    setAllergens(ing.allergens || []);
    setPrepState(ing.prepState || 'raw');
    setDietaryType(ing.dietaryType || 'veg');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`http://localhost:5000/api/ingredients/${currentIngredient._id}`, {
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
          location: { lat: parseFloat(lat), lng: parseFloat(lng) },
          allergens: allergens.length > 0 ? allergens : ['none'],
          prepState,
          dietaryType
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to update listing.');

      addToast(`Ingredient updated successfully!`, 'success');
      setShowEditModal(false);
      fetchMyIngredients();
      fetchStats();
    } catch (err) {
      setError(err.message);
      addToast(err.message || 'Update failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`http://localhost:5000/api/ingredients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to delete listing.');

      addToast(`Listing deleted successfully.`, 'success');
      fetchMyIngredients();
      fetchStats();
    } catch (err) {
      setError(err.message);
      addToast(err.message || 'Deletion failed', 'error');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // SVGs for reputation gauges
  const radius = 24;
  const stroke = 4;
  const circumference = 2 * Math.PI * radius;
  const getReputationColor = (score) => {
    if (score < 40) return 'var(--danger)';
    if (score < 60) return 'var(--attention)';
    return 'var(--verified)';
  };

  const filteredIngredients = ingredients.filter(ing => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ing.name.toLowerCase().includes(q) ||
      ing.category.toLowerCase().includes(q) ||
      ing.status.toLowerCase().includes(q) ||
      (ing.storageType && ing.storageType.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {/* Header bar section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="dashboard-title">Donor Workspace</h1>
          <p className="dashboard-subtitle" style={{ margin: 0 }}>
            Welcome back, {user?.name}. Oversee your listings and coordinate safe handoffs.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleOpenAddModal}
          disabled={stats && stats.isActive === false}
          style={stats && stats.isActive === false ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          + Upload Surplus Food
        </button>
      </div>

      {/* Account status banners */}
      {stats && stats.isActive === false && (
        <div className="badge badge-rejected" style={{ width: '100%', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none' }}>
          ⚠️ Account Deactivated: Your reputation score fell below acceptable parameters. Surplus listings disabled. Contact support to schedule kitchen quality audit.
        </div>
      )}
      {stats && stats.isActive !== false && stats.reputationScore >= 40 && stats.reputationScore <= 60 && (
        <div className="badge badge-attention" style={{ width: '100%', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none' }}>
          ⚠️ Warnings Active: Low reputation rating ({stats.reputationScore} pts). Ensure coordinate accuracy and strict shelf-life constraints to avoid status suspension.
        </div>
      )}

      {/* Dashboard KPI Row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', border: '1px solid var(--border)' }}>
            <div style={{ background: 'var(--active-glow)', color: 'var(--active)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>📦</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Donated Listings</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.05rem', lineHeight: 1.15 }}>{stats.totalIngredients}</div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Total active listings</span>
            </div>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>➔</span>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', border: '1px solid var(--border)' }}>
            <div style={{ background: 'var(--verified-glow)', color: 'var(--verified)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>🌱</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Successful Claims</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--verified)', marginTop: '0.05rem', lineHeight: 1.15 }}>{stats.totalFulfilled}</div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Completed handoffs</span>
            </div>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>➔</span>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', border: '1px solid var(--border)' }}>
            <div style={{ background: 'var(--attention-glow)', color: 'var(--attention)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>⭐</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reputation Score</span>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: getReputationColor(stats.reputationScore), marginTop: '0.05rem', lineHeight: 1.15 }}>
                {stats.reputationScore} <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ 100</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Keep it up!</span>
            </div>
            <div style={{ position: 'relative', width: '48px', height: '48px' }}>
              <svg width="48" height="48" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
                <circle 
                  cx="28" 
                  cy="28" 
                  r={radius} 
                  fill="none" 
                  stroke={getReputationColor(stats.reputationScore)} 
                  strokeWidth={stroke} 
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (stats.reputationScore / 100) * circumference}
                  strokeLinecap="round"
                  transform="rotate(-90 28 28)"
                />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {stats.reputationScore}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-container" style={{ marginBottom: '2rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'surplus' ? 'active' : ''}`}
          onClick={() => setActiveTab('surplus')}
        >
          Surplus Inventory & Handoffs
        </button>
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Operational Profile Settings
        </button>
      </div>

      {error && <div className="badge badge-rejected" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', textTransform: 'none', display: 'block', textAlign: 'center' }}>{error}</div>}

      {activeTab === 'surplus' && (
        <>
          {/* Surplus Inventory Listings Section */}
          <div style={{ marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', letterSpacing: '-0.25px' }}>
              Active Surplus Inventory
            </h2>

            {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading inventory...</p>}

            {!loading && ingredients.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🥗</div>
                <p style={{ fontSize: '0.95rem' }}>No surplus food is registered under your facility.</p>
                <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={handleOpenAddModal} disabled={stats && stats.isActive === false}>
                  Upload Your First Ingredient
                </button>
              </div>
            ) : !loading && filteredIngredients.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>No matching ingredients found.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', opacity: 0.8 }}>Try searching for a different keyword or category.</p>
              </div>
            ) : (
              <div className="listings-grid">
                {filteredIngredients.map((ing) => (
                  <div key={ing._id} className="ingredient-card">
                    <div className="card-header" style={{ borderBottom: 'none', padding: '1.25rem 1.25rem 0.5rem 1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={`badge ${getCategoryBadgeClass(ing.category)}`} style={{ fontSize: '0.65rem', fontWeight: 800 }}>
                            {ing.category}
                          </span>
                          {renderDietaryIcon(ing.dietaryType)}
                        </div>
                        <h3 className="card-title" style={{ fontSize: '1.1rem', marginTop: '0.15rem' }}>{ing.name}</h3>
                      </div>
                      <span className={`badge badge-${ing.status}`} style={{ alignSelf: 'flex-start' }}>
                        {ing.status}
                      </span>
                    </div>
                    <div style={{ padding: '0.25rem 1.25rem' }}>
                      <CustodyRibbon status={ing.status} />
                    </div>
                    <div className="card-body">
                      <div className="info-item">
                        <span className="info-label">Quantity</span>
                        <span className="info-value">{ing.quantity} {ing.unit}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Storage Temperature</span>
                        <span className="info-value">{ing.storageType}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Expiry Date</span>
                        <span className="info-value">{formatDate(ing.expiryDate)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Pickup Deadline</span>
                        <span className="info-value">{formatDate(ing.pickupDeadline)}</span>
                      </div>
                    </div>
                    <div className="card-footer" style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                        onClick={() => handleOpenEditModal(ing)}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                        onClick={() => handleDelete(ing._id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Reservations / Verified Pickups section */}
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '1.25rem', letterSpacing: '-0.25px' }}>
              Active Reservations & Handoff Requests
            </h2>

            {reservations.length === 0 ? (
              <div className="glass-panel" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                <p style={{ fontSize: '0.9rem' }}>No kitchens have reserved ingredients from your warehouse at this time.</p>
              </div>
            ) : (
              <div className="listings-grid">
                {reservations.map((res) => {
                  const req = res.requestRef;
                  const ing = req?.ingredientRef;
                  const isConfirmed = res.pickupConfirmedByDonor;
                  const isChecked = !!confirmedChecks[res._id];

                  return (
                    <div key={res._id} className="ingredient-card" style={isConfirmed ? { borderColor: 'rgba(16, 185, 129, 0.4)' } : {}}>
                      <div className="card-header">
                        <div>
                          <span className="badge badge-pending" style={{ fontSize: '0.65rem', marginBottom: '0.4rem', display: 'inline-block' }}>
                            {ing?.category || 'General'}
                          </span>
                          <h3 className="card-title">{ing?.name || 'Reserved surplus'}</h3>
                        </div>
                        <span className={`badge badge-${res.deliveryStatus}`}>
                          {res.deliveryStatus.replace('_', ' ')}
                        </span>
                      </div>
                      <div style={{ padding: '0.5rem 1.25rem 0 1.25rem' }}>
                        <CustodyRibbon deliveryStatus={res.deliveryStatus} />
                      </div>
                      <div className="card-body">
                        <div className="info-item">
                          <span className="info-label">Claim Quantity</span>
                          <span className="info-value">{res.reservedQuantity} {ing?.unit}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Release Deadline</span>
                          <span className="info-value" style={{ color: 'var(--danger)', fontWeight: 700 }}>
                            {formatDate(res.expiresAt)}
                          </span>
                        </div>

                        {res.deliveryStatus === 'pending' && (
                          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                            {!isConfirmed ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Verification Code (From Soup Kitchen)</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <input 
                                    type="text" 
                                    placeholder="Enter 6-digit code" 
                                    className="form-control"
                                    style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.9rem' }}
                                    value={enteredCodes[res._id] || ''}
                                    onChange={(e) => setEnteredCodes({ ...enteredCodes, [res._id]: e.target.value })}
                                  />
                                  <button 
                                    className="btn btn-primary"
                                    style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                                    onClick={() => handleVerifyPickup(res._id)}
                                    disabled={actionPending}
                                  >
                                    {actionPending ? 'Validating...' : 'Verify'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ color: 'var(--verified)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  ✓ Security Code Confirmed
                                </div>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                  <input 
                                    type="checkbox"
                                    style={{ marginTop: '0.15rem' }}
                                    checked={isChecked}
                                    onChange={(e) => setConfirmedChecks({ ...confirmedChecks, [res._id]: e.target.checked })}
                                  />
                                  <span>I verify that the cargo has been safely loaded and handed over to the matching driver.</span>
                                </label>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {res.deliveryStatus === 'pending' && isConfirmed && (
                        <div className="card-footer" style={{ padding: '0.75rem' }}>
                          <button 
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', background: isChecked ? 'var(--verified)' : 'rgba(255,255,255,0.05)', borderColor: isChecked ? 'var(--verified)' : 'var(--border)' }}
                            disabled={!isChecked}
                            onClick={() => handleMarkPickedUp(res._id)}
                          >
                            Release & Mark as Picked Up
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'profile' && (
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Donor Profile Settings</h2>
          
          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Typical Donation Schedule</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem', marginBottom: '1rem' }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <label key={day} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={typicalDonationSchedule.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTypicalDonationSchedule([...typicalDonationSchedule, day]);
                        } else {
                          setTypicalDonationSchedule(typicalDonationSchedule.filter(d => d !== day));
                        }
                      }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Preferred Pickup Window</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. 14:00 - 18:00" 
                value={preferredPickupWindow}
                onChange={e => setPreferredPickupWindow(e.target.value)}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Specify your optimal times for volunteers to pick up donations.</span>
            </div>

            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Typical Ingredient Categories Usually Donated</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
                {['protein', 'dairy', 'vegetable', 'grain', 'oil', 'condiment', 'bakery', 'other'].map(cat => (
                  <label key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                    <input 
                      type="checkbox"
                      checked={typicalIngredientCategories.includes(cat)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTypicalIngredientCategories([...typicalIngredientCategories, cat]);
                        } else {
                          setTypicalIngredientCategories(typicalIngredientCategories.filter(c => c !== cat));
                        }
                      }}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.65rem' }} disabled={actionPending}>
              {actionPending ? 'Saving...' : 'Save Profile Settings'}
            </button>
          </form>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Upload Surplus Food</h2>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              {(() => {
                const matched = activeNeeds.filter(n => n.ingredientName.toLowerCase() === name.toLowerCase().trim());
                if (matched.length > 0) {
                  return (
                    <div className="badge badge-pending" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', textTransform: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)', textAlign: 'left' }}>
                      <strong style={{ color: 'var(--active)', fontSize: '0.82rem' }}>⚡ Matched Operational Demand:</strong>
                      {matched.map((n, idx) => (
                        <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          • <strong>{n.soupKitchenRef?.name || 'Local Soup Kitchen'}</strong> has declared a need for {n.quantity} {n.unit} ({n.priority} priority).
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Food Item Name</label>
                  <select 
                    className="form-control" 
                    required 
                    value={namePreset} 
                    onChange={e => handlePresetChange(e.target.value)}
                  >
                    <option value="Atta">Atta</option>
                    <option value="Rice">Rice</option>
                    <option value="Dal">Dal</option>
                    <option value="Cooking Oil">Cooking Oil</option>
                    <option value="Onions">Onions</option>
                    <option value="Spices">Spices</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Packaged Goods">Packaged Goods</option>
                    <option value="Other">Other (Specify below)</option>
                  </select>
                  {namePreset === 'Other' && (
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ marginTop: '0.5rem' }} 
                      required 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="Enter custom food name" 
                    />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control" value={category} onChange={e => setCategory(e.target.value)} required>
                    <option value="">Select category</option>
                    <option value="protein">Protein</option>
                    <option value="dairy">Dairy</option>
                    <option value="vegetable">Vegetable</option>
                    <option value="grain">Grain</option>
                    <option value="oil">Oil</option>
                    <option value="condiment">Condiment</option>
                    <option value="bakery">Bakery</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Allergens (select all that apply)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {['nuts', 'gluten', 'dairy', 'shellfish', 'eggs', 'none'].map(a => (
                      <label key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          value={a}
                          checked={allergens.includes(a)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllergens([...allergens.filter(x => x !== 'none'), a]);
                            } else {
                              setAllergens(allergens.filter(x => x !== a));
                            }
                          }}
                        />
                        {a.charAt(0).toUpperCase() + a.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Preparation State</label>
                  <select className="form-control" value={prepState} onChange={e => setPrepState(e.target.value)} required>
                    <option value="">Select preparation state</option>
                    <option value="raw">Raw</option>
                    <option value="processed">Processed</option>
                    <option value="packaged">Packaged</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input type="number" min="1" step="1" className="form-control" required value={quantity} onChange={e => setQuantity(parseFloat(e.target.value) || '')} placeholder="10" />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select className="form-control" required value={unit} onChange={e => setUnit(e.target.value)}>
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="packets">packets</option>
                    <option value="pieces">pieces</option>
                    <option value="dozen">dozen</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    {['Today', 'Tomorrow', '3 Days', '1 Week'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem' }}
                        onClick={() => {
                          const d = new Date();
                          if (preset === 'Tomorrow') d.setDate(d.getDate() + 1);
                          if (preset === '3 Days') d.setDate(d.getDate() + 3);
                          if (preset === '1 Week') d.setDate(d.getDate() + 7);
                          const dateString = d.toISOString().split('T')[0];
                          setExpiryDate(dateString);
                          setPickupDeadline(dateString);
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input type="date" min={new Date().toISOString().split('T')[0]} className="form-control" required value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pickup Deadline</label>
                  <input type="date" min={new Date().toISOString().split('T')[0]} max={expiryDate || undefined} className="form-control" required value={pickupDeadline} onChange={e => setPickupDeadline(e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Storage Temperature Class</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['Ambient', 'Chilled', 'Frozen'].map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`btn ${storageType.toLowerCase() === t.toLowerCase() ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem' }}
                        onClick={() => setStorageType(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Dietary Classification</label>
                  <select className="form-control" value={dietaryType} onChange={e => setDietaryType(e.target.value)}>
                    <option value="veg">Veg (🟢 Vegetarian)</option>
                    <option value="non-veg">Non-Veg (🟤 Non-Vegetarian)</option>
                    <option value="egg">Egg (🟡 Eggitarian)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Upload Photo (Optional)</label>
                <input type="file" accept="image/*" className="form-control" style={{ fontSize: '0.8rem', padding: '0.45rem' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Location Offset Coordinates</label>
                <div className="map-container" style={{ marginBottom: '0.75rem' }}>
                  <LeafletMap lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} markerLabel="Ingredient Pickup Location" />
                </div>
                <div className="form-row">
                  <div>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Latitude</label>
                    <input type="number" step="0.000001" className="form-control" required value={lat} onChange={e => setLat(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Longitude</label>
                    <input type="number" step="0.000001" className="form-control" required value={lng} onChange={e => setLng(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <input 
                    type="checkbox" 
                    required 
                    checked={donorDeclaration} 
                    onChange={e => setDonorDeclaration(e.target.checked)} 
                    style={{ marginTop: '0.15rem' }}
                  />
                  <span>I declare under penalty of status demotion that this food complies with FSSAI hygiene guidelines, is clean, correctly stored, matches packaging parameters, and is safe for immediate delivery and intake.</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Publish Listing</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Edit Food Specifications</h2>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              {(() => {
                const matched = activeNeeds.filter(n => n.ingredientName.toLowerCase() === name.toLowerCase().trim());
                if (matched.length > 0) {
                  return (
                    <div className="badge badge-pending" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', textTransform: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)', textAlign: 'left' }}>
                      <strong style={{ color: 'var(--active)', fontSize: '0.82rem' }}>⚡ Matched Operational Demand:</strong>
                      {matched.map((n, idx) => (
                        <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          • <strong>{n.soupKitchenRef?.name || 'Local Soup Kitchen'}</strong> has declared a need for {n.quantity} {n.unit} ({n.priority} priority).
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Food Item Name</label>
                  <select 
                    className="form-control" 
                    required 
                    value={namePreset} 
                    onChange={e => handlePresetChange(e.target.value)}
                  >
                    <option value="Atta">Atta</option>
                    <option value="Rice">Rice</option>
                    <option value="Dal">Dal</option>
                    <option value="Cooking Oil">Cooking Oil</option>
                    <option value="Onions">Onions</option>
                    <option value="Spices">Spices</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Packaged Goods">Packaged Goods</option>
                    <option value="Other">Other (Specify below)</option>
                  </select>
                  {namePreset === 'Other' && (
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ marginTop: '0.5rem' }} 
                      required 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="Enter custom food name" 
                    />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control" value={category} onChange={e => setCategory(e.target.value)} required>
                    <option value="">Select category</option>
                    <option value="protein">Protein</option>
                    <option value="dairy">Dairy</option>
                    <option value="vegetable">Vegetable</option>
                    <option value="grain">Grain</option>
                    <option value="oil">Oil</option>
                    <option value="condiment">Condiment</option>
                    <option value="bakery">Bakery</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Allergens (select all that apply)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {['nuts', 'gluten', 'dairy', 'shellfish', 'eggs', 'none'].map(a => (
                      <label key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          value={a}
                          checked={allergens.includes(a)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllergens([...allergens.filter(x => x !== 'none'), a]);
                            } else {
                              setAllergens(allergens.filter(x => x !== a));
                            }
                          }}
                        />
                        {a.charAt(0).toUpperCase() + a.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Preparation State</label>
                  <select className="form-control" value={prepState} onChange={e => setPrepState(e.target.value)} required>
                    <option value="">Select preparation state</option>
                    <option value="raw">Raw</option>
                    <option value="processed">Processed</option>
                    <option value="packaged">Packaged</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input type="number" min="1" step="1" className="form-control" required value={quantity} onChange={e => setQuantity(parseFloat(e.target.value) || '')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select className="form-control" required value={unit} onChange={e => setUnit(e.target.value)}>
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="packets">packets</option>
                    <option value="pieces">pieces</option>
                    <option value="dozen">dozen</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    {['Today', 'Tomorrow', '3 Days', '1 Week'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem' }}
                        onClick={() => {
                          const d = new Date();
                          if (preset === 'Tomorrow') d.setDate(d.getDate() + 1);
                          if (preset === '3 Days') d.setDate(d.getDate() + 3);
                          if (preset === '1 Week') d.setDate(d.getDate() + 7);
                          const dateString = d.toISOString().split('T')[0];
                          setExpiryDate(dateString);
                          setPickupDeadline(dateString);
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input type="date" min={new Date().toISOString().split('T')[0]} className="form-control" required value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pickup Deadline</label>
                  <input type="date" min={new Date().toISOString().split('T')[0]} max={expiryDate || undefined} className="form-control" required value={pickupDeadline} onChange={e => setPickupDeadline(e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Storage Temperature Class</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['Ambient', 'Chilled', 'Frozen'].map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`btn ${storageType.toLowerCase() === t.toLowerCase() ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem' }}
                        onClick={() => setStorageType(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Dietary Classification</label>
                  <select className="form-control" value={dietaryType} onChange={e => setDietaryType(e.target.value)}>
                    <option value="veg">Veg (🟢 Vegetarian)</option>
                    <option value="non-veg">Non-Veg (🟤 Non-Vegetarian)</option>
                    <option value="egg">Egg (🟡 Eggitarian)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Upload Photo (Optional)</label>
                <input type="file" accept="image/*" className="form-control" style={{ fontSize: '0.8rem', padding: '0.45rem' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Location Coordinates</label>
                <div className="map-container" style={{ marginBottom: '0.75rem' }}>
                  <LeafletMap lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} markerLabel="Ingredient Pickup Location" />
                </div>
                <div className="form-row">
                  <div>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Latitude</label>
                    <input type="number" step="0.000001" className="form-control" required value={lat} onChange={e => setLat(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Longitude</label>
                    <input type="number" step="0.000001" className="form-control" required value={lng} onChange={e => setLng(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Specifications</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
