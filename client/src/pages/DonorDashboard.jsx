import { useState, useEffect } from 'react';
import LeafletMap from '../components/LeafletMap';
import { API_BASE_URL } from '../config/api';

export default function DonorDashboard({ user }) {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Current Editing Ingredient
  const [currentIngredient, setCurrentIngredient] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [pickupDeadline, setPickupDeadline] = useState('');
  const [storageType, setStorageType] = useState('');
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
      setError('Please enter the pickup code.');
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
      
      setSuccess('Pickup code verified successfully! Please tick the declaration below.');
      fetchReservations();
    } catch (err) {
      setError(err.message);
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

      setSuccess('Ingredient successfully marked as picked up.');
      fetchReservations();
      fetchMyIngredients();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchMyIngredients();
    fetchStats();
    fetchReservations();
  }, []);

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

      setSuccess('Ingredient listing created successfully!');
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
    // Format dates to YYYY-MM-DD
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

      setSuccess('Ingredient listing updated successfully!');
      setShowEditModal(false);
      fetchMyIngredients();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/ingredients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to delete listing.');

      setSuccess('Listing deleted successfully!');
      fetchMyIngredients();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="main-content">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Donor Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user?.name}</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleOpenAddModal}
          disabled={stats && stats.isActive === false}
          style={stats && stats.isActive === false ? { background: '#475569', borderColor: '#475569', cursor: 'not-allowed' } : {}}
        >
          + Upload Ingredient
        </button>
      </div>

      {/* Reputation Status Banners */}
      {stats && stats.isActive === false && (
        <div className="alert alert-danger" style={{ background: '#ef4444', color: 'white', fontWeight: 600, marginBottom: '1.5rem' }}>
          ⚠️ Your account has been deactivated due to low reputation. You cannot create new listings. Please contact admin for review.
        </div>
      )}
      {stats && stats.isActive !== false && stats.reputationScore >= 40 && stats.reputationScore <= 60 && (
        <div className="alert" style={{ background: '#eab308', color: 'black', fontWeight: 600, marginBottom: '1.5rem' }}>
          ⚠️ Your reputation is low ({stats.reputationScore} pts). Further issues may deactivate your account.
        </div>
      )}

      {/* Stats Row */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Ingredients Donated</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span className="stat-value">{stats.totalIngredients}</span>
              <span style={{ fontSize: '1.4rem' }}>🌾</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Requests Fulfilled</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span className="stat-value" style={{ color: '#10b981' }}>{stats.totalFulfilled}</span>
              <span style={{ fontSize: '1.4rem' }}>🍲</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Reputation Score</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span className="stat-value" style={{ color: stats.reputationScore >= 60 ? '#10b981' : stats.reputationScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                {stats.reputationScore} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>pts</span>
              </span>
              <span style={{ fontSize: '1.4rem' }}>⭐</span>
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading your food listings...</p>}

      {!loading && ingredients.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📦</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>No Active Food Listings</h3>
          <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '0.9rem' }}>You have not uploaded any surplus ingredients yet. List your surplus food to help local soup kitchens.</p>
          <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={handleOpenAddModal}>
            + Upload Your First Ingredient
          </button>
        </div>
      ) : (
        <div className="listings-grid">
          {ingredients.map((ing) => (
            <div key={ing._id} className="ingredient-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">{ing.name}</h3>
                  <div className="card-category">{ing.category}</div>
                </div>
                <span className={`status-badge status-${ing.status}`}>
                  {ing.status}
                </span>
              </div>
              <div className="card-body">
                <div className="info-item">
                  <span className="info-label">Quantity:</span>
                  <span className="info-value" style={{ color: 'var(--accent-color)', fontWeight: 700 }}>{ing.quantity} {ing.unit}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Storage Type:</span>
                  <span className="info-value">{ing.storageType}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Expiry Date:</span>
                  <span className="info-value">{formatDate(ing.expiryDate)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Pickup Deadline:</span>
                  <span className="info-value" style={{ color: '#fda4af' }}>{formatDate(ing.pickupDeadline)}</span>
                </div>
                <div className="info-item" style={{ marginTop: '0.2rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                  <span className="info-label">Location:</span>
                  <span className="info-value" style={{ fontSize: '0.78rem' }}>
                    {ing.location.lat.toFixed(4)}, {ing.location.lng.toFixed(4)}
                  </span>
                </div>
              </div>
              <div className="card-footer" style={{ flexDirection: 'row' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.45rem' }}
                  onClick={() => handleOpenEditModal(ing)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-danger" 
                  style={{ flex: 1, padding: '0.45rem' }}
                  onClick={() => handleDelete(ing._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending Pickups / Verification section */}
      <div style={{ marginTop: '3.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
              Pending Food Pickups & Verification
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Verify collector OTP codes upon arrival and confirm handovers
            </p>
          </div>
          <span className="status-badge" style={{ fontSize: '0.8rem' }}>
            {reservations.length} Active Reservations
          </span>
        </div>

        {reservations.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>No active reservations are currently pending pickup for your ingredients.</p>
          </div>
        ) : (
          <div className="listings-grid">
            {reservations.map((res) => {
              const req = res.requestRef;
              const ing = req?.ingredientRef;
              const isConfirmed = res.pickupConfirmedByDonor;
              const isChecked = !!confirmedChecks[res._id];

              return (
                <div key={res._id} className="ingredient-card" style={{ border: isConfirmed ? '1px solid #10b981' : '1px solid var(--border-color)', height: 'fit-content' }}>
                  <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 className="card-title">{ing?.name || 'Unknown Ingredient'}</h3>
                      <span className={`status-badge status-${res.deliveryStatus}`} style={{ fontSize: '0.72rem' }}>
                        {res.deliveryStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="card-category" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                      <span>{ing?.category || 'N/A'}</span>
                      <span style={{ fontSize: '0.8rem', color: isConfirmed ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                        {isConfirmed ? '✓ Code Verified' : '⏳ Awaiting Verification'}
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="info-item">
                      <span className="info-label">Reserved Quantity:</span>
                      <span className="info-value" style={{ color: 'var(--accent-color)', fontWeight: 700 }}>
                        {res.reservedQuantity} {ing?.unit}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Pickup Deadline:</span>
                      <span className="info-value" style={{ color: '#fda4af' }}>{formatDate(res.expiresAt)}</span>
                    </div>

                    {res.deliveryStatus === 'claimed' && (
                      <div style={{ marginTop: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.82rem', textAlign: 'center' }}>
                        Awaiting kitchen to schedule pickup
                      </div>
                    )}

                    {res.deliveryStatus === 'pickup_scheduled' && !isConfirmed && (
                      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.9rem' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Enter Collector's 6-Digit OTP</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <input 
                            type="text" 
                            maxLength="6"
                            placeholder="6-digit code" 
                            className="form-control"
                            style={{ flex: 1, padding: '0.45rem 0.65rem', fontSize: '0.95rem', letterSpacing: '2px', textAlign: 'center', fontWeight: 700 }}
                            value={enteredCodes[res._id] || ''}
                            onChange={(e) => setEnteredCodes({ ...enteredCodes, [res._id]: e.target.value })}
                          />
                          <button 
                            className="btn btn-primary"
                            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                            onClick={() => handleVerifyPickup(res._id)}
                          >
                            Verify OTP
                          </button>
                        </div>
                      </div>
                    )}

                    {res.deliveryStatus === 'pickup_scheduled' && isConfirmed && (
                      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', background: 'rgba(16, 185, 129, 0.08)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                          <input 
                            type="checkbox" 
                            id={`confirm-${res._id}`}
                            checked={isChecked}
                            onChange={(e) => setConfirmedChecks({ ...confirmedChecks, [res._id]: e.target.checked })}
                            style={{ marginTop: '0.2rem', cursor: 'pointer' }}
                          />
                          <label htmlFor={`confirm-${res._id}`} style={{ fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}>
                            I confirm the physical handover of <strong>{res.reservedQuantity} {ing?.unit}</strong> to the collector.
                          </label>
                        </div>
                        <button 
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '0.5rem' }}
                          disabled={!isChecked}
                          onClick={() => handleMarkPickedUp(res._id)}
                        >
                          Confirm Handover & Complete Pickup
                        </button>
                      </div>
                    )}

                    {res.deliveryStatus === 'handed_over' && (
                      <div style={{ marginTop: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.6rem', borderRadius: '8px', color: '#10b981', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                        ✓ Handed Over (Awaiting Kitchen Receipt)
                      </div>
                    )}

                    {res.deliveryStatus === 'completed' && (
                      <div style={{ marginTop: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.6rem', borderRadius: '8px', color: '#10b981', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                        ✓ Completed Successfully
                      </div>
                    )}

                    {res.deliveryStatus === 'cancelled' && (
                      <div style={{ marginTop: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                        Reservation Cancelled
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Upload Surplus Ingredient</h2>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem' }} onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ingredient Name</label>
                    <input type="text" className="form-control" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fresh Tomatoes" />
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
                    <input type="number" min="1" step="1" className="form-control" required value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="10" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <input type="text" className="form-control" required value={unit} onChange={e => setUnit(e.target.value)} placeholder="kg, liters, loaves" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Expiry Date</label>
                    <input type="date" min={new Date().toISOString().split('T')[0]} className="form-control" required value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pickup Deadline</label>
                    <input type="date" min={expiryDate || new Date().toISOString().split('T')[0]} className="form-control" required value={pickupDeadline} onChange={e => setPickupDeadline(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Storage Type</label>
                  <select className="form-control" value={storageType} onChange={e => setStorageType(e.target.value)}>
                    <option value="Ambient">Ambient (Room Temperature)</option>
                    <option value="Chilled">Chilled (Refrigerated)</option>
                    <option value="Frozen">Frozen</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Pickup Location (Click map or type coords)</label>
                  <div className="map-container" style={{ height: '200px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <LeafletMap lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} markerLabel="Ingredient Pickup Location" />
                  </div>
                  <div className="form-row" style={{ marginTop: '0.5rem' }}>
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

                <div className="form-group" style={{ marginTop: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    <input 
                      type="checkbox" 
                      required 
                      checked={donorDeclaration} 
                      onChange={e => setDonorDeclaration(e.target.checked)} 
                      style={{ marginTop: '0.2rem', cursor: 'pointer' }}
                    />
                    <span>I declare this surplus food is intact, not expired, safely stored, uncontaminated, and accurately weighed.</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Listing</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Edit Food Listing</h2>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem' }} onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ingredient Name</label>
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
                    <label className="form-label">Expiry Date</label>
                    <input type="date" min={new Date().toISOString().split('T')[0]} className="form-control" required value={expiryDate} onChange={e => setExpiryDate(e.target.value)} disabled={user?.role === 'donor'} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pickup Deadline</label>
                    <input type="date" min={expiryDate || new Date().toISOString().split('T')[0]} className="form-control" required value={pickupDeadline} onChange={e => setPickupDeadline(e.target.value)} disabled={user?.role === 'donor'} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Storage Type</label>
                  <select className="form-control" value={storageType} onChange={e => setStorageType(e.target.value)}>
                    <option value="Ambient">Ambient</option>
                    <option value="Chilled">Chilled</option>
                    <option value="Frozen">Frozen</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Pickup Location (Click map or type coords)</label>
                  <div className="map-container" style={{ height: '200px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <LeafletMap lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} markerLabel="Ingredient Pickup Location" />
                  </div>
                  <div className="form-row" style={{ marginTop: '0.5rem' }}>
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
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
