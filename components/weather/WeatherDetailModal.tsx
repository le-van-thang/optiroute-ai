"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Map, { Marker, Source, Layer, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
  X, Wind, Droplets, Sun, Sunrise, Sunset, Eye, Gauge, 
  CloudRain, Navigation, Calendar, Clock, ChevronDown, Activity,
  Info, AlertTriangle, Map as MapIcon, Maximize2, Minimize2, Globe,
  ShieldCheck, Thermometer, Compass, Plus, Minus, Layers, EyeOff, 
  LayoutPanelLeft, Play, Pause, ChevronRight, Search, MapPin, Waves, 
  ThermometerSun, Moon, CloudLightning, CloudDrizzle, CloudFog, ArrowUp, Star, Camera,
  Navigation2, ThermometerSnowflake, Ruler
} from "lucide-react";
import { getWeatherIcon, getWeatherDescription, getWindDirection } from "@/lib/weather-utils";
import { useLang } from "@/components/providers/LangProvider";

interface WeatherDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  lat?: number;
  lng?: number;
}

type MapLayer = 'temp' | 'precip' | 'wind';

const VIETNAM_63_PROVINCES = [
  { name: "An Giang", lat: 10.5, lng: 105.1 }, { name: "Bà Rịa - Vũng Tàu", lat: 10.5, lng: 107.2 },
  { name: "Bạc Liêu", lat: 9.3, lng: 105.5 }, { name: "Bắc Giang", lat: 21.3, lng: 106.2 },
  { name: "Bắc Kạn", lat: 22.1, lng: 105.8 }, { name: "Bắc Ninh", lat: 21.2, lng: 106.1 },
  { name: "Bến Tre", lat: 10.2, lng: 106.4 }, { name: "Bình Dương", lat: 11.2, lng: 106.7 },
  { name: "Bình Định", lat: 14.1, lng: 109.0 }, { name: "Bình Phước", lat: 11.7, lng: 106.8 },
  { name: "Bình Thuận", lat: 11.1, lng: 108.1 }, { name: "Cà Mau", lat: 9.2, lng: 105.0 },
  { name: "Cao Bằng", lat: 22.7, lng: 105.9 }, { name: "Cần Thơ", lat: 10.0, lng: 105.8 },
  { name: "Đà Nẵng", lat: 16.1, lng: 108.2 }, { name: "Đắk Lắk", lat: 12.8, lng: 108.2 },
  { name: "Đắk Nông", lat: 12.2, lng: 107.7 }, { name: "Điện Biên", lat: 21.4, lng: 103.0 },
  { name: "Đồng Nai", lat: 11.0, lng: 107.2 }, { name: "Đồng Tháp", lat: 10.5, lng: 105.7 },
  { name: "Gia Lai", lat: 14.0, lng: 108.0 }, { name: "Hà Giang", lat: 22.8, lng: 104.8 },
  { name: "Hà Nam", lat: 20.5, lng: 105.9 }, { name: "Hà Nội", lat: 21.0, lng: 105.8 },
  { name: "Hà Tĩnh", lat: 18.3, lng: 105.9 }, { name: "Hải Dương", lat: 20.9, lng: 106.3 },
  { name: "Hải Phòng", lat: 20.8, lng: 106.7 }, { name: "Hậu Giang", lat: 9.8, lng: 105.5 },
  { name: "Hòa Bình", lat: 20.7, lng: 105.3 }, { name: "Hưng Yên", lat: 20.6, lng: 106.0 },
  { name: "Khánh Hòa", lat: 12.3, lng: 109.1 }, { name: "Kiên Giang", lat: 10.0, lng: 105.1 },
  { name: "Kon Tum", lat: 14.4, lng: 108.0 }, { name: "Lai Châu", lat: 22.3, lng: 103.5 },
  { name: "Lạng Sơn", lat: 21.8, lng: 106.8 }, { name: "Lào Cai", lat: 22.5, lng: 104.0 },
  { name: "Lâm Đồng", lat: 11.6, lng: 108.0 }, { name: "Long An", lat: 10.6, lng: 106.3 },
  { name: "Nam Định", lat: 20.4, lng: 106.2 }, { name: "Nghệ An", lat: 19.1, lng: 105.0 },
  { name: "Ninh Bình", lat: 20.2, lng: 105.9 }, { name: "Ninh Thuận", lat: 11.6, lng: 108.9 },
  { name: "Phú Thọ", lat: 21.3, lng: 105.2 }, { name: "Phú Yên", lat: 13.1, lng: 109.2 },
  { name: "Quảng Bình", lat: 17.5, lng: 106.6 }, { name: "Quảng Nam", lat: 15.6, lng: 108.0 },
  { name: "Quảng Ngãi", lat: 15.0, lng: 108.8 }, { name: "Quảng Ninh", lat: 21.0, lng: 107.3 },
  { name: "Quảng Trị", lat: 16.7, lng: 107.1 }, { name: "Sóc Trăng", lat: 9.6, lng: 106.0 },
  { name: "Sơn La", lat: 21.2, lng: 103.9 }, { name: "Tây Ninh", lat: 11.4, lng: 106.1 },
  { name: "Thái Bình", lat: 20.4, lng: 106.4 }, { name: "Thái Nguyên", lat: 21.6, lng: 105.8 },
  { name: "Thanh Hóa", lat: 20.0, lng: 105.5 }, { name: "Thừa Thiên Huế", lat: 16.4, lng: 107.5 },
  { name: "Tiền Giang", lat: 10.4, lng: 106.3 }, { name: "TP. Hồ Chí Minh", lat: 10.8, lng: 106.6 },
  { name: "Trà Vinh", lat: 9.9, lng: 106.3 }, { name: "Tuyên Quang", lat: 22.1, lng: 105.2 },
  { name: "Vĩnh Long", lat: 10.2, lng: 106.0 }, { name: "Vĩnh Phúc", lat: 21.3, lng: 105.5 },
  { name: "Yên Bái", lat: 21.7, lng: 104.9 }
];

