import React from 'react';

export default function CustodyRibbon({ status, deliveryStatus }) {
  // Stages: Listed, Approved, Reserved, Picked Up, Verified
  const stages = ['LISTED', 'APPROVED', 'RESERVED', 'PICKED UP', 'VERIFIED'];
  
  // Resolve current active stage index and error index
  let activeIndex = 0;
  let isDanger = false;
  let dangerIndex = -1;

  // Determine stage based on ingredient status or reservation deliveryStatus
  const currentStatus = deliveryStatus || status;

  if (currentStatus === 'pending') {
    if (deliveryStatus) {
      // Reservation is pending -> Reserved stage is active
      activeIndex = 2;
    } else {
      // Ingredient is pending -> Listed stage is active
      activeIndex = 0;
    }
  } else if (currentStatus === 'approved') {
    activeIndex = 1;
  } else if (currentStatus === 'reserved') {
    activeIndex = 2;
  } else if (currentStatus === 'picked_up') {
    activeIndex = 3;
  } else if (currentStatus === 'delivered' || currentStatus === 'fulfilled') {
    activeIndex = 4;
  } else if (currentStatus === 'rejected') {
    isDanger = true;
    dangerIndex = 0; // Failed at listed review
  } else if (currentStatus === 'expired') {
    isDanger = true;
    if (deliveryStatus) {
      dangerIndex = 3; // Failed to be picked up on time
    } else {
      dangerIndex = 1; // Expired before being reserved/approved
    }
  }

  return (
    <div className="custody-ribbon-container">
      <div className="custody-line-bg"></div>
      <div className="custody-stages-wrapper">
        {stages.map((stage, idx) => {
          let nodeClass = 'custody-node-future';
          let labelClass = 'custody-label-future';
          let icon = null;

          if (isDanger && idx === dangerIndex) {
            nodeClass = 'custody-node-danger';
            labelClass = 'custody-label-danger';
            icon = '✕';
          } else if (isDanger && idx > dangerIndex) {
            nodeClass = 'custody-node-future';
            labelClass = 'custody-label-future';
          } else if (idx < activeIndex) {
            nodeClass = 'custody-node-completed';
            labelClass = 'custody-label-completed';
            icon = '✓';
          } else if (idx === activeIndex) {
            nodeClass = 'custody-node-active';
            labelClass = 'custody-label-active';
            if (activeIndex === 4) {
              icon = '✓'; // If completely verified, show checkmark
            }
          }

          return (
            <div key={stage} className="custody-stage-item">
              <div className={`custody-circle ${nodeClass}`}>
                {icon}
              </div>
              <span className={`custody-label ${labelClass}`}>{stage}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
