import { useState, useEffect } from 'react';
import LeafletMap from '../components/LeafletMap';
import CustodyRibbon from '../components/CustodyRibbon';

export default function AdminDashboard({ user }) {
  const [pendingIngredients, setPendingIngredients] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Checklist state for approval modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [categoryValid, setCategoryValid] = useState(false);
  const [dataReasonable, setDataReasonable] = useState(false);

  const token = localStorage.getItem('token');
  const [stats, setStats] = useState(null);
  const [issueReports, setIssueReports] = useState([]);
  const [deactivatedDonors, setDeactivatedDonors] = useState([]);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/stats/admin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    }
  };

  const fetchIssueReports = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/issue-reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setIssueReports(data);
    } catch (err) {
      console.error('Error fetching issue reports:', err);
    }
  };

  const fetchDeactivatedDonors = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/donors/deactivated', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setDeactivatedDonors(data);
    } catch (err) {
      console.error('Error fetching deactivated donors:', err);
    }
  };

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/admin/ingredients/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch pending ingredients.');
      
      setPendingIngredients(data);
      if (data.length > 0) {
        setSelectedIngredient(data[0]);
      } else {
        setSelectedIngredient(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    fetchStats();
    fetchIssueReports();
    fetchDeactivatedDonors();
  }, []);

  const handleOpenApproveModal = () => {
    // Reset checklist to false
    setCategoryValid(false);
    setDataReasonable(false);
    setError('');
    setShowApproveModal(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`http://localhost:5000/api/admin/ingredients/${selectedIngredient._id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to approve ingredient.');

      setSuccess(`Approved "${selectedIngredient.name}" successfully! Quality report logged.`);
      setShowApproveModal(false);
      fetchPending();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReject = async () => {
    if (!selectedIngredient) return;
    const confirmMsg = `Are you sure you want to reject "${selectedIngredient.name}"?\nThis will deduct 5 points from the donor's reputation score.`;
    if (!window.confirm(confirmMsg)) return;

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`http://localhost:5000/api/admin/ingredients/${selectedIngredient._id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to reject ingredient.');

      setSuccess(`Rejected "${selectedIngredient.name}". Donor reputation score is now ${data.donorReputationScore} (-5 points).`);
      fetchPending();
      fetchStats();
      fetchDeactivatedDonors();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResolveIssue = async (reportId, status) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`http://localhost:5000/api/issue-reports/${reportId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resolve issue report.');

      setSuccess(`Issue report successfully resolved as ${status}!`);
      fetchIssueReports();
      fetchStats();
      fetchDeactivatedDonors();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReactivateDonor = async (donorId) => {
    if (!window.confirm('Are you sure you want to reactivate this donor? This will reset their reputation score to 60.')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`http://localhost:5000/api/admin/donors/${donorId}/reactivate`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reactivate donor.');

      setSuccess('Donor reactivated successfully and reputation score reset to 60.');
      fetchDeactivatedDonors();
      fetchStats();
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
          <h1 className="dashboard-title">Admin Review Panel</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user?.name} (Administrator)</p>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Global Ingredients Donated</span>
            <span className="mono-val" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--structure)' }}>{stats.totalIngredients}</span>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Global Fulfilled Requests</span>
            <span className="mono-val" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--verified)' }}>{stats.totalFulfilled}</span>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Active Food Donors</span>
            <span className="mono-val" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--active)' }}>{stats.activeDonors}</span>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading && <p>Loading pending reviews...</p>}

      {!loading && pendingIngredients.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <h2>🎉 Clean Queue!</h2>
          <p style={{ marginTop: '0.5rem' }}>There are currently no pending surplus food listings to review.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem', minHeight: '60vh' }}>
          
          {/* Left panel: List of pending items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '75vh', paddingRight: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Pending Queue ({pendingIngredients.length} items)
            </h3>
            {pendingIngredients.map((ing) => (
              <div 
                key={ing._id} 
                className={`ingredient-card glass-panel status-card-${ing.status}`} 
                style={{ 
                  cursor: 'pointer',
                  border: selectedIngredient?._id === ing._id ? '2.5px solid var(--active)' : '1px solid var(--border)',
                  boxShadow: selectedIngredient?._id === ing._id ? '0 8px 24px rgba(37, 99, 235, 0.15)' : 'none',
                  background: 'var(--surface)',
                  marginBottom: '1rem',
                  height: 'fit-content'
                }}
                onClick={() => setSelectedIngredient(ing)}
              >
                <div className="card-header" style={{ borderBottom: 'none', paddingBottom: '0.25rem' }}>
                  <div>
                    <h4 className="card-title" style={{ fontSize: '1.05rem', margin: 0 }}>{ing.name}</h4>
                    <div className="card-category">{ing.category}</div>
                  </div>
                </div>
                <div style={{ padding: '0 1.25rem 0.25rem 1.25rem' }}>
                  <CustodyRibbon status={ing.status} />
                </div>
                <div className="card-body" style={{ fontSize: '0.85rem', paddingTop: 0 }}>
                  <div className="info-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span className="info-label">Donor:</span>
                    <span className="info-value">{ing.donorRef?.name || 'Unknown'}</span>
                  </div>
                  <div className="info-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="info-label">Quantity:</span>
                    <span className="info-value">{ing.quantity} {ing.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right panel: Details + Leaflet Map */}
          {selectedIngredient && (
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                  {selectedIngredient.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Listed Category: <strong>{selectedIngredient.category}</strong>
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Listing Details
                  </h4>
                  <p style={{ fontSize: '0.9rem' }}>Quantity: <strong>{selectedIngredient.quantity} {selectedIngredient.unit}</strong></p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Storage: <strong>{selectedIngredient.storageType}</strong></p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Expiry: <strong style={{ color: '#fda4af' }}>{formatDate(selectedIngredient.expiryDate)}</strong></p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Deadline: <strong>{formatDate(selectedIngredient.pickupDeadline)}</strong></p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Donor Information
                  </h4>
                  <p style={{ fontSize: '0.9rem' }}>Name: <strong>{selectedIngredient.donorRef?.name || 'N/A'}</strong></p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Email: <strong>{selectedIngredient.donorRef?.email || 'N/A'}</strong></p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Reputation Score: <strong style={{ color: '#6ee7b7' }}>{selectedIngredient.donorRef?.reputationScore ?? 0} pts</strong>
                  </p>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Pickup Geolocation Map
                </h4>
                <div className="map-container" style={{ height: '220px' }}>
                  <LeafletMap 
                    lat={selectedIngredient.location.lat} 
                    lng={selectedIngredient.location.lng} 
                    readOnly={true} 
                    markerLabel={`${selectedIngredient.name} Pickup Location`} 
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'right', marginTop: '0.25rem' }}>
                  Coords: {selectedIngredient.location.lat.toFixed(6)}, {selectedIngredient.location.lng.toFixed(6)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: 'auto' }}>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleReject}>
                  Reject Listing (-5 Rep)
                </button>
                <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={handleOpenApproveModal}>
                  Verify & Approve...
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Reported Issues Section */}
      <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border-color)', paddingTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
          Reported Food Quality Issues ({issueReports.length})
        </h2>

        {issueReports.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>No pending quality issue reports from soup kitchens.</p>
          </div>
        ) : (
          <div className="listings-grid">
            {issueReports.map((report) => (
              <div key={report._id} className={`ingredient-card glass-panel status-card-rejected`} style={{ border: '1px solid var(--danger)', height: 'fit-content' }}>
                <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch', borderBottom: 'none', paddingBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 className="card-title">{report.ingredientRef?.name || 'Unknown Item'}</h3>
                  </div>
                  <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Reported by: <strong>{report.reportedBy?.name || 'Soup Kitchen'}</strong></span>
                  </div>
                </div>
                <div style={{ padding: '0 1.25rem 0.5rem 1.25rem' }}>
                  <CustodyRibbon status={report.ingredientRef?.status} deliveryStatus={report.reservationRef?.deliveryStatus} />
                </div>

                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ background: 'rgba(220, 38, 38, 0.05)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid rgba(220, 38, 38, 0.15)' }}>
                    <p style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: '0.2rem' }}>Reason:</p>
                    <p style={{ color: 'var(--structure)' }}>{report.reason}</p>
                  </div>

                  {report.proofDescription && (
                    <div style={{ fontSize: '0.85rem' }}>
                      <span className="info-label" style={{ display: 'block', marginBottom: '0.15rem' }}>Proof / Description:</span>
                      <span className="info-value" style={{ color: 'var(--text-secondary)' }}>{report.proofDescription}</span>
                    </div>
                  )}

                  <div className="info-item" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
                    <span className="info-label">Reservation Qty:</span>
                    <span className="info-value">{report.reservationRef?.reservedQuantity || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Delivery Status:</span>
                    <span className="info-value" style={{ textTransform: 'capitalize' }}>
                      {report.reservationRef?.deliveryStatus || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="card-footer" style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem' }} 
                    onClick={() => handleResolveIssue(report._id, 'dismissed')}
                  >
                    Dismiss Report
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ flex: 1.5, padding: '0.4rem', fontSize: '0.85rem', background: '#ef4444', borderColor: '#ef4444' }} 
                    onClick={() => {
                      if (window.confirm('Are you sure you want to Uphold this report? This will deduct 15 reputation points from the donor.')) {
                        handleResolveIssue(report._id, 'upheld');
                      }
                    }}
                  >
                    Uphold (-15 Rep)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deactivated Donors Section */}
      <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border-color)', paddingTop: '2.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
          Deactivated Donors ({deactivatedDonors.length})
        </h2>

        {deactivatedDonors.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>No deactivated food donors currently.</p>
          </div>
        ) : (
          <div className="listings-grid">
            {deactivatedDonors.map((donor) => (
              <div key={donor._id} className="ingredient-card glass-panel" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)', height: 'fit-content' }}>
                <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <h3 className="card-title">{donor.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{donor.email}</p>
                </div>
                <div className="card-body">
                  <div className="info-item">
                    <span className="info-label">Current Reputation:</span>
                    <span className="info-value" style={{ color: '#ef4444', fontWeight: 'bold' }}>{donor.reputationScore} pts</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Account Status:</span>
                    <span className="info-value" style={{ color: '#ef4444' }}>Deactivated</span>
                  </div>
                </div>
                <div className="card-footer" style={{ padding: '0.75rem' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }} 
                    onClick={() => handleReactivateDonor(donor._id)}
                  >
                    Reactivate Donor (Reset Rep to 60)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval checklist modal */}
      {showApproveModal && selectedIngredient && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Quality Verification</h2>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowApproveModal(false)}>X</button>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Verify details for <strong>{selectedIngredient.name}</strong> from donor <strong>{selectedIngredient.donorRef?.name}</strong> before approval:
            </p>

            <form onSubmit={handleApproveSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input 
                    type="checkbox" 
                    required
                    checked={categoryValid} 
                    onChange={e => setCategoryValid(e.target.checked)} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>I confirm the category is valid</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input 
                    type="checkbox" 
                    required
                    checked={dataReasonable} 
                    onChange={e => setDataReasonable(e.target.checked)} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>I confirm the listing data looks reasonable</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowApproveModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }}>
                  Confirm Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
