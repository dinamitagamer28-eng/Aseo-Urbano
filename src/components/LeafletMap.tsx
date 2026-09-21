'use client';

import React, { useEffect, useState, useRef, useId } from 'react';
import dynamic from 'next/dynamic';
import {
  Layers,
  Compass,
  Crosshair,
  MapPin,
  Truck,
  Play,
  Pause,
  Navigation,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

export interface RouteWaypoint {
  lat: number;
  lng: number;
  name: string;
  street: string;
  speed: number;
  estimatedTime: string;
}

export const REAL_COLINAS_ROUTE: RouteWaypoint[] = [
  { lat: 10.3156, lng: -72.3186, name: 'Entrada Las Colinas', street: 'Av. Principal Las Colinas', speed: 24, estimatedTime: '07:00 AM' },
  { lat: 10.3168, lng: -72.3175, name: 'Calle 1 (Inicio)', street: 'Calle 1 (Av. Principal a Plaza)', speed: 18, estimatedTime: '07:30 AM' },
  { lat: 10.3182, lng: -72.3162, name: 'Plaza Las Colinas', street: 'Plaza Las Colinas (Sector Central)', speed: 14, estimatedTime: '08:00 AM' },
  { lat: 10.3196, lng: -72.3148, name: 'Calle 2 Los Pinos', street: 'Calle 2 Los Pinos (Casa 01 a 40)', speed: 19, estimatedTime: '08:30 AM' },
  { lat: 10.3207, lng: -72.3134, name: 'Calle 3 El Samán', street: 'Calle 3 El Samán (Sector Cancha)', speed: 16, estimatedTime: '09:30 AM' },
  { lat: 10.3197, lng: -72.3118, name: 'Calle 4 Las Flores', street: 'Calle 4 Las Flores', speed: 18, estimatedTime: '10:30 AM' },
  { lat: 10.3179, lng: -72.3126, name: 'Av. Intercomunal Este', street: 'Av. Intercomunal / Retorno', speed: 26, estimatedTime: '11:15 AM' },
  { lat: 10.3164, lng: -72.3144, name: 'Los Chaguaramos', street: 'Sector Los Chaguaramos', speed: 18, estimatedTime: '11:45 AM' },
  { lat: 10.3150, lng: -72.3166, name: 'CECAT Las Colinas', street: 'Los Chaguaramos CECAT', speed: 15, estimatedTime: '12:15 PM' },
  { lat: 10.3156, lng: -72.3186, name: 'Retorno Base Operativa', street: 'Av. Principal (Cierre de Circuito)', speed: 22, estimatedTime: '12:45 PM' },
];

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
  showTruckRoute?: boolean;
  simulateMovement?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
  sectoresPolygons?: any[];
  reportesMarcadores?: any[];
  onMarkerClick?: (id: any) => void;
}

