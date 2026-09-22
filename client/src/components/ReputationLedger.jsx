import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { Search, ChevronLeft, ChevronRight, Award, Trophy } from 'lucide-react';

// Leading partner ranks
const TRUST_RANKS = {
  1: { label: '#1 Top Partner', bg: 'var(--primary-500)', color: '#FFFFFF' },
  2: { label: '#2 Partner', bg: 'var(--accent-amber)', color: '#FFFFFF' },
  3: { label: '#3 Partner', bg: 'var(--border-strong)', color: 'var(--text-primary)' },
};

function RankBadge({ rank }) {
  if (rank <= 3) {
    const r = TRUST_RANKS[rank];
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        background: r.bg, color: r.color, fontWeight: 700,
        padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.72rem',
      }}>
        <Award size={12} /> {r.label}
      </span>
    );
  }
  return (
    <span style={{ color: 'var(--text-tertiary)', fontWeight: 700, fontSize: '0.85rem', paddingLeft: '0.3rem', fontFamily: 'var(--font-mono)' }}>
      #{rank}
    </span>
  );
}

export default function ReputationLedger() {
  const [searchQuery, setSearchQuery] = useState('');
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/network-ledger?page=${page}&limit=${limit}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Error: ${res.status} ${res.statusText}`);
        const data = await res.json();
        setLedger(data.docs || []);
        setTotalPages(data.pages || 1);
      } catch (err) {
        setError(err.message || 'Failed to fetch network reputation ledger.');
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [page]);

  const filteredLedger = ledger.filter(entry => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.name?.toLowerCase().includes(q) ||
      (entry.email && entry.email.toLowerCase().includes(q)) ||
      entry.role?.toLowerCase().includes(q)
    );
  });

  // Top-3 podium (only on page 1, no active search)
  const showPodium = page === 1 && !searchQuery && ledger.length >= 3;
  const podiumEntries = showPodium ? ledger.slice(0, 3) : [];
  const tableEntries = showPodium ? filteredLedger.slice(3) : filteredLedger;

  return (
    <div className="glass-panel animate-fade-up" style={{ overflow: 'hidden', padding: 0 }}>
      {/* Header row */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        background: 'var(--bg-surface-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'var(--surface-active)', border: '1px solid rgba(30, 122, 74, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-500)'
          }}>
            <Award size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Partner Trust Directory
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.15rem 0 0 0' }}>
              System-wide community trust ratings and verified distribution records
            </p>
          </div>
        </div>

        <div style={{ position: 'relative', minWidth: '220px', maxWidth: '300px', width: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, role or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.2rem', padding: '0.45rem 0.85rem 0.45rem 2.2rem', fontSize: '0.84rem' }}
          />
        </div>
      </div>

      {/* Loading state: skeleton */}
      {loading && (
        <div style={{ padding: '1.5rem' }}>
          <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton skeleton-stat" style={{ height: '110px' }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton skeleton-text" style={{ height: '38px' }} />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && <div className="alert alert-danger" style={{ margin: '1.5rem' }}>{error}</div>}

      {/* Top-3 Community Partners */}
      {!loading && !error && showPodium && (
        <div style={{
          padding: '2rem 1.5rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface-subtle)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary-600)' }}>
                Hall of Trust
              </div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.15rem 0 0 0' }}>
                Top Regional Food Rescue Partners
              </h4>
            </div>
            <span className="chip chip-green" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
              ★ Highest Community Reliability
            </span>
          </div>

          <div className="podium-grid">
            {podiumEntries.map((entry, i) => {
              const rank = i + 1;
              const podiumClass = rank === 1 ? 'podium-card-gold' : rank === 2 ? 'podium-card-silver' : 'podium-card-bronze';
              const crownLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
              const score = entry.reputationScore;
              const scoreColor = score >= 60 ? 'var(--primary-600)' : score >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)';

              return (
                <div
                  key={entry._id || i}
                  className={`podium-card ${podiumClass} animate-fade-up`}
                >
                  <div className="podium-rank-crown">
                    {crownLabel}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem' }}>
                    <span className={`chip ${entry.role === 'donor' ? 'chip-green' : 'chip-cyan'}`} style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
                      {entry.role === 'donor' ? 'Verified Donor' : 'Soup Kitchen'}
                    </span>
                  </div>
                  <div style={{
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    color: 'var(--text-primary)',
                    marginBottom: '0.75rem',
                    lineHeight: 1.3
                  }}>
                    {entry.name}
                  </div>
                  <div style={{
                    background: 'var(--bg-surface-hover)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    border: '1px solid var(--border-subtle)',
                    marginTop: 'auto'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Trust Index
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 900,
                      color: scoreColor,
                      fontFamily: 'var(--font-mono)',
                      marginTop: '0.1rem'
                    }}>
                      {score} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>/ 100</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main table */}
      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Rank</th>
                <th>Organisation Name</th>
                <th>Role</th>
                <th style={{ textAlign: 'right' }}>Reputation Score</th>
              </tr>
            </thead>
            <tbody>
              {(showPodium ? tableEntries : filteredLedger).length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '3.5rem 1rem' }}>
                    <div className="empty-state" style={{ padding: '1rem' }}>
                      <div className="empty-state-icon"><Search size={22} /></div>
                      <p className="empty-state-title">No Matching Organisations</p>
                      <p className="empty-state-desc">Try searching with a different name, role, or keyword.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                (showPodium ? tableEntries : filteredLedger).map((entry, index) => {
                  const rank = showPodium
                    ? (page - 1) * limit + index + 4   // start after top 3
                    : (page - 1) * limit + index + 1;
                  const score = entry.reputationScore;
                  const scoreColor = score >= 60 ? 'var(--primary-500)' : score >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)';
                  return (
                    <tr key={entry._id || index}>
                      <td><RankBadge rank={rank} /></td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{entry.name}</span>
                        {entry.email && <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>{entry.email}</span>}
                      </td>
                      <td>
                        <span className={`chip ${entry.role === 'donor' ? 'chip-green' : 'chip-cyan'}`} style={{ fontSize: '0.7rem' }}>
                          {entry.role === 'donor' ? 'Donor' : 'Soup Kitchen'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.05rem', color: scoreColor }}>
                          {score} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>pts</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.9rem 1.5rem',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface-subtle)'
      }}>
        <button
          className="btn btn-secondary btn-sm"
          disabled={page === 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <ChevronLeft size={14} /> Previous
        </button>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
          Page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalPages}</strong>
        </span>
        <button
          className="btn btn-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
