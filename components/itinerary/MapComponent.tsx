"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Map, { Marker, NavigationControl, Source, Layer, GeolocateControl } from "react-map-gl/mapbox";
import type { MapRef, LayerProps } from "react-map-gl/mapbox";
import type { FeatureCollection } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { Layers, MapPin, Plus, Minus, Bed, Utensils, Camera, Fuel } from "lucide-react";

interface Coordinate {
  lat: number;
  lng: number;
  place: string;
  category?: "hotel" | "restaurant" | "attraction" | "gas_station" | "user" | "target";
}

interface MapProps {
  locations: Coordinate[];
  activeLocation?: Coordinate | null;
  routeGeoJSON?: FeatureCollection | null;
  userLocation?: { lat: number; lng: number } | null;
  navFocusPoint?: { lat: number; lng: number } | null; // Camera tracks this
  targetPoint?: { lat: number; lng: number } | null;   // Red Pin stays here
  isNavigating?: boolean;
}

const MAP_STYLE_URLS = [
  { id: "dark", urlKey: "dark" as const, url: "mapbox://styles/mapbox/dark-v11" },
  { id: "streets", urlKey: "streets" as const, url: "mapbox://styles/mapbox/streets-v12" },
  { id: "satellite", urlKey: "satellite" as const, url: "mapbox://styles/mapbox/satellite-streets-v12" },
];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// Calculate bearing between two points
function getBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Công thức Haversine tính khoảng cách (KM)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Route line layer style — thick with white outline for maximum visibility on all map styles
const routeLineLayer: LayerProps = {
  id: "route-line",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#6366f1",
    "line-width": 7,
    "line-opacity": 1.0,
  },
};

// White outline layer under the route for contrast on satellite imagery
const routeOutlineLayer: LayerProps = {
  id: "route-outline",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#ffffff",
    "line-width": 11,
    "line-opacity": 0.6,
  },
};

// Route glow layer (underneath for effect)
const routeGlowLayer: LayerProps = {
  id: "route-glow",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#818cf8",
    "line-width": 18,
    "line-opacity": 0.25,
    "line-blur": 8,
  },
};

