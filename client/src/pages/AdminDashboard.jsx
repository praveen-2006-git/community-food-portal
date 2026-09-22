import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LeafletMap from '../components/LeafletMap';
import ReputationLedger from '../components/ReputationLedger';
import ConfirmDialog from '../components/ConfirmDialog';
import { API_BASE_URL } from '../config/api';
import {
  Wheat, ChefHat, Users, ClipboardList, ShieldAlert, UserX,
  Trophy, CheckCircle2, XCircle, RotateCcw, X, Compass
} from 'lucide-react';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingIngredients, setPendingIngredients] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [deactivatedLoading, setDeactivatedLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [categoryValid, setCategoryValid] = useState(false);
  const [dataReasonable, setDataReasonable] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Exceeds safe hold time (>48h)');
  const [rejectNotes, setRejectNotes] = useState('');

  // Confirmation dialog modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    confirmVariant: 'danger',
    onConfirm: () => {}
  });

  const REJECTION_REASONS = [
    'Exceeds safe hold time (>48h)',
    'Cold chain storage compromised',
    'Damaged / unsealed packaging',
    'Incomplete allergen declaration',
    'Quantity or weight discrepancy',
    'Inaccessible pickup location'
  ];

  const token = localStorage.getItem('token');
  const [stats, setStats] = useState(null);
  const [issueReports, setIssueReports] = useState([]);
  const [deactivatedDonors, setDeactivatedDonors] = useState([]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/stats/admin`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) { console.error('Error fetching admin stats:', err); }
  };

  const fetchIssueReports = async () => {
    setIssueLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/issue-reports`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setIssueReports(data);
    } catch (err) { console.error('Error fetching issue reports:', err); }
    finally { setIssueLoading(false); }
  };

  const fetchDeactivatedDonors = async () => {
    setDeactivatedLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/donors/deactivated`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setDeactivatedDonors(data);
    } catch (err) { console.error('Error fetching deactivated donors:', err); }
    finally { setDeactivatedLoading(false); }
  };

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/ingredients/pending`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch pending ingredients.');
      setPendingIngredients(data);
      setSelectedIngredient(data.length > 0 ? data[0] : null);
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowApproveModal(false);
        setShowRejectModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to approve ingredient.');
      setSuccess(`Approved "${selectedIngredient.name}" successfully. Quality report logged.`);
      setShowApproveModal(false);
      fetchPending();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenRejectModal = () => {
    if (!selectedIngredient) return;
    setRejectReason(REJECTION_REASONS[0]);
    setRejectNotes('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedIngredient) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/ingredients/${selectedIngredient._id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason, notes: rejectNotes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reject ingredient.');
      setSuccess(`Rejected "${selectedIngredient.name}" (${rejectReason}). Donor score now ${data.donorReputationScore} pts (-5).`);
      setShowRejectModal(false);
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resolve issue report.');
      setSuccess(`Issue resolved as "${status}"`);
      fetchIssueReports();
      fetchStats();
      fetchDeactivatedDonors();
    } catch (err) {
      setError(err.message);
    }
  };

  const promptUpholdIssue = (reportId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Uphold Quality Infraction?',
      message: 'Are you sure you want to uphold this complaint? The food donor will lose 15 reputation points and risk suspension.',
      confirmLabel: 'Uphold Infraction (−15 Rep)',
      confirmVariant: 'danger',
      onConfirm: () => {
        handleResolveIssue(reportId, 'upheld');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const executeReactivateDonor = async (donorId) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/donors/${donorId}/reactivate`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reactivate donor.');
      setSuccess('Donor reactivated. Reputation score reset to 60.');
      fetchDeactivatedDonors();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const promptReactivateDonor = (donorId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reactivate Food Donor?',
      message: 'This will restore donor listing permissions and reset their community reputation score to 60/100.',
      confirmLabel: 'Reactivate Donor',
      confirmVariant: 'warning',
      onConfirm: () => {
        executeReactivateDonor(donorId);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  const TABS = [
    { key: 'pending', label: 'Pending Approvals', icon: <ClipboardList size={15} />, badge: pendingIngredients.length, badgeColor: 'var(--accent-amber)' },
    { key: 'issues', label: 'Quality Issues', icon: <ShieldAlert size={15} />, badge: issueReports.length, badgeColor: 'var(--accent-rose)' },
    { key: 'deactivated', label: 'Deactivated Donors', icon: <UserX size={15} />, badge: deactivatedDonors.length, badgeColor: 'var(--accent-rose)' },
    { key: 'ledger', label: 'Reputation Leaderboard', icon: <Trophy size={15} />, badge: 0, badgeColor: '' },
  ];

  return (
    <div className="main-content">
      {/* Workspace Header */}
      <div className="workspace-header animate-fade-up" style={{ padding: '1.15rem 1.5rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
            <span className="chip chip-green" style={{ fontSize: '0.7rem', fontWeight: 800 }}>
              ● Community Food Governance
            </span>
            <span className="chip chip-neutral" style={{ fontSize: '0.7rem' }}>
              {pendingIngredients.length} Items Awaiting Review
            </span>
          </div>
          <h1 className="dashboard-title" style={{ fontSize: '1.65rem' }}>Food Safety &amp; Inventory Review</h1>
          <p className="dashboard-subtitle" style={{ maxWidth: '600px', fontSize: '0.86rem', marginTop: '0.2rem' }}>
            Verify incoming surplus batches, adjudicate kitchen quality feedback, and uphold community food safety standards.
          </p>
        </div>
        <div>
          <Link to="/map" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', textDecoration: 'none', padding: '0.5rem 0.9rem' }}>
            <Compass size={16} color="var(--primary-500)" />
            <span>Open Routing Map</span>
          </Link>
        </div>
      </div>

      {/* Network Activity & Impact Overview */}
      {stats && (
        <div className="telemetry-grid animate-fade-up-delay-1" style={{ marginBottom: '1.75rem' }}>
          <div className="telemetry-card">
            <div className="telemetry-top">
              <div className="telemetry-icon-well" style={{ background: 'var(--surface-active)', color: 'var(--primary-500)' }}>
                <Wheat size={20} />
              </div>
              <span className="telemetry-trend" style={{ background: 'var(--surface-active)', color: 'var(--primary-600)' }}>System Wide</span>
            </div>
            <div>
              <div className="telemetry-val">{stats.totalIngredients}</div>
              <div className="telemetry-lbl">Network Surplus Batches</div>
            </div>
          </div>

          <div className="telemetry-card">
            <div className="telemetry-top">
              <div className="telemetry-icon-well" style={{ background: 'var(--surface-active)', color: 'var(--primary-500)' }}>
                <ChefHat size={20} />
              </div>
              <span className="telemetry-trend" style={{ background: 'var(--surface-active)', color: 'var(--primary-600)' }}>Fulfillment</span>
            </div>
            <div>
              <div className="telemetry-val" style={{ color: 'var(--primary-500)' }}>{stats.totalFulfilled}</div>
              <div className="telemetry-lbl">Fulfilled Deliveries</div>
            </div>
          </div>

          <div className="telemetry-card">
            <div className="telemetry-top">
              <div className="telemetry-icon-well" style={{ background: 'var(--surface-info)', color: 'var(--accent-cyan)' }}>
                <Users size={20} />
              </div>
              <span className="telemetry-trend" style={{ background: 'var(--surface-info)', color: 'var(--accent-blue)' }}>Certified</span>
            </div>
            <div>
              <div className="telemetry-val" style={{ color: 'var(--accent-cyan)' }}>{stats.activeDonors}</div>
              <div className="telemetry-lbl">Verified Donors</div>
            </div>
          </div>

          <div className="telemetry-card">
            <div className="telemetry-top">
              <div className="telemetry-icon-well" style={{ background: pendingIngredients.length > 0 ? 'var(--surface-warning)' : 'var(--surface-active)', color: pendingIngredients.length > 0 ? 'var(--accent-amber)' : 'var(--primary-500)' }}>
                <ClipboardList size={20} />
              </div>
              <span className="telemetry-trend" style={{ background: pendingIngredients.length > 0 ? 'var(--surface-warning)' : 'var(--surface-active)', color: pendingIngredients.length > 0 ? 'var(--accent-amber)' : 'var(--primary-600)' }}>
                {pendingIngredients.length > 0 ? 'Requires Action' : 'Cleared'}
              </span>
            </div>
            <div>
              <div className="telemetry-val" style={{ color: pendingIngredients.length > 0 ? 'var(--accent-amber)' : 'var(--primary-500)' }}>{pendingIngredients.length}</div>
              <div className="telemetry-lbl">Pending Review Queue</div>
            </div>
          </div>
        </div>
      )}

      {/* Segmented Tab Navigation */}
      <div className="segmented-control-modern animate-fade-up-delay-2" role="tablist" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            className={`segmented-btn-modern ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge > 0 && (
              <span className="segmented-count" style={{ background: t.badgeColor, color: 'white' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-danger animate-fade-up-delay-2">{error}</div>}
      {success && <div className="alert alert-success animate-fade-up-delay-2">{success}</div>}

      {/* ── TAB 1: PENDING APPROVALS ── */}
      {activeTab === 'pending' && (
        loading ? (
          <div className="stats-grid animate-fade-up-delay-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
          </div>
        ) : pendingIngredients.length === 0 ? (
          <div className="empty-state animate-fade-up-delay-3">
            <CheckCircle2 className="empty-state-icon" style={{ color: 'var(--accent-green)' }} />
            <h2 className="empty-state-title">Clean Queue!</h2>
            <p className="empty-state-desc">No surplus listings awaiting quality review.</p>
          </div>
        ) : (
          <div className="two-pane-responsive animate-fade-up-delay-3">
            {/* Left: Queue list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.25rem' }}>
                Pending Queue ({pendingIngredients.length})
              </h3>
              {pendingIngredients.map((ing) => (
                <div
                  key={ing._id}
                  className="glass-panel"
                  style={{
                    padding: '1rem 1.15rem',
                    cursor: 'pointer',
                    border: selectedIngredient?._id === ing._id ? '2px solid var(--primary-500)' : '1px solid var(--border-default)',
                    background: selectedIngredient?._id === ing._id ? 'var(--surface-active)' : 'var(--bg-surface)',
                    borderRadius: '12px',
                    transition: 'all 0.15s'
                  }}
                  onClick={() => setSelectedIngredient(ing)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{ing.name}</h4>
                    <span className="status-badge status-pending" style={{ fontSize: '0.68rem' }}>{ing.category}</span>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.81rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <p>Donor: <strong style={{ color: 'var(--text-primary)' }}>{ing.donorRef?.name || 'Unknown'}</strong></p>
                    <p>Qty: <strong style={{ color: 'var(--primary-500)' }}>{ing.quantity} {ing.unit}</strong></p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Detail + Map (Sticky inspection card with full clearance for action buttons) */}
            {selectedIngredient && (
              <div
                key={selectedIngredient._id}
                className="card-pro"
                style={{
                  padding: '1.65rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.15rem',
                  position: 'sticky',
                  top: '78px',
                  height: 'fit-content',
                  boxShadow: 'var(--shadow-level-2)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                        {selectedIngredient.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}>
                        <span className="chip chip-green" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>
                          {selectedIngredient.category}
                        </span>
                        <span className="chip chip-neutral" style={{ fontSize: '0.72rem' }}>
                          Hold condition: {selectedIngredient.storageType}
                        </span>
                      </div>
                    </div>
                    <span className="status-badge status-pending" style={{ flexShrink: 0, marginTop: '2px' }}>
                      Pending Quality Review
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', background: 'var(--bg-surface-hover)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.84rem' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Batch Telemetry</span>
                    <p style={{ color: 'var(--text-secondary)' }}>Quantity: <strong style={{ color: 'var(--primary-600)', fontFamily: 'var(--font-mono)' }}>{selectedIngredient.quantity} {selectedIngredient.unit}</strong></p>
                    <p style={{ color: 'var(--text-secondary)' }}>Expiry (FEFO): <strong style={{ color: 'var(--accent-rose)' }}>{formatDate(selectedIngredient.expiryDate)}</strong></p>
                    <p style={{ color: 'var(--text-secondary)' }}>Hold Deadline: <strong style={{ color: 'var(--text-primary)' }}>{formatDate(selectedIngredient.pickupDeadline)}</strong></p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.84rem' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Donor Identity</span>
                    <p style={{ color: 'var(--text-secondary)' }}>Name: <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.donorRef?.name || 'N/A'}</strong></p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{selectedIngredient.donorRef?.email || 'N/A'}</p>
                    <p style={{ color: 'var(--text-secondary)' }}>Trust Rating: <strong style={{ color: 'var(--primary-600)' }}>⭐ {selectedIngredient.donorRef?.reputationScore ?? 0} pts</strong></p>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.45rem', letterSpacing: '0.06em' }}>
                    Pickup Location &amp; Geofence Verification
                  </h4>
                  <div className="map-container" style={{ height: '175px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <LeafletMap lat={selectedIngredient.location.lat} lng={selectedIngredient.location.lng} readOnly={true} markerLabel={`${selectedIngredient.name} Pickup`} />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'right', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
                    GPS: {selectedIngredient.location.lat.toFixed(6)}, {selectedIngredient.location.lng.toFixed(6)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', marginTop: '0.35rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--accent-rose)' }}
                    onClick={handleOpenRejectModal}
                  >
                    <XCircle size={15} /> Reject (−5 Rep)
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1.5, padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                    onClick={handleOpenApproveModal}
                  >
                    <CheckCircle2 size={15} /> Verify &amp; Approve
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ── TAB 2: QUALITY ISSUES ── */}
      {activeTab === 'issues' && (
        <div className="animate-fade-up-delay-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Reported Quality Issues ({issueReports.length})
            </h2>
          </div>

          {issueLoading ? (
            <div className="listings-grid">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
            </div>
          ) : issueReports.length === 0 ? (
            <div className="empty-state">
              <ShieldAlert className="empty-state-icon" style={{ color: 'var(--accent-green)' }} />
              <h3 className="empty-state-title">No Active Complaints</h3>
              <p className="empty-state-desc">No pending food quality issues reported.</p>
            </div>
          ) : (
            <div className="listings-grid">
              {issueReports.map((report) => (
                <div key={report._id} className="ingredient-card card-urgent" style={{ borderLeft: '3px solid var(--accent-red)', height: 'fit-content' }}>
                  <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 className="card-title">{report.ingredientRef?.name || 'Unknown Item'}</h3>
                      <span className="status-badge status-rejected" style={{ fontSize: '0.68rem' }}>Pending</span>
                    </div>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Reported by: <strong style={{ color: 'var(--text-primary)' }}>{report.reportedBy?.name || 'Soup Kitchen'}</strong>
                    </div>
                  </div>

                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ background: 'var(--surface-critical)', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.84rem', border: '1px solid var(--accent-rose-border)' }}>
                      <p style={{ fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '0.2rem', fontSize: '0.72rem', textTransform: 'uppercase' }}>Reason:</p>
                      <p style={{ color: 'var(--text-primary)' }}>{report.reason}</p>
                    </div>
                    {report.proofDescription && (
                      <div style={{ fontSize: '0.84rem' }}>
                        <span className="info-label" style={{ display: 'block', marginBottom: '0.1rem' }}>Proof / Reference:</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{report.proofDescription}</span>
                      </div>
                    )}
                    <div className="info-item" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                      <span className="info-label">Reserved Qty:</span>
                      <span className="info-value">{report.reservationRef?.reservedQuantity || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Delivery Status:</span>
                      <span className="info-value" style={{ textTransform: 'capitalize' }}>{report.reservationRef?.deliveryStatus || 'N/A'}</span>
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
                      onClick={() => promptUpholdIssue(report._id)}
                    >
                      Uphold (−15 Rep)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: DEACTIVATED DONORS ── */}
      {activeTab === 'deactivated' && (
        <div className="animate-fade-up-delay-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Deactivated Donors ({deactivatedDonors.length})
            </h2>
          </div>

          {deactivatedLoading ? (
            <div className="listings-grid">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
            </div>
          ) : deactivatedDonors.length === 0 ? (
            <div className="empty-state">
              <Users className="empty-state-icon" style={{ color: 'var(--accent-green)' }} />
              <h3 className="empty-state-title">All Donors Active</h3>
              <p className="empty-state-desc">No food donors are currently suspended.</p>
            </div>
          ) : (
            <div className="listings-grid">
              {deactivatedDonors.map((donor) => (
                <div key={donor._id} className="ingredient-card" style={{ border: '1px solid var(--accent-rose-border)', height: 'fit-content' }}>
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
                      <span className="info-value" style={{ color: 'var(--accent-rose)', fontWeight: 800 }}>{donor.reputationScore} pts</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Account Status:</span>
                      <span className="info-value" style={{ color: 'var(--accent-rose)' }}>Suspended</span>
                    </div>
                  </div>
                  <div className="card-footer">
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      onClick={() => promptReactivateDonor(donor._id)}
                    >
                      <RotateCcw size={14} /> Reactivate Donor (Reset Rep → 60)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: REPUTATION LEADERBOARD ── */}
      {activeTab === 'ledger' && (
        <div className="animate-fade-up-delay-3">
          <ReputationLedger />
        </div>
      )}

      {/* ── APPROVAL CHECKLIST MODAL ── */}
      {showApproveModal && selectedIngredient && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Quality Verification Checklist</h2>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem' }} onClick={() => setShowApproveModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleApproveSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Verify details for <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.name}</strong> from <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.donorRef?.name}</strong> before approving for public routing:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <input type="checkbox" required checked={categoryValid} onChange={e => setCategoryValid(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '1px', flexShrink: 0 }} />
                    <span>I confirm the food category and storage type are valid and appropriate</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <input type="checkbox" required checked={dataReasonable} onChange={e => setDataReasonable(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '1px', flexShrink: 0 }} />
                    <span>I confirm expiry date, quantity, and GPS location are plausible and accurate</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowApproveModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
                  Confirm &amp; Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REJECTION ADJUDICATION MODAL ── */}
      {showRejectModal && selectedIngredient && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="metric-icon-box" style={{ background: 'var(--surface-critical)', color: 'var(--accent-rose)', width: '32px', height: '32px' }}>
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h2 className="modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>Safety Rejection Adjudication</h2>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>Mandatory quality audit action</span>
                </div>
              </div>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem' }} onClick={() => setShowRejectModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleConfirmReject}>
              <div className="modal-body">
                <div style={{ background: 'var(--surface-critical)', border: '1px solid var(--accent-rose-border)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--accent-rose)', fontWeight: 600, margin: 0 }}>
                    ⚠️ Warning: Rejecting <strong>{selectedIngredient.name}</strong> will penalize donor <strong>{selectedIngredient.donorRef?.name || 'organization'}</strong> by <strong>−5 reputation points</strong>.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Select Non-Compliance Reason</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    {REJECTION_REASONS.map(reason => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setRejectReason(reason)}
                        className={`chip ${rejectReason === reason ? 'chip-rose' : 'chip-neutral'}`}
                        style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Additional Admin Notes (Optional)</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Specific visual observations, temperature logs, or packaging defects observed..."
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <XCircle size={15} /> Confirm Rejection (−5 Rep)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SHARED CONFIRM DIALOG ── */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmVariant={confirmModal.confirmVariant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
