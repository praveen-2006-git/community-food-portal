import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker asset resolution issue
const kitchenIcon = L.divIcon({
  className: 'custom-map-pin-kitchen',
  html: `<div style="background-color: #10B981; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 3px #10B981; margin: 5px;"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const donorIcon = L.divIcon({
  className: 'custom-map-pin-donor',
  html: `<div style="background-color: #3B82F6; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 3px #3B82F6; margin: 5px;"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const sequenceIcon = (index) => L.divIcon({
  className: 'custom-map-pin-seq',
  html: `<div style="background-color: #F59E0B; width: 22px; height: 22px; border: 2px solid white; border-radius: 50%; color: black; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 3px #F59E0B; margin: 2px;">${index}</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13]
});

// Map Controller for dynamic panning and framing
function MapController({ selectedKitchen, routePoints, ingredients }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    const bounds = [];
    
    if (selectedKitchen) {
      bounds.push([selectedKitchen.location.lat, selectedKitchen.location.lng]);
    }

    if (routePoints && routePoints.length > 0) {
      routePoints.forEach(pt => {
        bounds.push([pt.lat, pt.lng]);
      });
    } else {
      ingredients.forEach((ing) => {
        if (ing.location && typeof ing.location.lat === 'number') {
          bounds.push([ing.location.lat, ing.location.lng]);
        }
      });
    }
    
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, selectedKitchen, routePoints, ingredients]);
  
  return null;
}

// Distance helper
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function RoutingMap({ user }) {
  const [ingredients, setIngredients] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [selectedKitchen, setSelectedKitchen] = useState(null);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  
  // Route planning tabs & options
  const [activeTab, setActiveTab] = useState('explore'); 
  const [planningSource, setPlanningSource] = useState('basket'); 
  const [basketItems, setBasketItems] = useState([]);
  const [reservations, setReservations] = useState([]);

  // Street routing states
  const [roadGeometry, setRoadGeometry] = useState([]);
  const [roadDistance, setRoadDistance] = useState(null);
  const [roadDuration, setRoadDuration] = useState(null);
  const [routingType, setRoutingType] = useState('haversine'); // 'haversine' or 'osrm'

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mobile Companion State
  const [showMobileCompanion, setShowMobileCompanion] = useState(false);
  const [currentCompanionStopIndex, setCurrentCompanionStopIndex] = useState(0);
  const [companionReceivedQty, setCompanionReceivedQty] = useState('');
  const [companionCondition, setCompanionCondition] = useState('good');
  const [companionSecurityCode, setCompanionSecurityCode] = useState('');
  const [companionActionPending, setCompanionActionPending] = useState(false);
  
  const token = localStorage.getItem('token');
  const isAdmin = user?.role === 'admin';

  // Load basket items from localStorage
  const loadBasket = () => {
    const saved = localStorage.getItem('food_basket');
    if (saved) {
      try {
        setBasketItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse basket items', e);
      }
    } else {
      setBasketItems([]);
    }
  };

  const fetchReservations = async () => {
    try {
      const url = isAdmin 
        ? 'http://localhost:5000/api/admin/ledger' 
        : 'http://localhost:5000/api/kitchen/reservations';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        if (isAdmin) {
          setReservations(data);
        } else {
          setReservations(data.filter(r => r.deliveryStatus === 'pending' || r.deliveryStatus === 'approved'));
        }
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
    }
  };

  useEffect(() => {
    const fetchIngredients = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:5000/api/kitchen/ingredients', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setIngredients(data);
      } catch (err) {
        setError('Failed to fetch ingredients.');
      } finally {
        setLoading(false);
      }
    };

    const fetchKitchens = async () => {
      if (!isAdmin) return;
      try {
        const res = await fetch('http://localhost:5000/api/admin/kitchens', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setKitchens(data);
          if (data.length > 0) setSelectedKitchen(data[0]);
        }
      } catch (err) {
        setError('Failed to fetch kitchens.');
      }
    };

    fetchIngredients();
    if (isAdmin) {
      fetchKitchens();
    } else if (user) {
      setSelectedKitchen({
        _id: user.id,
        name: user.name,
        location: user.location
      });
    }

    loadBasket();
    fetchReservations();
  }, [isAdmin, token, user]);

  // Compute optimized sequential multi-stop route
  const getOptimizedRoute = () => {
    if (!selectedKitchen) return { sequence: [], totalDistance: 0 };

    let itemsToRoute = [];
    if (planningSource === 'basket') {
      itemsToRoute = basketItems.map(item => ({
        id: item.ingredientId,
        name: item.name,
        quantity: item.selectedQuantity || item.quantity,
        unit: item.unit,
        location: item.location,
        donorName: item.donorName || 'Donor'
      }));
    } else {
      itemsToRoute = reservations.map(r => ({
        id: r._id,
        name: r.ingredientRef?.name || 'Surplus item',
        quantity: r.reservedQuantity || r.quantity,
        unit: r.ingredientRef?.unit || 'units',
        location: r.ingredientRef?.location || r.donorRef?.location,
        donorName: r.donorRef?.name || 'Donor',
        rawReservation: r
      }));
    }

    const validItems = itemsToRoute.filter(item => item.location && typeof item.location.lat === 'number');

    if (validItems.length === 0) return { sequence: [], totalDistance: 0 };

    // Nearest Neighbor sequence optimizer
    const sequence = [];
    let currentLoc = { lat: selectedKitchen.location.lat, lng: selectedKitchen.location.lng };
    const unvisited = [...validItems];
    let totalDistance = 0;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const d = getHaversineDistance(
          currentLoc.lat, currentLoc.lng,
          unvisited[i].location.lat, unvisited[i].location.lng
        );
        if (d < minDistance) {
          minDistance = d;
          nearestIndex = i;
        }
      }

      const nextStop = unvisited.splice(nearestIndex, 1)[0];
      sequence.push({
        ...nextStop,
        distanceFromLastLeg: minDistance
      });
      totalDistance += minDistance;
      currentLoc = { lat: nextStop.location.lat, lng: nextStop.location.lng };
    }

    const returnLegDistance = getHaversineDistance(
      currentLoc.lat, currentLoc.lng,
      selectedKitchen.location.lat, selectedKitchen.location.lng
    );
    totalDistance += returnLegDistance;

    return { sequence, totalDistance, returnLegDistance };
  };

  const { sequence: routeSequence, totalDistance: routeTotalDistance, returnLegDistance } = getOptimizedRoute();

  const handleOpenMobileCompanion = () => {
    if (routeSequence.length === 0) return;
    setCurrentCompanionStopIndex(0);
    setCompanionReceivedQty(routeSequence[0].quantity);
    setCompanionCondition('good');
    setShowMobileCompanion(true);
  };

  const handleCompanionHandoff = async (stop, newStatus) => {
    setError('');
    setCompanionActionPending(true);
    try {
      const body = { deliveryStatus: newStatus };
      if (newStatus === 'delivered') {
        body.receivedQuantity = parseFloat(companionReceivedQty);
        body.condition = companionCondition;
      }
      
      const res = await fetch(`http://localhost:5000/api/kitchen/reservations/${stop.id}/delivery-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Handoff update failed.');
      
      alert(`Stop handoff updated successfully to ${newStatus}!`);
      
      // Refresh reservations
      fetchReservations();
      
      // Move to next stop if possible, or close companion if complete
      const nextIndex = currentCompanionStopIndex + 1;
      if (nextIndex < routeSequence.length) {
        setCurrentCompanionStopIndex(nextIndex);
        const nextStop = routeSequence[nextIndex];
        setCompanionReceivedQty(nextStop.quantity);
        setCompanionCondition('good');
      } else {
        setShowMobileCompanion(false);
      }
    } catch (err) {
      alert(err.message || 'Failed to complete stop handoff.');
    } finally {
      setCompanionActionPending(false);
    }
  };

  // Load road routing geometry from OSRM API
  useEffect(() => {
    const fetchOSRMRoute = async () => {
      if (!selectedKitchen) return;
      
      let coords = [];
      if (activeTab === 'explore') {
        if (!selectedIngredient) {
          setRoadGeometry([]);
          setRoadDistance(null);
          setRoadDuration(null);
          return;
        }
        coords = [
          selectedKitchen.location,
          selectedIngredient.location
        ];
      } else {
        if (routeSequence.length === 0) {
          setRoadGeometry([]);
          setRoadDistance(null);
          setRoadDuration(null);
          return;
        }
        coords = [
          selectedKitchen.location,
          ...routeSequence.map(s => s.location),
          selectedKitchen.location
        ];
      }

      try {
        const coordsStr = coords.map(c => `${c.lng},${c.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const route = data.routes[0];
          // Convert GeoJSON [lng, lat] array to Leaflet [lat, lng] array
          const leafletCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
          setRoadGeometry(leafletCoords);
          setRoadDistance(route.distance / 1000); // meters to km
          setRoadDuration(route.duration); // seconds
          setRoutingType('osrm');
        } else {
          throw new Error('OSRM route failed');
        }
      } catch (err) {
        console.warn('OSRM routing offline, falling back to Haversine straight-line coordinates', err);
        setRoutingType('haversine');
        // fallback straight line
        const fallback = coords.map(c => [c.lat, c.lng]);
        setRoadGeometry(fallback);
        setRoadDistance(null);
        setRoadDuration(null);
      }
    };

    fetchOSRMRoute();
  }, [activeTab, selectedKitchen, selectedIngredient, planningSource, basketItems.length, reservations.length]);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Format duration helper (seconds to mins/hours)
  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hr ${remMins} mins`;
  };

  // Distance label mid-point calculation (for explore tab fallback)
  let singleDistance = 0;
  let singleMidLat = 0;
  let singleMidLng = 0;
  let singleLabelIcon = null;

  if (selectedKitchen && selectedIngredient && activeTab === 'explore') {
    const startLat = selectedKitchen.location.lat;
    const startLng = selectedKitchen.location.lng;
    const endLat = selectedIngredient.location.lat;
    const endLng = selectedIngredient.location.lng;
    
    singleDistance = roadDistance || getHaversineDistance(startLat, startLng, endLat, endLng);
    singleMidLat = (startLat + endLat) / 2;
    singleMidLng = (startLng + endLng) / 2;
    
    const labelText = routingType === 'osrm' 
      ? `${singleDistance.toFixed(2)} KM (DRIVING)`
      : `${singleDistance.toFixed(2)} KM (RADIAL)`;

    singleLabelIcon = L.divIcon({
      className: 'distance-label-wrapper',
      html: `<div style="background: #FFFFFF; color: #10B981; border: 1.5px solid #D1FAE5; border-radius: 20px; padding: 4px 10px; font-family: system-ui, sans-serif; font-weight: 700; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 10px rgba(16,185,129,0.15);">${labelText}</div>`,
      iconSize: [140, 24],
      iconAnchor: [70, 12]
    });
  }

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 90px)', padding: '1rem 2rem' }}>
      
      {/* Upper Navigation & Origin selection */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ fontSize: '1.5rem', margin: 0 }}>OSRM Street Routing Workspace</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
            Generates actual driving paths on road grids.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAdmin && kitchens.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Origin Kitchen:</span>
              <select 
                className="form-control" 
                style={{ width: '180px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                value={selectedKitchen?._id || ''}
                onChange={(e) => {
                  const kit = kitchens.find(k => k._id === e.target.value);
                  setSelectedKitchen(kit);
                  setSelectedIngredient(null);
                }}
              >
                {kitchens.map((k) => (
                  <option key={k._id} value={k._id}>{k.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle Tabs */}
          <div className="tab-container" style={{ margin: 0, padding: '2px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button 
              className={`tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', borderRadius: '6px' }}
              onClick={() => setActiveTab('explore')}
            >
              🔍 Explore Proximity
            </button>
            <button 
              className={`tab-btn ${activeTab === 'route-planner' ? 'active' : ''}`}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', borderRadius: '6px' }}
              onClick={() => { setActiveTab('route-planner'); loadBasket(); fetchReservations(); }}
            >
              📍 Route Planner ({planningSource === 'basket' ? basketItems.length : reservations.length} stops)
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Main Two Column Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.25rem', flex: 1, minHeight: 0 }}>
        
        {/* Map Container */}
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: 0, border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          {loading && (
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: 'rgba(11,15,25,0.85)', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', color: 'white' }}>
              Loading map markers...
            </div>
          )}
          
          <MapContainer center={[11.5034, 77.2444]} zoom={13} style={{ width: '100%', height: '100%', minHeight: '450px', zIndex: 1 }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController 
              selectedKitchen={selectedKitchen} 
              routePoints={activeTab === 'route-planner' ? routeSequence.map(s => s.location) : (selectedIngredient ? [selectedIngredient.location] : [])} 
              ingredients={ingredients} 
            />
            
            {/* Draw explore OSRM or Haversine connection */}
            {activeTab === 'explore' && selectedKitchen && selectedIngredient && roadGeometry.length > 0 && (
              <>
                <Polyline 
                  positions={roadGeometry}
                  pathOptions={{ 
                    color: '#10B981', 
                    weight: 4, 
                    dashArray: routingType === 'haversine' ? '5, 10' : undefined 
                  }}
                />
                <Marker position={[singleMidLat, singleMidLng]} icon={singleLabelIcon} />
              </>
            )}

            {/* Draw sequential route connection */}
            {activeTab === 'route-planner' && roadGeometry.length > 0 && (
              <Polyline 
                positions={roadGeometry}
                pathOptions={{ color: '#F59E0B', weight: 4 }}
              />
            )}

            {/* Render origin kitchen */}
            {selectedKitchen && (
              <Marker position={[selectedKitchen.location.lat, selectedKitchen.location.lng]} icon={kitchenIcon}>
                <Popup>
                  <div style={{ padding: '2px', fontFamily: 'system-ui, sans-serif' }}>
                    <strong>Kitchen Origin:</strong><br/>{selectedKitchen.name}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Render explore ingredients */}
            {activeTab === 'explore' && ingredients.map((ing) => (
              <Marker 
                key={ing._id} 
                position={[ing.location.lat, ing.location.lng]} 
                icon={donorIcon}
                eventHandlers={{ click: () => setSelectedIngredient(ing) }}
              >
                <Popup>
                  <div style={{ padding: '5px', fontFamily: 'system-ui, sans-serif' }}>
                    <span style={{ fontSize: '0.62rem', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                      {ing.category}
                    </span>
                    <h4 style={{ margin: '4px 0' }}>{ing.name}</h4>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Available: {ing.quantity} {ing.unit}<br/>
                      Donor: {ing.donorRef?.name || 'Donor'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render route stop markers */}
            {activeTab === 'route-planner' && routeSequence.map((stop, idx) => (
              <Marker 
                key={stop.id} 
                position={[stop.location.lat, stop.location.lng]} 
                icon={sequenceIcon(idx + 1)}
              >
                <Popup>
                  <div style={{ padding: '4px', fontFamily: 'system-ui, sans-serif' }}>
                    <strong>Stop #{idx + 1}: {stop.donorName}</strong><br/>
                    Ingredient: {stop.name}<br/>
                    Load size: {stop.quantity} {stop.unit}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Sidebar Info Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
          
          {/* Explore Sidebar content */}
          {activeTab === 'explore' && (
            <>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Explore Proximity</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Click any marker on the map to calculate actual street routing and inspect item details.
                </p>
              </div>

              {selectedIngredient ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  <div style={{ background: 'var(--bg)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.62rem', background: '#3B82F6', color: 'white', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 800 }}>
                      {selectedIngredient.category}
                    </span>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.4rem' }}>{selectedIngredient.name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Donor: {selectedIngredient.donorRef?.name || 'N/A'}
                    </p>
                  </div>

                  <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div>Quantity: <strong>{selectedIngredient.quantity} {selectedIngredient.unit}</strong></div>
                    <div>Storage Mode: <strong>{selectedIngredient.storageType}</strong></div>
                    <div>Freshness/Expiry: <strong style={{ color: 'var(--danger)' }}>{formatDate(selectedIngredient.expiryDate)}</strong></div>
                    <div>Reputation Score: <strong style={{ color: 'var(--verified)' }}>{selectedIngredient.donorRef?.reputationScore ?? 0} pts</strong></div>
                  </div>

                  {singleDistance > 0 && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                        {routingType === 'osrm' ? 'OSRM Driving Distance' : 'Haversine Radial Distance'}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981', marginTop: '0.15rem' }}>{singleDistance.toFixed(2)} KM</div>
                      {roadDuration && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          Est. Transit: <strong>{formatDuration(roadDuration)}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)', textAlign: 'center' }}>
                  <span style={{ fontSize: '2rem' }}>📍</span>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Select an ingredient marker on the map to begin.</p>
                </div>
              )}
            </>
          )}

          {/* Route Planner Sidebar content */}
          {activeTab === 'route-planner' && (
            <>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Consolidated Multi-Stop Route</h3>
                
                {/* Select source toggle */}
                <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                  <button
                    className={`btn ${planningSource === 'basket' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '0.25rem', fontSize: '0.75rem' }}
                    onClick={() => setPlanningSource('basket')}
                  >
                    My Basket ({basketItems.length})
                  </button>
                  <button
                    className={`btn ${planningSource === 'reservations' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '0.25rem', fontSize: '0.75rem' }}
                    onClick={() => setPlanningSource('reservations')}
                  >
                    My Claims ({reservations.length})
                  </button>
                </div>
              </div>

              {routeSequence.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)', textAlign: 'center' }}>
                  <span style={{ fontSize: '2rem' }}>🗺️</span>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    {planningSource === 'basket' 
                      ? 'Add ingredients to your collection basket to map out a sequential route.' 
                      : 'No active approved reservations ready for collection.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  
                  {/* Route Summary */}
                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                      {routingType === 'osrm' ? 'OSRM Total Driving Path' : 'Optimized Haversine Path'}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.15rem' }}>
                      {(roadDistance || routeTotalDistance).toFixed(2)} KM
                    </div>
                    {roadDuration && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        Est. Route Duration: <strong>{formatDuration(roadDuration)}</strong>
                      </div>
                    )}
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                      {routeSequence.length} stops • Includes return leg
                    </div>
                  </div>

                  {planningSource === 'reservations' && (
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}
                      onClick={handleOpenMobileCompanion}
                    >
                      📱 Launch Mobile Handoff Companion
                    </button>
                  )}

                  {/* Sequential stops list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto' }}>
                    
                    {/* Kitchen Start node */}
                    <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
                        <div style={{ width: '2px', flex: 1, background: 'var(--border)' }} />
                      </div>
                      <div style={{ fontSize: '0.8rem', paddingBottom: '0.5rem' }}>
                        <strong style={{ color: '#10B981' }}>Start: Kitchen Origin</strong>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>{selectedKitchen?.name}</div>
                      </div>
                    </div>

                    {/* Sequential loop stops */}
                    {routeSequence.map((stop, idx) => (
                      <div key={stop.id} style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ 
                            width: '16px', 
                            height: '16px', 
                            borderRadius: '50%', 
                            background: '#F59E0B', 
                            color: 'black', 
                            fontSize: '9px', 
                            fontWeight: 800, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            {idx + 1}
                          </div>
                          <div style={{ width: '2px', flex: 1, background: 'var(--border)' }} />
                        </div>
                        <div style={{ fontSize: '0.8rem', paddingBottom: '0.5rem' }}>
                          <strong>Stop #{idx + 1}: {stop.donorName}</strong>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            Load: {stop.quantity} {stop.unit} of {stop.name}
                          </div>
                          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', marginTop: '0.1rem' }}>
                            Proximity leg: +{stop.distanceFromLastLeg.toFixed(2)} km
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Kitchen Return node */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
                      </div>
                      <div style={{ fontSize: '0.8rem' }}>
                        <strong style={{ color: '#10B981' }}>End: Return to Origin</strong>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>+{returnLegDistance.toFixed(1)} km return leg</div>
                      </div>
                    </div>

                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div>Compliance: <strong style={{ color: 'var(--verified)' }}>FSSAI Cold Chain Transit Code</strong></div>
                    <div>Safe Transit: <strong>Temp Controlled Box required</strong></div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

      </div>

      {/* Mobile Companion Modal */}
      {showMobileCompanion && routeSequence.length > 0 && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '1.25rem', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="modal-header" style={{ marginBottom: '1rem' }}>
              <h2 className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 800 }}>📱 Mobile Driver Companion</h2>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowMobileCompanion(false)}>✕</button>
            </div>

            {/* Stop sequence navigator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1rem', fontSize: '0.8rem' }}>
              <span>Stop <strong>{currentCompanionStopIndex + 1}</strong> of <strong>{routeSequence.length}</strong></span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button 
                  className="btn btn-secondary" 
                  disabled={currentCompanionStopIndex === 0} 
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                  onClick={() => {
                    const idx = currentCompanionStopIndex - 1;
                    setCurrentCompanionStopIndex(idx);
                    setCompanionReceivedQty(routeSequence[idx].quantity);
                    setCompanionCondition('good');
                  }}
                >
                  ◀ Prev
                </button>
                <button 
                  className="btn btn-secondary" 
                  disabled={currentCompanionStopIndex === routeSequence.length - 1} 
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                  onClick={() => {
                    const idx = currentCompanionStopIndex + 1;
                    setCurrentCompanionStopIndex(idx);
                    setCompanionReceivedQty(routeSequence[idx].quantity);
                    setCompanionCondition('good');
                  }}
                >
                  Next ▶
                </button>
              </div>
            </div>

            {/* Current Stop Details */}
            {(() => {
              const stop = routeSequence[currentCompanionStopIndex];
              const r = stop.rawReservation;
              
              return (
                <div>
                  <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--active)', fontWeight: 800 }}>Collect from:</div>
                    <strong style={{ fontSize: '1.1rem', color: 'white', display: 'block', marginTop: '0.15rem' }}>{stop.donorName}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Item: <strong>{stop.name}</strong> ({stop.quantity} {stop.unit})</span>
                    
                    {r && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div>Claim Status: <span className={`badge badge-${r.deliveryStatus}`}>{r.deliveryStatus.toUpperCase()}</span></div>
                        {r.pickupCode && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <span>🔑 Handoff Verification Code:</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--verified)', letterSpacing: '1px' }}>{r.pickupCode}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {r && r.deliveryStatus === 'pending' && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
                        * Note: Show the verification code above to the donor so they can confirm pickup on their device first.
                      </p>
                    </div>
                  )}

                  <form onSubmit={(e) => { e.preventDefault(); handleCompanionHandoff(stop, 'delivered'); }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700 }}>Confirm Quantity Received</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        min="0"
                        className="form-control" 
                        required 
                        value={companionReceivedQty} 
                        onChange={e => setCompanionReceivedQty(e.target.value)} 
                        placeholder={stop.quantity}
                      />
                      {parseFloat(companionReceivedQty) !== stop.quantity && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--attention)', marginTop: '0.25rem', fontWeight: 600 }}>
                          ⚠️ Discrepancy logged! Actual quantity differs from reserved claim of {stop.quantity} {stop.unit}.
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Condition</label>
                      <select 
                        className="form-control" 
                        value={companionCondition} 
                        onChange={e => setCompanionCondition(e.target.value)}
                      >
                        <option value="good">Good (Clean, correct temperature)</option>
                        <option value="partial">Partial Spoilage (Accept parts, log waste)</option>
                        <option value="rejected">Rejected (Spoiled / Unusable shipment)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                      {r && r.deliveryStatus === 'pending' && (
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                          onClick={() => handleCompanionHandoff(stop, 'picked_up')}
                          disabled={companionActionPending || !r.pickupConfirmedByDonor}
                        >
                          Mark Picked Up
                        </button>
                      )}
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ flex: 1.5, padding: '0.5rem', fontSize: '0.85rem' }}
                        disabled={companionActionPending}
                      >
                        {companionActionPending ? 'Saving Handoff...' : 'Confirm Delivery'}
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()}

          </div>
        </div>
      )}

    </div>
  );
}