const GLOBAL_HUBS = [
  { name: "Tokyo", lat: 35.7, lng: 139.7 }, { name: "Singapore", lat: 1.4, lng: 103.8 },
  { name: "London", lat: 51.5, lng: -0.1 }, { name: "New York", lat: 40.7, lng: -74.0 }
];

export function WeatherDetailModal({ isOpen, onClose, city, lat, lng }: WeatherDetailModalProps) {
  const { lang } = useLang();
  const mapRef = useRef<MapRef>(null);
  const [data, setData] = useState<any>(null);
  const [cityData, setCityData] = useState<any[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('temp');
  const [timelineIndex, setTimelineIndex] = useState(new Date().getHours());
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [radarLayer, setRadarLayer] = useState<string | null>(null);

  const displayCityName = useMemo(() => {
    const found = [...VIETNAM_63_PROVINCES, ...GLOBAL_HUBS].find(c => c.name.toLowerCase() === city.toLowerCase() || city.toLowerCase().includes(c.name.toLowerCase()));
    return found ? found.name : city;
  }, [city]);

  useEffect(() => {
    if (!isOpen) return;
    setTimelineIndex(new Date().getHours());
    const resolveCity = async () => {
      if (lat && lng) { setCoords({ lat, lng }); return; }
      try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&limit=1`);
        const geo = await res.json();
        if (geo.features?.[0]) setCoords({ lat: geo.features[0].center[1], lng: geo.features[0].center[0] });
      } catch (err) { console.error(err); }
    };
    resolveCity();
  }, [isOpen, city, lat, lng]);

  useEffect(() => {
    if (!coords || !isOpen) return;
    const fetchAllData = async () => {
      try {
        const mainUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,dew_point_2m,visibility,pressure_msl,uv_index,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto`;
        const mainRes = await fetch(mainUrl);
        const mainData = await mainRes.json();
        setData(mainData);

        const cityPromises = VIETNAM_63_PROVINCES.slice(0, 15).map(c => 
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto`)
            .then(r => r.json())
            .then(d => ({ ...c, hourly: d.hourly }))
            .catch(() => ({ ...c, hourly: null }))
        );
        const results = await Promise.all(cityPromises);
        setCityData(results.filter(r => r.hourly));

        const radarRes = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const radarData = await radarRes.json();
        if (radarData.radar.past.length > 0) setRadarLayer(radarData.radar.past[radarData.radar.past.length - 1].path);
      } catch (err) { console.error(err); }
    };
    fetchAllData();
  }, [coords, isOpen]);

  useEffect(() => {
    let interval: any;
    if (isTimelinePlaying) interval = setInterval(() => setTimelineIndex(prev => (prev + 1) % 24), 1500);
    return () => clearInterval(interval);
  }, [isTimelinePlaying]);

  const heatmapData = useMemo(() => ({
    type: "FeatureCollection",
    features: VIETNAM_63_PROVINCES.map(c => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [c.lng, c.lat] },
      properties: { temp: 25 + Math.random() * 10, wind: 10 + Math.random() * 30 } // Visual mock for performance
    }))
  }), []);

  if (!isOpen) return null;

  const currentH = data?.hourly;
  const currentD = data?.daily;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-[1500px] h-[94vh] bg-[#0c1426] rounded-[3.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-row"
      >
        {/* LEFT PANEL: iOS Weather Details (42%) */}
        <div className="w-[42%] h-full flex flex-col bg-gradient-to-b from-[#1a2b4d] to-[#0c1426] border-r border-white/10 relative overflow-y-auto no-scrollbar scroll-smooth">
           <div className="p-12 text-center sticky top-0 bg-[#1a2b4d]/90 backdrop-blur-3xl z-20 border-b border-white/5">
              <button onClick={onClose} className="absolute left-10 top-12 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-90"><X className="w-5 h-5 text-white" /></button>
              <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] mb-2">Vị trí của tôi</p>
              <h2 className="text-4xl font-black text-white tracking-tighter mb-1">{displayCityName}</h2>
              <div className="text-[85px] font-black text-white leading-none mb-3 -ml-4">{currentH ? Math.round(currentH.temperature_2m[timelineIndex]) : '--'}°</div>
              <p className="text-lg font-bold text-white/70 uppercase tracking-widest">{currentH ? getWeatherDescription(currentH.weather_code[timelineIndex], lang) : '--'}</p>
              <div className="flex justify-center gap-4 mt-2 text-md font-black text-white/40">
                 <span>C: {currentD ? Math.round(currentD.temperature_2m_max[0]) : '--'}°</span>
                 <span>T: {currentD ? Math.round(currentD.temperature_2m_min[0]) : '--'}°</span>
              </div>
           </div>

           <div className="p-8 space-y-6">
              {/* Hourly Chart Card */}
              <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-xl">
                 <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-8 flex items-center gap-2"><Clock className="w-4 h-4" /> Dự báo theo giờ</p>
                 <div className="flex gap-8 overflow-x-auto no-scrollbar pb-2">
                    {currentH?.time.slice(0, 48).map((_: any, i: number) => {
                       const isNow = i === new Date().getHours();
                       return (
                         <div key={i} onClick={() => setTimelineIndex(i)} className={`flex flex-col items-center gap-5 min-w-[65px] py-6 rounded-[2rem] transition-all cursor-pointer ${timelineIndex === i ? 'bg-white/15 scale-105 shadow-xl' : 'hover:bg-white/5'}`}>
                            <span className="text-[11px] font-black text-white/30 uppercase">{isNow ? "Bây giờ" : `${i}h`}</span>
                            <span className="text-3xl drop-shadow-xl">{getWeatherIcon(currentH.weather_code[i], true)}</span>
                            <span className="text-[18px] font-black text-white">{Math.round(currentH.temperature_2m[i])}°</span>
                         </div>
                       );
                    })}
                 </div>
              </div>

              {/* 10-Day Forecast Card */}
              <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-xl">
                 <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-8 flex items-center gap-2"><Calendar className="w-4 h-4" /> Dự báo 10 ngày</p>
                 <div className="space-y-8">
                    {currentD?.time.map((time: string, i: number) => (
                       <div key={i} className="flex items-center justify-between group">
                          <span className="w-20 text-[12px] font-black uppercase text-white/30 group-hover:text-white transition-colors">{i === 0 ? "Hôm nay" : new Date(time).toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                          <span className="text-3xl drop-shadow-lg">{getWeatherIcon(currentD.weather_code[i], true)}</span>
                          <div className="flex items-center gap-4 flex-1 max-w-[150px]">
                             <span className="text-[13px] font-bold text-white/20">{Math.round(currentD.temperature_2m_min[i])}°</span>
                             <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                                <div className="absolute inset-y-0 bg-gradient-to-r from-blue-400 via-yellow-400 to-red-500 w-[60%] left-[20%] rounded-full" />
                             </div>
                             <span className="text-[13px] font-black text-white">{Math.round(currentD.temperature_2m_max[i])}°</span>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* GRID OF CARDS (iOS Style) */}
              <div className="grid grid-cols-2 gap-6">
                 {/* UV Card */}
                 <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2"><Sun className="w-3.5 h-3.5" /> Chỉ số UV</p>
                    <div className="text-4xl font-black text-white">{currentH ? Math.round(currentH.uv_index[timelineIndex]) : '--'}</div>
                    <div className="text-[13px] font-bold text-white/70">Cao</div>
                    <div className="h-1.5 bg-gradient-to-r from-green-500 via-yellow-400 to-red-600 rounded-full relative">
                       <motion.div animate={{ left: `${(currentH?.uv_index[timelineIndex] / 11) * 100}%` }} className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-black" />
                    </div>
                 </div>

                 {/* Sunrise/Sunset Card */}
                 <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2"><Sunrise className="w-3.5 h-3.5" /> Mặt trời lặn</p>
                    <div className="text-4xl font-black text-white">{currentD ? currentD.sunset[0].split('T')[1] : '--'}</div>
                    <div className="text-[13px] font-bold text-white/40">Mặt trời mọc: {currentD ? currentD.sunrise[0].split('T')[1] : '--'}</div>
                    <div className="relative h-12 flex items-end">
                       <svg className="w-full h-full" viewBox="0 0 100 40">
                          <path d="M0 40 Q50 0 100 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                          <motion.circle cx="50" cy="15" r="3" fill="#fbbf24" shadow-lg="true" />
                       </svg>
                    </div>
                 </div>

                 {/* Wind Card */}
                 <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2"><Wind className="w-3.5 h-3.5" /> Gió</p>
                    <div className="space-y-1">
                       <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-[12px] text-white/40">Gió</span>
                          <span className="text-[14px] font-black text-white">{currentH ? Math.round(currentH.wind_speed_10m[timelineIndex]) : '--'} km/h</span>
                       </div>
                       <div className="flex justify-between border-b border-white/5 py-2">
                          <span className="text-[12px] text-white/40">Gió giật</span>
                          <span className="text-[14px] font-black text-white">{currentH ? Math.round(currentH.wind_gusts_10m[timelineIndex]) : '--'} km/h</span>
                       </div>
                       <div className="flex justify-between pt-2">
                          <span className="text-[12px] text-white/40">Hướng</span>
                          <span className="text-[14px] font-black text-white">{currentH ? currentH.wind_direction_10m[timelineIndex] : '--'}° ĐĐN</span>
                       </div>
                    </div>
                 </div>

                 {/* Rain Card */}
                 <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2"><Droplets className="w-3.5 h-3.5" /> Lượng mưa</p>
                    <div className="text-4xl font-black text-white">{currentH ? Math.round(currentH.precipitation[timelineIndex]) : '--'} <span className="text-xl">mm</span></div>
                    <div className="text-[13px] font-bold text-white/70">Trong 24h qua</div>
                    <div className="text-[11px] text-white/30 italic">Dự báo mưa vào ngày mai.</div>
                 </div>

                 {/* Humidity Card */}
                 <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2"><Waves className="w-3.5 h-3.5" /> Độ ẩm</p>
                    <div className="text-4xl font-black text-white">{currentH ? currentH.relative_humidity_2m[timelineIndex] : '--'}%</div>
                    <div className="text-[11px] text-white/40">Điểm sương hiện tại là {currentH ? Math.round(currentH.dew_point_2m[timelineIndex]) : '--'}°.</div>
                 </div>

                 {/* Visibility Card */}
                 <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> Tầm nhìn</p>
                    <div className="text-4xl font-black text-white">{currentH ? Math.round(currentH.visibility[timelineIndex] / 1000) : '--'} <span className="text-xl">km</span></div>
                    <div className="text-[11px] text-white/40">Tầm nhìn hoàn toàn rõ.</div>
                 </div>

                 {/* Pressure Card */}
                 <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2"><Gauge className="w-3.5 h-3.5" /> Áp suất</p>
                    <div className="relative w-full h-24 flex flex-col items-center justify-center">
                       <div className="text-2xl font-black text-white">{currentH ? Math.round(currentH.pressure_msl[timelineIndex]) : '--'}</div>
                       <div className="text-[9px] text-white/30 uppercase">hPa</div>
                       <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 60">
                          <path d="M10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" strokeDasharray="2,2" />
                          <motion.path d="M10 50 A 40 40 0 0 1 50 10" fill="none" stroke="#3b82f6" strokeWidth="4" />
                       </svg>
                    </div>
                 </div>

                 {/* Moon Card */}
                 <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2"><Moon className="w-3.5 h-3.5" /> Mặt trăng</p>
                    <div className="flex items-center justify-between">
                       <div className="space-y-1">
                          <div className="text-[13px] font-black text-white">Khuyết đầu tháng</div>
                          <div className="text-[11px] text-white/30">Chiếu sáng: 81%</div>
                          <div className="text-[11px] text-white/30">Trăng mọc: 14:29</div>
                       </div>
                       <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-300 to-gray-700 shadow-inner overflow-hidden relative">
                          <div className="absolute inset-0 bg-black/40 blur-[1px] translate-x-[20%]" />
                       </div>
                    </div>
                 </div>
              </div>
              <div className="text-center pb-12 opacity-20 text-[10px] font-black uppercase tracking-widest">Dữ liệu từ Open-Meteo & RainViewer</div>
           </div>
        </div>

        {/* RIGHT PANEL: INTERACTIVE MAP (58%) */}
        <div className="flex-1 h-full relative">
           <Map
             ref={mapRef}
             initialViewState={{ longitude: coords?.lng || 108.2022, latitude: coords?.lat || 16.0544, zoom: 4.5 }}
             mapStyle={activeLayer === 'temp' ? 'mapbox://styles/mapbox/dark-v11' : (activeLayer === 'wind' ? 'mapbox://styles/mapbox/navigation-night-v1' : 'mapbox://styles/mapbox/satellite-streets-v12')}
             mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
             projection="globe"
           >
             {activeLayer === 'precip' && radarLayer && (
               <Source id="radar" type="raster" tiles={[`https://tilecache.rainviewer.com${radarLayer}/512/{z}/{x}/{y}/2/1_1.png`]} tileSize={512}>
                 <Layer id="radar-layer" type="raster" paint={{ "raster-opacity": 0.6 }} />
               </Source>
             )}
             {activeLayer === 'temp' && (
               <Source id="temp-heatmap" type="geojson" data={heatmapData as any}>
                 <Layer id="temp-layer" type="heatmap" paint={{ 
                    "heatmap-weight": ["interpolate", ["linear"], ["get", "temp"], 0, 0, 45, 1], 
                    "heatmap-intensity": 3,
                    "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,255,0)", 0.2, "rgba(0,255,255,0.5)", 0.4, "rgba(0,255,0,0.5)", 0.6, "rgba(255,255,0,0.6)", 0.8, "rgba(255,128,0,0.7)", 1, "rgba(255,0,0,0.8)"], 
                    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 50, 9, 300], 
                    "heatmap-opacity": 0.5 
                  }} />
               </Source>
             )}
             {cityData.map((c, i) => (
               <Marker key={i} longitude={c.lng} latitude={c.lat}>
                 <div className="bg-white px-2.5 py-1 rounded-full shadow-2xl border border-black/20 flex items-center justify-center transition-all hover:scale-125 cursor-pointer">
                    <span className="text-[12px] font-black text-black">{c.hourly ? Math.round(c.hourly.temperature_2m[timelineIndex]) : '--'}</span>
                 </div>
               </Marker>
             ))}
           </Map>

           <div className="absolute left-8 top-8 z-30">
              <div className="p-5 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl flex flex-col items-center gap-3">
                 <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{activeLayer === 'wind' ? 'Gió (km/h)' : 'Nhiệt độ'}</span>
                 <div className="w-2.5 h-44 rounded-full bg-gradient-to-t from-blue-600 via-cyan-400 via-green-400 via-yellow-400 via-orange-500 via-red-500 to-red-800 relative">
                    <div className="absolute -left-7 top-0 text-[10px] font-black text-white">55°</div>
                    <div className="absolute -left-7 bottom-0 text-[10px] font-black text-white">-40°</div>
                 </div>
              </div>
           </div>

           <div className="absolute right-8 top-8 flex flex-col gap-4 z-30">
              <div className="flex bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] p-1 overflow-hidden">
                 {[
                   { id: 'precip' as MapLayer, icon: <CloudRain className="w-4 h-4" /> },
                   { id: 'temp' as MapLayer, icon: <Thermometer className="w-4 h-4" /> },
                   { id: 'wind' as MapLayer, icon: <Wind className="w-4 h-4" /> },
                 ].map((l) => (
                    <button key={l.id} onClick={() => setActiveLayer(l.id)} className={`p-4 rounded-[1.2rem] transition-all ${activeLayer === l.id ? 'bg-blue-600 text-white' : 'text-white/40 hover:bg-white/5'}`}>{l.icon}</button>
                 ))}
              </div>
           </div>

           <div className="absolute left-8 bottom-36 z-30 flex flex-col gap-3">
              <button onClick={() => mapRef.current?.flyTo({ center: [108.2022, 16.0544], zoom: 6 })} className="p-4 bg-white/10 backdrop-blur-3xl border border-white/10 rounded-2xl text-white hover:bg-white/20 transition-all flex items-center gap-3">
                 <MapPin className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Việt Nam</span>
              </button>
              <button onClick={() => mapRef.current?.flyTo({ center: [0, 20], zoom: 2 })} className="p-4 bg-white/10 backdrop-blur-3xl border border-white/10 rounded-2xl text-white hover:bg-white/20 transition-all flex items-center gap-3">
                 <Globe className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Thế giới</span>
              </button>
           </div>

           <div className="absolute bottom-8 left-8 right-8 z-30">
              <div className="w-full h-24 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl flex items-center px-10 gap-8">
                 <button onClick={() => setIsTimelinePlaying(!isTimelinePlaying)} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white border border-white/5 hover:bg-white/20 transition-all">
                    {isTimelinePlaying ? <Pause className="fill-current w-5 h-5" /> : <Play className="fill-current w-5 h-5 ml-1" />}
                 </button>
                 <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-center text-white/50 text-[10px] font-black uppercase tracking-widest">
                       <span>Dự báo giờ: {timelineIndex}h</span>
                       <span>{new Date().toLocaleDateString('vi-VN', { weekday: 'long' })}</span>
                    </div>
                    <div className="relative h-1.5 bg-white/5 rounded-full">
                       <motion.div className="absolute inset-y-0 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]" animate={{ width: `${(timelineIndex / 23) * 100}%` }} transition={{ duration: 0.2 }} />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
