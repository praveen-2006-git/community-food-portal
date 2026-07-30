import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix Leaflet default marker icon path resolution in bundlers
const customIcon = L.divIcon({
  className: 'custom-map-pin-selection',
  html: `<div style="background-color: #2563EB; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 3px #2563EB; margin: 5px;"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

export default function LeafletMap({ lat, lng, onChange, readOnly = false, markerLabel = "Selected Location" }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Use Sathyamangalam coordinates as default center (11.5034, 77.2444)
    const initialLat = lat || 11.5034;
    const initialLng = lng || 77.2444;

    // Create Map
    const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);
    mapRef.current = map;

    // Load OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Create Marker
    const marker = L.marker([initialLat, initialLng], {
      draggable: !readOnly,
      keyboard: !readOnly,
      icon: customIcon
    }).addTo(map);
    
    if (markerLabel) {
      marker.bindPopup(markerLabel).openPopup();
    }
    markerRef.current = marker;

    // Attach keyboard event handler to marker element for custom navigation
    const markerEl = marker.getElement();
    if (!readOnly && markerEl) {
      markerEl.setAttribute('tabindex', '0');
      markerEl.setAttribute('role', 'button');
      markerEl.setAttribute('aria-label', `${markerLabel || 'Selected Location'} pin. Press arrow keys to adjust marker position.`);
      
      markerEl.addEventListener('keydown', (e) => {
        const { lat: currLat, lng: currLng } = marker.getLatLng();
        let step = 0.0005; // precise movement delta
        if (e.shiftKey) step = 0.0025; // larger jumps
        
        let moved = false;
        let newLat = currLat;
        let newLng = currLng;

        if (e.key === 'ArrowUp') {
          newLat += step;
          moved = true;
        } else if (e.key === 'ArrowDown') {
          newLat -= step;
          moved = true;
        } else if (e.key === 'ArrowLeft') {
          newLng -= step;
          moved = true;
        } else if (e.key === 'ArrowRight') {
          newLng += step;
          moved = true;
        }

        if (moved) {
          e.preventDefault();
          marker.setLatLng([newLat, newLng]);
          if (onChange) {
            onChange(parseFloat(newLat.toFixed(6)), parseFloat(newLng.toFixed(6)));
          }
        }
      });
    }

    // Handle marker drag event (if not readOnly)
    if (!readOnly) {
      marker.on('dragend', () => {
        const { lat: newLat, lng: newLng } = marker.getLatLng();
        if (onChange) {
          onChange(parseFloat(newLat.toFixed(6)), parseFloat(newLng.toFixed(6)));
        }
      });

      // Handle map click event to move marker
      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        if (onChange) {
          onChange(parseFloat(clickLat.toFixed(6)), parseFloat(clickLng.toFixed(6)));
        }
      });
    }

    // Clean up map instance on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map view and marker position when lat/lng changes from external input
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    
    const currentLat = lat || 11.5034;
    const currentLng = lng || 77.2444;

    const markerLatLng = markerRef.current.getLatLng();
    if (markerLatLng.lat !== currentLat || markerLatLng.lng !== currentLng) {
      markerRef.current.setLatLng([currentLat, currentLng]);
      mapRef.current.panTo([currentLat, currentLng]);
    }
  }, [lat, lng]);

  return (
    <div 
      ref={mapContainerRef} 
      tabIndex={0} 
      aria-label="Interactive map. Focus pin to move marker with arrow keys." 
      className="leaflet-map-container"
      style={{ width: '100%', height: '100%', outline: 'none' }} 
    />
  );
}
