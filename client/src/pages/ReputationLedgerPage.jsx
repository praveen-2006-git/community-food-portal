import React from 'react';
import ReputationLedger from '../components/ReputationLedger';

export default function ReputationLedgerPage({ user }) {
  return (
    <div>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="dashboard-title">Reputation Leaderboard</h1>
        <p className="dashboard-subtitle" style={{ margin: 0 }}>
          System-wide organization trust ranking and audit logs.
        </p>
      </div>

      <ReputationLedger />
    </div>
  );
}
