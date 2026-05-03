"use client";
import mapboxgl from "mapbox-gl";
import React, { useMemo, useRef, useState, useEffect } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import type { MapRef, LayerProps } from "react-map-gl/mapbox";
import type { FeatureCollection } from "geojson";
import Supercluster from "supercluster";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { Layers, MapPin, Plus, Minus, Bed, Utensils, Camera, Fuel, Gamepad2 } from "lucide-react";

interface Coordinate {
  lat: number;
  lng: number;
  place: string;
  category?: "hotel" | "restaurant" | "attraction" | "entertainment" | "gas_station" | "user" | "target";
}

interface MapProps {
  locations: Coordinate[];
  activeLocation?: Coordinate | null;
  routeGeoJSON?: FeatureCollection | null;
  userLocation?: { lat: number; lng: number } | null;
  navFocusPoint?: { lat: number; lng: number } | null;
  targetPoint?: { lat: number; lng: number } | null;
  isNavigating?: boolean;
  isSearching?: boolean; // triggers radar wave animation
}

const MAP_STYLE_URLS = [
  { id: "streets",   urlKey: "streets"   as const, url: "mapbox://styles/mapbox/streets-v12" },
  { id: "dark",      urlKey: "dark"      as const, url: "mapbox://styles/mapbox/dark-v11" },
  { id: "satellite", urlKey: "satellite" as const, url: "mapbox://styles/mapbox/satellite-streets-v12" },
];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

function getBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180)
          - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Color scale for cluster bubble (indigo → amber → orange → rose)
function clusterColor(count: number) {
  if (count >= 20) return { bg: "bg-rose-500",   ring: "ring-rose-400/30",   text: "text-white" };
  if (count >= 10) return { bg: "bg-orange-500", ring: "ring-orange-400/30", text: "text-white" };
  if (count >= 5)  return { bg: "bg-amber-500",  ring: "ring-amber-400/30",  text: "text-slate-900" };
  return             { bg: "bg-indigo-500",  ring: "ring-indigo-400/30",  text: "text-white" };
}

function getCatStyle(category?: string) {
  switch (category) {
    case "hotel":         return { bg: "bg-purple-600", Icon: Bed };
    case "restaurant":    return { bg: "bg-orange-500", Icon: Utensils };
    case "entertainment": return { bg: "bg-sky-500",    Icon: Gamepad2 };
    case "gas_station":   return { bg: "bg-amber-500",  Icon: Fuel };
    default:              return { bg: "bg-rose-600",   Icon: Camera };
  }
}

