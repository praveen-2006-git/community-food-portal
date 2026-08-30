import React, { useState, useEffect } from 'react';
import { useSearch } from '../App';
import { API_BASE_URL } from '../config/api';

export default function ReputationLedger() {
  const { searchQuery } = useSearch();
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

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading leaderboard statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="badge badge-rejected" style={{ width: '100%', padding: '1rem', borderRadius: '8px', textAlign: 'center', textTransform: 'none', display: 'block' }}>
        {error}
      </div>
    );
  }

  const renderRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: 'white', fontWeight: 800, padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)' }}>
          👑 1st
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'linear-gradient(135deg, #9CA3AF 0%, #4B5563 100%)', color: 'white', fontWeight: 800, padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', boxShadow: '0 4px 10px rgba(156, 163, 175, 0.3)' }}>
          🥈 2nd
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'linear-gradient(135deg, #B45309 0%, #78350F 100%)', color: 'white', fontWeight: 800, padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', boxShadow: '0 4px 10px rgba(180, 83, 9, 0.3)' }}>
          🥉 3rd
        </span>
      );
    }
    return (
      <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', paddingLeft: '0.5rem' }}>
        #{rank}
      </span>
    );
  };

  const filteredLedger = ledger.filter(entry => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.name.toLowerCase().includes(q) ||
      (entry.email && entry.email.toLowerCase().includes(q)) ||
      entry.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '90px' }}>Rank</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Organization Name</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Reputation Rating</th>
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
                <tr 
                  key={index} 
                  style={{ borderBottom: index === ledger.length - 1 ? 'none' : '1px solid var(--border)', background: rank <= 3 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                  className="ledger-row"
                >
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    {renderRankBadge(rank)}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {entry.name}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    {entry.role === 'donor' ? (
                      <span className="badge badge-attention" style={{ fontSize: '0.65rem' }}>
                        Donor
                      </span>
                    ) : (
                      <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>
                        Soup Kitchen
                      </span>
                    )}
                  </td>
                  <td className="reputation-score-val" style={{ padding: '1.25rem 1.5rem', fontWeight: 800, color: entry.reputationScore >= 60 ? 'var(--verified)' : entry.reputationScore >= 40 ? 'var(--attention)' : 'var(--danger)', fontSize: '1.05rem', textAlign: 'right' }}>
                    <span className="ledger-score-cell" style={{ display: 'inline-block' }}>
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

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
        <button 
          className="btn btn-secondary" 
          disabled={page === 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
        >
          Previous
        </button>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Page <strong>{page}</strong> of <strong>{totalPages}</strong>
        </span>
        <button 
          className="btn btn-secondary" 
          disabled={page >= totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
