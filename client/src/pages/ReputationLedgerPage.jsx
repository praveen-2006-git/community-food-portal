import React from 'react';
import ReputationLedger from '../components/ReputationLedger';

export default function ReputationLedgerPage({ user }) {
  return (
    <div className="main-content">
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ fontSize: '1.8rem', fontFamily: 'IBM Plex Serif, serif', fontWeight: 700 }}>
            Network Reputation Ledger
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            System-wide organization reputation leaderboard and history logs.
          </p>
        </div>
      </div>

      <ReputationLedger />
    </div>
  );
}