function MapInternal({
  center,
  zoom,
  markers = [],
  polygons = [],
  interactive = true,
  onMapClick,
  height = '360px',
  autoFollowTruck = false,
  showControls = true,
  showTruckRoute = true,
  simulateMovement = true,
  initialCenter,
  initialZoom,
  sectoresPolygons,
  reportesMarcadores,
  onMarkerClick,
}: LeafletMapProps) {
  const finalCenter = center || initialCenter || [10.3180, -72.3150];
  const finalZoom = zoom || initialZoom || 15;
  const [L, setL] = useState<any>(null);
  const mapContainerId = useId().replace(/:/g, '');
  const mapRef = useRef<any>(null);
  const layersRef = useRef<{
    tileSatellite?: any;
    tileLabels?: any;
    tileStreets?: any;
    markerGroup?: any;
    polygonGroup?: any;
    routeGroup?: any;
    truckGroup?: any;
    userLocationGroup?: any;
  }>({});

  const [mapType, setMapType] = useState<'satellite' | 'streets'>('satellite');
  const [followingTruck, setFollowingTruck] = useState<boolean>(autoFollowTruck);
  const [locatingUser, setLocatingUser] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Simulation controls & telemetry along real street routes
  const [isSimRunning, setIsSimRunning] = useState<boolean>(simulateMovement);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState<number>(1);
  const [wpIndex, setWpIndex] = useState<number>(0);
  const [wpProgress, setWpProgress] = useState<number>(0);

  const [truckTelemetry, setTruckTelemetry] = useState({
    lat: REAL_COLINAS_ROUTE[0].lat,
    lng: REAL_COLINAS_ROUTE[0].lng,
    street: REAL_COLINAS_ROUTE[0].street,
    speed: REAL_COLINAS_ROUTE[0].speed,
    nextStop: REAL_COLINAS_ROUTE[1].name,
    progressPercent: 0,
    heading: 45,
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

    const polygonGroup = L.layerGroup().addTo(map);
    const routeGroup = L.layerGroup().addTo(map);
    const markerGroup = L.layerGroup().addTo(map);
    const truckGroup = L.layerGroup().addTo(map);
    const userLocationGroup = L.layerGroup().addTo(map);

    layersRef.current = {
      tileSatellite,
      tileLabels,
      tileStreets,
      polygonGroup,
      routeGroup,
      markerGroup,
      truckGroup,
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
      mapRef.current.flyTo(finalCenter, finalZoom, { duration: 1.0 });
    } catch (e) {}
  }, [finalCenter?.[0], finalCenter?.[1], finalZoom]);

  // Real Street Route Simulation Loop
  useEffect(() => {
    if (!isSimRunning) return;

    const intervalTime = 600 / simSpeedMultiplier;

    const timer = setInterval(() => {
      setWpProgress((prevProgress) => {
        const step = 0.08 * simSpeedMultiplier;
        const newProgress = prevProgress + step;

        if (newProgress >= 1.0) {
          // Move to next waypoint in the circuit
          setWpIndex((prevIndex) => {
            const nextIdx = (prevIndex + 1) % (REAL_COLINAS_ROUTE.length - 1);
            return nextIdx;
          });
          return 0;
        }

        return newProgress;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isSimRunning, simSpeedMultiplier]);

  // Compute interpolated truck position & update telemetry
  useEffect(() => {
    const curWp = REAL_COLINAS_ROUTE[wpIndex];
    const nextWp = REAL_COLINAS_ROUTE[(wpIndex + 1) % REAL_COLINAS_ROUTE.length];

    if (!curWp || !nextWp) return;

    // Linear interpolation
    const lat = curWp.lat + (nextWp.lat - curWp.lat) * wpProgress;
    const lng = curWp.lng + (nextWp.lng - curWp.lng) * wpProgress;

    // Heading calculation
    const dLng = (nextWp.lng - curWp.lng) * (Math.PI / 180);
    const lat1 = curWp.lat * (Math.PI / 180);
    const lat2 = nextWp.lat * (Math.PI / 180);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

    const totalSegments = REAL_COLINAS_ROUTE.length - 1;
    const totalProgressPct = Math.round(((wpIndex + wpProgress) / totalSegments) * 100);
    const speedVariation = Math.round(curWp.speed + (Math.sin(wpProgress * Math.PI) * 4));

    setTruckTelemetry({
      lat,
      lng,
      street: curWp.street,
      speed: speedVariation,
      nextStop: nextWp.name,
      progressPercent: totalProgressPct,
      heading: Math.round(bearing),
    });

    // Auto Follow Pan
    if (followingTruck && mapRef.current) {
      try {
        mapRef.current.panTo([lat, lng], { animate: true, duration: 0.6 });
      } catch (e) {}
    }
  }, [wpIndex, wpProgress, followingTruck]);

  // Draw Route Polylines and Waypoint Pins
  useEffect(() => {
    if (!L || !mapRef.current || !layersRef.current.routeGroup) return;

    const { routeGroup } = layersRef.current;
    routeGroup.clearLayers();

    if (!showTruckRoute) return;

    const latLngs = REAL_COLINAS_ROUTE.map((wp) => [wp.lat, wp.lng]);

    // 1. Glow effect outer line (Scheduled Route)
    L.polyline(latLngs, {
      color: '#f59e0b',
      weight: 8,
      opacity: 0.25,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeGroup);

    // 2. High contrast dashed route line
    L.polyline(latLngs, {
      color: '#fbbf24',
      weight: 3.5,
      opacity: 0.9,
      dashArray: '8, 8',
      lineCap: 'round',
    }).addTo(routeGroup);

    // 3. Completed Route Trail (Green)
    const completedLatLngs = REAL_COLINAS_ROUTE.slice(0, wpIndex + 1).map((wp) => [wp.lat, wp.lng]);
    completedLatLngs.push([truckTelemetry.lat, truckTelemetry.lng]);

    if (completedLatLngs.length > 1) {
      L.polyline(completedLatLngs, {
        color: '#10b981',
        weight: 4,
        opacity: 0.95,
        lineCap: 'round',
      }).addTo(routeGroup);
    }

    // 4. Numbered Stop Badges on Waypoints
    REAL_COLINAS_ROUTE.forEach((wp, idx) => {
      if (idx === REAL_COLINAS_ROUTE.length - 1) return;

      const isVisited = idx < wpIndex;
      const isNext = idx === wpIndex + 1;

      const stopIcon = L.divIcon({
        className: 'route-stop-pin',
        html: `
          <div style="
            background: ${isVisited ? '#059669' : isNext ? '#f59e0b' : '#1e293b'};
            color: white;
            font-size: 10px;
            font-weight: 900;
            width: 22px;
            height: 22px;
            border-radius: 9999px;
            border: 2px solid ${isVisited ? '#6ee7b7' : isNext ? '#fef08a' : '#94a3b8'};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
            transform: scale(${isNext ? 1.15 : 1});
            transition: transform 0.3s;
          ">
            ${idx + 1}
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker([wp.lat, wp.lng], { icon: stopIcon })
        .addTo(routeGroup)
        .bindPopup(`
          <div style="font-family: system-ui; max-width: 200px; font-size: 12px;">
            <div style="font-weight: 800; color: #f59e0b; text-transform: uppercase;">Parada #${idx + 1} • Cuadrilla</div>
            <strong style="color: #f8fafc; display: block; margin: 2px 0;">${wp.name}</strong>
            <div style="color: #94a3b8; font-size: 11px;">${wp.street}</div>
            <div style="margin-top: 4px; font-weight: 700; color: #38bdf8;">⏰ Horario Estimado: ${wp.estimatedTime}</div>
          </div>
        `);
    });
  }, [L, showTruckRoute, wpIndex, truckTelemetry.lat, truckTelemetry.lng]);

  // Render Markers and Polygons
  useEffect(() => {
    if (!L || !mapRef.current || !layersRef.current.polygonGroup || !layersRef.current.markerGroup) return;

    const { polygonGroup, markerGroup } = layersRef.current;
    polygonGroup.clearLayers();
    markerGroup.clearLayers();

    const allPolygons = [
      ...polygons,
      ...(sectoresPolygons || []).map((sp: any) => ({
        id: sp.id,
        name: sp.name || 'Sector',
        color: sp.color || '#0284c7',
        coordinates: sp.coordinates || [],
      })),
    ];

    // 1. Draw Polygons
    allPolygons.forEach((poly) => {
      if (poly.coordinates && poly.coordinates.length > 0) {
        L.polygon(poly.coordinates, {
          color: poly.color || '#38bdf8',
          fillColor: poly.color || '#0284c7',
          fillOpacity: 0.22,
          weight: 2.5,
          dashArray: '5, 8',
        })
          .addTo(polygonGroup)
          .bindPopup(`<div style="font-family: sans-serif; font-size: 12px;"><strong>Geocerca Satelital:</strong> ${poly.name}</div>`);
      }
    });

    const allMarkers: MapMarker[] = [
      ...markers,
      ...(reportesMarcadores || []).map((rm: any) => ({
        id: rm.id,
        lat: rm.lat,
        lng: rm.lng,
        title: rm.folio || rm.tipo || 'Punto',
        description: rm.descripcion || '',
        status: rm.tipo,
        type: 'property' as const,
      })),
    ];

    // 2. Add Custom Markers (excluding trucks, which are rendered dynamically in truckGroup)
    allMarkers.forEach((m) => {
      if (m.type === 'truck') return;

      let iconColor = '#0284c7';
      let iconLabel = m.title;

      if (m.type === 'incident') {
        iconColor = m.status === 'RESUELTO' ? '#10b981' : m.status === 'RECHAZADO' ? '#ef4444' : '#f59e0b';
        iconLabel = (m.status === 'RESUELTO' ? '✅ ' : m.status === 'RECHAZADO' ? '❌ ' : '⚠️ ') + m.title;
      } else if (m.type === 'property') {
        iconColor = m.status === 'SOLVENTE' || m.status === 'RESUELTO' ? '#10b981' : '#f59e0b';
        iconLabel = '🏠 ' + m.title;
      }

      const customIcon = L.divIcon({
        className: 'custom-leaflet-pin',
        html: `
          <div style="
            background: ${iconColor};
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
            cursor: pointer;
          ">
            <span>${iconLabel}</span>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([m.lat, m.lng], { icon: customIcon }).addTo(markerGroup);

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(m.id));
      }

      const popupContent = `<div style="max-width: 240px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase;">GPS Rosario de Perijá</div>
        <h4 style="margin: 2px 0 4px 0; font-size: 14px; font-weight: bold; color: #0f172a;">${m.title}</h4>
        ${m.description ? `<p style="margin: 0 0 6px 0; font-size: 12px; color: #475569;">${m.description}</p>` : ''}
        ${m.status ? `<div style="font-size: 11px; font-weight: bold; color: ${m.status === 'RESUELTO' || m.status === 'SOLVENTE' ? '#059669' : m.status === 'RECHAZADO' ? '#dc2626' : '#d97706'}; margin-bottom: 6px;">Estado: ${m.status}</div>` : ''}
        ${m.photoUrl ? `<img src="${m.photoUrl}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-top: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);" alt="Evidencia"/>` : ''}
      </div>`;

      marker.bindPopup(popupContent);
    });
  }, [L, markers, polygons, sectoresPolygons, reportesMarcadores]);

  // Render Dynamic Garbage Truck Marker
  useEffect(() => {
    if (!L || !mapRef.current || !layersRef.current.truckGroup) return;

    const { truckGroup } = layersRef.current;
    truckGroup.clearLayers();

    const truckIcon = L.divIcon({
      className: 'custom-truck-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <span style="
            position: absolute;
            width: 48px;
            height: 48px;
            background: rgba(245, 158, 11, 0.45);
            border-radius: 9999px;
            animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></span>
          <div style="
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #0f172a;
            font-weight: 900;
            font-size: 11px;
            padding: 5px 11px;
            border-radius: 9999px;
            box-shadow: 0 4px 18px rgba(0,0,0,0.7);
            border: 2px solid white;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            z-index: 10;
          ">
            <span style="font-size: 15px; display: inline-block;">🚛</span>
            <span>Camión 01 Compactador</span>
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 9999px; background: #22c55e; box-shadow: 0 0 6px #22c55e;"></span>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const liveTruckMarker = L.marker([truckTelemetry.lat, truckTelemetry.lng], { icon: truckIcon }).addTo(truckGroup);

    liveTruckMarker.bindPopup(`
      <div style="font-family: system-ui; max-width: 220px; font-size: 12px;">
        <div style="font-weight: 900; color: #f59e0b; text-transform: uppercase;">🚛 Unidad Activa de Recolección</div>
        <h4 style="margin: 3px 0; font-size: 13px; font-weight: bold; color: #f8fafc;">Camión 01 (6.5 Tn)</h4>
        <div style="background: rgba(15, 23, 42, 0.8); padding: 6px; border-radius: 8px; border: 1px solid #334155; margin: 4px 0;">
          <div><strong>Calle Actual:</strong> <span style="color: #38bdf8;">${truckTelemetry.street}</span></div>
          <div><strong>Velocidad:</strong> <span style="color: #facc15;">${truckTelemetry.speed} km/h</span></div>
          <div><strong>Próxima Parada:</strong> <span style="color: #4ade80;">${truckTelemetry.nextStop}</span></div>
          <div><strong>Avance de Ruta:</strong> <span style="color: #cbd5e1;">${truckTelemetry.progressPercent}%</span></div>
        </div>
        <div style="font-size: 10px; color: #94a3b8;">Supervisión: Roberto González • Sierra de Perijá</div>
      </div>
    `);
  }, [L, truckTelemetry.lat, truckTelemetry.lng, truckTelemetry.street, truckTelemetry.speed, truckTelemetry.nextStop, truckTelemetry.progressPercent, truckTelemetry.heading]);

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
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-slate-950 font-sans isolate z-0">
      {/* Map Container */}
      <div id={mapContainerId} style={{ height, width: '100%' }} className="z-0" />

      {/* Floating Controls Overlay (Top Right) */}
      {showControls && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 pointer-events-auto">
          {/* Layer Selector */}
          <div className="bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-xl flex text-[11px] font-bold">
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
                : 'bg-slate-950/90 text-amber-400 border-amber-500/40 hover:bg-slate-900'
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
              className="px-3 py-1.5 bg-slate-950/90 hover:bg-slate-900 text-sky-400 hover:text-sky-300 border border-sky-500/40 backdrop-blur-md rounded-xl text-xs font-bold transition shadow-xl flex items-center gap-1.5"
              title="Centrar en mi ubicación GPS actual"
            >
              <Crosshair className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin text-amber-400' : ''}`} />
              <span>{locatingUser ? 'Buscando GPS...' : '📍 Mi Ubicación'}</span>
            </button>
          )}
        </div>
      )}

      {/* Floating Real-Time Truck Telemetry HUD (Bottom Bar) */}
      <div className="absolute bottom-2 left-2 right-2 sm:left-3 sm:right-auto z-10 bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-amber-500/40 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-2.5 max-w-xl">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Truck className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <span>Camión 01 Compactador</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
            <div className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-[260px]">
              {truckTelemetry.street}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-300 font-medium w-full sm:w-auto justify-between border-t sm:border-t-0 sm:border-l border-slate-800 pt-1.5 sm:pt-0 sm:pl-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-mono font-black">{truckTelemetry.speed} km/h</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-mono font-bold">{truckTelemetry.progressPercent}% ruta</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsSimRunning(!isSimRunning)}
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
              title={isSimRunning ? 'Pausar recorrido simulado' : 'Reanudar recorrido'}
            >
              {isSimRunning ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={() => setSimSpeedMultiplier((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1))}
              className="px-1.5 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-sky-400 border border-slate-700 transition"
              title="Cambiar velocidad de simulación"
            >
              {simSpeedMultiplier}x
            </button>
          </div>
        </div>
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
