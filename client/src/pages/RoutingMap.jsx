import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE_URL } from '../config/api';
import { Navigation, MapPin, X, Clock, Package, Star, Search, ExternalLink } from 'lucide-react';

// Clean community map pin icons
const kitchenMapPin = L.divIcon({
  className: 'custom-map-pin',
  html: `<div class="map-pin-kitchen" title="Soup Kitchen Facility"><span style="font-size:12px;line-height:1;">🍲</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16]
});

const getFoodMapPin = (isActive) => L.divIcon({
  className: 'custom-map-pin',
  html: `<div class="map-pin-food ${isActive ? 'active' : ''}" title="Surplus Food Listing"><span style="font-size:11px;line-height:1;">🥕</span></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14]
});

// Helper to slightly offset markers if multiple listings share identical coordinates
function getMarkerPosition(ing, index, allIngredients) {
  if (!ing?.location?.lat || !ing?.location?.lng) return [11.5034, 77.2444];
  if (!Array.isArray(allIngredients)) return [ing.location.lat, ing.location.lng];
  
  const duplicatesBefore = allIngredients.slice(0, index).filter(
    other => Math.abs(other?.location?.lat - ing.location.lat) < 0.0001 &&
             Math.abs(other?.location?.lng - ing.location.lng) < 0.0001
  ).length;

  if (duplicatesBefore > 0) {
    const angle = duplicatesBefore * 1.2;
    const radius = 0.0008 * Math.ceil(duplicatesBefore / 2);
    return [
      ing.location.lat + radius * Math.cos(angle),
      ing.location.lng + radius * Math.sin(angle)
    ];
  }
  return [ing.location.lat, ing.location.lng];
}

// Map controller for auto-fit bounds
function MapController({ selectedKitchen, selectedIngredient, ingredients }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !map._container || !map._mapPane) return;
    const bounds = [];
    if (selectedKitchen && selectedIngredient) {
      if (selectedKitchen?.location?.lat && selectedKitchen?.location?.lng &&
          selectedIngredient?.location?.lat && selectedIngredient?.location?.lng) {
        bounds.push([selectedKitchen.location.lat, selectedKitchen.location.lng]);
        bounds.push([selectedIngredient.location.lat, selectedIngredient.location.lng]);
      }
    } else {
      if (selectedKitchen?.location?.lat && selectedKitchen?.location?.lng) {
        bounds.push([selectedKitchen.location.lat, selectedKitchen.location.lng]);
      }
      if (Array.isArray(ingredients)) {
        ingredients.forEach((ing) => {
          if (ing?.location?.lat && ing?.location?.lng) {
            bounds.push([ing.location.lat, ing.location.lng]);
          }
        });
      }
    }
    if (bounds.length > 0) {
      try { map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true, duration: 0.5 }); }
      catch (err) { /* ignore unmounted container errors */ }
    }
  }, [map, selectedKitchen, selectedIngredient, ingredients]);
  return null;
}

