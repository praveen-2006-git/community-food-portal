import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, MapPin, Navigation, Phone, ExternalLink,
  CheckCircle2, Clock, Package, AlertCircle, RefreshCw, Delete
} from 'lucide-react';
import CustodyRibbon from '../components/CustodyRibbon';
import { API_BASE_URL } from '../config/api';

// Haversine distance in km
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DispatchView({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [enteredDigits, setEnteredDigits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');

  const fetchAssignments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/reservations/dispatch`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load dispatch assignments.');
      const data = await res.json();
      setAssignments(data);
      if (data.length > 0) {
        setSelectedAssignment(data[0]);
      } else {
        setSelectedAssignment(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Keyboard handler for number entry
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        if (enteredDigits.length === 6) {
          handleVerifyHandover();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enteredDigits, selectedAssignment]);

  const handleDigitPress = (digit) => {
    if (enteredDigits.length < 6) {
      setEnteredDigits(prev => [...prev, digit]);
      setError('');
    }
  };

  const handleBackspace = () => {
    setEnteredDigits(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setEnteredDigits([]);
    setError('');
  };

  const handleVerifyHandover = async () => {
    if (!selectedAssignment) return;
    if (enteredDigits.length !== 6) {
      setError('Please enter all 6 digits of the pickup OTP.');
      return;
    }

    setVerifying(true);
    setError('');
    setSuccess('');

    const otpCode = enteredDigits.join('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/reservations/${selectedAssignment._id}/verify-pickup`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enteredCode: otpCode })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed. Please recheck the OTP.');

      setSuccess('Pickup OTP verified successfully! Food custody handed over.');
      setEnteredDigits([]);
      fetchAssignments();
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const req = selectedAssignment?.requestRef;
  const ing = req?.ingredientRef;
  const donor = ing?.donorRef;
  const kitchen = req?.soupKitchenRef;

  const donorLat = ing?.location?.lat || donor?.location?.lat;
  const donorLng = ing?.location?.lng || donor?.location?.lng;
  const kitchenLat = kitchen?.location?.lat;
  const kitchenLng = kitchen?.location?.lng;

  const distance = getDistance(donorLat, donorLng, kitchenLat, kitchenLng);
  const estTimeMin = Math.round((distance / 25) * 60);

  return (
    <div className="main-content">
      {/* Workspace Header */}
      <div className="workspace-header animate-fade-up">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
            <span className="chip chip-green" style={{ fontSize: '0.7rem', fontWeight: 800 }}>
              ● Live Logistics Dispatch
            </span>
            <span className="chip chip-neutral" style={{ fontSize: '0.7rem' }}>
              {assignments.length} Active Route{assignments.length === 1 ? '' : 's'}
            </span>
          </div>
          <h1 className="dashboard-title">Driver &amp; Volunteer Dispatch Station</h1>
          <p className="dashboard-subtitle">
            Waypoint navigation, live pickup directions, and verified 6-digit touch custody handover.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchAssignments}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
            <span>Refresh Routes</span>
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger animate-fade-up">{error}</div>}
      {success && <div className="alert alert-success animate-fade-up">{success}</div>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '820px', margin: '0 auto' }}>
          {[1, 2].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: '180px' }} />)}
        </div>
      ) : assignments.length === 0 ? (
        <div className="empty-state animate-fade-up">
          <Truck size={40} className="empty-state-icon" style={{ color: 'var(--accent-green)' }} />
          <h2 className="empty-state-title">No Active Pickups Scheduled</h2>
          <p className="empty-state-desc">
            All current food rescue reservations are either fulfilled or awaiting kitchen claims.
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
            <Link to="/map" className="btn btn-secondary btn-sm">
              <Navigation size={14} />
              <span>Explore Routing Map</span>
            </Link>
            <Link to="/kitchen" className="btn btn-primary btn-sm">
              <span>View Kitchen Portal</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="dispatch-container animate-fade-up">
          {/* Assignment Selector (if multiple) */}
          {assignments.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              {assignments.map(a => {
                const aName = a.requestRef?.ingredientRef?.name || 'Surplus Food';
                const kName = a.requestRef?.kitchenRef?.name;
                const unitStr = a.requestRef?.ingredientRef?.unit || 'kg';
                const tabLabel = kName
                  ? `${aName} (${a.reservedQuantity} ${unitStr}) — ${kName}`
                  : `${aName} (${a.reservedQuantity} ${unitStr}) · #${a._id.slice(-4)}`;
                const isSel = selectedAssignment?._id === a._id;
                return (
                  <button
                    key={a._id}
                    type="button"
                    onClick={() => {
                      setSelectedAssignment(a);
                      setEnteredDigits([]);
                      setError('');
                      setSuccess('');
                    }}
                    className={`chip ${isSel ? 'chip-green' : 'chip-neutral'}`}
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    <Package size={13} />
                    <span>{tabLabel}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Route Waypoint Card */}
          <div className="dispatch-route-card">
            <div style={{ padding: '1.25rem 1.4rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Rescue Assignment
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.15rem 0 0 0' }}>
                  {ing?.name || 'Surplus Batch'}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="quantity-capsule">
                  <span className="quantity-number">{selectedAssignment.reservedQuantity}</span>
                  <span className="quantity-unit">{ing?.unit}</span>
                </span>
                <span className={`status-badge status-${selectedAssignment.deliveryStatus}`}>
                  {selectedAssignment.deliveryStatus.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Custody Pipeline Ribbon */}
            <div style={{ padding: '0 1.4rem' }}>
              <CustodyRibbon status={ing?.status} deliveryStatus={selectedAssignment.deliveryStatus} />
            </div>

            {/* Waypoints: Donor Pickup -> Kitchen Dropoff */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              {/* Node 1: Origin / Donor */}
              <div className="waypoint-node">
                <div className="waypoint-badge pickup">1</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Pickup Location (Donor)
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {donor?.name || 'Local Donor Facility'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Contact: {donor?.contactPerson || donor?.email || 'Facility Staff'}
                  </div>
                  {donorLat && donorLng && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                      GPS: {donorLat.toFixed(5)}, {donorLng.toFixed(5)}
                    </div>
                  )}
                </div>
              </div>

              {/* Waypoint Connector */}
              <div className="waypoint-connector">
                <span style={{ position: 'absolute', left: '16px', top: '2px', fontSize: '0.7rem', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {distance > 0 ? `${distance.toFixed(1)} km (~${estTimeMin} min)` : 'Local transfer'}
                </span>
              </div>

              {/* Node 2: Destination / Soup Kitchen */}
              <div className="waypoint-node">
                <div className="waypoint-badge delivery">2</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Delivery Destination (Soup Kitchen)
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {kitchen?.name || 'Receiving Soup Kitchen'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Coordinator: {kitchen?.email || 'Kitchen Dispatch'}
                  </div>
                  {kitchenLat && kitchenLng && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                      GPS: {kitchenLat.toFixed(5)}, {kitchenLng.toFixed(5)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Launch GPS Directions */}
            {donorLat && donorLng && kitchenLat && kitchenLng && (
              <div style={{ padding: '0.9rem 1.4rem', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface-subtle)' }}>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${donorLat},${donorLng}&destination=${kitchenLat},${kitchenLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ width: '100%', textDecoration: 'none', gap: '0.5rem', fontWeight: 700 }}
                >
                  <Navigation size={15} />
                  <span>Launch Turn-by-Turn in Google Maps</span>
                  <ExternalLink size={13} style={{ opacity: 0.8 }} />
                </a>
              </div>
            )}
          </div>

          {/* Large Touch Keypad Station for OTP Handover Verification */}
          <div className="glass-panel" style={{ padding: '1.75rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Handover Verification Terminal
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0 0.4rem 0' }}>
              Enter 6-Digit Pickup Code
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
              Obtain the 6-digit confirmation code from the soup kitchen app to certify custody transfer.
            </p>

            {/* 6 Digit Display Slots */}
            <div className="digit-display-row">
              {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
                const digit = enteredDigits[slotIdx];
                const isCursor = slotIdx === enteredDigits.length;
                return (
                  <div
                    key={slotIdx}
                    className={`digit-slot ${digit !== undefined ? 'filled' : ''} ${isCursor ? 'active-cursor' : ''}`}
                  >
                    {digit ?? '•'}
                  </div>
                );
              })}
            </div>

            {/* Touch Keypad */}
            <div className="keypad-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  className="keypad-btn"
                  onClick={() => handleDigitPress(num)}
                  disabled={verifying}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                className="keypad-btn action-btn"
                onClick={handleClear}
                disabled={verifying || enteredDigits.length === 0}
              >
                Clear
              </button>
              <button
                type="button"
                className="keypad-btn"
                onClick={() => handleDigitPress('0')}
                disabled={verifying}
              >
                0
              </button>
              <button
                type="button"
                className="keypad-btn action-btn"
                onClick={handleBackspace}
                disabled={verifying || enteredDigits.length === 0}
              >
                ⌫
              </button>
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '1.5rem', maxWidth: '340px', margin: '1.5rem auto 0' }}>
              <button
                type="button"
                className={`btn btn-primary ${verifying ? 'btn-loading' : ''}`}
                style={{ width: '100%', padding: '0.85rem 1.25rem', fontSize: '0.95rem' }}
                onClick={handleVerifyHandover}
                disabled={verifying || enteredDigits.length !== 6}
              >
                {verifying ? (
                  <>
                    <span className="spinner spinner-sm" />
                    <span>Verifying Code…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm Verified Handover</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
