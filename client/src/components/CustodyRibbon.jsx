import { Check, X, AlertCircle } from 'lucide-react';

const STAGES = [
  { key: 'listed',           label: 'Listed',     role: 'Donor' },
  { key: 'available',        label: 'Approved',   role: 'Admin' },
  { key: 'claimed',          label: 'Reserved',   role: 'Kitchen' },
  { key: 'pickup_scheduled', label: 'Pickup Set', role: 'Kitchen' },
  { key: 'handed_over',      label: 'Picked Up',  role: 'Driver' },
  { key: 'completed',        label: 'Fulfilled',  role: 'Kitchen' },
];

const STATUS_TO_INDEX = {
  pending:          0,
  available:        1,
  claimed:          2,
  pickup_scheduled: 3,
  handed_over:      4,
  completed:        5,
};

const TOOLTIPS = {
  listed:           'Listed by Donor — awaiting admin quality validation',
  available:        'Approved by Admin — visible to nearby kitchens for routing',
  claimed:          'Reserved by Soup Kitchen — scheduled for pickup',
  pickup_scheduled: 'Pickup scheduled — awaiting 6-digit OTP verification',
  handed_over:      'Picked up by driver/collector — in transit to kitchen',
  completed:        'Delivered and verified — community meal fulfilled',
};

export default function CustodyRibbon({ status, deliveryStatus }) {
  const currentStatus = deliveryStatus || status;

  let activeIndex = STATUS_TO_INDEX[currentStatus] ?? 0;
  let isDanger = false;
  let dangerIndex = -1;

  if (currentStatus === 'rejected') {
    isDanger = true;
    dangerIndex = 0;
  } else if (currentStatus === 'expired') {
    isDanger = true;
    dangerIndex = deliveryStatus ? 4 : 1;
  } else if (currentStatus === 'cancelled') {
    isDanger = true;
    dangerIndex = 2;
  }

  return (
    <div className="custody-ribbon-container" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={activeIndex}>
      {/* Background track */}
      <div className="custody-line-bg" />

      {/* Filled progress track */}
      {(activeIndex > 0 || (isDanger && dangerIndex > 0)) && (
        <div
          className={`custody-line-fill ${isDanger ? 'danger' : ''}`}
          style={{
            width: `${((isDanger ? dangerIndex : activeIndex) / (STAGES.length - 1)) * 100}%`,
          }}
        />
      )}

      <div className="custody-stages-wrapper">
        {STAGES.map((stage, idx) => {
          let nodeClass = 'custody-node-future';
          let labelClass = 'custody-label-future';
          let icon = null;
          let tooltip = TOOLTIPS[stage.key];

          if (isDanger && idx === dangerIndex) {
            nodeClass = 'custody-node-danger';
            labelClass = 'custody-label-danger';
            icon = <X size={10} strokeWidth={3} />;
            tooltip = currentStatus === 'rejected' ? 'Rejected during quality review'
                    : currentStatus === 'expired' ? 'Item expired before pickup'
                    : 'Reservation was cancelled';
          } else if (isDanger && idx > dangerIndex) {
            // future after danger
          } else if (idx < activeIndex) {
            nodeClass = 'custody-node-completed';
            labelClass = 'custody-label-completed';
            icon = <Check size={10} strokeWidth={3} />;
          } else if (idx === activeIndex) {
            nodeClass = 'custody-node-active';
            labelClass = 'custody-label-active';
            if (activeIndex === 5) {
              icon = <Check size={10} strokeWidth={3} />;
              nodeClass = 'custody-node-completed';
              labelClass = 'custody-label-completed';
            }
          }

          return (
            <div key={stage.key} className="custody-stage-item" title={tooltip}>
              <div className={`custody-circle ${nodeClass}`}>
                {icon}
                {/* Pulse ring on active node */}
                {idx === activeIndex && !isDanger && activeIndex < 5 && (
                  <span
                    style={{
                      position: 'absolute',
                      inset: '-4px',
                      borderRadius: '50%',
                      border: '2px solid currentColor',
                      opacity: 0.3,
                      animation: 'pulseDot 2s ease-in-out infinite',
                    }}
                  />
                )}
              </div>
              <span className={`custody-label ${labelClass}`}>{stage.label}</span>
              <span className="custody-role" style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{stage.role}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
