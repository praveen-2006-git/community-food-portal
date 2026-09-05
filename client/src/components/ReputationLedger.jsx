import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

export default function ReputationLedger() {
  const [searchQuery, setSearchQuery] = useState('');
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/network-ledger?page=${page}&limit=${limit}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error(`Error: ${res.status} ${res.statusText}`);
        }
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

  const renderRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: 'white', fontWeight: 800, padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)' }}>
          🥇 1st
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)', color: 'white', fontWeight: 800, padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', boxShadow: '0 2px 8px rgba(148, 163, 184, 0.3)' }}>
          🥈 2nd
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)', color: 'white', fontWeight: 800, padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)' }}>
          🥉 3rd
        </span>
      );
    }
    return (
      <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem', paddingLeft: '0.35rem' }}>
        #{rank}
      </span>
    );
  };

  const filteredLedger = ledger.filter(entry => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.name?.toLowerCase().includes(q) ||
      (entry.email && entry.email.toLowerCase().includes(q)) ||
      entry.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
      {/* Search Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', background: 'var(--bg-secondary)' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
            Network Reputation Leaderboard
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
            System-wide organization trust ratings and quality track record
          </p>
        </div>
        <div style={{ minWidth: '240px', maxWidth: '320px', width: '100%' }}>
          <input 
            type="text"
            className="form-control"
            placeholder="🔍 Search organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {loading && (
        <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>Loading leaderboard statistics...</p>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ margin: '1.5rem' }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th>Organization Name</th>
                <th>Role</th>
                <th style={{ textAlign: 'right' }}>Reputation Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    🔍 No matching organizations found.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((entry, index) => {
                  const rank = (page - 1) * limit + index + 1;
                  return (
                    <tr key={entry._id || index}>
                      <td>
                        {renderRankBadge(rank)}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{entry.name}</span>
                        {entry.email && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{entry.email}</span>}
                      </td>
                      <td>
                        <span className={`status-badge ${entry.role === 'donor' ? 'status-pending' : 'status-approved'}`} style={{ fontSize: '0.68rem' }}>
                          {entry.role === 'donor' ? 'Donor' : 'Soup Kitchen'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontWeight: 800, 
                          fontSize: '1.05rem',
                          color: entry.reputationScore >= 60 ? '#10b981' : entry.reputationScore >= 40 ? '#f59e0b' : '#ef4444' 
                        }}>
                          {entry.reputationScore} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>pts</span>
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

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        <button 
          className="btn btn-secondary" 
          disabled={page === 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
        >
          Previous
        </button>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
          Page <strong>{page}</strong> of <strong>{totalPages}</strong>
        </span>
        <button 
          className="btn btn-secondary" 
          disabled={page >= totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