// Haversine distance (km)
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Rough travel time estimate (city average ~25 km/h)
function getTravelTime(km) {
  const minutes = Math.round((km / 25) * 60);
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

export default function RoutingMap({ user }) {
  const [ingredients, setIngredients] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [selectedKitchen, setSelectedKitchen] = useState(null);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchIngredients = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/kitchen/ingredients`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setIngredients(data);
      } catch { setError('Failed to fetch ingredients.'); }
      finally { setLoading(false); }
    };

    const fetchKitchens = async () => {
      if (!isAdmin) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/kitchens`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) { setKitchens(data); if (data.length > 0) setSelectedKitchen(data[0]); }
      } catch { setError('Failed to fetch kitchens.'); }
    };

    fetchIngredients();
    if (isAdmin) {
      fetchKitchens();
    } else if (user) {
      setSelectedKitchen({ _id: user.id, name: user.name, location: user.location });
    }
  }, [isAdmin, token, user]);

  // Scroll active drawer item into view
  useEffect(() => {
    if (selectedIngredient) {
      const el = document.getElementById(`drawer-item-${selectedIngredient._id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIngredient]);

  const filteredIngredients = ingredients.filter(ing => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ing.name?.toLowerCase().includes(q) ||
      ing.category?.toLowerCase().includes(q) ||
      ing.donorRef?.name?.toLowerCase().includes(q)
    );
  });

  let distance = 0, midLat = 0, midLng = 0, labelIcon = null;

  if (selectedKitchen && selectedIngredient) {
    const { lat: slat, lng: slng } = selectedKitchen.location;
    const { lat: elat, lng: elng } = selectedIngredient.location;
    distance = getHaversineDistance(slat, slng, elat, elng);
    midLat = (slat + elat) / 2;
    midLng = (slng + elng) / 2;
    labelIcon = L.divIcon({
      className: 'distance-label-wrapper',
      html: `<div style="background:#FFFFFF;color:#15803D;border:1.5px solid #16A34A;border-radius:20px;padding:3px 10px;font-weight:800;font-size:11px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.12);">${distance.toFixed(2)} km</div>`,
      iconSize: [80, 24],
      iconAnchor: [40, 12]
    });
  }

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 145px)', minHeight: '520px', padding: '1.25rem 2rem' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="dashboard-title" style={{ fontSize: '1.55rem', margin: 0 }}>Community Pickup &amp; Routing Map</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: '0.45rem 0.9rem', borderRadius: '10px', fontSize: '0.77rem', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary-600)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary-500)', display: 'inline-block' }}></span> Soup Kitchen
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-amber)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-amber)', display: 'inline-block' }}></span> Surplus Food
            </span>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Split-Screen Layout */}
      <div className="map-split-layout">
        
        {/* Left: Drawer with ingredient list */}
        <div className="map-drawer">
          <div className="map-drawer-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Surplus Food</h3>
              <span className="chip chip-cyan" style={{ fontSize: '0.75rem' }}>
                {filteredIngredients.length} {filteredIngredients.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Quick search input */}
            <div style={{ position: 'relative', marginBottom: isAdmin && kitchens.length > 0 ? '0.65rem' : '0' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search food or donor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '30px', paddingRight: searchQuery ? '28px' : '10px', fontSize: '0.78rem', height: '32px', borderRadius: '8px' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            
            {/* Admin kitchen selector */}
            {isAdmin && kitchens.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.4rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Route to:</span>
                <select
                  className="form-control"
                  style={{ flex: 1, padding: '0.2rem 0.4rem', fontSize: '0.8rem', height: 'auto' }}
                  value={selectedKitchen?._id || ''}
                  onChange={(e) => {
                    const kit = kitchens.find(k => k._id === e.target.value);
                    setSelectedKitchen(kit);
                    setSelectedIngredient(null);
                  }}
                >
                  {kitchens.map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="map-drawer-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton-card" style={{ height: '90px', borderRadius: '10px' }}></div>
                ))}
              </div>
            ) : filteredIngredients.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <Package className="empty-state-icon" style={{ opacity: 0.5 }} size={32} />
                <h4 className="empty-state-title" style={{ fontSize: '0.95rem', marginTop: '0.75rem' }}>
                  {searchQuery ? 'No matching items' : 'No surplus available'}
                </h4>
                <p className="empty-state-desc" style={{ fontSize: '0.8rem' }}>
                  {searchQuery ? 'Try adjusting your search query' : 'Check back later for new items.'}
                </p>
              </div>
            ) : (
              filteredIngredients.map(ing => {
                const isActive = selectedIngredient?._id === ing._id;
                let dist = 0, timeStr = '';
                if (selectedKitchen) {
                   dist = getHaversineDistance(selectedKitchen.location.lat, selectedKitchen.location.lng, ing.location.lat, ing.location.lng);
                   timeStr = getTravelTime(dist);
                }
                
                return (
                  <div 
                    key={ing._id}
                    id={`drawer-item-${ing._id}`}
                    className={`map-drawer-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedIngredient(ing)}
                    style={{ 
                      padding: '0.85rem', 
                      borderRadius: '10px', 
                      background: isActive ? 'var(--surface-active)' : 'var(--bg-surface)', 
                      border: `1px solid ${isActive ? 'var(--accent-green)' : 'var(--border-default)'}`,
                      borderLeft: isActive ? '4px solid var(--accent-green)' : '1px solid var(--border-default)',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      marginBottom: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{ing.name}</strong>
                      <span className="chip chip-neutral" style={{ fontSize: '0.65rem' }}>{ing.category || 'Food'}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Package size={11} /> {ing.quantity} {ing.unit}
                      </span>
                      {selectedKitchen && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                            <MapPin size={11}/> {dist.toFixed(2)} km
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-amber)', fontWeight: 600 }}>
                            <Clock size={11}/> {timeStr}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Donor: {ing.donorRef?.name || 'Local Donor'}</span>
                      {ing.donorRef?.reputationScore != null && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-green)' }}>
                          <Star size={10} /> {ing.donorRef.reputationScore} pt
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Map canvas */}
        <div className="map-canvas glass-panel" style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: '14px' }}>
          
          {/* Loading overlay */}
          {loading && (
            <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-color)', padding: '8px 14px', borderRadius: '8px', fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              Loading map data…
            </div>
          )}

          {/* ── Route Summary Card ── */}
          {selectedIngredient && selectedKitchen && (
            <div className="route-summary-card">
              {/* Title row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Navigation size={10} /> Active Route
                  </span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem', lineHeight: 1.3 }}>
                    {selectedIngredient.name}
                  </h4>
                </div>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  onClick={() => setSelectedIngredient(null)}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Distance + Travel Time chips */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.85rem' }}>
                <div style={{ background: 'var(--surface-info)', border: '1px solid var(--accent-cyan-border)', borderRadius: '8px', padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                    <MapPin size={9} /> Distance
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                    {distance.toFixed(2)} km
                  </div>
                </div>
                <div style={{ background: 'var(--surface-warning)', border: '1px solid var(--accent-amber-border)', borderRadius: '8px', padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                    <Clock size={9} /> Est. Travel
                  </span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.15rem' }}>
                    {getTravelTime(distance)}
                  </div>
                </div>
              </div>

              {/* Ingredient info */}
              <div style={{ fontSize: '0.81rem', color: 'var(--text-secondary)', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Package size={11} /> Available:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.quantity} {selectedIngredient.unit}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Star size={11} /> Donor Trust:</span>
                  <strong style={{ color: 'var(--primary-600)' }}>{selectedIngredient.donorRef?.reputationScore ?? 0} pts</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Donor:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedIngredient.donorRef?.name || 'Local Donor'}</strong>
                </div>
              </div>

              {/* External Google Maps Navigation Link */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${selectedKitchen.location.lat},${selectedKitchen.location.lng}&destination=${selectedIngredient.location.lat},${selectedIngredient.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  marginTop: '0.85rem',
                  width: '100%',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  padding: '0.55rem'
                }}
              >
                <ExternalLink size={13} />
                Open Directions in Google Maps
              </a>
            </div>
          )}

          {/* Hint when no ingredient selected */}
          {!selectedIngredient && !loading && (
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'var(--bg-surface-glass)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-default)', padding: '0.6rem 1.2rem', borderRadius: '9999px', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap', boxShadow: 'var(--shadow-md)' }}>
              Select an item from the list to route
            </div>
          )}

          {/* Leaflet map */}
          <MapContainer center={[11.5034, 77.2444]} zoom={13} style={{ width: '100%', height: '100%', minHeight: '500px', zIndex: 1 }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController selectedKitchen={selectedKitchen} selectedIngredient={selectedIngredient} ingredients={ingredients} />

            {/* Route polyline + midpoint label */}
            {selectedKitchen && selectedIngredient && (
              <>
                <Polyline
                  positions={[
                    [selectedKitchen.location.lat, selectedKitchen.location.lng],
                    [selectedIngredient.location.lat, selectedIngredient.location.lng]
                  ]}
                  pathOptions={{
                    color: '#10B981',
                    weight: 4,
                    dashArray: '8, 10',
                    opacity: 0.95,
                    className: 'animated-route-polyline'
                  }}
                />
                <Marker position={[midLat, midLng]} icon={labelIcon} />
              </>
            )}

            {/* Kitchen marker */}
            {selectedKitchen && (
              <Marker position={[selectedKitchen.location.lat, selectedKitchen.location.lng]} icon={kitchenMapPin}>
                <Popup>
                  <div style={{ fontFamily: 'var(--font-sans)', padding: '4px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-green)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      🍲 Soup Kitchen
                    </div>
                    <div style={{ fontWeight: 800, marginTop: '2px', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedKitchen.name}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Ingredient markers */}
            {ingredients.map((ing, idx) => (
              <Marker
                key={ing._id}
                position={getMarkerPosition(ing, idx, ingredients)}
                icon={getFoodMapPin(selectedIngredient?._id === ing._id)}
                eventHandlers={{ click: () => setSelectedIngredient(ing) }}
              >
                <Popup>
                  <div style={{ fontFamily: 'var(--font-sans)', padding: '4px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-amber)', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      Surplus Food
                    </div>
                    <h4 style={{ margin: '2px 0 4px', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 800 }}>{ing.name}</h4>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Available: <strong style={{ color: 'var(--text-primary)' }}>{ing.quantity} {ing.unit}</strong><br />
                      Donor Trust: <strong style={{ color: 'var(--accent-green)' }}>⭐ {ing.donorRef?.reputationScore ?? 0} pts</strong>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}