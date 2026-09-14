'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Layers, Compass, Crosshair, MapPin, Truck, AlertTriangle } from 'lucide-react';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  type?: 'truck' | 'incident' | 'property' | 'center' | 'user';
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
  autoFollowTruck?: boolean;
  showControls?: boolean;
}

function MapInternal({
  center = [10.3180, -72.3150],
  zoom = 15,
  markers = [],
  polygons = [],
  interactive = true,
  onMapClick,
  height = '350px',
  autoFollowTruck = false,
  showControls = true,
}: LeafletMapProps) {
  const [L, setL] = useState<any>(null);
  const mapContainerId = React.useId().replace(/:/g, '');
  const mapRef = useRef<any>(null);
  const layersRef = useRef<{
    tileSatellite?: any;
    tileLabels?: any;
    tileStreets?: any;
    markerGroup?: any;
    polygonGroup?: any;
    userLocationGroup?: any;
  }>({});

  const [mapType, setMapType] = useState<'satellite' | 'streets'>('satellite');
  const [followingTruck, setFollowingTruck] = useState<boolean>(autoFollowTruck);
  const [locatingUser, setLocatingUser] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Dynamic simulation coords for the truck if active
  const [truckPos, setTruckPos] = useState<{ lat: number; lng: number }>({
    lat: 10.3185,
    lng: -72.3148,
  });

  // Load Leaflet
  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!L) return;

    const container = document.getElementById(mapContainerId);
    if (!container) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerId, {
      center: center,
      zoom: zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: false,
    });

    // 1. ESRI World Imagery (High-Resolution Satellite with Mountain Reliefs of Sierra de Perijá)
    const tileSatellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: '&copy; Esri, Maxar, Earthstar Geographics, USDA, USGS | Sierra de Perijá',
      }
    );

    // 2. High Contrast Labels Overlay for Streets and Sectors
    const tileLabels = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        opacity: 0.85,
      }
    );

    // 3. OpenStreetMap Streets alternative
    const tileStreets = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors | Rosario de Perijá',
      }
    );

    // Default to Satellite HD with Labels
    tileSatellite.addTo(map);
    tileLabels.addTo(map);

    const markerGroup = L.layerGroup().addTo(map);
    const polygonGroup = L.layerGroup().addTo(map);
    const userLocationGroup = L.layerGroup().addTo(map);

    layersRef.current = {
      tileSatellite,
      tileLabels,
      tileStreets,
      markerGroup,
      polygonGroup,
      userLocationGroup,
    };

    if (onMapClick && interactive) {
      map.on('click', (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [L, mapContainerId]);

  // Handle Map Type Change
  useEffect(() => {
    if (!mapRef.current || !layersRef.current) return;
    const { tileSatellite, tileLabels, tileStreets } = layersRef.current;
    const map = mapRef.current;

    if (mapType === 'satellite') {
      if (map.hasLayer(tileStreets)) map.removeLayer(tileStreets);
      if (!map.hasLayer(tileSatellite)) tileSatellite.addTo(map);
      if (!map.hasLayer(tileLabels)) tileLabels.addTo(map);
    } else {
      if (map.hasLayer(tileSatellite)) map.removeLayer(tileSatellite);
      if (map.hasLayer(tileLabels)) map.removeLayer(tileLabels);
      if (!map.hasLayer(tileStreets)) tileStreets.addTo(map);
    }
  }, [mapType]);

  // Handle Center & Zoom Updates smoothly
  useEffect(() => {
    if (!mapRef.current) return;
    try {
      mapRef.current.flyTo(center, zoom, { duration: 1.0 });
    } catch (e) {}
  }, [center?.[0], center?.[1], zoom]);

  // Simulated truck slow movement for live visual feedback
  useEffect(() => {
    const truckMarker = markers.find((m) => m.type === 'truck');
    if (truckMarker) {
      setTruckPos({ lat: truckMarker.lat, lng: truckMarker.lng });
      return;
    }

    const interval = setInterval(() => {
      setTruckPos((prev) => {
        const offsetLat = (Math.sin(Date.now() / 6000) * 0.0003);
        const offsetLng = (Math.cos(Date.now() / 6000) * 0.0003);
        return {
          lat: 10.3182 + offsetLat,
          lng: -72.3150 + offsetLng,
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [markers]);

  // Follow Truck logic
  useEffect(() => {
    if (!followingTruck || !mapRef.current) return;
    const truckMarker = markers.find((m) => m.type === 'truck');
    const targetLat = truckMarker ? truckMarker.lat : truckPos.lat;
    const targetLng = truckMarker ? truckMarker.lng : truckPos.lng;

    try {
      mapRef.current.panTo([targetLat, targetLng], { animate: true, duration: 1.0 });
    } catch (e) {}
  }, [followingTruck, truckPos.lat, truckPos.lng, markers]);

  // Render Markers and Polygons
  useEffect(() => {
    if (!L || !mapRef.current || !layersRef.current.markerGroup || !layersRef.current.polygonGroup) return;

    const { markerGroup, polygonGroup } = layersRef.current;
    markerGroup.clearLayers();
    polygonGroup.clearLayers();

    // 1. Draw Polygons (Geocercas de Sectores con Borde Brillante)
    polygons.forEach((poly) => {
      if (poly.coordinates && poly.coordinates.length > 0) {
        L.polygon(poly.coordinates, {
          color: poly.color || '#38bdf8',
          fillColor: poly.color || '#0284c7',
          fillOpacity: 0.25,
          weight: 2.5,
          dashArray: '5, 8',
        })
          .addTo(polygonGroup)
          .bindPopup(`<div style="font-family: sans-serif; font-size: 12px;"><strong>Geocerca Satelital:</strong> ${poly.name}</div>`);
      }
    });

    // 2. Icon Creator with Satellite High Visibility
    const createCustomIcon = (type: string, color: string, label: string, status?: string) => {
      if (type === 'truck') {
        return L.divIcon({
          className: 'custom-truck-pin',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <span style="
                position: absolute;
                width: 44px;
                height: 44px;
                background: rgba(245, 158, 11, 0.4);
                border-radius: 9999px;
                animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></span>
              <div style="
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: #0f172a;
                font-weight: 900;
                font-size: 11px;
                padding: 5px 10px;
                border-radius: 9999px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.6);
                border: 2px solid white;
                display: flex;
                align-items: center;
                gap: 5px;
                white-space: nowrap;
                z-index: 10;
              ">
                <span style="font-size: 14px;">🚛</span>
                <span>${label}</span>
                <span style="display: inline-block; width: 7px; height: 7px; border-radius: 9999px; background: #22c55e;"></span>
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      }

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
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
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

    // 3. Add Custom Markers
    let hasTruckMarker = false;
    markers.forEach((m) => {
      let iconColor = '#0284c7';
      let iconLabel = m.title;

      if (m.type === 'truck') {
        hasTruckMarker = true;
        iconColor = '#f59e0b';
        iconLabel = m.title;
      } else if (m.type === 'incident') {
        iconColor = m.status === 'RESUELTO' ? '#10b981' : m.status === 'RECHAZADO' ? '#ef4444' : '#f59e0b';
        iconLabel = (m.status === 'RESUELTO' ? '✅ ' : m.status === 'RECHAZADO' ? '❌ ' : '⚠️ ') + m.title;
      } else if (m.type === 'property') {
        iconColor = '#6366f1';
        iconLabel = '🏠 ' + m.title;
      }

      const marker = L.marker([m.lat, m.lng], {
        icon: createCustomIcon(m.type || 'property', iconColor, iconLabel, m.status),
      }).addTo(markerGroup);

      const popupContent = `<div style="max-width: 240px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase;">GPS Rosario de Perijá</div>
        <h4 style="margin: 2px 0 4px 0; font-size: 14px; font-weight: bold; color: #0f172a;">${m.title}</h4>
        ${m.description ? `<p style="margin: 0 0 6px 0; font-size: 12px; color: #475569;">${m.description}</p>` : ''}
        ${m.status ? `<div style="font-size: 11px; font-weight: bold; color: ${m.status === 'RESUELTO' ? '#059669' : m.status === 'RECHAZADO' ? '#dc2626' : '#d97706'}; margin-bottom: 6px;">Estado: ${m.status}</div>` : ''}
        ${m.photoUrl ? `<img src="${m.photoUrl}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-top: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);" alt="Evidencia"/>` : ''}
      </div>`;

      marker.bindPopup(popupContent);
    });

    // If autoFollow is enabled and no explicit truck marker passed, add simulated active truck
    if (!hasTruckMarker && autoFollowTruck) {
      const liveTruck = L.marker([truckPos.lat, truckPos.lng], {
        icon: createCustomIcon('truck', '#f59e0b', 'Camión 01 Compactador (En Ruta)', 'EN_CURSO'),
      }).addTo(markerGroup);

      liveTruck.bindPopup(`<div style="font-family: system-ui; max-width: 200px;">
        <strong style="color: #d97706;">🚛 Camión 01 de Aseo</strong>
        <p style="font-size: 11px; margin: 4px 0; color: #334155;">Operativo en Sector Las Colinas • Sierra de Perijá</p>
      </div>`);
    }
  }, [L, markers, polygons, truckPos.lat, truckPos.lng, autoFollowTruck]);

  // Geolocation trigger
  const handleGeoLocateMe = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setUserLocation([userLat, userLng]);
        setLocatingUser(false);

        if (mapRef.current && L) {
          mapRef.current.flyTo([userLat, userLng], 17, { duration: 1.2 });

          if (layersRef.current.userLocationGroup) {
            layersRef.current.userLocationGroup.clearLayers();
            const userIcon = L.divIcon({
              className: 'user-gps-pulse',
              html: `
                <div style="position: relative; display: flex; align-items: center; justify-content: center;">
                  <span style="position: absolute; width: 36px; height: 36px; background: rgba(14, 165, 233, 0.5); border-radius: 9999px; animation: ping 1.5s infinite;"></span>
                  <div style="background: #0284c7; width: 18px; height: 18px; border-radius: 9999px; border: 3px solid white; box-shadow: 0 0 10px rgba(2,132,199,0.8);"></div>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });

            L.marker([userLat, userLng], { icon: userIcon })
              .addTo(layersRef.current.userLocationGroup)
              .bindPopup('<strong>📍 Tu Ubicación Actual</strong><br/>Detectada por GPS')
              .openPopup();
          }
        }

        if (onMapClick) {
          onMapClick(userLat, userLng);
        }
      },
      (err) => {
        console.warn('GPS Error:', err);
        // Fallback with lower accuracy
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;
            setUserLocation([userLat, userLng]);
            setLocatingUser(false);
            if (mapRef.current) mapRef.current.flyTo([userLat, userLng], 17);
            if (onMapClick) onMapClick(userLat, userLng);
          },
          () => {
            setLocatingUser(false);
            alert('No se pudo obtener la ubicación GPS precisa. Por favor activa los permisos de ubicación en tu navegador.');
          },
          { enableHighAccuracy: false, timeout: 20000 }
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl">
      {/* Map Container */}
      <div id={mapContainerId} style={{ height, width: '100%' }} className="z-0" />

      {/* Floating Controls Overlay */}
      {showControls && (
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2 pointer-events-auto">
          {/* Layer Selector */}
          <div className="bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-xl flex text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                mapType === 'satellite'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Vista Satelital HD con Relieves de la Sierra de Perijá"
            >
              <span>🛰️ Satelital (Perijá)</span>
            </button>
            <button
              type="button"
              onClick={() => setMapType('streets')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                mapType === 'streets'
                  ? 'bg-sky-600 text-white shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Vista Vectorial de Calles"
            >
              <span>🗺️ Calles</span>
            </button>
          </div>

          {/* Follow Truck Toggle */}
          <button
            type="button"
            onClick={() => setFollowingTruck(!followingTruck)}
            className={`px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-bold transition-all shadow-xl flex items-center gap-1.5 ${
              followingTruck
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black ring-2 ring-amber-500/40'
                : 'bg-slate-950/85 text-amber-400 border-amber-500/40 hover:bg-slate-900'
            }`}
          >
            <Truck className={`w-3.5 h-3.5 ${followingTruck ? 'animate-bounce' : ''}`} />
            <span>{followingTruck ? '✓ Siguiendo Camión' : '🛰️ Seguir Camión'}</span>
          </button>

          {/* Direct Locate Me GPS Button */}
          {interactive && (
            <button
              type="button"
              onClick={handleGeoLocateMe}
              disabled={locatingUser}
              className="px-3 py-1.5 bg-slate-950/85 hover:bg-slate-900 text-sky-400 hover:text-sky-300 border border-sky-500/40 backdrop-blur-md rounded-xl text-xs font-bold transition shadow-xl flex items-center gap-1.5"
              title="Centrar en mi ubicación GPS actual"
            >
              <Crosshair className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin text-amber-400' : ''}`} />
              <span>{locatingUser ? 'Buscando GPS...' : '📍 Mi Ubicación'}</span>
            </button>
          )}
        </div>
      )}

      {/* Sierra de Perijá Topography Watermark Badge */}
      <div className="absolute bottom-2 left-3 z-[400] bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-700/60 text-[10px] text-slate-300 font-medium flex items-center gap-1.5 shadow-md">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Relieve Satelital: <strong>Sierra de Rosario de Perijá</strong></span>
      </div>
    </div>
  );
}

// Export dynamic with ssr disabled
export default dynamic(() => Promise.resolve(MapInternal), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 bg-slate-900 animate-pulse rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs border border-slate-800 space-y-2">
      <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      <span>Cargando mapa satelital con relieves de Perijá...</span>
    </div>
  ),
});
