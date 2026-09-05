import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix Leaflet default marker icon path resolution in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
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
      draggable: !readOnly
    }).addTo(map);
    
    if (markerLabel) {
      marker.bindPopup(markerLabel).openPopup();
    }
    markerRef.current = marker;

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
        try {
          mapRef.current.off();
          mapRef.current.remove();
        } catch (err) {
          // Graceful cleanup
        }
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
    <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
  );
}
