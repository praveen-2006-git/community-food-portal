import React from 'react';
import ReputationLedger from '../components/ReputationLedger';

export default function ReputationLedgerPage({ user }) {
  return (
    <div className="main-content">
      <div className="workspace-header animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <span className="chip chip-green" style={{ fontSize: '0.7rem', fontWeight: 800 }}>
              ● Verified Partner Registry
            </span>
          </div>
          <h1 className="dashboard-title">Partner Trust Directory</h1>
          <p className="dashboard-subtitle" style={{ maxWidth: '650px' }}>
            Transparent community trust scores, hygiene track records, and verified fulfillment status across the community food rescue network.
          </p>
        </div>
      </div>

      <ReputationLedger />
    </div>
  );
}
