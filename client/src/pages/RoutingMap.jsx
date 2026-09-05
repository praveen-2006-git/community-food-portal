import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE_URL } from '../config/api';

// Fix default marker asset resolution issue
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Map Controller for dynamic panning and framing
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
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: false });
      } catch (err) {
        // Gracefully ignore zoom transition on unmounted container
      }
    }
  }, [map, selectedKitchen, selectedIngredient, ingredients]);
  
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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  
  const token = localStorage.getItem('token');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchIngredients = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/kitchen/ingredients`, {
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
        const res = await fetch(`${API_BASE_URL}/api/admin/kitchens`, {
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
  }, [isAdmin, token, user]);

  let distance = 0;
  let midLat = 0;
  let midLng = 0;
  let labelIcon = null;

  if (selectedKitchen && selectedIngredient) {
    const startLat = selectedKitchen.location.lat;
    const startLng = selectedKitchen.location.lng;
    const endLat = selectedIngredient.location.lat;
    const endLng = selectedIngredient.location.lng;
    
    distance = getHaversineDistance(startLat, startLng, endLat, endLng);
    midLat = (startLat + endLat) / 2;
    midLng = (startLng + endLng) / 2;
    
    labelIcon = L.divIcon({
      className: 'distance-label-wrapper',
      html: `<div style="background: #1e293b; color: #60a5fa; border: 2px solid #3b82f6; border-radius: 20px; padding: 4px 10px; font-weight: 700; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.4);">${distance.toFixed(2)} km</div>`,
      iconSize: [80, 24],
      iconAnchor: [40, 12]
    });
  }

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 90px)', padding: '1rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ fontSize: '1.5rem' }}>Pickup Route Support</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Straight-line Haversine distance routing support visualization
          </p>
        </div>
        {isAdmin && kitchens.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Select origin Kitchen:</span>
            <select 
              className="form-control" 
              style={{ width: '220px', padding: '0.35rem 0.5rem', fontSize: '0.9rem' }}
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
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="glass-panel" style={{ flex: 1, width: '100%', position: 'relative', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: 'rgba(11,15,25,0.85)', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', color: 'white' }}>
            Loading map data...
          </div>
        )}
<MapContainer center={[11.5034, 77.2444]} zoom={13} style={{ width: '100%', height: '70vh', minHeight: '500px', zIndex: 1 }}>
            <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController 
            selectedKitchen={selectedKitchen} 
            selectedIngredient={selectedIngredient} 
            ingredients={ingredients} 
          />
          
          {selectedKitchen && selectedIngredient && (
            <>
              <Polyline 
                positions={[
                  [selectedKitchen.location.lat, selectedKitchen.location.lng],
                  [selectedIngredient.location.lat, selectedIngredient.location.lng]
                ]}
                pathOptions={{ color: '#3b82f6', weight: 4, dashArray: '5, 10' }}
              />
              <Marker position={[midLat, midLng]} icon={labelIcon} />
            </>
          )}

          {selectedKitchen && (
            <Marker position={[selectedKitchen.location.lat, selectedKitchen.location.lng]} icon={greenIcon}>
              <Popup><strong>Soup Kitchen:</strong><br/>{selectedKitchen.name}</Popup>
            </Marker>
          )}

          {ingredients.map((ing) => (
            <Marker 
              key={ing._id} 
              position={[ing.location.lat, ing.location.lng]} 
              icon={redIcon}
              eventHandlers={{ click: () => setSelectedIngredient(ing) }}
            >
              <Popup>
                <div style={{ padding: '5px', fontFamily: 'system-ui, sans-serif' }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>{ing.name}</h4>
                  <div style={{ fontSize: '11px', color: '#475569' }}>
                    Available: {ing.quantity} {ing.unit}<br/>
                    Reputation: {ing.donorRef?.reputationScore ?? 0} pts
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}