const routeGlowLayer:    LayerProps = { id: "route-glow",    type: "line", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#818cf8", "line-width": 18, "line-opacity": 0.25, "line-blur": 8 } };
const routeOutlineLayer: LayerProps = { id: "route-outline", type: "line", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#ffffff", "line-width": 11, "line-opacity": 0.6 } };
const routeLineLayer:    LayerProps = { id: "route-line",    type: "line", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#6366f1", "line-width": 7,  "line-opacity": 1.0 } };

export default function MapComponent({
  locations, activeLocation, routeGeoJSON,
  userLocation, navFocusPoint, targetPoint,
  isNavigating = false, isSearching = false,
}: MapProps) {
  const mapRef = useRef<MapRef>(null);
  const { lang, t } = useLang();
  const ml = t.map;

  const [styleIdx, setStyleIdx] = useState(0);
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const [viewState, setViewState] = useState({
    latitude: 16.0544, longitude: 108.2022, zoom: 12, pitch: 0, bearing: 0,
  });
  const [userDistance, setUserDistance] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [radarActive, setRadarActive] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // ── Radar Wave: fires each time isSearching becomes true ──
  useEffect(() => {
    if (!isSearching) return;
    setRadarActive(true);
    const id = setTimeout(() => setRadarActive(false), 3600);
    return () => clearTimeout(id);
  }, [isSearching]);

  // ── Supercluster — only when ≥ 6 locations ──
  const shouldCluster = locations.length >= 6;

  const clusterIndex = useMemo(() => {
    if (!shouldCluster) return null;
    const idx = new Supercluster({ radius: 60, maxZoom: 16, minPoints: 2 });
    const points = locations
      .filter(l => l.lat && l.lng && l.category !== "user")
      .map((l, i) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [l.lng, l.lat] },
        properties: { id: i, ...l },
      }));
    idx.load(points);
    return idx;
  }, [locations, shouldCluster]);

  const zoom = Math.round(viewState.zoom);
  const clusters = useMemo(() => {
    if (!clusterIndex) return [];
    const bounds: [number, number, number, number] = [
      viewState.longitude - 2, viewState.latitude - 2,
      viewState.longitude + 2, viewState.latitude + 2,
    ];
    return clusterIndex.getClusters(bounds, zoom);
  }, [clusterIndex, viewState.longitude, viewState.latitude, zoom]);

  // ── Auto Fit Bounds ──
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;
    const bounds = new mapboxgl.LngLatBounds();
    
    // Only fit to user location if there are no search results
    if (locations.length === 0) {
      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat]);
        map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 460, right: 80 }, duration: 2000, maxZoom: 14 });
      }
      return;
    }

    // Otherwise, strictly fit to the search results
    locations.forEach(l => { if (l.lat && l.lng) bounds.extend([l.lng, l.lat]); });
    map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 460, right: 80 }, duration: 2000, maxZoom: 16 });
  }, [locations, userLocation]);

  // ── Navigation Camera ──
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;
    if (isNavigating && navFocusPoint) {
      const bearing = userLocation ? getBearing(userLocation.lat, userLocation.lng, navFocusPoint.lat, navFocusPoint.lng) : viewState.bearing;
      map.flyTo({ center: [navFocusPoint.lng, navFocusPoint.lat], zoom: 17, pitch: 60, bearing, duration: 1500, essential: true });
    } else if (!isNavigating && activeLocation) {
      if (locations.length >= 2) {
        // Fit bounds to show both user location and destination
        const bounds = new mapboxgl.LngLatBounds();
        locations.forEach(l => { if (l.lat && l.lng) bounds.extend([l.lng, l.lat]); });
        map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 460, right: 80 }, duration: 2000, maxZoom: 15 });
      } else {
        map.flyTo({ center: [activeLocation.lng, activeLocation.lat], zoom: 15, pitch: 0, bearing: 0, duration: 2000, essential: true });
      }
    }
  }, [isNavigating, navFocusPoint, activeLocation, locations, userLocation]);

  // ── Distance Toast ──
  useEffect(() => {
    if (locations.length === 0 || typeof window === "undefined" || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const dist = getDistance(pos.coords.latitude, pos.coords.longitude, locations[0].lat, locations[0].lng);
      if (dist > 50) { setUserDistance(Math.round(dist)); setShowToast(true); setTimeout(() => setShowToast(false), 5000); }
    });
  }, [locations]);

  const handleZoomIn    = () => mapRef.current?.getMap()?.zoomIn();
  const handleZoomOut   = () => mapRef.current?.getMap()?.zoomOut();
  const handleGeolocate = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(pos =>
      mapRef.current?.getMap()?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 14, duration: 2000, essential: true })
    );
  };

  const currentStyle = MAP_STYLE_URLS[styleIdx];

  return (
    <div className="w-full h-full relative rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
      <Map
        {...viewState}
        ref={mapRef}
        onMove={evt => setViewState(evt.viewState)}
        onDragStart={() => setShowToast(false)}
        onLoad={() => setIsMapLoaded(true)}
        style={{ width: "100%", height: "100%" }}
        mapStyle={currentStyle.url}
        mapboxAccessToken={MAPBOX_TOKEN}
        antialias={true}
      >
        {/* ── Route Lines ── */}
        {routeGeoJSON && (
          <Source id="route-source" type="geojson" data={routeGeoJSON as any}>
            <Layer {...routeGlowLayer} />
            <Layer {...routeOutlineLayer} />
            <Layer {...routeLineLayer} />
          </Source>
        )}

        {/* ── User GPS Dot + Radar Wave ── */}
        {isMapLoaded && userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div className="relative flex items-center justify-center">
              {/* Radar rings — expand outward when search is triggered */}
              <AnimatePresence>
                {radarActive && [0, 1, 2].map(i => (
                  <motion.div
                    key={`radar-${i}`}
                    initial={{ scale: 0.6, opacity: 0.9 }}
                    animate={{ scale: 7 + i * 3.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.8, delay: i * 0.55, ease: "easeOut" }}
                    className="absolute w-5 h-5 rounded-full border-2 border-indigo-400 pointer-events-none"
                  />
                ))}
              </AnimatePresence>
              {/* Standard GPS pulse */}
              <div className="relative w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-500 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              </div>
            </div>
          </Marker>
        )}

        {/* ── Target Destination Pin ── */}
        {isMapLoaded && targetPoint && (
          <Marker longitude={targetPoint.lng} latitude={targetPoint.lat} anchor="bottom">
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center">
              <div className="w-9 h-9 flex items-center justify-center bg-rose-600 rounded-full border-2 border-white shadow-2xl ring-4 ring-rose-500/20">
                <MapPin className="w-5 h-5 text-white fill-current" />
              </div>
              <div className="w-2.5 h-2.5 bg-rose-600 rotate-45 -mt-1.5 shadow-lg" />
            </motion.div>
          </Marker>
        )}

        {/* ── Navigation Maneuver Dot ── */}
        {isMapLoaded && isNavigating && navFocusPoint && (
          <Marker longitude={navFocusPoint.lng} latitude={navFocusPoint.lat} anchor="center">
            <div className="w-3 h-3 bg-indigo-500/80 rounded-full border-2 border-white shadow-lg animate-pulse" />
          </Marker>
        )}

        {/* ── CLUSTER MODE (≥6 POIs) ── */}
        {isMapLoaded && shouldCluster && clusters.length > 0 ? clusters.map((feature, i) => {
          const [lng, lat] = feature.geometry.coordinates;
          const props = feature.properties as any;

          if (props.cluster) {
            const { bg, ring, text } = clusterColor(props.point_count);
            return (
              <Marker key={`cluster-${i}`} longitude={lng} latitude={lat} anchor="center">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.18 }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  onClick={() => {
                    const map = mapRef.current?.getMap();
                    if (map) map.flyTo({ center: [lng, lat], zoom: zoom + 2.5, duration: 700, essential: true });
                  }}
                  className={`cursor-pointer flex items-center justify-center w-12 h-12 rounded-full ${bg} border-[3px] border-white shadow-2xl ring-4 ${ring}`}
                >
                  <div className="flex flex-col items-center leading-none">
                    <span className={`text-[12px] font-black ${text}`}>{props.point_count_abbreviated}</span>
                    <span className={`text-[7px] font-bold uppercase tracking-wider ${text} opacity-70`}>POI</span>
                  </div>
                </motion.div>
              </Marker>
            );
          }

          // Individual POI within cluster
          const loc = props as Coordinate;
          const isActive = activeLocation?.place === loc.place;
          const { bg, Icon } = getCatStyle(loc.category);
          return (
            <Marker key={`poi-c-${i}`} longitude={lng} latitude={lat} anchor="bottom">
              <motion.div
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.12 }}
                transition={{ type: "spring", stiffness: 350, damping: 18 }}
                className="flex flex-col items-center cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center ${isActive ? `${bg} scale-125 ring-2 ring-white/50` : `${bg} opacity-90 hover:opacity-100`}`}>
                  <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <div className={`w-2.5 h-2.5 ${bg} rotate-45 -mt-1 shadow-lg`} />
                {isActive && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-1.5 px-2 py-0.5 bg-slate-900/90 backdrop-blur-md rounded border border-white/5 text-[10px] font-bold text-white whitespace-nowrap max-w-[120px] truncate">
                    {loc.place}
                  </motion.div>
                )}
              </motion.div>
            </Marker>
          );
        }) : (
          // ── STANDARD MODE (AI itinerary / <6 markers) ──
          isMapLoaded && !isNavigating && locations.filter(l => l.lat && l.lng).map((loc, i) => {
            if (loc.category === "user" || loc.place.includes("Vị trí") || loc.place.includes("Your location")) return null;
            const isActive = activeLocation?.place === loc.place;
            const { bg, Icon } = getCatStyle(loc.category);
            const activeBg = bg.replace("600", "400").replace("500", "400");
            return (
              <Marker key={`loc-${i}`} longitude={loc.lng} latitude={loc.lat} anchor="bottom">
                <div className="relative flex flex-col items-center cursor-pointer p-2 pb-0">
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1.6, opacity: 0.4 }}
                        exit={{ opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                        className={`absolute bottom-2 w-8 h-8 rounded-full ${activeBg}`}
                      />
                    )}
                  </AnimatePresence>
                  <div className={`relative z-10 w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center transition-all duration-300 ${isActive ? `${activeBg} scale-125 ring-2 ring-white/50 ring-offset-2 ring-offset-slate-900` : `${bg} opacity-90 hover:opacity-100 hover:scale-110`}`}>
                    {!loc.category && i === 0 ? (
                      <div className="text-[10px] font-black text-white">{i + 1}</div>
                    ) : (
                      <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
                    )}
                  </div>
                  <div className={`w-2.5 h-2.5 ${isActive ? activeBg : bg} rotate-45 -mt-1 shadow-lg z-0`} />
                  {isActive && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 px-2 py-0.5 bg-slate-900/90 backdrop-blur-md rounded border border-white/5 text-[10px] font-bold text-white shadow-2xl whitespace-nowrap max-w-[120px] truncate">
                      {loc.place}
                    </motion.div>
                  )}
                </div>
              </Marker>
            );
          })
        )}
      </Map>

      {/* ── Control Panel ── */}
      <div className="absolute bottom-20 right-4 z-20 flex flex-col items-end gap-2">
        {/* Compass (navigation only) */}
        {isNavigating && (
          <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
            className="w-12 h-12 mb-2 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-2xl cursor-pointer hover:bg-black/60 transition-colors"
            onClick={() => mapRef.current?.easeTo({ bearing: 0, duration: 1000 })}>
            <div className="relative w-8 h-8 flex items-center justify-center" style={{ transform: `rotate(${-viewState.bearing}deg)` }}>
              <div className="absolute top-0 w-1.5 h-4 bg-rose-500 rounded-t-full shadow-lg" />
              <div className="absolute bottom-0 w-1.5 h-4 bg-slate-300 rounded-b-full shadow-lg" />
              <div className="w-1 h-1 bg-white rounded-full z-10" />
              <span className="absolute -top-5 text-[8px] font-black text-white/50">N</span>
            </div>
          </motion.div>
        )}

        {/* Style Switcher */}
        <div className="relative flex items-center gap-3"
          onMouseEnter={() => setStyleMenuOpen(true)}
          onMouseLeave={() => setStyleMenuOpen(false)}>
          <AnimatePresence>
            {styleMenuOpen && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.92 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.92 }}
                className="flex items-center gap-2 p-1.5 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl mr-1">
                {MAP_STYLE_URLS.map((style, idx) => (
                  <button key={style.id} onClick={() => setStyleIdx(idx)}
                    className={`px-3 py-2 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${idx === styleIdx ? "border-indigo-500 bg-indigo-500/15 text-indigo-300" : "border-white/5 bg-white/5 hover:border-white/20 text-slate-400"}`}>
                    <div className={`w-3 h-3 rounded-full shrink-0 ${style.id === "dark" ? "bg-slate-700 border border-slate-500" : style.id === "streets" ? "bg-blue-400" : "bg-emerald-500"}`} />
                    {ml[style.urlKey]}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button whileTap={{ scale: 0.9 }}
            className={`w-12 h-12 flex items-center justify-center rounded-2xl backdrop-blur-md border border-white/10 shadow-lg transition-all ${styleMenuOpen ? "bg-indigo-600/40 border-indigo-500/50" : "bg-black/40 hover:bg-black/60"}`}>
            <Layers className={`w-5 h-5 ${styleMenuOpen ? "text-white" : "text-white/70"}`} strokeWidth={2} />
          </motion.button>
        </div>

        {/* Zoom In */}
        <motion.button onClick={handleZoomIn} whileTap={{ scale: 0.9 }}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 shadow-lg transition-all">
          <Plus className="w-5 h-5 text-white/70" strokeWidth={2} />
        </motion.button>

        {/* Zoom Out */}
        <motion.button onClick={handleZoomOut} whileTap={{ scale: 0.9 }}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 shadow-lg transition-all">
          <Minus className="w-5 h-5 text-white/70" strokeWidth={2} />
        </motion.button>

        {/* GPS */}
        <motion.button onClick={handleGeolocate} whileTap={{ scale: 0.9 }}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 shadow-lg transition-all">
          <MapPin className="w-5 h-5 text-white/70 hover:text-indigo-400 transition-colors" strokeWidth={2} />
        </motion.button>
      </div>

      {/* Distance Toast */}
      <AnimatePresence>
        {showToast && userDistance && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="absolute top-12 left-1/2 z-50 px-5 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-xs font-semibold text-white">
              {lang === "vi" ? `Bạn đang cách điểm đến ${userDistance}km` : `You are ${userDistance}km from destination`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mapbox Token Warning */}
      {!MAPBOX_TOKEN && (
        <div className="absolute top-4 right-16 z-30 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-400 backdrop-blur-md max-w-[200px]">
          <p className="font-bold mb-1 underline">{ml.tokenRequiredTitle}</p>
          <p>{ml.tokenRequiredDesc}</p>
        </div>
      )}
    </div>
  );
}
