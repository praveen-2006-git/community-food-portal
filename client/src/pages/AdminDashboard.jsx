import { useState, useEffect } from 'react';
import LeafletMap from '../components/LeafletMap';
import ReputationLedger from '../components/ReputationLedger';
import { API_BASE_URL } from '../config/api';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'issues', 'deactivated', 'ledger'
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
      const res = await fetch(`${API_BASE_URL}/api/stats/admin`, {
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
      const res = await fetch(`${API_BASE_URL}/api/issue-reports`, {
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
      const res = await fetch(`${API_BASE_URL}/api/admin/donors/deactivated`, {
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
      const res = await fetch(`${API_BASE_URL}/api/admin/ingredients/pending`, {
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
      const res = await fetch(`${API_BASE_URL}/api/admin/ingredients/${selectedIngredient._id}/approve`, {
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
      const res = await fetch(`${API_BASE_URL}/api/admin/ingredients/${selectedIngredient._id}/reject`, {
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
      const res = await fetch(`${API_BASE_URL}/api/issue-reports/${reportId}/resolve`, {
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
      const res = await fetch(`${API_BASE_URL}/api/admin/donors/${donorId}/reactivate`, {
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
          <h1 className="dashboard-title">Admin Review & Governance</h1>
          <p style={{ color: 'var(--text-secondary)' }}>System governance, quality controls, and network audit log</p>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Global Donations</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span className="stat-value">{stats.totalIngredients}</span>
              <span style={{ fontSize: '1.4rem' }}>🌾</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Fulfilled Deliveries</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span className="stat-value" style={{ color: '#10b981' }}>{stats.totalFulfilled}</span>
              <span style={{ fontSize: '1.4rem' }}>🍲</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Active Food Donors</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span className="stat-value" style={{ color: '#38bdf8' }}>{stats.activeDonors}</span>
              <span style={{ fontSize: '1.4rem' }}>👥</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Pending Reviews</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span className="stat-value" style={{ color: pendingIngredients.length > 0 ? '#f59e0b' : '#10b981' }}>
                {pendingIngredients.length}
              </span>
              <span style={{ fontSize: '1.4rem' }}>🔍</span>
            </div>
          </div>
        </div>
      )}

      {/* Segmented Tab Navigation */}
      <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.25rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          style={{ 
            flex: '1 1 auto',
            minWidth: '160px',
            background: activeTab === 'pending' ? 'var(--bg-tertiary)' : 'transparent', 
            border: 'none', 
            color: activeTab === 'pending' ? 'var(--text-primary)' : 'var(--text-secondary)', 
            fontWeight: 700, 
            cursor: 'pointer', 
            padding: '0.65rem 1rem',
            borderRadius: '9px',
            fontSize: '0.86rem',
            boxShadow: activeTab === 'pending' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.18s ease'
          }}
          onClick={() => setActiveTab('pending')}
        >
          <span>Pending Approvals</span>
          {pendingIngredients.length > 0 && (
            <span style={{ background: '#f59e0b', color: 'black', fontSize: '0.7rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '9999px' }}>
              {pendingIngredients.length}
            </span>
          )}
        </button>

        <button 
          className={`tab-btn ${activeTab === 'issues' ? 'active' : ''}`}
          style={{ 
            flex: '1 1 auto',
            minWidth: '160px',
            background: activeTab === 'issues' ? 'var(--bg-tertiary)' : 'transparent', 
            border: 'none', 
            color: activeTab === 'issues' ? 'var(--text-primary)' : 'var(--text-secondary)', 
            fontWeight: 700, 
            cursor: 'pointer', 
            padding: '0.65rem 1rem',
            borderRadius: '9px',
            fontSize: '0.86rem',
            boxShadow: activeTab === 'issues' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.18s ease'
          }}
          onClick={() => setActiveTab('issues')}
        >
          <span>Quality Issues</span>
          {issueReports.length > 0 && (
            <span style={{ background: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '9999px' }}>
              {issueReports.length}
            </span>
          )}
        </button>

        <button 
          className={`tab-btn ${activeTab === 'deactivated' ? 'active' : ''}`}
          style={{ 
            flex: '1 1 auto',
            minWidth: '160px',
            background: activeTab === 'deactivated' ? 'var(--bg-tertiary)' : 'transparent', 
            border: 'none', 
            color: activeTab === 'deactivated' ? 'var(--text-primary)' : 'var(--text-secondary)', 
            fontWeight: 700, 
            cursor: 'pointer', 
            padding: '0.65rem 1rem',
            borderRadius: '9px',
            fontSize: '0.86rem',
            boxShadow: activeTab === 'deactivated' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.18s ease'
          }}
          onClick={() => setActiveTab('deactivated')}
        >
          <span>Deactivated Donors</span>
          {deactivatedDonors.length > 0 && (
            <span style={{ background: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '9999px' }}>
              {deactivatedDonors.length}
            </span>
          )}
        </button>

        <button 
          className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
          style={{ 
            flex: '1 1 auto',
            minWidth: '160px',
            background: activeTab === 'ledger' ? 'var(--bg-tertiary)' : 'transparent', 
            border: 'none', 
            color: activeTab === 'ledger' ? 'var(--text-primary)' : 'var(--text-secondary)', 
            fontWeight: 700, 
            cursor: 'pointer', 
            padding: '0.65rem 1rem',
            borderRadius: '9px',
            fontSize: '0.86rem',
            boxShadow: activeTab === 'ledger' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.18s ease'
          }}
          onClick={() => setActiveTab('ledger')}
        >
          <span>Reputation Leaderboard</span>
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Tab 1: Pending Approvals */}
      {activeTab === 'pending' && (
        loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading pending reviews...</p>
        ) : pendingIngredients.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.4rem' }}>Clean Queue!</h2>
            <p style={{ marginTop: '0.5rem', fontSize: '0.92rem' }}>There are currently no pending surplus food listings awaiting quality review.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', minHeight: '60vh' }}>
            
            {/* Left panel: List of pending items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '75vh', overflowY: 'auto', paddingRight: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Pending Queue ({pendingIngredients.length})
                </h3>
              </div>
              {pendingIngredients.map((ing) => (
                <div 
                  key={ing._id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '1.15rem 1.25rem', 
                    cursor: 'pointer',
                    border: selectedIngredient?._id === ing._id ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    background: selectedIngredient?._id === ing._id ? 'rgba(16, 185, 129, 0.08)' : 'var(--glass-bg)',
                    borderRadius: '12px'
                  }}
                  onClick={() => setSelectedIngredient(ing)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{ing.name}</h4>
                    <span className="status-badge status-pending" style={{ fontSize: '0.68rem' }}>{ing.category}</span>
                  </div>
                  <div style={{ marginTop: '0.65rem', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <p>Donor: <strong style={{ color: 'var(--text-primary)' }}>{ing.donorRef?.name || 'Unknown'}</strong></p>
                    <p>Quantity: <strong style={{ color: 'var(--accent-color)' }}>{ing.quantity} {ing.unit}</strong></p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right panel: Details + Leaflet Map */}
            {selectedIngredient && (
              <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
                        {selectedIngredient.name}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
                        Category: <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.category}</strong>
                      </p>
                    </div>
                    <span className="status-badge status-pending">Pending Review</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.86rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                      Listing Details
                    </span>
                    <p>Quantity: <strong style={{ color: 'var(--accent-color)' }}>{selectedIngredient.quantity} {selectedIngredient.unit}</strong></p>
                    <p>Storage: <strong>{selectedIngredient.storageType}</strong></p>
                    <p>Expiry: <strong style={{ color: '#fda4af' }}>{formatDate(selectedIngredient.expiryDate)}</strong></p>
                    <p>Deadline: <strong>{formatDate(selectedIngredient.pickupDeadline)}</strong></p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.86rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                      Donor Information
                    </span>
                    <p>Name: <strong>{selectedIngredient.donorRef?.name || 'N/A'}</strong></p>
                    <p>Email: <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedIngredient.donorRef?.email || 'N/A'}</span></p>
                    <p>Reputation: <strong style={{ color: '#34d399' }}>⭐ {selectedIngredient.donorRef?.reputationScore ?? 0} pts</strong></p>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                    Pickup Geolocation Verification
                  </h4>
                  <div className="map-container" style={{ height: '200px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <LeafletMap 
                      lat={selectedIngredient.location.lat} 
                      lng={selectedIngredient.location.lng} 
                      readOnly={true} 
                      markerLabel={`${selectedIngredient.name} Pickup Location`} 
                    />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'right', marginTop: '0.25rem' }}>
                    GPS: {selectedIngredient.location.lat.toFixed(6)}, {selectedIngredient.location.lng.toFixed(6)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: 'auto' }}>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleReject}>
                    Reject (-5 Rep)
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={handleOpenApproveModal}>
                    Verify & Approve Listing
                  </button>
                </div>
              </div>
            )}

          </div>
        )
      )}

      {/* Tab 2: Quality Issues */}
      {activeTab === 'issues' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
              Reported Food Quality Issues ({issueReports.length})
            </h2>
          </div>

          {issueReports.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛡️</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Active Complaints</h3>
              <p style={{ fontSize: '0.9rem' }}>No pending food quality issues reported by soup kitchens.</p>
            </div>
          ) : (
            <div className="listings-grid">
              {issueReports.map((report) => (
                <div key={report._id} className="ingredient-card" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', height: 'fit-content' }}>
                  <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 className="card-title">{report.ingredientRef?.name || 'Unknown Item'}</h3>
                      <span className="status-badge status-rejected" style={{ fontSize: '0.7rem' }}>
                        Pending Resolution
                      </span>
                    </div>
                    <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Reported by: <strong style={{ color: 'var(--text-primary)' }}>{report.reportedBy?.name || 'Soup Kitchen'}</strong>
                    </div>
                  </div>

                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <p style={{ fontWeight: 700, color: '#fca5a5', marginBottom: '0.2rem', fontSize: '0.75rem', textTransform: 'uppercase' }}>Reason:</p>
                      <p style={{ color: 'var(--text-primary)' }}>{report.reason}</p>
                    </div>

                    {report.proofDescription && (
                      <div style={{ fontSize: '0.85rem' }}>
                        <span className="info-label" style={{ display: 'block', marginBottom: '0.15rem' }}>Proof / Reference:</span>
                        <span className="info-value" style={{ color: 'var(--text-secondary)' }}>{report.proofDescription}</span>
                      </div>
                    )}

                    <div className="info-item" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
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

                  <div className="card-footer" style={{ flexDirection: 'row', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem' }} 
                      onClick={() => handleResolveIssue(report._id, 'dismissed')}
                    >
                      Dismiss
                    </button>
                    <button 
                      className="btn btn-danger" 
                      style={{ flex: 1.5, padding: '0.45rem', fontSize: '0.82rem' }} 
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
      )}

      {/* Tab 3: Deactivated Donors */}
      {activeTab === 'deactivated' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
              Deactivated Donors ({deactivatedDonors.length})
            </h2>
          </div>

          {deactivatedDonors.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✨</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>All Donors Active</h3>
              <p style={{ fontSize: '0.9rem' }}>No food donors are currently suspended or deactivated.</p>
            </div>
          ) : (
            <div className="listings-grid">
              {deactivatedDonors.map((donor) => (
                <div key={donor._id} className="ingredient-card" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', height: 'fit-content' }}>
                  <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 className="card-title">{donor.name}</h3>
                      <span className="status-badge status-rejected" style={{ fontSize: '0.68rem' }}>Deactivated</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{donor.email}</p>
                  </div>
                  <div className="card-body">
                    <div className="info-item">
                      <span className="info-label">Reputation Score:</span>
                      <span className="info-value" style={{ color: '#ef4444', fontWeight: 800 }}>{donor.reputationScore} pts</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Account Status:</span>
                      <span className="info-value" style={{ color: '#ef4444' }}>Suspended</span>
                    </div>
                  </div>
                  <div className="card-footer">
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
      )}

      {/* Tab 4: Reputation Leaderboard */}
      {activeTab === 'ledger' && (
        <div>
          <ReputationLedger />
        </div>
      )}

      {/* Approval checklist modal */}
      {showApproveModal && selectedIngredient && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Quality Verification Checklist</h2>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem' }} onClick={() => setShowApproveModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleApproveSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Verify details for <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.name}</strong> from donor <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.donorRef?.name}</strong> before approving for public routing:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <input 
                      type="checkbox" 
                      required
                      checked={categoryValid} 
                      onChange={e => setCategoryValid(e.target.checked)} 
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>I confirm the food category and storage type are valid</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <input 
                      type="checkbox" 
                      required
                      checked={dataReasonable} 
                      onChange={e => setDataReasonable(e.target.checked)} 
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>I confirm expiration date, quantity, and location are plausible</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowApproveModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm & Approve Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
