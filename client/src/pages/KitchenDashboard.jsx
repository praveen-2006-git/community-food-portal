import { useState, useEffect } from 'react';
import LeafletMap from '../components/LeafletMap';
import CustodyRibbon from '../components/CustodyRibbon';
import { useToast, useSearch } from '../App';

export default function KitchenDashboard({ user }) {
  const [ingredients, setIngredients] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [activeTab, setActiveTab] = useState('available'); // 'available', 'reservations', or 'needs_inventory'
  
  // Weekly Needs State
  const [needs, setNeeds] = useState([]);
  const [needIngredientName, setNeedIngredientName] = useState('Atta');
  const [needIngredientPreset, setNeedIngredientPreset] = useState('Atta');
  const [needQuantity, setNeedQuantity] = useState('');
  const [needUnit, setNeedUnit] = useState('kg');
  const [needPriority, setNeedPriority] = useState('normal');

  // Kitchen Inventory State
  const [inventory, setInventory] = useState([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Consume Log State
  const [consumeItemName, setConsumeItemName] = useState('');
  const [consumeQuantity, setConsumeQuantity] = useState('');

  // Adjust Stock State
  const [adjustItemName, setAdjustItemName] = useState('');
  const [adjustStockQuantity, setAdjustStockQuantity] = useState('');
  const [adjustUnit, setAdjustUnit] = useState('kg');
  const [adjustMinThreshold, setAdjustMinThreshold] = useState(5);
  
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
  const [dietaryFilter, setDietaryFilter] = useState('all'); // 'all', 'veg', 'non-veg', 'egg'

  // Collection Basket State
  const [basket, setBasket] = useState([]);
  const [showBasketDrawer, setShowBasketDrawer] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Category visual thumbnail helper removed

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

  const renderDietaryIcon = (type) => {
    const t = (type || 'veg').toLowerCase();
    const color = t === 'veg' ? '#10b981' : t === 'egg' ? '#eab308' : '#b45309';
    const label = t === 'veg' ? 'Veg' : t === 'egg' ? 'Egg' : 'Non-Veg';
    
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
        <div style={{ 
          width: '14px', 
          height: '14px', 
          border: `2px solid ${color}`, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: '3px',
          padding: '1px'
        }}>
          <div style={{ 
            width: '6px', 
            height: '6px', 
            backgroundColor: color, 
            borderRadius: '50%' 
          }} />
        </div>
        <span>{label}</span>
      </div>
    );
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
      let url = `http://localhost:5000/api/kitchen/ingredients?page=${page}&limit=${limit}`;
      if (dietaryFilter !== 'all') {
        url += `&dietaryType=${dietaryFilter}`;
      }
      const res = await fetch(url, {
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

  const fetchNotifications = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/kitchen/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/kitchen/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const fetchNeeds = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/kitchen/needs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setNeeds(data);
    } catch (err) {
      console.error('Error fetching weekly needs:', err);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/kitchen/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setInventory(data);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

  const handleNeedSubmit = async (e) => {
    e.preventDefault();
    setActionPending(true);
    try {
      const res = await fetch('http://localhost:5000/api/kitchen/needs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ingredientName: needIngredientName,
          quantity: parseFloat(needQuantity),
          unit: needUnit,
          priority: needPriority
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit need.');
      
      addToast('Weekly need declared successfully!', 'success');
      setNeedQuantity('');
      fetchNeeds();
    } catch (err) {
      addToast(err.message || 'Submission failed.', 'error');
    } finally {
      setActionPending(false);
    }
  };

  const handleNeedDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this need declaration?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/kitchen/needs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete need.');
      
      addToast('Need declaration removed.', 'info');
      fetchNeeds();
    } catch (err) {
      addToast(err.message || 'Deletion failed.', 'error');
    }
  };

  const handleConsumeSubmit = async (e) => {
    e.preventDefault();
    if (!consumeItemName || !consumeQuantity) return;
    setActionPending(true);
    try {
      const res = await fetch('http://localhost:5000/api/kitchen/inventory/consume', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: consumeItemName,
          quantity: parseFloat(consumeQuantity)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to log consumption.');
      
      addToast('Daily consumption logged successfully!', 'success');
      setShowConsumeModal(false);
      setConsumeQuantity('');
      fetchInventory();
    } catch (err) {
      addToast(err.message || 'Consumption log failed.', 'error');
    } finally {
      setActionPending(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustItemName || !adjustStockQuantity || !adjustUnit) return;
    setActionPending(true);
    try {
      const res = await fetch('http://localhost:5000/api/kitchen/inventory/adjust', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: adjustItemName,
          quantity: parseFloat(adjustStockQuantity),
          unit: adjustUnit,
          minThreshold: parseFloat(adjustMinThreshold)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to adjust inventory.');
      
      addToast('Inventory adjusted successfully!', 'success');
      setShowAdjustModal(false);
      setAdjustStockQuantity('');
      fetchInventory();
    } catch (err) {
      addToast(err.message || 'Adjustment failed.', 'error');
    } finally {
      setActionPending(false);
    }
  };

  const handleOpenConsumeModal = (item) => {
    setConsumeItemName(item.name);
    setConsumeQuantity('');
    setShowConsumeModal(true);
  };

  const handleOpenAdjustModal = (item) => {
    if (item) {
      setAdjustItemName(item.name);
      setAdjustStockQuantity(item.quantity);
      setAdjustUnit(item.unit);
      setAdjustMinThreshold(item.minThreshold || 5);
    } else {
      setAdjustItemName('');
      setAdjustStockQuantity('');
      setAdjustUnit('kg');
      setAdjustMinThreshold(5);
    }
    setShowAdjustModal(true);
  };

  const handleNeedPresetChange = (preset) => {
    setNeedIngredientPreset(preset);
    if (preset !== 'Other') {
      setNeedIngredientName(preset);
    } else {
      setNeedIngredientName('');
    }
  };

  useEffect(() => {
    if (activeTab === 'available') {
      fetchIngredients();
    } else if (activeTab === 'reservations') {
      fetchReservations();
    } else if (activeTab === 'needs_inventory') {
      fetchNeeds();
      fetchInventory();
    }
  }, [activeTab, page, dietaryFilter]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

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
        <div style={{ position: 'relative' }}>
          <button 
            className="btn btn-secondary" 
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔 Notifications
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="badge badge-attention" style={{ position: 'absolute', top: '-10px', right: '-10px', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', padding: 0 }}>
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="glass-panel" style={{ position: 'absolute', right: 0, top: '45px', width: '360px', zIndex: 1000, padding: '1rem', maxHeight: '400px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span>Matched Shipments</span>
                <button className="btn btn-secondary" style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }} onClick={() => setShowNotifications(false)}>Close</button>
              </h4>
              {notifications.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '1rem' }}>No matched shipments nearby.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {notifications.map(n => (
                    <div 
                      key={n._id} 
                      style={{ 
                        padding: '0.75rem', 
                        borderRadius: '6px', 
                        background: n.isRead ? 'rgba(255,255,255,0.02)' : 'rgba(99, 102, 241, 0.15)', 
                        borderLeft: n.isRead ? '3px solid transparent' : '3px solid var(--primary)',
                        cursor: 'pointer'
                      }}
                      onClick={() => markAsRead(n._id)}
                    >
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{n.message}</p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '0.25rem' }}>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {n.isRead ? 'Read' : 'Mark as Read'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
        <button 
          className={`tab-btn ${activeTab === 'needs_inventory' ? 'active' : ''}`}
          onClick={() => { setPage(1); setActiveTab('needs_inventory'); }}
        >
          Needs & Inventory
        </button>
      </div>

      {error && <div className="badge badge-rejected" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', textTransform: 'none', display: 'block', textAlign: 'center' }}>{error}</div>}

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading details...</p>}

      {/* Available Surplus View */}
      {activeTab === 'available' && !loading && (
        <div>
          {/* Dietary Filter Bar */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Dietary Filter:</span>
              {['all', 'veg', 'non-veg', 'egg'].map(type => (
                <button
                  key={type}
                  className={`btn ${dietaryFilter === type ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                  onClick={() => { setPage(1); setDietaryFilter(type); }}
                >
                  {type === 'all' && 'All'}
                  {type === 'veg' && '🟢 Veg'}
                  {type === 'non-veg' && '🟤 Non-Veg'}
                  {type === 'egg' && '🟡 Egg'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Compliance: <span style={{ color: 'var(--verified)', fontWeight: 600 }}>FSSAI Save Food Share Food</span>
            </div>
          </div>

          {ingredients.length === 0 ? (
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
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Nearby Surplus Inventories (Nearest First)
              </h3>
            <div className="listings-grid">
              {filteredIngredients.map((ing) => (
                <div key={ing._id} className="ingredient-card">
                  <div className="card-header" style={{ borderBottom: 'none', padding: '1.25rem 1.25rem 0.5rem 1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge badge-approved" style={{ fontSize: '0.65rem', fontWeight: 800 }}>
                          📍 {ing.distance ? `${ing.distance.toFixed(1)} km away` : 'Nearby'}
                        </span>
                        {renderDietaryIcon(ing.dietaryType)}
                      </div>
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
        )}
      </div>
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

      {/* Needs & Inventory view */}
      {activeTab === 'needs_inventory' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem', marginBottom: '3.5rem' }}>
          
          {/* Section 1: Weekly Needs Board */}
          <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>📋 Weekly Needs Board</h2>
            
            <form onSubmit={handleNeedSubmit} style={{ marginBottom: '1.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Ingredient Needed</label>
                <select 
                  className="form-control" 
                  value={needIngredientPreset} 
                  onChange={e => handleNeedPresetChange(e.target.value)}
                  required
                >
                  <option value="Atta">Atta</option>
                  <option value="Rice">Rice</option>
                  <option value="Dal">Dal</option>
                  <option value="Cooking Oil">Cooking Oil</option>
                  <option value="Onions">Onions</option>
                  <option value="Spices">Spices</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Packaged Goods">Packaged Goods</option>
                  <option value="Other">Other (Specify below)</option>
                </select>
                {needIngredientPreset === 'Other' && (
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ marginTop: '0.5rem' }} 
                    required 
                    value={needIngredientName} 
                    onChange={e => setNeedIngredientName(e.target.value)} 
                    placeholder="Enter ingredient name" 
                  />
                )}
              </div>
              <div className="form-row" style={{ marginTop: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="form-control" 
                    required 
                    value={needQuantity} 
                    onChange={e => setNeedQuantity(e.target.value)} 
                    placeholder="10" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select 
                    className="form-control" 
                    value={needUnit} 
                    onChange={e => setNeedUnit(e.target.value)}
                    required
                  >
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="packets">packets</option>
                    <option value="pieces">pieces</option>
                    <option value="dozen">dozen</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Priority</label>
                <select 
                  className="form-control" 
                  value={needPriority} 
                  onChange={e => setNeedPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent (Immediate Need)</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.5rem' }} disabled={actionPending}>
                Declare Weekly Need
              </button>
            </form>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Active Declarations</h3>
            {needs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>No weekly needs currently declared.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {needs.map(n => (
                  <div key={n._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{n.ingredientName}</span>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Target: {n.quantity} {n.unit} | Priority: 
                        <span style={{ 
                          color: n.priority === 'urgent' ? 'var(--danger)' : n.priority === 'normal' ? 'var(--active)' : 'var(--text-tertiary)',
                          marginLeft: '0.25rem',
                          fontWeight: 700
                        }}>{n.priority}</span>
                      </div>
                    </div>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }} 
                      onClick={() => handleNeedDelete(n._id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Kitchen Inventory Tracking */}
          <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>📦 Stock Inventory</h2>
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                onClick={() => handleOpenAdjustModal(null)}
              >
                + Add Item
              </button>
            </div>

            <input 
              type="text" 
              className="form-control" 
              placeholder="Search kitchen inventory..." 
              style={{ marginBottom: '1.25rem' }} 
              value={inventorySearch}
              onChange={e => setInventorySearch(e.target.value)}
            />

            {/* Low stock alerts */}
            {inventory.some(item => item.quantity <= item.minThreshold) && (
              <div className="badge badge-attention" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', marginBottom: '1.25rem', textTransform: 'none', display: 'flex', flexDirection: 'column', gap: '0.15rem', textAlign: 'left' }}>
                <strong style={{ fontSize: '0.8rem' }}>⚠️ Low Stock Alert:</strong>
                {inventory.filter(item => item.quantity <= item.minThreshold).map((item, idx) => (
                  <span key={idx} style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                    • {item.name} is at {item.quantity} {item.unit} (Minimum: {item.minThreshold} {item.unit})
                  </span>
                ))}
              </div>
            )}

            {inventory.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Your canteens inventory ledger is currently empty. Deliveries automatically populate here, or you can add items manually.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {inventory.filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase())).map((item, idx) => {
                  const isLow = item.quantity <= item.minThreshold;
                  return (
                    <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: isLow ? '1px solid var(--attention)' : '1px solid var(--border)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '1.05rem', color: isLow ? 'var(--attention)' : 'var(--text-primary)' }}>{item.name}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                            Threshold: {item.minThreshold} {item.unit}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isLow ? 'var(--attention)' : 'var(--verified)' }}>
                            {item.quantity} {item.unit}
                          </div>
                          {isLow && <span className="badge badge-attention" style={{ fontSize: '0.6rem', marginTop: '0.15rem' }}>Low Stock</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ flex: 1, padding: '0.35rem', fontSize: '0.75rem' }} 
                          onClick={() => handleOpenConsumeModal(item)}
                          disabled={item.quantity <= 0}
                        >
                          🍽️ Log Consumed
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ flex: 1, padding: '0.35rem', fontSize: '0.75rem' }} 
                          onClick={() => handleOpenAdjustModal(item)}
                        >
                          ⚙️ Adjust
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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

      {/* Log Consumption Modal */}
      {showConsumeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Record Daily Meal Consumption</h2>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowConsumeModal(false)}>✕</button>
            </div>
            <form onSubmit={handleConsumeSubmit}>
              <div style={{ marginBottom: '1rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Deducting stock for: <strong style={{ color: 'white' }}>{consumeItemName}</strong>
              </div>
              
              {/* Presets */}
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Quick presets</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {[5, 10, 25].map(preset => (
                  <button 
                    key={preset}
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', flex: 1 }}
                    onClick={() => setConsumeQuantity(preset)}
                  >
                    {preset} units
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Quantity Consumed</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0.1"
                  className="form-control" 
                  required 
                  value={consumeQuantity} 
                  onChange={e => setConsumeQuantity(e.target.value)} 
                  placeholder="e.g. 15"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowConsumeModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={actionPending}>
                  {actionPending ? 'Logging...' : 'Log Deduct'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Manual Stock Adjustment</h2>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowAdjustModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdjustSubmit}>
              <div className="form-group">
                <label className="form-label">Ingredient Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={adjustItemName} 
                  onChange={e => setAdjustItemName(e.target.value)} 
                  placeholder="e.g. Atta"
                />
              </div>

              <div className="form-row" style={{ marginTop: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Current Stock</label>
                  <input 
                    type="number" 
                    step="0.1"
                    min="0"
                    className="form-control" 
                    required 
                    value={adjustStockQuantity} 
                    onChange={e => setAdjustStockQuantity(e.target.value)} 
                    placeholder="e.g. 50"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select 
                    className="form-control" 
                    value={adjustUnit} 
                    onChange={e => setAdjustUnit(e.target.value)}
                    required
                  >
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="packets">packets</option>
                    <option value="pieces">pieces</option>
                    <option value="dozen">dozen</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Minimum Threshold Alert Level</label>
                <input 
                  type="number" 
                  min="0"
                  className="form-control" 
                  required 
                  value={adjustMinThreshold} 
                  onChange={e => setAdjustMinThreshold(e.target.value)} 
                  placeholder="Alert when stock falls below this level"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAdjustModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={actionPending}>
                  {actionPending ? 'Adjusting...' : 'Save Inventory Stock'}
                </button>
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