export default function MapComponent({ 
  locations, 
  activeLocation, 
  routeGeoJSON,
  userLocation,
  navFocusPoint,
  targetPoint,
  isNavigating = false
}: MapProps) {
  const mapRef = useRef<MapRef>(null);
  const [styleIdx, setStyleIdx] = useState(0);
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const [viewState, setViewState] = useState({
    latitude: 10.7769,
    longitude: 106.7009,
    zoom: 12,
    pitch: 0,
    bearing: 0,
  });
  const [userDistance, setUserDistance] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);

  const { lang, t } = useLang();
  const ml = t.map;

  // Navigation Camera Tracking Logic
  useEffect(() => {
    // We prioritize navFocusPoint for camera centering during navigation
    if (isNavigating && navFocusPoint && mapRef.current) {
      let bearing = viewState.bearing;
      if (userLocation) {
        bearing = getBearing(userLocation.lat, userLocation.lng, navFocusPoint.lat, navFocusPoint.lng);
      }

      mapRef.current.flyTo({
        center: [navFocusPoint.lng, navFocusPoint.lat],
        zoom: 17,
        pitch: 60, // 3D Tilt for GPS feel
        bearing: bearing, 
        duration: 1500,
        essential: true,
      });
    } else if (!isNavigating && activeLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [activeLocation.lng, activeLocation.lat],
        zoom: 15,
        pitch: 0,
        bearing: 0,
        duration: 2000,
      });
    }
  }, [isNavigating, navFocusPoint, userLocation]);

  // Đồng bộ tâm bản đồ ban đầu
  React.useEffect(() => {
    if (locations.length > 0 && !isNavigating) {
      setViewState((prev) => ({
        ...prev,
        latitude: locations[0].lat,
        longitude: locations[0].lng,
      }));
    }
  }, [locations, isNavigating]);

  // Tính khoảng cách từ GPS người dùng đến điểm đầu tiên
  React.useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator && locations.length > 0) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const dist = getDistance(pos.coords.latitude, pos.coords.longitude, locations[0].lat, locations[0].lng);
        if (dist > 50) {
          setUserDistance(Math.round(dist));
          setShowToast(true);
          const timer = setTimeout(() => setShowToast(false), 5000);
          return () => clearTimeout(timer);
        }
      });
    }
  }, [locations]);

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleGeolocate = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 2000,
        });
      });
    }
  };

  const currentStyle = MAP_STYLE_URLS[styleIdx];

  return (
    <div className="w-full h-full relative rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
      <Map
        {...viewState}
        ref={mapRef}
        onMove={(evt) => setViewState(evt.viewState)}
        onDragStart={() => setShowToast(false)}
        onZoomStart={() => setShowToast(false)}
        style={{ width: "100%", height: "100%" }}
        mapStyle={currentStyle.url}
        mapboxAccessToken={MAPBOX_TOKEN}
        antialias={true}
      >
        {/* Route Line */}
        {routeGeoJSON && (
          <Source id="route-source" type="geojson" data={routeGeoJSON as any}>
            {/* 1. Glow halo outermost */}
            <Layer {...routeGlowLayer} />
            {/* 2. White outline for contrast on satellite view */}
            <Layer {...routeOutlineLayer} />
            {/* 3. Main colored route line on top */}
            <Layer {...routeLineLayer} />
          </Source>
        )}

        {/* 1. User Location Pulse Dot (Standard GPS style) */}
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping" />
              <div className="relative w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-500 flex items-center justify-center">
                 <div className="w-2 h-2 bg-blue-500 rounded-full" />
              </div>
            </div>
          </Marker>
        )}

        {/* 2. Target Destination Pin (shown whenever a place is selected or navigating) */}
        {targetPoint && (
          <Marker longitude={targetPoint.lng} latitude={targetPoint.lat} anchor="bottom">
            <motion.div 
               initial={{ y: -20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="relative flex flex-col items-center"
            >
              <div className="w-9 h-9 flex items-center justify-center bg-rose-600 rounded-full border-2 border-white shadow-2xl ring-4 ring-rose-500/20">
                 <MapPin className="w-5 h-5 text-white fill-current" />
              </div>
              <div className="w-2.5 h-2.5 bg-rose-600 rotate-45 -mt-1.5 shadow-lg" />
            </motion.div>
          </Marker>
        )}

        {/* 3. Small Maneuver Indicator (Dynamic for Turn-by-Turn) */}
        {isNavigating && navFocusPoint && (
           <Marker longitude={navFocusPoint.lng} latitude={navFocusPoint.lat} anchor="center">
             <div className="w-3 h-3 bg-indigo-500/80 rounded-full border-2 border-white shadow-lg animate-pulse" title="Next Turn" />
           </Marker>
        )}

        {/* 4. General Location Markers (Subdued while navigating) */}
        {!isNavigating && locations.map((loc, i) => {
          const isActive = activeLocation?.place === loc.place;
          const isHotel = loc.category === "hotel";
          const isRestaurant = loc.category === "restaurant";
          const isGasStation = loc.category === "gas_station";
          const isUser = loc.category === "user" || loc.place.includes("Vị trí của bạn") || loc.place.includes("Your location");
          
          let bgColor = "bg-slate-700";
          let activeBgColor = "bg-indigo-500";
          let Icon = MapPin;

          if (isUser) {
            bgColor = "bg-blue-600";
            activeBgColor = "bg-blue-400";
          } else if (isHotel) {
            bgColor = "bg-purple-600";
            activeBgColor = "bg-purple-500";
            Icon = Bed;
          } else if (isRestaurant) {
            bgColor = "bg-orange-600";
            activeBgColor = "bg-orange-500";
            Icon = Utensils;
          } else if (isGasStation) {
            bgColor = "bg-amber-500";
            activeBgColor = "bg-amber-400";
            Icon = Fuel;
          } else {
            // attraction (default) - Google Maps red style
            bgColor = "bg-rose-600";
            activeBgColor = "bg-rose-500";
            Icon = MapPin;
          }

          return (
            <Marker
              key={`${loc.place}-${i}`}
              longitude={loc.lng}
              latitude={loc.lat}
              anchor="bottom"
            >
              <div className="relative flex flex-col items-center justify-center p-2 group/marker cursor-pointer pb-0">
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: 0.4 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                      className={`absolute bottom-2 w-8 h-8 rounded-full ${activeBgColor}`}
                    />
                  )}
                </AnimatePresence>

                <div
                  className={`relative z-10 w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? `${activeBgColor} scale-125 text-white ring-2 ring-white/50 ring-offset-2 ring-offset-slate-900`
                      : `${bgColor} text-white opacity-90 hover:opacity-100 hover:scale-110`
                  }`}
                >
                  {/* Content inside the pin */}
                  {isUser ? (
                     <div className="w-2.5 h-2.5 bg-white rounded-full shadow-inner animate-pulse" />
                  ) : (!loc.category && i === 0) ? (
                     <div className="text-[10px] font-black text-white">{i + 1}</div>
                  ) : (loc.category && loc.category !== "attraction") ? (
                     <Icon className="w-4 h-4" strokeWidth={2.5} />
                  ) : (
                     <div className="w-2.5 h-2.5 bg-white/90 rounded-full shadow-inner" />
                  )}
                </div>
                
                {/* Arrow / Pointy pin tip */}
                <div className={`w-2.5 h-2.5 ${isActive ? activeBgColor : bgColor} rotate-45 -mt-1 shadow-lg z-0 transition-colors duration-300 ${isActive ? "scale-125" : ""}`} />
                
                {/* Fallback Label to ensure users can read */}
                {isActive && (
                   <motion.div 
                     initial={{ opacity: 0, y: 5 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="mt-1.5 px-2 py-0.5 bg-slate-900/90 backdrop-blur-md rounded border border-white/5 text-[10px] font-bold text-white shadow-2xl whitespace-nowrap text-center max-w-[120px] truncate"
                   >
                     {loc.place}
                   </motion.div>
                )}
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* ── Cụm điều khiển bản đồ hợp nhất (Unified Control Stack) ── */}
      <div className="absolute bottom-20 right-4 z-20 flex flex-col items-end gap-2">
        {/* 0. Compass UI (Auto-rotates with Map) */}
        {isNavigating && (
          <motion.div 
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-12 h-12 mb-2 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-2xl cursor-pointer hover:bg-black/60 transition-colors"
            onClick={() => mapRef.current?.easeTo({ bearing: 0, duration: 1000 })}
            title="North Up"
          >
            <div 
              className="relative w-8 h-8 flex items-center justify-center transition-transform duration-300"
              style={{ transform: `rotate(${-viewState.bearing}deg)` }}
            >
              {/* Compass Needle */}
              <div className="absolute top-0 w-1.5 h-4 bg-rose-500 rounded-t-full shadow-lg" />
              <div className="absolute bottom-0 w-1.5 h-4 bg-slate-300 rounded-b-full shadow-lg" />
              <div className="w-1 h-1 bg-white rounded-full z-10" />
              <span className="absolute -top-6 text-[8px] font-black text-white/50">N</span>
            </div>
          </motion.div>
        )}

        {/* 1. Style Switcher */}
        <div 
          className="relative flex items-center gap-3"
          onMouseEnter={() => setStyleMenuOpen(true)}
          onMouseLeave={() => setStyleMenuOpen(false)}
        >
          <AnimatePresence>
            {styleMenuOpen && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                className="flex items-center gap-2 p-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl mr-1"
              >
                {MAP_STYLE_URLS.map((style, idx) => (
                  <button
                    key={style.id}
                    onClick={() => setStyleIdx(idx)}
                    className={`relative px-4 py-2 rounded-xl border transition-all flex items-center gap-2 overflow-hidden ${
                      idx === styleIdx 
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" 
                        : "border-white/5 bg-white/5 hover:border-white/20 text-slate-400"
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full shrink-0 ${
                      style.id === "dark" ? "bg-slate-900" :
                      style.id === "streets" ? "bg-blue-400" :
                      "bg-emerald-600"
                    }`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                      {ml[style.urlKey]}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className={`group/style relative w-12 h-12 flex items-center justify-center rounded-2xl backdrop-blur-md border border-white/10 shadow-lg transition-all ${styleMenuOpen ? "bg-indigo-600/40 border-indigo-500/50 scale-105" : "bg-black/40 hover:bg-black/60"}`}
          >
            <Layers className={`w-5 h-5 transition-colors ${styleMenuOpen ? "text-white" : "text-white/70"}`} strokeWidth={2} />
            {!styleMenuOpen && (
              <span className="absolute right-14 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover/style:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 shadow-2xl z-50">
                {ml.tooltipSwitchStyle}
              </span>
            )}
          </motion.button>
        </div>

        {/* 2. Custom Zoom In */}
        <motion.button
          onClick={handleZoomIn}
          whileTap={{ scale: 0.9 }}
          className="group/zoomIn relative w-11 h-11 flex items-center justify-center rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 shadow-lg transition-all"
        >
          <Plus className="w-5 h-5 text-white/70 group-hover/zoomIn:text-white transition-colors" strokeWidth={2} />
          <span className="absolute right-14 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover/zoomIn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 shadow-2xl z-50">
            {ml.tooltipZoomIn}
          </span>
        </motion.button>

        {/* 3. Custom Zoom Out */}
        <motion.button
          onClick={handleZoomOut}
          whileTap={{ scale: 0.9 }}
          className="group/zoomOut relative w-11 h-11 flex items-center justify-center rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 shadow-lg transition-all"
        >
          <Minus className="w-5 h-5 text-white/70 group-hover/zoomOut:text-white transition-colors" strokeWidth={2} />
          <span className="absolute right-14 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover/zoomOut:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 shadow-2xl z-50">
            {ml.tooltipZoomOut}
          </span>
        </motion.button>

        {/* 4. Custom GPS Button (Bottom) */}
        <motion.button
          onClick={handleGeolocate}
          whileTap={{ scale: 0.9 }}
          className="group/gps relative w-12 h-12 flex items-center justify-center rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 shadow-lg transition-all"
        >
          <MapPin className="w-5 h-5 text-white/70 group-hover/gps:text-indigo-400 transition-colors" strokeWidth={2} />
          <span className="absolute right-14 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover/gps:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 shadow-2xl z-50">
            {ml.tooltipMyLocation}
          </span>
        </motion.button>
      </div>

      {/* ── Thông báo khoảng cách (Toast) ── */}
      <AnimatePresence>
        {showToast && userDistance && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="absolute top-12 left-1/2 z-50 px-5 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-xs font-semibold text-white tracking-wide">
              {lang === "vi" ? `Bạn đang cách điểm đến ${userDistance}km` : `You are ${userDistance}km away from destination`}
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
