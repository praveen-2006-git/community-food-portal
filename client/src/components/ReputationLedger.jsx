import React, { useState, useEffect } from 'react';

export default function ReputationLedger() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLedger = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('http://localhost:5000/api/admin/network-ledger', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error(`Error: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        setLedger(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch network reputation ledger.');
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, []);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', margin: '2rem 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ margin: '2rem 0' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(15, 23, 42, 0.02)' }}>
            <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Organization Name</th>
            <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Role</th>
            <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Reputation Score</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((entry, index) => (
            <tr 
              key={index} 
              style={{ borderBottom: index === ledger.length - 1 ? 'none' : '1px solid var(--border)' }}
              className="ledger-row"
            >
              <td style={{ padding: '1rem 1.25rem', fontFamily: 'IBM Plex Serif, serif', fontWeight: 600, color: 'var(--structure)' }}>
                {entry.name}
              </td>
              <td style={{ padding: '1rem 1.25rem' }}>
                {entry.role === 'donor' ? (
                  <span className="ledger-role-badge" style={{ 
                    display: 'inline-block',
                    padding: '0.25rem 0.6rem', 
                    borderRadius: '20px', 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    textTransform: 'uppercase',
                    background: 'rgba(245, 158, 11, 0.15)', 
                    color: 'var(--attention)' 
                  }}>
                    Donor
                  </span>
                ) : (
                  <span className="ledger-role-badge" style={{ 
                    display: 'inline-block',
                    padding: '0.25rem 0.6rem', 
                    borderRadius: '20px', 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    textTransform: 'uppercase',
                    background: 'rgba(20, 184, 166, 0.15)', 
                    color: 'var(--verified)' 
                  }}>
                    Soup Kitchen
                  </span>
                )}
              </td>
              <td className="reputation-score-val" style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--active)', fontSize: '0.95rem' }}>
                <span className="ledger-score-cell" style={{ display: 'inline-block' }}>
                  {entry.reputationScore} pts
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
