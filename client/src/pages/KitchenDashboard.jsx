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

      setSuccess(`Successfully requested ${qty} ${selectedIngredient.unit} of "${selectedIngredient.name}"!`);
      setShowRequestModal(false);
      fetchIngredients();
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

  return (
    <div className="main-content">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Soup Kitchen Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user?.name} (Soup Kitchen)</p>
        </div>
      </div>

      {/* Segmented Tab Controls */}
      <div style={{ display: 'inline-flex', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '2.5rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
          style={{ 
            background: activeTab === 'available' ? 'var(--bg-tertiary)' : 'transparent', 
            border: 'none', 
            color: activeTab === 'available' ? 'var(--text-primary)' : 'var(--text-secondary)', 
            fontWeight: 600, 
            cursor: 'pointer', 
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            boxShadow: activeTab === 'available' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setActiveTab('available')}
        >
          Available Surplus Food
        </button>
        <button 
          className={`tab-btn ${activeTab === 'reservations' ? 'active' : ''}`}
          style={{ 
            background: activeTab === 'reservations' ? 'var(--bg-tertiary)' : 'transparent', 
            border: 'none', 
            color: activeTab === 'reservations' ? 'var(--text-primary)' : 'var(--text-secondary)', 
            fontWeight: 600, 
            cursor: 'pointer', 
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            boxShadow: activeTab === 'reservations' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setActiveTab('reservations')}
        >
          My Reservations
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading && <p>Loading details...</p>}

      {/* Available Surplus View */}
      {activeTab === 'available' && !loading && (
        ingredients.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <h2>No Available Surplus Food</h2>
            <p style={{ marginTop: '0.5rem' }}>There are currently no approved ingredients available in the system.</p>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Surplus Food Near You (Nearest First)
            </h3>
            <div className="listings-grid">
              {ingredients.map((ing) => (
                <div key={ing._id} className="ingredient-card glass-panel">
                  <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 className="card-title">{ing.name}</h3>
                      <span className="status-badge status-approved" style={{ fontSize: '0.7rem' }}>
                        {ing.distance} km away
                      </span>
                    </div>
                    <div className="card-category" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                      <span>{ing.category}</span>
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Approved</span>
                    </div>
                  </div>
                  <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Available</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{ing.quantity} {ing.unit}</span>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Storage</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{ing.storageType}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Expires:</span>
                        <span style={{ fontWeight: 600, color: '#f87171' }}>{formatDate(ing.expiryDate)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Pickup:</span>
                        <span style={{ fontWeight: 600 }}>{formatDate(ing.pickupDeadline)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                        <span>Donor:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ing.donorRef?.name || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Reputation:</span>
                        <span style={{ fontWeight: 600, color: '#34d399' }}>{ing.donorRef?.reputationScore ?? 0} pts</span>
                      </div>
                    </div>
                  </div>
                  <div className="card-footer" style={{ padding: '0.75rem' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%' }}
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
          <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <h2>No Reservations Yet</h2>
            <p style={{ marginTop: '0.5rem' }}>You have not requested or reserved any surplus food ingredients yet.</p>
          </div>
        ) : (
          <div className="listings-grid">
            {reservations.map((res) => {
              const req = res.requestRef;
              const ing = req?.ingredientRef;
              return (
                <div key={res._id} className="ingredient-card glass-panel">
                  <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 className="card-title">{ing?.name || 'Unknown Ingredient'}</h3>
                      <span className={`status-badge status-${res.deliveryStatus}`} style={{ fontSize: '0.75rem' }}>
                        {res.deliveryStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="card-category" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                      <span>{ing?.category || 'N/A'}</span>
                      <span style={{ fontSize: '0.80rem', color: req?.status === 'fulfilled' ? '#10b981' : 'var(--text-secondary)' }}>
                        Request: {req?.status}
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="info-item">
                      <span className="info-label">Reserved Qty:</span>
                      <span className="info-value" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                        {res.reservedQuantity} {ing?.unit || ''}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Pickup Mode:</span>
                      <span className="info-value">{req?.pickupMode}</span>
                    </div>
                    {req?.pickupMode === 'volunteer' && (
                      <div className="info-item">
                        <span className="info-label">Volunteer:</span>
                        <span className="info-value" style={{ color: '#60a5fa' }}>{req?.volunteerName}</span>
                      </div>
                    )}
                    <div className="info-item">
                      <span className="info-label">Expires At:</span>
                      <span className="info-value" style={{ color: '#fda4af' }}>{formatDate(res.expiresAt)}</span>
                    </div>
                    {res.pickupCode && res.pickupCode.length === 6 && ['claimed', 'pickup_scheduled'].includes(res.deliveryStatus) && (
                      <div className="info-item" style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '4px', marginTop: '0.5rem', border: '1px dashed #3b82f6' }}>
                        <span className="info-label" style={{ color: '#60a5fa' }}>Pickup Code (Share with collector):</span>
                        <span className="info-value" style={{ color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '1px' }}>{res.pickupCode}</span>
                      </div>
                    )}
                  </div>
                  <div className="card-footer" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {res.deliveryStatus === 'claimed' && (
                      <>
                        <button 
                          className="btn btn-primary" 
                          style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.85rem' }}
                          onClick={() => handleUpdateStatus(res._id, 'pickup_scheduled')}
                        >
                          Schedule Pickup
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.85rem', background: '#ef4444', borderColor: '#ef4444' }}
                          onClick={() => handleUpdateStatus(res._id, 'cancelled')}
                        >
                          Cancel Claim
                        </button>
                      </>
                    )}
                    {res.deliveryStatus === 'pickup_scheduled' && (
                      <>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '0.25rem 0' }}>
                          Pickup Scheduled (Awaiting Donor Code Verification)
                        </span>
                        <button 
                          className="btn btn-danger" 
                          style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.85rem', background: '#ef4444', borderColor: '#ef4444' }}
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
                          style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.85rem', background: '#10b981', borderColor: '#10b981' }}
                          onClick={() => handleUpdateStatus(res._id, 'completed')}
                        >
                          Mark as Completed
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.85rem', background: '#ef4444', borderColor: '#ef4444' }}
                          onClick={() => handleOpenIssueModal(res)}
                        >
                          Report an Issue
                        </button>
                      </>
                    )}
                    {res.deliveryStatus === 'completed' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                        <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600, textAlign: 'center', width: '100%' }}>
                          ✓ Completed Successfully
                        </span>
                        <button 
                          className="btn btn-danger" 
                          style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.85rem', background: '#ef4444', borderColor: '#ef4444' }}
                          onClick={() => handleOpenIssueModal(res)}
                        >
                          Report an Issue
                        </button>
                      </div>
                    )}
                    {res.deliveryStatus === 'expired' && (
                      <span style={{ fontSize: '0.85rem', color: '#f43f5e', fontWeight: 600, textAlign: 'center', width: '100%' }}>
                        Reservation Expired
                      </span>
                    )}
                    {res.deliveryStatus === 'cancelled' && (
                      <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600, textAlign: 'center', width: '100%' }}>
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
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Request Food</h2>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowRequestModal(false)}>X</button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
              <p>Item: <strong>{selectedIngredient.name}</strong></p>
              <p style={{ marginTop: '0.2rem' }}>Total Available: <strong>{selectedIngredient.quantity} {selectedIngredient.unit}</strong></p>
              <p style={{ marginTop: '0.2rem' }}>Pickup Location Distance: <strong>{selectedIngredient.distance} km</strong></p>
            </div>

            <form onSubmit={handleRequestSubmit}>
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

              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label className="form-label">Pickup Geolocation Map (Read-Only)</label>
                <div className="map-container" style={{ height: '180px' }}>
                  <LeafletMap 
                    lat={selectedIngredient.location.lat} 
                    lng={selectedIngredient.location.lng} 
                    readOnly={true} 
                    markerLabel={`${selectedIngredient.name} Pickup Location`} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowRequestModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Reporting Modal */}
      {showIssueModal && selectedReservation && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Report a Quality Issue</h2>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowIssueModal(false)}>X</button>
            </div>
            <form onSubmit={handleIssueSubmit}>
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
                  placeholder="e.g. Link to image, description of decay..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" style={{ flex: 1.5, background: '#ef4444', borderColor: '#ef4444' }}>Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
