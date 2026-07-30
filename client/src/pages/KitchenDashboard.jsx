import { useState, useEffect } from 'react';
import LeafletMap from '../components/LeafletMap';
import CustodyRibbon from '../components/CustodyRibbon';
import { useToast, useSearch } from '../App';

export default function KitchenDashboard({ user }) {
  const [ingredients, setIngredients] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [activeTab, setActiveTab] = useState('available'); // 'available' or 'reservations'
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination State for Surplus Feed
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 6;
  const [actionPending, setActionPending] = useState(false);
  const { addToast } = useToast();
  const { searchQuery } = useSearch();

  // Collection Basket State
  const [basket, setBasket] = useState([]);
  const [showBasketDrawer, setShowBasketDrawer] = useState(false);

  // Category visual thumbnail helpers
  const getCategoryEmoji = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('veg')) return '🥦';
    if (cat.includes('fruit')) return '🍎';
    if (cat.includes('bake') || cat.includes('bread')) return '🍞';
    if (cat.includes('dairy') || cat.includes('milk')) return '🥛';
    if (cat.includes('grain') || cat.includes('rice') || cat.includes('pasta')) return '🌾';
    if (cat.includes('meat') || cat.includes('protein') || cat.includes('chicken')) return '🍗';
    if (cat.includes('canned')) return '🥫';
    return '🍲';
  };

  const getCategoryGradient = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('veg') || cat.includes('fruit')) return 'linear-gradient(135deg, #10B981, #059669)';
    if (cat.includes('bake') || cat.includes('bread')) return 'linear-gradient(135deg, #F59E0B, #D97706)';
    if (cat.includes('grain') || cat.includes('rice')) return 'linear-gradient(135deg, #6366F1, #4F46E5)';
    if (cat.includes('dairy') || cat.includes('milk')) return 'linear-gradient(135deg, #3B82F6, #2563EB)';
    return 'linear-gradient(135deg, #6B7280, #4B5563)';
  };

  const getCategoryBadgeClass = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('veg') || cat.includes('fruit')) return 'badge-approved';
    if (cat.includes('bake') || cat.includes('bread')) return 'badge-attention';
    if (cat.includes('grain') || cat.includes('rice') || cat.includes('pasta')) return 'badge-reserved';
    if (cat.includes('dairy') || cat.includes('milk')) return 'badge-reserved';
    return 'badge-expired';
  };

  // Load and save basket in localStorage
  useEffect(() => {
    const savedBasket = localStorage.getItem('food_basket');
    if (savedBasket) {
      try {
        setBasket(JSON.parse(savedBasket));
      } catch (e) {
        console.error('Failed to parse basket from localStorage', e);
      }
    }
  }, []);

  const updateBasket = (newBasket) => {
    setBasket(newBasket);
    localStorage.setItem('food_basket', JSON.stringify(newBasket));
  };

  // Basket action handlers
  const addToBasket = (ing) => {
    const existing = basket.find(item => item.ingredientId === ing._id);
    if (existing) {
      addToast(`"${ing.name}" is already in your basket.`, 'info');
      return;
    }
    const newItem = {
      ingredientId: ing._id,
      name: ing.name,
      category: ing.category,
      unit: ing.unit,
      storageType: ing.storageType,
      expiryDate: ing.expiryDate,
      pickupDeadline: ing.pickupDeadline,
      donorName: ing.donorRef?.name || 'Unknown',
      availableQuantity: ing.quantity,
      selectedQuantity: Math.min(1, ing.quantity),
      distance: ing.distance
    };
    updateBasket([...basket, newItem]);
    addToast(`Added "${ing.name}" to your basket.`, 'success');
  };

  const adjustQuantity = (itemId, delta) => {
    const updated = basket.map(item => {
      if (item.ingredientId === itemId) {
        const newQty = Math.max(0.1, parseFloat((item.selectedQuantity + delta).toFixed(1)));
        if (newQty > item.availableQuantity) {
          addToast(`Cannot select more than available quantity (${item.availableQuantity} ${item.unit}).`, 'warning');
          return item;
        }
        return { ...item, selectedQuantity: newQty, error: null };
      }
      return item;
    });
    updateBasket(updated);
  };

  const setItemQuantity = (itemId, value) => {
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) return;
    const updated = basket.map(item => {
      if (item.ingredientId === itemId) {
        const targetQty = parseFloat(val.toFixed(1));
        if (targetQty > item.availableQuantity) {
          addToast(`Quantity adjusted to max available (${item.availableQuantity} ${item.unit}).`, 'warning');
          return { ...item, selectedQuantity: item.availableQuantity, error: null };
        }
        return { ...item, selectedQuantity: targetQty, error: null };
      }
      return item;
    });
    updateBasket(updated);
  };

  const removeFromBasket = (itemId) => {
    const filtered = basket.filter(item => item.ingredientId !== itemId);
    updateBasket(filtered);
    addToast('Item removed from basket.', 'info');
  };

  const clearBasket = () => {
    updateBasket([]);
    addToast('Basket cleared.', 'info');
  };

  // Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [requestedQuantity, setRequestedQuantity] = useState('');
  const [pickupMode, setPickupMode] = useState('self');
  const [volunteerName, setVolunteerName] = useState('');
  
  const [basketPickupMode, setBasketPickupMode] = useState('self');
  const [basketVolunteerName, setBasketVolunteerName] = useState('');

  // Issue Reporting State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [reason, setReason] = useState('');
  const [proofDescription, setProofDescription] = useState('');

  const token = localStorage.getItem('token');

  const fetchIngredients = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/api/kitchen/ingredients?page=${page}&limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch ingredients.');
      setIngredients(data.docs || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/kitchen/reservations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch reservations.');
      setReservations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'available') {
      fetchIngredients();
    } else {
      fetchReservations();
    }
  }, [activeTab, page]);

  const handleOpenRequestModal = (ing) => {
    setSelectedIngredient(ing);
    setRequestedQuantity('');
    setPickupMode('self');
    setVolunteerName('');
    setError('');
    setSuccess('');
    setShowRequestModal(true);
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const qty = parseFloat(requestedQuantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid positive quantity.');
      return;
    }

    if (qty > selectedIngredient.quantity) {
      setError(`Cannot request more than the available quantity (${selectedIngredient.quantity} ${selectedIngredient.unit}).`);
      return;
    }

    setActionPending(true);
    try {
      const res = await fetch(`http://localhost:5000/api/kitchen/ingredients/${selectedIngredient._id}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestedQuantity: qty,
          pickupMode,
          volunteerName: pickupMode === 'volunteer' ? volunteerName : ''
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to request ingredient.');

      addToast(`Surplus food requested — authorized pickup code generated!`, 'success');
      setShowRequestModal(false);
      fetchIngredients();
    } catch (err) {
      setError(err.message);
      addToast(err.message || 'Failed to submit request', 'error');
    } finally {
      setActionPending(false);
    }
  };

  const handleBasketCheckout = async (e) => {
    e.preventDefault();
    setError('');
    setActionPending(true);

    try {
      // 1. Fetch fresh ingredients
      const res = await fetch(`http://localhost:5000/api/kitchen/ingredients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const freshData = await res.json();
      const freshList = freshData.docs || freshData || [];

      // 2. Validate items
      const updatedBasket = [...basket];
      let hasValidationErrors = false;
      const itemsToClaim = [];

      for (const item of basket) {
        const freshItem = freshList.find(ing => ing._id === item.ingredientId);
        
        if (!freshItem || freshItem.status !== 'approved' || freshItem.quantity <= 0) {
          addToast(`"${item.name}" is no longer available. Please remove it from your basket.`, 'error');
          hasValidationErrors = true;
          const idx = updatedBasket.findIndex(i => i.ingredientId === item.ingredientId);
          if (idx !== -1) {
            updatedBasket[idx].error = 'Unavailable';
            updatedBasket[idx].availableQuantity = 0;
          }
        } else if (item.selectedQuantity > freshItem.quantity) {
          addToast(`Available quantity of "${item.name}" has changed. Max available: ${freshItem.quantity} ${item.unit}.`, 'warning');
          hasValidationErrors = true;
          const idx = updatedBasket.findIndex(i => i.ingredientId === item.ingredientId);
          if (idx !== -1) {
            updatedBasket[idx].error = 'Insufficient Quantity';
            updatedBasket[idx].availableQuantity = freshItem.quantity;
            updatedBasket[idx].selectedQuantity = freshItem.quantity;
          }
        } else {
          itemsToClaim.push(item);
        }
      }

      if (hasValidationErrors) {
        updateBasket(updatedBasket);
        setActionPending(false);
        return;
      }

      // 3. Process claims sequentially
      let successCount = 0;
      let failCount = 0;
      const remainingBasket = [];

      for (const item of itemsToClaim) {
        try {
          const claimRes = await fetch(`http://localhost:5000/api/kitchen/ingredients/${item.ingredientId}/request`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              requestedQuantity: item.selectedQuantity,
              pickupMode: basketPickupMode,
              volunteerName: basketPickupMode === 'volunteer' ? basketVolunteerName : ''
            })
          });

          const data = await claimRes.json();
          if (claimRes.ok) {
            successCount++;
          } else {
            failCount++;
            remainingBasket.push({
              ...item,
              error: data.message || 'Claim failed'
            });
          }
        } catch (err) {
          failCount++;
          remainingBasket.push({
            ...item,
            error: 'Network error'
          });
        }
      }

      // Update basket state with failed claims
      updateBasket(remainingBasket);

      if (successCount > 0) {
        addToast(`Successfully claimed ${successCount} food item(s)!`, 'success');
      }
      if (failCount > 0) {
        addToast(`Failed to claim ${failCount} item(s). Check your basket for details.`, 'error');
      }

      if (remainingBasket.length === 0) {
        setShowBasketDrawer(false);
      }

      fetchIngredients();
      fetchReservations();
    } catch (err) {
      console.error('Checkout error:', err);
      addToast('Failed to validate and checkout basket.', 'error');
    } finally {
      setActionPending(false);
    }
  };

  const handleOpenIssueModal = (res) => {
    setSelectedReservation(res);
    setReason('');
    setProofDescription('');
    setError('');
    setSuccess('');
    setShowIssueModal(true);
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!reason) {
      setError('Please provide a reason for the report.');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/issue-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reservationRef: selectedReservation._id,
          reason,
          proofDescription
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit report.');

      addToast(`Issue reported to administrators — donor notified`, 'error');
      setShowIssueModal(false);
      fetchReservations();
    } catch (err) {
      setError(err.message);
      addToast(err.message || 'Failed to submit report', 'error');
    }
  };

  const handleUpdateStatus = async (resId, newStatus) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`http://localhost:5000/api/kitchen/reservations/${resId}/delivery-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deliveryStatus: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update delivery status.');

      const toastMessage = newStatus === 'picked_up' 
        ? "Ingredient picked up — verification updated" 
        : "Ingredient marked as delivered to kitchen";
      addToast(toastMessage, 'success');
      fetchReservations();
    } catch (err) {
      setError(err.message);
      addToast(err.message || 'Failed to update reservation status', 'error');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const filteredIngredients = ingredients.filter(ing => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ing.name.toLowerCase().includes(q) ||
      ing.category.toLowerCase().includes(q) ||
      (ing.donorRef?.name && ing.donorRef.name.toLowerCase().includes(q))
    );
  });

  const filteredReservations = reservations.filter(resv => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (resv.ingredientRef?.name && resv.ingredientRef.name.toLowerCase().includes(q)) ||
      (resv.ingredientRef?.donorRef?.name && resv.ingredientRef.donorRef.name.toLowerCase().includes(q)) ||
      resv.deliveryStatus.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header bar section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="dashboard-title">Kitchen Operations</h1>
          <p className="dashboard-subtitle" style={{ margin: 0 }}>
            Welcome back, {user?.name}. Browse nearby surplus and manage active pickups.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-container">
        <button 
          className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
          onClick={() => { setPage(1); setActiveTab('available'); }}
        >
          Available Surplus Food
        </button>
        <button 
          className={`tab-btn ${activeTab === 'reservations' ? 'active' : ''}`}
          onClick={() => { setPage(1); setActiveTab('reservations'); }}
        >
          My Reservations
        </button>
      </div>

      {error && <div className="badge badge-rejected" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', textTransform: 'none', display: 'block', textAlign: 'center' }}>{error}</div>}

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading details...</p>}

      {/* Available Surplus View */}
      {activeTab === 'available' && !loading && (
        ingredients.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🍃</div>
            <h2>No Surplus Food Available</h2>
            <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>There are currently no approved surplus items within your region.</p>
          </div>
        ) : filteredIngredients.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
            <h2>No Matching Surplus Items</h2>
            <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>Try searching for a different keyword or category.</p>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Nearby Surplus Inventories (Nearest First)
            </h3>
            <div className="listings-grid">
              {filteredIngredients.map((ing) => (
                <div key={ing._id} className="ingredient-card">
                  <div 
                    className="listing-thumbnail-banner" 
                    style={{ background: getCategoryGradient(ing.category) }}
                  >
                    {getCategoryEmoji(ing.category)}
                  </div>
                  <div className="card-header" style={{ borderBottom: 'none', padding: '1.25rem 1.25rem 0.5rem 1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span className="badge badge-approved" style={{ alignSelf: 'flex-start', fontSize: '0.65rem', fontWeight: 800 }}>
                        📍 {ing.distance ? `${ing.distance.toFixed(1)} km away` : 'Nearby'}
                      </span>
                      <h3 className="card-title" style={{ fontSize: '1.1rem', marginTop: '0.15rem' }}>{ing.name}</h3>
                    </div>
                    <span className={`badge ${getCategoryBadgeClass(ing.category)}`} style={{ alignSelf: 'flex-start' }}>
                      {ing.category}
                    </span>
                  </div>
                  <div style={{ padding: '0.25rem 1.25rem' }}>
                    <CustodyRibbon status={ing.status} />
                  </div>
                  <div className="card-body">
                    <div className="info-item">
                      <span className="info-label">Available quantity</span>
                      <span className="info-value">{ing.quantity} {ing.unit}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Storage Class</span>
                      <span className="info-value">{ing.storageType}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Expiry Date</span>
                      <span className="info-value" style={{ color: 'var(--danger)', fontWeight: 600 }}>{formatDate(ing.expiryDate)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Pickup Deadline</span>
                      <span className="info-value">{formatDate(ing.pickupDeadline)}</span>
                    </div>
                    <div style={{ margin: '0.75rem 0', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }} />
                    <div className="info-item">
                      <span className="info-label">Donor Facility</span>
                      <span className="info-value">{ing.donorRef?.name || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Donor Reputation Rating</span>
                      <span className="info-value" style={{ color: 'var(--verified)', fontWeight: 700 }}>
                        {ing.donorRef?.reputationScore ?? 0} / 100
                      </span>
                    </div>
                  </div>
                  <div className="card-footer" style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ flex: 1, padding: '0.55rem', fontSize: '0.85rem' }}
                      onClick={() => addToBasket(ing)}
                    >
                      ＋ Add to Basket
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1, padding: '0.55rem', fontSize: '0.85rem' }}
                      onClick={() => handleOpenRequestModal(ing)}
                      disabled={actionPending}
                    >
                      Claim Direct
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', padding: '1.25rem 0', borderTop: '1px solid var(--border)' }}>
              <button 
                className="btn btn-secondary" 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous Page
              </button>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <button 
                className="btn btn-secondary" 
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next Page
              </button>
            </div>
          </div>
        )
      )}

      {/* Reservations Tab View */}
      {activeTab === 'reservations' && !loading && (
        reservations.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤝</div>
            <h2>No Active Reservations</h2>
            <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>Your soup kitchen does not have any active claims or pickup requests pending.</p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
            <h2>No Matching Reservations</h2>
            <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>Try searching for a different keyword or status.</p>
          </div>
        ) : (
          <div className="listings-grid">
            {filteredReservations.map((res) => {
              const req = res.requestRef;
              const ing = req?.ingredientRef;
              return (
                <div key={res._id} className="ingredient-card">
                  <div className="card-header">
                    <div>
                      <span className="badge badge-approved" style={{ fontSize: '0.65rem', marginBottom: '0.4rem', display: 'inline-block' }}>
                        Claim Status
                      </span>
                      <h3 className="card-title">{ing?.name || 'Unknown surplus ingredient'}</h3>
                    </div>
                    <span className={`badge badge-${res.deliveryStatus}`}>
                      {res.deliveryStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ padding: '0.5rem 1.25rem 0 1.25rem' }}>
                    <CustodyRibbon deliveryStatus={res.deliveryStatus} />
                  </div>
                  <div className="card-body">
                    <div className="info-item">
                      <span className="info-label">Claim quantity</span>
                      <span className="info-value">{res.reservedQuantity} {ing?.unit || ''}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Transport Route</span>
                      <span className="info-value" style={{ textTransform: 'capitalize' }}>{req?.pickupMode} Dispatch</span>
                    </div>
                    {req?.pickupMode === 'volunteer' && (
                      <div className="info-item">
                        <span className="info-label">Assigned Volunteer</span>
                        <span className="info-value" style={{ color: 'var(--active)', fontWeight: 700 }}>{req?.volunteerName}</span>
                      </div>
                    )}
                    <div className="info-item">
                      <span className="info-label">Pickup Deadline</span>
                      <span className="info-value" style={{ color: 'var(--danger)', fontWeight: 700 }}>{formatDate(res.expiresAt)}</span>
                    </div>

                    {res.pickupCode && res.deliveryStatus === 'pending' && (
                      <div style={{ marginTop: '1rem', padding: '0.75rem', border: '1px dashed var(--active)', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.04)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                          Security Authorization Code
                        </div>
                        <div className="pickup-code-val" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--active)', letterSpacing: '3px', marginTop: '0.2rem' }}>
                          {res.pickupCode}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="card-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {res.deliveryStatus === 'pending' && (
                      <button 
                        className="btn btn-primary" 
                        style={{ width: '100%', padding: '0.5rem' }}
                        onClick={() => handleUpdateStatus(res._id, 'picked_up')}
                      >
                        Confirm Picked Up
                      </button>
                    )}
                    {res.deliveryStatus === 'picked_up' && (
                      <>
                        <button 
                          className="btn btn-primary" 
                          style={{ width: '100%', padding: '0.5rem', background: 'var(--verified)', borderColor: 'var(--verified)' }}
                          onClick={() => handleUpdateStatus(res._id, 'delivered')}
                        >
                          Confirm Delivered to Kitchen
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ width: '100%', padding: '0.5rem' }}
                          onClick={() => handleOpenIssueModal(res)}
                        >
                          Report Quality Issue
                        </button>
                      </>
                    )}
                    {res.deliveryStatus === 'delivered' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--verified)', fontWeight: 700, textAlign: 'center', width: '100%', margin: '0.25rem 0' }}>
                          ✓ Successfully Received
                        </span>
                        <button 
                          className="btn btn-danger" 
                          style={{ width: '100%', padding: '0.5rem' }}
                          onClick={() => handleOpenIssueModal(res)}
                        >
                          Report Quality Issue
                        </button>
                      </div>
                    )}
                    {res.deliveryStatus === 'expired' && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700, textAlign: 'center', width: '100%' }}>
                        Reservation Expired
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Request Modal */}
      {showRequestModal && selectedIngredient && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Request Surplus Food</h2>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowRequestModal(false)}>✕</button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Item Name: <strong style={{ color: 'white' }}>{selectedIngredient.name}</strong></p>
              <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>Available Quantity: <strong style={{ color: 'white' }}>{selectedIngredient.quantity} {selectedIngredient.unit}</strong></p>
              <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>Pickup Offset: <strong style={{ color: 'white' }}>{selectedIngredient.distance?.toFixed(1) || '0.0'} km away</strong></p>
            </div>

            <form onSubmit={handleRequestSubmit}>
              {error && <div className="badge badge-rejected" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', marginBottom: '1.25rem', textTransform: 'none', display: 'block', textAlign: 'center' }}>{error}</div>}
              
              <div className="form-group">
                <label className="form-label">Requested Quantity ({selectedIngredient.unit})</label>
                <input 
                  type="number" 
                  min="0.1" 
                  max={selectedIngredient.quantity}
                  step="0.1"
                  className="form-control" 
                  required 
                  value={requestedQuantity} 
                  onChange={e => setRequestedQuantity(e.target.value)} 
                  placeholder={`Maximum allowed: ${selectedIngredient.quantity}`}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pickup mode</label>
                <select 
                  className="form-control" 
                  value={pickupMode} 
                  onChange={e => setPickupMode(e.target.value)}
                >
                  <option value="self">Self (Soup kitchen staff will pick up)</option>
                  <option value="volunteer">Volunteer (Assign local driver / helper)</option>
                </select>
              </div>

              {pickupMode === 'volunteer' && (
                <div className="form-group">
                  <label className="form-label">Volunteer Driver's Full Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={volunteerName} 
                    onChange={e => setVolunteerName(e.target.value)} 
                    placeholder="Enter volunteer name"
                  />
                </div>
              )}

              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label className="form-label">Pickup Location Map</label>
                <div className="map-container" style={{ height: '180px' }}>
                  <LeafletMap 
                    lat={selectedIngredient.location.lat} 
                    lng={selectedIngredient.location.lng} 
                    readOnly={true} 
                    markerLabel={`${selectedIngredient.name} Pickup Location`} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowRequestModal(false)} disabled={actionPending}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }} disabled={actionPending}>
                  {actionPending ? 'Submitting...' : 'Confirm Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Reporting Modal */}
      {showIssueModal && selectedReservation && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">File Food Quality Report</h2>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowIssueModal(false)}>✕</button>
            </div>
            <form onSubmit={handleIssueSubmit}>
              {error && <div className="badge badge-rejected" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', marginBottom: '1.25rem', textTransform: 'none', display: 'block', textAlign: 'center' }}>{error}</div>}
              
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#fca5a5' }}>
                Filing report for ingredient: <strong style={{ color: 'white' }}>{selectedReservation.requestRef?.ingredientRef?.name || 'Surplus Item'}</strong>
              </div>

              <div className="form-group">
                <label className="form-label">Nature of Complaint (Spoilage, Quantity discrepancy, etc.)</label>
                <textarea 
                  className="form-control" 
                  required 
                  rows="4"
                  value={reason} 
                  onChange={e => setReason(e.target.value)} 
                  placeholder="Describe the condition, temperature issues, mold, shelf-life violations, etc..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Evidence / Photo Reference Link (Optional)</label>
                <input 
                  type="text"
                  className="form-control" 
                  value={proofDescription} 
                  onChange={e => setProofDescription(e.target.value)} 
                  placeholder="e.g. imgur.com/reference-photo-xyz"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" style={{ flex: 1.5 }}>File Quality Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Basket Button */}
      <button 
        className="floating-basket-btn" 
        onClick={() => setShowBasketDrawer(true)}
      >
        <span style={{ fontSize: '1.6rem' }}>🛒</span>
        {basket.length > 0 && (
          <span className="badge-count">{basket.length}</span>
        )}
      </button>

      {/* Slide-Over Basket Drawer Overlay and Panel */}
      <div className={`drawer-overlay ${showBasketDrawer ? 'open' : ''}`} onClick={() => setShowBasketDrawer(false)}>
        <div className="basket-drawer" onClick={e => e.stopPropagation()}>
          <div className="drawer-header">
            <h2 className="drawer-title">
              <span>🛒</span> Food Collection Basket
            </h2>
            <button className="drawer-close-btn" onClick={() => setShowBasketDrawer(false)}>✕</button>
          </div>

          <div className="drawer-body">
            {basket.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🍲</span>
                <h3>Your Basket is Empty</h3>
                <p style={{ fontSize: '0.88rem', marginTop: '0.5rem' }}>Browse available surplus food listings and add them here to coordinate bulk reservations.</p>
              </div>
            ) : (
              basket.map((item) => (
                <div key={item.ingredientId} className={`basket-item-card ${item.error ? 'has-error' : ''}`}>
                  <div 
                    className="basket-item-thumbnail"
                    style={{ background: getCategoryGradient(item.category) }}
                  >
                    {getCategoryEmoji(item.category)}
                  </div>
                  <div className="basket-item-details">
                    <h3 className="basket-item-name">{item.name}</h3>
                    <div className="basket-item-meta">
                      <span>🏪 {item.donorName}</span>
                      <span>🏷️ {item.category}</span>
                      <span>📦 Max: {item.availableQuantity} {item.unit}</span>
                      {item.distance !== null && <span>📍 {item.distance.toFixed(1)} km away</span>}
                    </div>
                    {item.error && <div className="basket-item-error-msg">⚠️ {item.error}</div>}
                    
                    <div className="basket-item-actions">
                      <div className="basket-qty-control">
                        <button 
                          type="button" 
                          className="basket-qty-btn" 
                          onClick={() => adjustQuantity(item.ingredientId, -1)}
                        >
                          -
                        </button>
                        <input 
                          type="number"
                          step="0.1"
                          min="0.1"
                          max={item.availableQuantity}
                          className="basket-qty-input"
                          value={item.selectedQuantity}
                          onChange={e => setItemQuantity(item.ingredientId, e.target.value)}
                        />
                        <button 
                          type="button" 
                          className="basket-qty-btn" 
                          onClick={() => adjustQuantity(item.ingredientId, 1)}
                        >
                          +
                        </button>
                      </div>
                      <button 
                        type="button" 
                        className="basket-item-remove-btn"
                        onClick={() => removeFromBasket(item.ingredientId)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {basket.length > 0 && (
            <div className="drawer-footer">
              <form onSubmit={handleBasketCheckout}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Pickup Mode</label>
                  <select 
                    className="form-control" 
                    value={basketPickupMode} 
                    onChange={e => setBasketPickupMode(e.target.value)}
                  >
                    <option value="self">Self Pickup (Soup Kitchen Staff)</option>
                    <option value="volunteer">Volunteer Driver</option>
                  </select>
                </div>

                {basketPickupMode === 'volunteer' && (
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Volunteer Driver Full Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={basketVolunteerName} 
                      onChange={e => setBasketVolunteerName(e.target.value)} 
                      placeholder="Driver name"
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={clearBasket}
                    disabled={actionPending}
                  >
                    Clear All
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 2 }}
                    disabled={actionPending}
                  >
                    {actionPending ? 'Processing...' : 'Reserve Selected Items'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
