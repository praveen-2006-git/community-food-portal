import { useState, useEffect } from 'react';
import LeafletMap from '../components/LeafletMap';
import CustodyRibbon from '../components/CustodyRibbon';
import { useToast, useSearch } from '../App';

export default function AdminDashboard({ user }) {
  const [pendingIngredients, setPendingIngredients] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionPending, setActionPending] = useState(false);
  const { addToast } = useToast();
  const { searchQuery } = useSearch();

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
    setCategoryValid(false);
    setDataReasonable(false);
    setError('');
    setShowApproveModal(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionPending(true);

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

      addToast(`Listing approved — now visible to kitchens`, 'success');
      setShowApproveModal(false);
      fetchPending();
      fetchStats();
    } catch (err) {
      setError(err.message);
      addToast(err.message || 'Failed to approve listing', 'error');
    } finally {
      setActionPending(false);
    }
  };

  const handleReject = async () => {
    if (!selectedIngredient) return;
    const confirmMsg = `Are you sure you want to reject "${selectedIngredient.name}"?\nThis will deduct 5 points from the donor's reputation score.`;
    if (!window.confirm(confirmMsg)) return;

    setError('');
    setSuccess('');
    setActionPending(true);

    try {
      const res = await fetch(`http://localhost:5000/api/admin/ingredients/${selectedIngredient._id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to reject ingredient.');

      addToast(`Listing rejected — donor notified`, 'success');
      fetchPending();
      fetchStats();
      fetchDeactivatedDonors();
    } catch (err) {
      setError(err.message);
      addToast(err.message || 'Failed to reject listing', 'error');
    } finally {
      setActionPending(false);
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

      const consequencesMsg = status === 'upheld' 
        ? "Issue upheld — 15 points deducted from donor's reputation score" 
        : "Issue report dismissed";
      addToast(consequencesMsg, status === 'upheld' ? 'error' : 'success');
      fetchIssueReports();
      fetchStats();
      fetchDeactivatedDonors();
    } catch (err) {
      setError(err.message);
      addToast(err.message || 'Failed to resolve report', 'error');
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

      addToast(`Donor reactivated successfully — reputation score reset to 60`, 'success');
      fetchDeactivatedDonors();
      fetchStats();
    } catch (err) {
      setError(err.message);
      addToast(err.message || 'Failed to reactivate donor', 'error');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const filteredPending = pendingIngredients.filter(ing => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ing.name.toLowerCase().includes(q) ||
      ing.category.toLowerCase().includes(q) ||
      (ing.donorRef?.name && ing.donorRef.name.toLowerCase().includes(q))
    );
  });

  const filteredReports = issueReports.filter(rep => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      rep.reason.toLowerCase().includes(q) ||
      (rep.ingredientRef?.name && rep.ingredientRef.name.toLowerCase().includes(q)) ||
      (rep.reportedBy?.name && rep.reportedBy.name.toLowerCase().includes(q))
    );
  });

  const filteredDeactivated = deactivatedDonors.filter(donor => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      donor.name.toLowerCase().includes(q) ||
      donor.email.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header bar section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="dashboard-title">System Control Console</h1>
          <p className="dashboard-subtitle" style={{ margin: 0 }}>
            Welcome back, {user?.name}. Oversee facility declarations, quality audits, and listings review.
          </p>
        </div>
      </div>

      {/* KPI Stats Row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Global Ingredients</span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{stats.totalIngredients}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem', fontSize: '1.5rem' }}>🍲</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Fulfilled Requests</span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--verified)', marginTop: '0.25rem' }}>{stats.totalFulfilled}</div>
            </div>
            <div style={{ background: 'var(--verified-glow)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '0.75rem', fontSize: '1.5rem' }}>📦</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Food Donors</span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--active)', marginTop: '0.25rem' }}>{stats.activeDonors}</div>
            </div>
            <div style={{ background: 'var(--active-glow)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '0.75rem', fontSize: '1.5rem' }}>🏪</div>
          </div>
        </div>
      )}

      {error && <div className="badge badge-rejected" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', textTransform: 'none', display: 'block', textAlign: 'center' }}>{error}</div>}

      {/* Main Review Section */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', letterSpacing: '-0.25px' }}>
          Pending Declarations Queue
        </h2>

        {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading reviews queue...</p>}

        {!loading && pendingIngredients.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
            <h2>Queue Cleared</h2>
            <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>There are currently no pending listings requiring administrator verification.</p>
          </div>
        ) : !loading && filteredPending.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
            <h2>No Matching Reviews</h2>
            <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>Try searching for a different keyword or category.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem', alignItems: 'start' }}>
            
            {/* Left Column: Pending review feed list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '75vh', paddingRight: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                Pending items (
                <span key={filteredPending.length} className="pending-count-animate" style={{ color: 'var(--active)', fontWeight: 'bold' }}>
                  {filteredPending.length}
                </span>
                )
              </div>
              
              {filteredPending.map((ing) => (
                <div 
                  key={ing._id} 
                  className="ingredient-card" 
                  style={{ 
                    cursor: 'pointer',
                    border: selectedIngredient?._id === ing._id ? '2px solid var(--active)' : '1px solid var(--border)',
                    background: selectedIngredient?._id === ing._id ? 'rgba(99, 102, 241, 0.05)' : 'rgba(17, 24, 39, 0.3)',
                    boxShadow: selectedIngredient?._id === ing._id ? '0 12px 24px var(--active-glow)' : 'none'
                  }}
                  onClick={() => setSelectedIngredient(ing)}
                >
                  <div className="card-header" style={{ borderBottom: 'none', paddingBottom: '0.25rem' }}>
                    <div>
                      <h4 className="card-title" style={{ fontSize: '1.05rem' }}>{ing.name}</h4>
                      <div className="card-category" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>{ing.category}</div>
                    </div>
                  </div>
                  <div style={{ padding: '0 1.25rem 0.25rem 1.25rem' }}>
                    <CustodyRibbon status={ing.status} />
                  </div>
                  <div className="card-body" style={{ fontSize: '0.85rem', paddingTop: 0 }}>
                    <div className="info-item">
                      <span className="info-label">Facility</span>
                      <span className="info-value">{ing.donorRef?.name || 'Unknown'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Quantity</span>
                      <span className="info-value">{ing.quantity} {ing.unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Active detail pane */}
            {selectedIngredient && (
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                    {selectedIngredient.name}
                  </h3>
                  <span className="badge badge-pending" style={{ marginTop: '0.4rem', display: 'inline-block' }}>
                    {selectedIngredient.category}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div>
                    <h4 style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                      Specifications
                    </h4>
                    <p style={{ fontSize: '0.88rem' }}>Quantity: <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.quantity} {selectedIngredient.unit}</strong></p>
                    <p style={{ fontSize: '0.88rem', marginTop: '0.25rem' }}>Storage: <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.storageType}</strong></p>
                    <p style={{ fontSize: '0.88rem', marginTop: '0.25rem' }}>Expiry: <strong style={{ color: 'var(--danger)' }}>{formatDate(selectedIngredient.expiryDate)}</strong></p>
                    <p style={{ fontSize: '0.88rem', marginTop: '0.25rem' }}>Deadline: <strong style={{ color: 'var(--text-primary)' }}>{formatDate(selectedIngredient.pickupDeadline)}</strong></p>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                      Supplier Details
                    </h4>
                    <p style={{ fontSize: '0.88rem' }}>Name: <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.donorRef?.name || 'N/A'}</strong></p>
                    <p style={{ fontSize: '0.88rem', marginTop: '0.25rem' }}>Email: <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.donorRef?.email || 'N/A'}</strong></p>
                    <p style={{ fontSize: '0.88rem', marginTop: '0.25rem' }}>
                      Reputation: <strong style={{ color: 'var(--verified)' }}>{selectedIngredient.donorRef?.reputationScore ?? 0} pts</strong>
                    </p>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                    Declaration Pickup Pin location
                  </h4>
                  <div className="map-container" style={{ height: '220px' }}>
                    <LeafletMap 
                      lat={selectedIngredient.location.lat} 
                      lng={selectedIngredient.location.lng} 
                      readOnly={true} 
                      markerLabel={`${selectedIngredient.name} Pickup Location`} 
                    />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'right', marginTop: '0.25rem' }}>
                    Coords: {selectedIngredient.location.lat.toFixed(6)}, {selectedIngredient.location.lng.toFixed(6)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: 'auto' }}>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleReject} disabled={actionPending}>
                    {actionPending ? 'Rejecting...' : 'Reject Listing (-5 Rep)'}
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={handleOpenApproveModal} disabled={actionPending}>
                    Verify & Approve
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reported Quality Issues Section */}
      <div style={{ marginTop: '4.5rem', borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem', letterSpacing: '-0.25px' }}>
          Open Quality Audits & Reports ({filteredReports.length})
        </h2>

        {issueReports.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '0.9rem' }}>No open quality issue disputes require review.</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '0.9rem' }}>No matching quality audits found.</p>
          </div>
        ) : (
          <div className="listings-grid">
            {filteredReports.map((report) => (
              <div key={report._id} className="ingredient-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <div className="card-header">
                  <div>
                    <span className="badge badge-rejected" style={{ fontSize: '0.65rem', marginBottom: '0.4rem', display: 'inline-block' }}>
                      Quality Dispute
                    </span>
                    <h3 className="card-title">{report.ingredientRef?.name || 'Surplus Item'}</h3>
                  </div>
                </div>
                <div style={{ padding: '0.5rem 1.25rem 0 1.25rem' }}>
                  <CustodyRibbon status={report.ingredientRef?.status} deliveryStatus={report.reservationRef?.deliveryStatus} />
                </div>

                <div className="card-body">
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.15)', marginBottom: '0.75rem' }}>
                    <p style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '0.2rem' }}>Kitchen Claim Description:</p>
                    <p style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{report.reason}</p>
                  </div>

                  {report.proofDescription && (
                    <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      <span className="info-label" style={{ display: 'block', color: 'var(--text-secondary)' }}>Reference Proof Link:</span>
                      <span className="info-value" style={{ color: 'var(--active)', wordBreak: 'break-all' }}>{report.proofDescription}</span>
                    </div>
                  )}

                  <div className="info-item" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <span className="info-label">Reserved Quantity</span>
                    <span className="info-value">{report.reservationRef?.reservedQuantity || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Reporting Kitchen</span>
                    <span className="info-value">{report.reportedBy?.name || 'Soup Kitchen'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Accused Donor</span>
                    <span className="info-value" style={{ color: 'var(--danger)', fontWeight: 700 }}>{report.ingredientRef?.donorRef?.name || 'Donor'}</span>
                  </div>
                </div>

                <div className="card-footer" style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.82rem' }} 
                    onClick={() => handleResolveIssue(report._id, 'dismissed')}
                  >
                    Dismiss Report
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ flex: 1.5, padding: '0.5rem', fontSize: '0.82rem' }} 
                    onClick={() => {
                      if (window.confirm('Confirm uphold? This will deduct 15 points from donor reputation.')) {
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
      <div style={{ marginTop: '4.5rem', borderTop: '1px solid var(--border)', paddingTop: '2.5rem', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem', letterSpacing: '-0.25px' }}>
          Suspended Donors Directory ({filteredDeactivated.length})
        </h2>

        {deactivatedDonors.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '0.9rem' }}>No facilities are currently suspended.</p>
          </div>
        ) : filteredDeactivated.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '0.9rem' }}>No matching suspended donors found.</p>
          </div>
        ) : (
          <div className="listings-grid">
            {filteredDeactivated.map((donor) => (
              <div key={donor._id} className="ingredient-card" style={{ borderColor: 'rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.02)' }}>
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{donor.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{donor.email}</p>
                  </div>
                  <span className="badge badge-rejected">Suspended</span>
                </div>
                <div className="card-body">
                  <div className="info-item">
                    <span className="info-label">Suspension Reputation</span>
                    <span className="info-value" style={{ color: 'var(--danger)', fontWeight: 700 }}>{donor.reputationScore} pts</span>
                  </div>
                </div>
                <div className="card-footer" style={{ padding: '0.75rem' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.82rem' }} 
                    onClick={() => handleReactivateDonor(donor._id)}
                  >
                    Reactivate (Reset Rep to 60)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification Checklist Modal */}
      {showApproveModal && selectedIngredient && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Verification Checklist</h2>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowApproveModal(false)}>✕</button>
            </div>
            
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Confirm verification audits for <strong>{selectedIngredient.name}</strong> from donor <strong>{selectedIngredient.donorRef?.name}</strong>:
            </p>

            <form onSubmit={handleApproveSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <input 
                    type="checkbox" 
                    required
                    checked={categoryValid} 
                    onChange={e => setCategoryValid(e.target.checked)} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '0.1rem' }}
                  />
                  <span>I confirm the listing categorization is accurate and contains no restricted ingredients.</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <input 
                    type="checkbox" 
                    required
                    checked={dataReasonable} 
                    onChange={e => setDataReasonable(e.target.checked)} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '0.1rem' }}
                  />
                  <span>I confirm the shelf life metrics and storage constraints declared are reasonable.</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowApproveModal(false)} disabled={actionPending}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }} disabled={actionPending}>
                  {actionPending ? 'Confirming...' : 'Approve Declaration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
