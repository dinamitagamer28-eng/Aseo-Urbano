'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  type?: 'truck' | 'incident' | 'property' | 'center';
  status?: string;
  photoUrl?: string;
}

export interface MapPolygon {
  id: string;
  coordinates: [number, number][]; // [lat, lng]
  name: string;
  color?: string;
}

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  polygons?: MapPolygon[];
  interactive?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
}

// Subcomponent that only loads on the client
function MapInternal({
  center = [10.3180, -72.3150],
  zoom = 15,
  markers = [],
  polygons = [],
  interactive = true,
  onMapClick,
  height = '350px',
}: LeafletMapProps) {
  const [L, setL] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const mapContainerId = React.useId().replace(/:/g, '');

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  useEffect(() => {
    if (!L) return;

    // Check if map already exists
    const container = document.getElementById(mapContainerId);
    if (!container) return;

    // Initialize map
    const map = L.map(mapContainerId, {
      center: center,
      zoom: zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: false,
    });

    // Add OpenStreetMap tile layer (100% Free & Open Source)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors | Municipio Rosario de Perijá',
    }).addTo(map);

    // Custom Icon Creators
    const createCustomIcon = (color: string, label: string) => {
      return L.divIcon({
        className: 'custom-leaflet-pin',
        html: `
          <div style="
            background: ${color};
            color: white;
            font-weight: bold;
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 9999px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 2px solid white;
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            <span>${label}</span>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
    };

    // Draw Polygons (Geocercas)
    polygons.forEach((poly) => {
      if (poly.coordinates && poly.coordinates.length > 0) {
        L.polygon(poly.coordinates, {
          color: poly.color || '#0284c7',
          fillColor: poly.color || '#0284c7',
          fillOpacity: 0.15,
          weight: 2,
          dashArray: '4, 6',
        })
          .addTo(map)
          .bindPopup(`<strong>Geocerca:</strong> ${poly.name}`);
      }
    });

    // Add Markers
    markers.forEach((m) => {
      let iconColor = '#0284c7';
      let iconLabel = '📍';

      if (m.type === 'truck') {
        iconColor = '#f59e0b';
        iconLabel = '🚛 ' + m.title;
      } else if (m.type === 'incident') {
        iconColor = m.status === 'RESUELTO' ? '#10b981' : '#ef4444';
        iconLabel = (m.status === 'RESUELTO' ? '✅ ' : '⚠️ ') + m.title;
      } else if (m.type === 'property') {
        iconColor = '#6366f1';
        iconLabel = '🏠 ' + m.title;
      }

      const marker = L.marker([m.lat, m.lng], {
        icon: createCustomIcon(iconColor, iconLabel),
      }).addTo(map);

      let popupContent = `<div style="max-width: 220px; font-family: sans-serif;">
        <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #0f172a;">${m.title}</h4>
        ${m.description ? `<p style="margin: 0 0 6px 0; font-size: 12px; color: #475569;">${m.description}</p>` : ''}
        ${m.status ? `<div style="font-size: 11px; font-weight: bold; color: ${m.status === 'RESUELTO' ? '#059669' : '#dc2626'}; margin-bottom: 6px;">Estado: ${m.status}</div>` : ''}
        ${m.photoUrl ? `<img src="${m.photoUrl}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px; margin-top: 4px;" alt="Evidencia"/>` : ''}
      </div>`;

      marker.bindPopup(popupContent);
    });

    // Handle clicks if interactive
    if (onMapClick) {
      map.on('click', (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    setMapInstance(map);

    return () => {
      map.remove();
    };
  }, [L, mapContainerId]);

  return (
    <div
      id={mapContainerId}
      style={{ height, width: '100%' }}
      className="shadow-inner relative z-10 border border-slate-700/50"
    />
  );
}

// Export dynamic with ssr disabled
export default dynamic(() => Promise.resolve(MapInternal), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 bg-slate-800 animate-pulse rounded-xl flex items-center justify-center text-slate-400 text-sm">
      <span>Cargando mapa cartográfico de Rosario de Perijá...</span>
    </div>
  ),
});
