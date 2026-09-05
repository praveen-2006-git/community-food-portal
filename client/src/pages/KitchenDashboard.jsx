import { useState, useEffect } from 'react';
import LeafletMap from '../components/LeafletMap';
import { API_BASE_URL } from '../config/api';

export default function KitchenDashboard({ user }) {
  const [ingredients, setIngredients] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [activeTab, setActiveTab] = useState('available'); // 'available' or 'reservations'
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [requestedQuantity, setRequestedQuantity] = useState('');
  const [pickupMode, setPickupMode] = useState('self');
  const [volunteerName, setVolunteerName] = useState('');

  // Issue Reporting State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [reason, setReason] = useState('');
  const [proofDescription, setProofDescription] = useState('');
  const [activePickupCodes, setActivePickupCodes] = useState({});

  const token = localStorage.getItem('token');

  const fetchIngredients = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/kitchen/ingredients`, {
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

  const fetchReservations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/kitchen/reservations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch reservations.');
      setReservations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'available') {
      fetchIngredients();
    } else {
      fetchReservations();
    }
  }, [activeTab]);

  const handleOpenRequestModal = (ing) => {
    setSelectedIngredient(ing);
    setRequestedQuantity('');
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
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid positive quantity.');
      return;
    }

    if (qty > selectedIngredient.quantity) {
      setError(`Cannot request more than the available quantity (${selectedIngredient.quantity} ${selectedIngredient.unit}).`);
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
          volunteerName: pickupMode === 'volunteer' ? volunteerName : ''
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to request ingredient.');

      if (data.reservation?._id && data.reservation?.pickupCode) {
        setActivePickupCodes(prev => ({
          ...prev,
          [data.reservation._id]: data.reservation.pickupCode
        }));
      }

      setSuccess(`Successfully requested ${qty} ${selectedIngredient.unit} of "${selectedIngredient.name}"!`);
      setShowRequestModal(false);
      fetchIngredients();
      fetchReservations();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegenerateCode = async (resId) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/reservations/${resId}/regenerate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate pickup code.');

      setActivePickupCodes(prev => ({
        ...prev,
        [resId]: data.pickupCode
      }));
      setSuccess(`Generated fresh 6-digit pickup OTP: ${data.pickupCode}`);
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
    if (!reason) {
      setError('Please provide a reason for the report.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/issue-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reservationRef: selectedReservation._id,
          reason,
          proofDescription
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit report.');

      setSuccess('Issue reported successfully. The administration will review your complaint.');
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deliveryStatus: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update delivery status.');

      setSuccess(`Status updated to ${newStatus.replace('_', ' ')}!`);
      fetchReservations();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const activeReservationsCount = reservations.filter(r => ['claimed', 'pickup_scheduled'].includes(r.deliveryStatus)).length;
  const completedReservationsCount = reservations.filter(r => r.deliveryStatus === 'completed').length;

  return (
    <div className="main-content">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Soup Kitchen Portal</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user?.name} (Recipient Organization)</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Available Surplus Items</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
            <span className="stat-value">{ingredients.length}</span>
            <span style={{ fontSize: '1.4rem' }}>🥬</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Reservations</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
            <span className="stat-value" style={{ color: '#38bdf8' }}>{activeReservationsCount}</span>
            <span style={{ fontSize: '1.4rem' }}>🚚</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed Deliveries</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
            <span className="stat-value" style={{ color: '#10b981' }}>{completedReservationsCount}</span>
            <span style={{ fontSize: '1.4rem' }}>✓</span>
          </div>
        </div>
      </div>

      {/* Segmented Tab Controls */}
      <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '2rem', maxWidth: '480px' }}>
        <button 
          className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
          style={{ 
            flex: 1,
            background: activeTab === 'available' ? 'var(--bg-tertiary)' : 'transparent', 
            border: 'none', 
            color: activeTab === 'available' ? 'var(--text-primary)' : 'var(--text-secondary)', 
            fontWeight: 700, 
            cursor: 'pointer', 
            padding: '0.65rem 1.25rem',
            borderRadius: '9px',
            fontSize: '0.88rem',
            boxShadow: activeTab === 'available' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            transition: 'all 0.18s ease'
          }}
          onClick={() => setActiveTab('available')}
        >
          Available Surplus Food ({ingredients.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'reservations' ? 'active' : ''}`}
          style={{ 
            flex: 1,
            background: activeTab === 'reservations' ? 'var(--bg-tertiary)' : 'transparent', 
            border: 'none', 
            color: activeTab === 'reservations' ? 'var(--text-primary)' : 'var(--text-secondary)', 
            fontWeight: 700, 
            cursor: 'pointer', 
            padding: '0.65rem 1.25rem',
            borderRadius: '9px',
            fontSize: '0.88rem',
            boxShadow: activeTab === 'reservations' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            transition: 'all 0.18s ease'
          }}
          onClick={() => setActiveTab('reservations')}
        >
          My Reservations ({reservations.length})
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading details...</p>}

      {/* Available Surplus View */}
      {activeTab === 'available' && !loading && (
        ingredients.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🍲</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>No Available Surplus Food</h3>
            <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '0.9rem' }}>There are currently no approved ingredients available near your location. Check back soon!</p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                Surplus Food Near You (Nearest First)
              </h3>
              <span className="status-badge" style={{ fontSize: '0.78rem' }}>
                {ingredients.length} items found
              </span>
            </div>
            <div className="listings-grid">
              {ingredients.map((ing) => (
                <div key={ing._id} className="ingredient-card">
                  <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 className="card-title">{ing.name}</h3>
                      <span className="status-badge status-approved" style={{ fontSize: '0.7rem' }}>
                        📍 {ing.distance} km away
                      </span>
                    </div>
                    <div className="card-category" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                      <span>{ing.category}</span>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>✓ Verified</span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Available</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-color)' }}>{ing.quantity} {ing.unit}</span>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Storage</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{ing.storageType}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Expiry Date:</span>
                        <span style={{ fontWeight: 600, color: '#f87171' }}>{formatDate(ing.expiryDate)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Pickup Deadline:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(ing.pickupDeadline)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.45rem', marginTop: '0.15rem' }}>
                        <span>Donor:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ing.donorRef?.name || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Reputation:</span>
                        <span style={{ fontWeight: 700, color: '#34d399' }}>⭐ {ing.donorRef?.reputationScore ?? 0} pts</span>
                      </div>
                    </div>
                  </div>
                  <div className="card-footer">
                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', padding: '0.55rem' }}
                      onClick={() => handleOpenRequestModal(ing)}
                    >
                      Request Food Ingredient
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Reservations Tab View */}
      {activeTab === 'reservations' && !loading && (
        reservations.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>No Reservations Yet</h3>
            <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '0.9rem' }}>You have not requested or reserved any surplus food ingredients yet.</p>
            <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => setActiveTab('available')}>
              Browse Available Food
            </button>
          </div>
        ) : (
          <div className="listings-grid">
            {reservations.map((res) => {
              const req = res.requestRef;
              const ing = req?.ingredientRef;
              return (
                <div key={res._id} className="ingredient-card">
                  <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 className="card-title">{ing?.name || 'Unknown Ingredient'}</h3>
                      <span className={`status-badge status-${res.deliveryStatus}`} style={{ fontSize: '0.72rem' }}>
                        {res.deliveryStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="card-category" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                      <span>{ing?.category || 'N/A'}</span>
                      <span style={{ fontSize: '0.78rem', color: req?.status === 'fulfilled' ? '#10b981' : 'var(--text-secondary)', fontWeight: 600 }}>
                        Request: {req?.status}
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="info-item">
                      <span className="info-label">Reserved Qty:</span>
                      <span className="info-value" style={{ color: 'var(--accent-color)', fontWeight: 700 }}>
                        {res.reservedQuantity} {ing?.unit || ''}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Pickup Mode:</span>
                      <span className="info-value" style={{ textTransform: 'capitalize' }}>{req?.pickupMode}</span>
                    </div>
                    {req?.pickupMode === 'volunteer' && (
                      <div className="info-item">
                        <span className="info-label">Volunteer:</span>
                        <span className="info-value" style={{ color: '#38bdf8' }}>{req?.volunteerName}</span>
                      </div>
                    )}
                    
                    {/* 6-Digit Pickup OTP Section */}
                    {(() => {
                      const codeToShow = activePickupCodes[res._id] || (res.pickupCode && res.pickupCode.length === 6 ? res.pickupCode : null);
                      if (codeToShow && ['claimed', 'pickup_scheduled'].includes(res.deliveryStatus)) {
                        return (
                          <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: '10px', padding: '0.75rem 0.9rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                🔐 6-Digit Pickup OTP
                              </span>
                              <button 
                                type="button"
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                                onClick={() => handleRegenerateCode(res._id)}
                              >
                                Regenerate
                              </button>
                            </div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '5px', fontFamily: 'monospace', textAlign: 'center', margin: '0.2rem 0' }}>
                              {codeToShow}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                              Share this code with the Donor upon physical food collection
                            </span>
                          </div>
                        );
                      }
                      if (['claimed', 'pickup_scheduled'].includes(res.deliveryStatus)) {
                        return (
                          <div style={{ marginTop: '0.75rem' }}>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderColor: '#38bdf8', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.08)', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
                              onClick={() => handleRegenerateCode(res._id)}
                            >
                              <span>🔑</span> View / Generate Pickup OTP
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="card-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {res.deliveryStatus === 'claimed' && (
                      <>
                        <button 
                          className="btn btn-primary" 
                          style={{ width: '100%', padding: '0.45rem 0.5rem', fontSize: '0.85rem' }}
                          onClick={() => handleUpdateStatus(res._id, 'pickup_scheduled')}
                        >
                          Schedule Pickup
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ width: '100%', padding: '0.45rem 0.5rem', fontSize: '0.85rem', color: '#f87171' }}
                          onClick={() => handleUpdateStatus(res._id, 'cancelled')}
                        >
                          Cancel Claim
                        </button>
                      </>
                    )}
                    {res.deliveryStatus === 'pickup_scheduled' && (
                      <>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '0.2rem 0' }}>
                          Pickup Scheduled (Awaiting Donor Code Verification)
                        </span>
                        <button 
                          className="btn btn-secondary" 
                          style={{ width: '100%', padding: '0.45rem 0.5rem', fontSize: '0.85rem', color: '#f87171' }}
                          onClick={() => handleUpdateStatus(res._id, 'cancelled')}
                        >
                          Cancel Claim
                        </button>
                      </>
                    )}
                    {res.deliveryStatus === 'handed_over' && (
                      <>
                        <button 
                          className="btn btn-primary" 
                          style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                          onClick={() => handleUpdateStatus(res._id, 'completed')}
                        >
                          Confirm Receipt & Complete
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
                          onClick={() => handleOpenIssueModal(res)}
                        >
                          Report Food Quality Issue
                        </button>
                      </>
                    )}
                    {res.deliveryStatus === 'completed' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                        <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700, textAlign: 'center', width: '100%' }}>
                          ✓ Completed Successfully
                        </span>
                        <button 
                          className="btn btn-outline" 
                          style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.82rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          onClick={() => handleOpenIssueModal(res)}
                        >
                          Report Food Issue
                        </button>
                      </div>
                    )}
                    {res.deliveryStatus === 'expired' && (
                      <span style={{ fontSize: '0.85rem', color: '#f43f5e', fontWeight: 600, textAlign: 'center', width: '100%' }}>
                        Reservation Expired
                      </span>
                    )}
                    {res.deliveryStatus === 'cancelled' && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: 600, textAlign: 'center', width: '100%' }}>
                        Reservation Cancelled
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Request Modal */}
      {showRequestModal && selectedIngredient && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Request Food Ingredient</h2>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem' }} onClick={() => setShowRequestModal(false)}>✕</button>
            </div>

            <form onSubmit={handleRequestSubmit}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
                  <p>Item: <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.name}</strong> ({selectedIngredient.category})</p>
                  <p style={{ marginTop: '0.25rem' }}>Total Available: <strong style={{ color: 'var(--accent-color)' }}>{selectedIngredient.quantity} {selectedIngredient.unit}</strong></p>
                  <p style={{ marginTop: '0.25rem' }}>Pickup Distance: <strong style={{ color: '#38bdf8' }}>{selectedIngredient.distance} km</strong></p>
                </div>

                {error && <div className="alert alert-danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>{error}</div>}
                
                <div className="form-group">
                  <label className="form-label">Requested Quantity ({selectedIngredient.unit})</label>
                  <input 
                    type="number" 
                    min="0.1" 
                    max={selectedIngredient.quantity}
                    step="0.1"
                    className="form-control" 
                    required 
                    value={requestedQuantity} 
                    onChange={e => setRequestedQuantity(e.target.value)} 
                    placeholder={`Max: ${selectedIngredient.quantity}`}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Pickup Mode</label>
                  <select 
                    className="form-control" 
                    value={pickupMode} 
                    onChange={e => setPickupMode(e.target.value)}
                  >
                    <option value="self">Self (Soup kitchen staff will pick up)</option>
                    <option value="volunteer">Volunteer (Assign a volunteer to pick up)</option>
                  </select>
                </div>

                {pickupMode === 'volunteer' && (
                  <div className="form-group">
                    <label className="form-label">Volunteer Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={volunteerName} 
                      onChange={e => setVolunteerName(e.target.value)} 
                      placeholder="Enter volunteer's full name"
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Pickup Geolocation Map (Read-Only)</label>
                  <div className="map-container" style={{ height: '170px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <LeafletMap 
                      lat={selectedIngredient.location.lat} 
                      lng={selectedIngredient.location.lng} 
                      readOnly={true} 
                      markerLabel={`${selectedIngredient.name} Pickup Location`} 
                    />
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

      {/* Issue Reporting Modal */}
      {showIssueModal && selectedReservation && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Report Food Quality Issue</h2>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem' }} onClick={() => setShowIssueModal(false)}>✕</button>
            </div>
            <form onSubmit={handleIssueSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>{error}</div>}
                
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#fca5a5' }}>
                  Reporting issue for: <strong>{selectedReservation.requestRef?.ingredientRef?.name || 'Ingredient'}</strong>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Complaint (Required)</label>
                  <textarea 
                    className="form-control" 
                    required 
                    rows="3"
                    value={reason} 
                    onChange={e => setReason(e.target.value)} 
                    placeholder="e.g. Food spoiled, packaging torn, incorrect quantity delivered..."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Proof Description or Reference Link (Optional)</label>
                  <input 
                    type="text"
                    className="form-control" 
                    value={proofDescription} 
                    onChange={e => setProofDescription(e.target.value)} 
                    placeholder="e.g. Link to image, description of defect..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Submit Issue Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
