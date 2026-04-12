"use client";

import { ProvinceSelector } from "@/components/itinerary/ProvinceSelector";
import { SearchPromptChips } from "@/components/itinerary/SearchPromptChips";
import { useLang } from "@/components/providers/LangProvider";
import { AnimatePresence, motion, Variants } from "framer-motion";
import type { FeatureCollection } from "geojson";
import { HDCameraModal } from "@/components/itinerary/HDCameraModal";
import {
  ArrowRight,
  Bike,
  Camera,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Footprints,
  Loader2,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  Navigation,
  Navigation2,
  Play,
  Search,
  Sparkles,
  Star,
  Trash2,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const MapComponent = dynamic(
  () => import("@/components/itinerary/MapComponent"),
  {
    ssr: false,
    loading: () => {
      const { t } = useLang();
      return (
        <div className="w-full h-full bg-slate-900/50 animate-pulse rounded-3xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-slate-700 animate-spin" />
            <span className="text-[10px] text-slate-700 font-medium uppercase tracking-widest">
              {t.itinerary.loadingMap}
            </span>
          </div>
        </div>
      );
    },
  },
);

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

const legVariants: Variants = {
  hidden: { opacity: 0, scaleY: 0.5 },
  show: {
    opacity: 1,
    scaleY: 1,
    transition: { type: "spring", stiffness: 200, damping: 20 },
  },
};

interface LocalizedString {
  vi: string;
  en: string;
}

interface Activity {
  time?: string;
  place?: LocalizedString | string;
  place_name?: LocalizedString | string;
  category?: "hotel" | "restaurant" | "attraction" | "gas_station";
  description: LocalizedString | string;
  tip?: LocalizedString | string;
  lat?: number;
  lng?: number;
  completed?: boolean;
  start_time?: string;
}

interface DaySessions {
  morning: Activity[];
  afternoon: Activity[];
  evening: Activity[];
}

interface ItineraryDay {
  day?: number; // old format
  day_number?: number; // new format
  title?: LocalizedString | string;
  activities?: Activity[]; // old format
  locations?: Activity[]; // new format (Phase 18)
  sessions?: DaySessions; // new format (Phase 19)
}

interface LegInfo {
  distance: string; // "X.X km"
  duration: string; // "X min"
  rawMins: number;  // For accurate numerical addition
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

const getLocString = (
  val?: string | LocalizedString,
  lang: string = "vi",
): string => {
  if (!val) return "";
  if (typeof val === "string") return val;
  return (val as any)[lang] || val.vi || "";
};

// Phase 19: PlaceItem with Journey Mode support
const PlaceItem = ({
  act,
  leg,
  activeLocation,
  setActiveLocation,
  lang,
  searchMode,
  isCompleted = false,
  isCurrentStep = false,
  onCheckin,
  stepIndex,
}: {
  act: Activity;
  leg?: LegInfo | null;
  activeLocation: Activity | null;
  setActiveLocation: (a: Activity) => void;
  lang: string;
  searchMode: "ai" | "local";
  isCompleted?: boolean;
  isCurrentStep?: boolean;
  onCheckin?: () => void;
  stepIndex?: number;
}) => {
  const tip = getLocString(act.tip, lang);
  const categoryColors: Record<string, string> = {
    hotel: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    restaurant: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    attraction: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    gas_station: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  };
  const catStyle =
    categoryColors[act.category || "attraction"] || categoryColors.attraction;
  const catLabel: Record<string, Record<string, string>> = {
    hotel: { vi: "Khách sạn", en: "Hotel" },
    restaurant: { vi: "Nhà hàng", en: "Restaurant" },
    attraction: { vi: "Điểm tham quan", en: "Attraction" },
    gas_station: { vi: "Trạm xăng", en: "Gas station" },
  };
  return (
    <div
      className="group/item transition-all duration-300"
    >
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.005, x: 3 }}
        onClick={() => setActiveLocation(act)}
        className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
          isCurrentStep
            ? "bg-indigo-500/10 border-indigo-500/40 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10"
            : activeLocation === act
              ? "bg-indigo-500/5 border-indigo-500/30 ring-1 ring-indigo-500/20"
              : isCompleted
                ? "bg-slate-900/20 border-slate-800"
                : "bg-slate-900/40 border-border hover:border-slate-700"
        }`}
      >
        {/* Completed tick overlay */}
        {isCompleted && (
          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={3} />
          </div>
        )}
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {searchMode === "ai" ? (
                <>
                  <Clock
                    className="w-3.5 h-3.5 text-indigo-400"
                    strokeWidth={2}
                  />
                  <span className="text-[10px] font-bold font-mono text-slate-400 tracking-tighter">
                    {act.time}
                  </span>
                  {act.category && (
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${catStyle}`}
                    >
                      {catLabel[act.category]?.[lang] || act.category}
                    </span>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-current" />
                  <span className="text-[10px] font-bold text-amber-500">
                    4.5
                  </span>
                  <span className="text-[10px] text-slate-600">·</span>
                  <span className="text-[10px] text-green-500 font-bold uppercase">
                    {lang === "vi" ? "Mở cửa" : "Open"}
                  </span>
                </div>
              )}
            </div>
            <h3
              className={`text-sm font-bold mb-1 group-hover:text-indigo-400 transition-colors capitalize ${isCompleted ? "text-emerald-400" : "text-foreground"}`}
            >
              {getLocString(act.place_name || act.place, lang)}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
              {getLocString(act.description, lang)}
            </p>
            {/* Tip badge */}
            {tip && !isCompleted && (
              <div className="mt-2 flex items-start gap-1.5 p-2 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <span className="text-amber-400 text-[10px] mt-0.5">💡</span>
                <p className="text-[10px] text-amber-400/80 leading-relaxed">
                  {tip}
                </p>
              </div>
            )}
          </div>
          {!isCompleted && (
            <ChevronRight
              className={`w-4 h-4 mt-2 shrink-0 transition-transform ${
                activeLocation === act
                  ? "text-indigo-400 rotate-90"
                  : "text-slate-700"
              }`}
              strokeWidth={2}
            />
          )}
        </div>

        {/* Journey Mode: Check-in Button */}
        {isCurrentStep && onCheckin && !isCompleted && (
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onCheckin();
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            {lang === "vi"
              ? "✅ Đã tới nơi / Check-in"
              : "✅ Arrived / Check-in"}
          </motion.button>
        )}
      </motion.div>

      {leg && (
        <motion.div
          variants={legVariants}
          className="flex items-center gap-2 px-3 py-2 my-1"
        >
          <div className="w-px h-4 bg-slate-800 ml-3 flex-shrink-0" />
          <div className="flex items-center gap-1.5 text-slate-500">
            <Car
              className="w-3.5 h-3.5 flex-shrink-0 text-slate-400"
              strokeWidth={2}
            />
            <span className="text-[11px] font-bold tabular-nums text-slate-400">
              {leg.distance}
            </span>
            <span className="text-slate-800">|</span>
            <span className="text-[11px] font-bold tabular-nums text-slate-400">
              {leg.duration}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

interface Review {
  id: string;
  user: string;
  rating: number;
  text: string;
  date: string;
}

export default function ItineraryPage() {
  const { lang, t } = useLang();
  const itinT = t.itinerary;
  const commonT = t.common;
  const searchParams = useSearchParams();

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [itineraryResult, setItineraryResult] = useState<ItineraryDay[] | null>(
    null,
  );
  const [activeLocation, setActiveLocation] = useState<Activity | null>(null);

  // Phase 17: Search Mode & Local Persistence
  const [searchMode, setSearchMode] = useState<"ai" | "local">("ai");
  const [localResults, setLocalResults] = useState<Activity[] | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navSteps, setNavSteps] = useState<any[]>([]);
  const [activeStepIdx, setActiveStepIdx] = useState(0);

  // Phase 18: Active Day Tab
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  // Phase 19: Journey Mode State
  const [journeyActive, setJourneyActive] = useState(false);
  const [journeyStepIdx, setJourneyStepIdx] = useState(0); // index in flat session list
  const [journeyNotif, setJourneyNotif] = useState<string | null>(null);
  const [localFilterType, setLocalFilterType] = useState<
    "all" | "restaurant" | "hotel" | "attraction"
  >("all");
  
  const [itineraryHistory, setItineraryHistory] = useState<any[]>([]);
  const [searchTab, setSearchTab] = useState<"ai" | "local" | "history">("ai");
  const [isMuted, setIsMuted] = useState(false);
  const [navStatus, setNavStatus] = useState<"routing" | "arrived">("routing");
  const [navTargetName, setNavTargetName] = useState<string>("");
  // Stores the destination lat/lng when navigation starts (so we can keep the correct 2-point
  // route after closing the detail panel, instead of reverting to the full day route)
  const [navTargetCoords, setNavTargetCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [checkins, setCheckins] = useState<Record<string, boolean>>({});
  
  // Phase 19+20: Trip Journal State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [journeyMemories, setJourneyMemories] = useState<any[]>([]);
  const [isMemoriesLoaded, setIsMemoriesLoaded] = useState(false);
  const [isStateRestored, setIsStateRestored] = useState(false);
  const [showFinishTripModal, setShowFinishTripModal] = useState(false);

  useEffect(() => {
    const savedProv = localStorage.getItem("optiroute_selected_province");
    if (savedProv) setSelectedProvince(savedProv);
  }, []);

  useEffect(() => {
    if (selectedProvince) {
      localStorage.setItem("optiroute_selected_province", selectedProvince);
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("optiroute_journey_memories");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setJourneyMemories(parsed);
          }
        } catch (e) {}
      }
      // Ensure we mark as loaded only after potential state update
      setIsMemoriesLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Only save if we have successfully loaded the previous state from localStorage
    // to prevent wiping the storage with an empty initial state []
    if (isMemoriesLoaded && typeof window !== "undefined") {
      localStorage.setItem("optiroute_journey_memories", JSON.stringify(journeyMemories));
    }
  }, [journeyMemories, isMemoriesLoaded]);

  useEffect(() => {
    // Only auto-arrive if actively navigating and reached the final step
    if (isNavigating && navStatus === "routing" && activeStepIdx > 0 && activeStepIdx === navSteps.length - 1 && navSteps.length > 0) {
      handleArrived();
    }
  }, [activeStepIdx, isNavigating, navSteps.length, navStatus]);

  const handleSelectLocation = (loc: Activity) => {
    setActiveLocation(loc);
    // When previewing a location, stop any active navigation
    setIsNavigating(false);
    setNavStatus("routing");
    setNavTargetCoords(null);
  };

  const handleArrived = () => {
    setNavStatus("arrived");
    const displayPlace = activePlaceName || navTargetName || (lang === "vi" ? "địa điểm" : "your destination");
    if (!isMuted) {
      speakInstruction(lang === "vi" 
        ? `Chào mừng bạn đã đến ${displayPlace}. Chúc bạn có thời gian tuyệt vời tại đây!` 
        : `Welcome to ${displayPlace}. Have a great time!`);
    }
  };

  const handleNextLeg = () => {
    if (activeLocation) {
       handleCheckin();
    }
    
    // Advance using the dedicated tracker
    const nextIdx = journeyStepIdx + 1;
    const nextActivity = flatActivities[nextIdx];

    if (nextActivity) {
      setJourneyStepIdx(nextIdx);
      setActiveLocation(nextActivity);
      setNavStatus("routing");
      setActiveStepIdx(0);
    } else {
      setIsNavigating(false);
      showJourneyNotif(lang === "vi" ? "Đã đến điểm dừng cuối cùng!" : "Reached the final destination!");
    }
  };

  const handleCheckin = (locationToCheckin?: Activity) => {
    const loc = locationToCheckin || activeLocation;
    if (!loc || !itineraryResult) return;
    const key = getLocString(loc.place_name || loc.place, "en");
    setCheckins((prev) => ({ ...prev, [key]: true }));

    // Mark current as completed in persistent state
    const updated = itineraryResult.map((day, di) => {
      // Allow cross-day checkins if we pass locationToCheckin explicitly
      if (!locationToCheckin && di !== activeDayIdx) return day;
      const patchList = (arr: Activity[]) =>
        arr.map((a) => {
          const isMatch = getLocString(a.place_name || a.place, "en") === getLocString(loc.place_name || loc.place, "en");
          return isMatch ? { ...a, completed: true } : a;
        });

      if (day.sessions) {
        return {
          ...day,
          sessions: {
            morning: patchList([...(day.sessions.morning || [])]),
            afternoon: patchList([...(day.sessions.afternoon || [])]),
            evening: patchList([...(day.sessions.evening || [])]),
          },
        };
      }
      return {
        ...day,
        locations: patchList([...(day.locations || day.activities || [])]),
      };
    });
    setItineraryResult(updated);
    showJourneyNotif(lang === "vi" ? `✨ Thật tuyệt! Bạn đã check-in.` : "✨ Awesome! Checked-in.");
  };

  const handlePhotoCapture = (photoData: string, filterName: string) => {
    // ROOT CAUSE FIX: When navigation is active, activeLocation is set to null
    // (to close the detail panel). We must fall back to navTargetName/navTargetCoords
    // so photos taken during navigation are still attributed to the correct place.
    const resolvedPlace = activeLocation
      ? {
          place: getLocString(activeLocation.place_name || activeLocation.place, lang),
          lat: activeLocation.lat,
          lng: activeLocation.lng,
        }
      : (isNavigating && navTargetName)
      ? { place: navTargetName, lat: navTargetCoords?.lat, lng: navTargetCoords?.lng }
      : null;

    const placeName = resolvedPlace 
      ? (typeof resolvedPlace.place === 'string' ? resolvedPlace.place : resolvedPlace.place?.[lang as keyof LocalizedString]) || ""
      : "";

    if (!resolvedPlace || !placeName) {
      // Last resort: save with unknown location so the photo is never lost
      const unknownName = lang === "vi" ? "Địa điểm không xác định" : "Unknown Location";
      const newMemory = {
        id: Date.now().toString(),
        photoUrl: photoData,
        placeName: unknownName,
        filterName,
        timestamp: new Date().toLocaleTimeString(lang === "vi" ? "vi-VN" : "en-US", { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US"),
        aiCaption: lang === "vi" ? "Kỷ niệm của bạn." : "Your memory.",
        userNote: ""
      };
      setJourneyMemories((prev) => {
        const newArr = [newMemory, ...prev];
        if (typeof window !== "undefined") {
          localStorage.setItem("optiroute_journey_memories", JSON.stringify(newArr));
        }
        return newArr;
      });
      showJourneyNotif(lang === "vi" ? "📸 Đã lưu vào Nhật ký!" : "📸 Saved to Journal!");
      return;
    }

    // Now auto-checkin since the photo was successfully captured
    handleCheckin(resolvedPlace as any);

    const aiCaption = lang === "vi" 
      ? `Một khoảnh khắc tuyệt vời tại ${placeName}. Kỷ niệm này đã được lưu vào Nhật ký.` 
      : `A breathtaking moment at ${placeName}. This memory is safely saved in your Journal.`;

    const newMemory = {
      id: Date.now().toString(),
      photoUrl: photoData,
      placeName,
      filterName,
      timestamp: new Date().toLocaleTimeString(lang === "vi" ? "vi-VN" : "en-US", { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US"),
      aiCaption,
      userNote: ""
    };

    setJourneyMemories((prev) => {
      const newArr = [newMemory, ...prev];
      // Force direct localStorage write to prevent race conditions on SPA route transitions
      if (typeof window !== "undefined") {
        localStorage.setItem("optiroute_journey_memories", JSON.stringify(newArr));
      }
      return newArr;
    });
    showJourneyNotif(lang === "vi" ? "📸 Đã lưu vào Nhật ký!" : "📸 Saved to Journal!");
  };

  const showJourneyNotif = (msg: string) => {
    setJourneyNotif(msg);
    setTimeout(() => setJourneyNotif(null), 3500);
  };

  // Load from sessionStorage strictly on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedPrompt = sessionStorage.getItem("optiroute_search_query");
        if (savedPrompt) setPrompt(savedPrompt);

        // Core App State Restoration
        const savedAppState = sessionStorage.getItem("optiroute_session_state");
        if (savedAppState) {
          const parsedState = JSON.parse(savedAppState);
          if (parsedState.itineraryResult) {
            // Restore itinerary
            const migrated = parsedState.itineraryResult.map((d: any) => ({
              day_number: d.day_number || d.day || 1,
              title: d.title || {
                vi: `Ngày ${d.day || 1}`,
                en: `Day ${d.day || 1}`,
              },
              sessions: d.sessions, // Use existing sessions if any
              locations: (d.locations || d.activities || []).map((a: any) => ({
                ...a,
                place_name: a.place_name || a.place,
                category: a.category || "attraction",
              })),
            }));
            setItineraryResult(migrated);
          }
          if (parsedState.activeLocation) setActiveLocation(parsedState.activeLocation);
          if (parsedState.isNavigating !== undefined) setIsNavigating(parsedState.isNavigating);
          if (parsedState.activeStepIdx !== undefined) setActiveStepIdx(parsedState.activeStepIdx);
          if (parsedState.activeDayIdx !== undefined) setActiveDayIdx(parsedState.activeDayIdx);
          if (parsedState.journeyActive !== undefined) setJourneyActive(parsedState.journeyActive);
          if (parsedState.navStatus) setNavStatus(parsedState.navStatus);
          if (parsedState.navTargetName) setNavTargetName(parsedState.navTargetName);
          if (parsedState.checkins) setCheckins(parsedState.checkins);
          if (parsedState.journeyStepIdx !== undefined) setJourneyStepIdx(parsedState.journeyStepIdx);
          if (parsedState.searchMode) setSearchMode(parsedState.searchMode);
          if (parsedState.searchTab) setSearchTab(parsedState.searchTab);
        } else {
           // Fallback for old partial loads
           const savedItin = sessionStorage.getItem("optiroute_current_itinerary");
           if (savedItin) {
             const parsed = JSON.parse(savedItin);
             const migrated = parsed.map((d: any) => ({
               day_number: d.day_number || d.day || 1,
               title: d.title || { vi: `Ngày ${d.day || 1}`, en: `Day ${d.day || 1}` },
               locations: (d.locations || d.activities || []).map((a: any) => ({
                 ...a, place_name: a.place_name || a.place, category: a.category || "attraction",
               })),
             }));
             setItineraryResult(migrated);
           }
        }
      } catch (e) {
        console.error("Failed to restore session state", e);
      } finally {
        setIsStateRestored(true);
      }
    }
  }, []);

  // Save changes to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("optiroute_search_query", prompt);
    }
  }, [prompt]);

  // Unified State Persistence Trigger
  useEffect(() => {
    if (isStateRestored && typeof window !== "undefined" && itineraryResult) {
       const stateToSave = {
         itineraryResult,
         activeLocation,
         isNavigating,
         activeStepIdx,
         activeDayIdx,
         journeyActive,
         navStatus,
         navTargetName,
         checkins,
         journeyStepIdx,
         searchMode,
         searchTab
       };
       sessionStorage.setItem("optiroute_session_state", JSON.stringify(stateToSave));
       // Keep old compat just in case
       sessionStorage.setItem("optiroute_current_itinerary", JSON.stringify(itineraryResult));
    }
  }, [
    isStateRestored, itineraryResult, activeLocation, isNavigating, activeStepIdx, activeDayIdx, 
    journeyActive, navStatus, navTargetName, checkins, journeyStepIdx, searchMode, searchTab 
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedHistory = localStorage.getItem("optiroute_itinerary_history");
      if (savedHistory) {
        try { setItineraryHistory(JSON.parse(savedHistory)); } catch(e) { console.error(e); }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && itineraryHistory.length > 0) {
      localStorage.setItem("optiroute_itinerary_history", JSON.stringify(itineraryHistory));
    }
  }, [itineraryHistory]);

  const addToHistory = (plan: any, q: string) => {
    const entry = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(lang === "vi" ? "vi-VN" : "en-US"),
      prompt: q,
      result: plan,
      title: plan[0]?.title?.[lang] || q
    };
    setItineraryHistory(prev => [entry, ...prev.slice(0, 9)]); // Keep last 10
  };

  const speakInstruction = (text: string) => {
    if (isMuted || typeof window === "undefined" || !window.speechSynthesis) return;
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "vi" ? "vi-VN" : "en-US";
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleReset = () => {
    setPrompt("");
    setItineraryResult(null);
    setRouteGeoJSON(null);
    setLegs([]);
    setActiveLocation(null);
    setTransportMode("driving");
    setJourneyActive(false);
    setIsNavigating(false);
    setCheckins({});
    
    // Clear persistence safely
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("optiroute_search_query");
      sessionStorage.removeItem("optiroute_current_itinerary");
      sessionStorage.removeItem("optiroute_session_state");
    }
  };

  // Route data states
  const [routeGeoJSON, setRouteGeoJSON] = useState<FeatureCollection | null>(
    null,
  );
  // legs[i] = info between allLocations[i] and allLocations[i+1]
  const [legs, setLegs] = useState<LegInfo[]>([]);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);

  // New features state
  const [transportMode, setTransportMode] = useState<
    "driving" | "walking" | "cycling" | "motorcycle"
  >("driving");
  const [useGps, setUseGps] = useState(true); // Default ON — auto-request on mount
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<
    "pending" | "granted" | "denied" | "unsupported"
  >("pending");
  const [showGpsBanner, setShowGpsBanner] = useState(false); // Show banner after denied or first-time

  // Phase 19+ Interactive Review State
  const [reviewsByPlace, setReviewsByPlace] = useState<Record<string, Review[]>>({});
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Persistence for reviews
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("optiroute_reviews");
      if (saved) {
        try { setReviewsByPlace(JSON.parse(saved)); } catch (e) { console.error(e); }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && Object.keys(reviewsByPlace).length > 0) {
      localStorage.setItem("optiroute_reviews", JSON.stringify(reviewsByPlace));
    }
  }, [reviewsByPlace]);

  // Auto-request GPS on mount, silently track status
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsStatus("unsupported");
      setUseGps(false);
      return;
    }
    // Auto-request silently
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setUseGps(true);
        setGpsStatus("granted");
      },
      (err) => {
        console.warn("GPS auto-request denied:", err.code);
        setGpsStatus("denied");
        setUseGps(false);
        setShowGpsBanner(true); // Show friendly banner
      },
      { timeout: 8000, maximumAge: 60000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When user manually re-enables GPS (from banner)
  const handleRequestGps = () => {
    if (!("geolocation" in navigator)) return;
    setGpsStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setUseGps(true);
        setGpsStatus("granted");
        setShowGpsBanner(false);
        showJourneyNotif(
          lang === "vi"
            ? "📍 Đã bật định vị! Thông tin túyến sẽ chính xác hơn."
            : "📍 GPS enabled! Routes will be more accurate.",
        );
      },
      () => {
        setGpsStatus("denied");
        // Browser is blocking — guide to settings
        alert(
          lang === "vi"
            ? "Trình duyệt đang chặn quyền vị trí. Hãy vào Cài đặt trình duyệt > Quyền truy cập > Vị trí và cho phép trang này."
            : "Browser is blocking location. Go to Browser Settings > Permissions > Location and allow this site.",
        );
      },
      { timeout: 8000 },
    );
  };

  // Phase 17+19: Local Search via Mapbox Geocoding — Hardened for Vietnam
  const handleLocalSearch = async (query: string) => {
    if (!query.trim() || !MAPBOX_TOKEN) return;
    setIsGenerating(true);
    setError("");
    setItineraryResult(null);
    setLocalResults(null);
    setRouteGeoJSON(null);
    setLegs([]);

    try {
      // Phase 19 Fix: strict proximity + country=vn + POI types only
      const proximitySuffix = userLocation
        ? `&proximity=${userLocation.lng},${userLocation.lat}`
        : userLocation === null && "geolocation" in navigator
          ? "&proximity=108.2022,16.0544" // Default Da Nang center if no GPS yet
          : "";

      // Map filter to Mapbox POI category types – inclusive categories
      const typeMap: Record<string, string> = {
        all: "poi,landmark,place,neighborhood",
        restaurant: "poi",
        hotel: "poi",
        attraction: "poi,landmark",
      };
      const poiType = typeMap[localFilterType] || "poi,landmark";

      // Keyword modifier based on filter – refined for typical Vietnamese queries
      const filterKeyword: Record<string, string> = {
        restaurant: query.toLowerCase().includes("nhà hàng") || query.toLowerCase().includes("ăn") ? query : `nhà hàng ${query}`,
        hotel: query.toLowerCase().includes("khách sạn") || query.toLowerCase().includes("homestay") ? query : `khách sạn ${query}`,
        attraction: query.toLowerCase().includes("du lịch") || query.toLowerCase().includes("tham quan") ? query : `điểm tham quan ${query}`,
        all: query,
      };
      const searchQuery = filterKeyword[localFilterType] || query;

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=8&country=vn&types=${poiType}&language=vi${proximitySuffix}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) throw new Error("Search failed.");

      const results: Activity[] = data.features.map((f: any) => ({
        time: "Now",
        place_name: { vi: f.text || f.place_name, en: f.text || f.place_name },
        description: { vi: f.place_name || "", en: f.place_name || "" },
        lat: f.center[1],
        lng: f.center[0],
        category:
          localFilterType === "all" ? "attraction" : (localFilterType as any),
      }));

      setLocalResults(results);
    } catch (err) {
      setError(
        lang === "vi"
          ? "Không tìm thấy địa điểm nào gần đây."
          : "No nearby places found.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Phase 19+: Handle review submission
  const handleSubmitReview = () => {
    if (!activeLocation) return;
    const placeKey = getLocString(activeLocation.place_name || activeLocation.place, "en"); // Unique key
    const review: Review = {
      id: Date.now().toString(),
      user: (lang === "vi" ? "Người dùng Khách" : "Guest User"),
      rating: newRating,
      text: newComment,
      date: new Date().toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US")
    };

    setReviewsByPlace(prev => ({
      ...prev,
      [placeKey]: [review, ...(prev[placeKey] || [])]
    }));
    
    setNewComment("");
    setShowReviewForm(false);
    showJourneyNotif(lang === "vi" ? "✨ Đã gửi đánh giá của bạn!" : "✨ Review submitted!");
  };
  // Computed helper for the active place name
  const activePlaceName = useMemo(() => {
    if (!activeLocation) return "";
    return getLocString(activeLocation.place_name || activeLocation.place, lang);
  }, [activeLocation, lang]);

  // Phase 19+: Flatten all activities for the current day for sequential navigation
  const flatActivities = useMemo(() => {
    if (!itineraryResult || !itineraryResult[activeDayIdx]) return [];
    const day = itineraryResult[activeDayIdx];
    return day.sessions ? [
      ...(day.sessions.morning || []),
      ...(day.sessions.afternoon || []),
      ...(day.sessions.evening || [])
    ] : (day.locations || day.activities || []);
  }, [itineraryResult, activeDayIdx]);

  // Flatten activities for the map
  const allLocations = useMemo(() => {
    // PRIORITY 1: During active navigation, always use the LOCKED target coords (2-point route).
    // This prevents reverting to the full-day multi-stop route after closing the detail panel,
    // which was causing the wrong direction / winding route bug.
    if (isNavigating && navTargetCoords && userLocation) {
      return [
        {
          lat: userLocation.lat,
          lng: userLocation.lng,
          place: lang === "vi" ? "Vị trí của bạn" : "Your Location",
        },
        {
          lat: navTargetCoords.lat,
          lng: navTargetCoords.lng,
          place: navTargetName || (lang === "vi" ? "Điểm đến" : "Destination"),
        },
      ];
    }

    // PRIORITY 2: Detail panel open → direct user → selected place route.
    if (activeLocation && activeLocation.lat && activeLocation.lng) {
      const dest = {
        lat: activeLocation.lat,
        lng: activeLocation.lng,
        place: getLocString(activeLocation.place_name || activeLocation.place, lang),
        category: activeLocation.category,
      };

      if (useGps && userLocation) {
        return [
          {
            lat: userLocation.lat,
            lng: userLocation.lng,
            place: lang === "vi" ? "Vị trí của bạn" : "Your Location",
          },
          dest,
        ];
      }
      return [dest];
    }

    // Default AI Mode Trip View: Render only Active Day locations when no specific point is selected
    if (!itineraryResult || searchMode === "local") return [];
    
    const sourceArr =
      itineraryResult?.[activeDayIdx]?.locations ||
      itineraryResult?.[activeDayIdx]?.activities ||
      itineraryResult?.[activeDayIdx]?.sessions?.morning || // Ensure compatibility with session-based schema
      [];
    
    // Merge all sessions if they exist
    const day = itineraryResult[activeDayIdx];
    const allSessions = day.sessions ? [
      ...(day.sessions.morning || []),
      ...(day.sessions.afternoon || []),
      ...(day.sessions.evening || [])
    ] : sourceArr;

    const dests = allSessions
      .filter((act) => act.lat && act.lng)
      .map((act) => ({
        lat: act.lat as number,
        lng: act.lng as number,
        place: getLocString(act.place_name || act.place, lang),
        category: act.category,
      }));

    if (useGps && userLocation && dests.length > 0) {
      return [
        {
          lat: userLocation.lat,
          lng: userLocation.lng,
          place: lang === "vi" ? "Vị trí của bạn" : "Your Location",
        },
        ...dests,
      ];
    }
    return dests;
  }, [isNavigating, navTargetCoords, navTargetName, itineraryResult, searchMode, activeLocation, useGps, userLocation, lang, activeDayIdx]);


  // Fetch Directions API whenever allLocations changes and has 2+ points
  useEffect(() => {
    if (allLocations.length < 2 || !MAPBOX_TOKEN) {
      setRouteGeoJSON(null);
      setLegs([]);
      setNavSteps([]);
      return;
    }
    
    // Clear ALL old route data immediately before fetching new data.
    // This prevents the old multi-point route and new 2-point route from
    // rendering simultaneously, causing the "split route" visual bug.
    setRouteGeoJSON(null);
    setLegs([]);
    setNavSteps([]);

    const fetchRoute = async () => {
      setIsFetchingRoute(true);
      try {
        const coords = allLocations
          .map((loc) => `${loc.lng},${loc.lat}`)
          .join(";");
        // Mapbox profile mapping:
        // driving-traffic: car with live traffic
        // driving + exclude=motorway,toll: motorcycle (avoids highways & toll roads)
        // cycling: bicycle
        // walking: on foot
        const getProfileAndExcludes = () => {
          if (transportMode === "motorcycle") {
            return { profile: "driving", exclude: "motorway,toll" };
          }
          if (transportMode === "driving") {
            return { profile: "driving-traffic", exclude: "" };
          }
          return { profile: transportMode, exclude: "" };
        };
        const { profile, exclude } = getProfileAndExcludes();
        const excludeParam = exclude ? `&exclude=${exclude}` : "";
        const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?geometries=geojson&overview=full&steps=true&language=vi${excludeParam}&access_token=${MAPBOX_TOKEN}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok || !data.routes || data.routes.length === 0) {
          console.error("[Directions API] No route found:", data);
          return;
        }

        const route = data.routes[0];

        // Build GeoJSON FeatureCollection
        const geojson: FeatureCollection = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            },
          ],
        };
        setRouteGeoJSON(geojson);

        // Parse legs for timeline with realism buffers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsedLegs: LegInfo[] = route.legs.map((leg: any) => {
          const km = (leg.distance / 1000).toFixed(1);
          let rawSecs = leg.duration;
          
          // Realistic buffers to match Google Maps' conservative estimates
          if (transportMode === "walking") rawSecs *= 1.25; // Mapbox is too optimistic for walking
          if (transportMode === "cycling") rawSecs *= 1.15;
          
          const mins = Math.round(rawSecs / 60);
          return {
            distance: `${km} km`,
            rawMins: mins,
            duration: mins > 60 
              ? `${Math.floor(mins / 60)}h ${mins % 60}m` 
              : `${mins} min`,
          };
        });
        setLegs(parsedLegs);

        // Phase 17: Extract steps for navigation HUD
        const steps = route.legs.flatMap((leg: any) => leg.steps);
        setNavSteps(steps);
      } catch (err) {
        console.error("[Directions API] Failed to fetch route:", err);
      } finally {
        setIsFetchingRoute(false);
      }
    };

    fetchRoute();
  }, [allLocations, transportMode]);

  useEffect(() => {
    if (isNavigating && navSteps[activeStepIdx]) {
      const instruction = navSteps[activeStepIdx].maneuver.instruction;
      speakInstruction(instruction);
    }
  }, [activeStepIdx, isNavigating]);

  // Initial trigger from URL search param 'q'
  useEffect(() => {
    const q = searchParams?.get("q");
    if (q) {
      setPrompt(q);
      setTimeout(() => handleGenerate(q), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleGenerate = async (overridePrompt?: string) => {
    const textToGenerate = overridePrompt || prompt;
    if (!textToGenerate.trim()) return;

    // Phase 17: Local Branch
    if (searchMode === "local") {
      handleLocalSearch(textToGenerate);
      return;
    }

    setIsGenerating(true);
    setError("");
    setItineraryResult(null);
    setLocalResults(null);
    setRouteGeoJSON(null);
    setLegs([]);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Phase 19: Pass user GPS to AI for location-aware itinerary start
        body: JSON.stringify({
          prompt: textToGenerate,
          lang,
          userLat: userLocation?.lat,
          userLng: userLocation?.lng,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");

      // Phase 19 Migration: support sessions + locations + old activities
      const rawDays = data.data.days || data.data.itinerary || [];
      const migrated = rawDays.map((d: any) => {
        // If AI returned new sessions format
        if (d.sessions) {
          return {
            day_number: d.day_number || 1,
            title: d.title || {
              vi: `Ngày ${d.day_number || 1}`,
              en: `Day ${d.day_number || 1}`,
            },
            sessions: {
              morning: (d.sessions.morning || []).map((a: any) => ({
                ...a,
                place_name: a.place_name || a.place,
                category: a.category || "attraction",
              })),
              afternoon: (d.sessions.afternoon || []).map((a: any) => ({
                ...a,
                place_name: a.place_name || a.place,
                category: a.category || "restaurant",
              })),
              evening: (d.sessions.evening || []).map((a: any) => ({
                ...a,
                place_name: a.place_name || a.place,
                category: a.category || "hotel",
              })),
            },
          };
        }
        // Fallback: old locations/activities format
        return {
          day_number: d.day_number || d.day || 1,
          title: d.title || {
            vi: `Ngày ${d.day || 1}`,
            en: `Day ${d.day || 1}`,
          },
          locations: (d.locations || d.activities || []).map((a: any) => ({
            ...a,
            place_name: a.place_name || a.place,
            category: a.category || "attraction",
          })),
        };
      });

      setItineraryResult(migrated);
      addToHistory(migrated, textToGenerate);
      setActiveDayIdx(0);
      setJourneyActive(false);
      setJourneyStepIdx(0);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="flex h-[calc(100vh-64px)] bg-background overflow-hidden font-sans">
      {/* Phase 19: Journey Notification Toast */}
      <AnimatePresence>
        {journeyNotif && (
          <motion.div
            initial={{ opacity: 0, y: -30, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -30, x: "-50%" }}
            className="fixed top-24 left-1/2 z-[999] px-6 py-4 bg-slate-900/95 backdrop-blur-2xl border border-emerald-500/40 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 min-w-[320px]"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
               <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-white tracking-tight">{journeyNotif}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GPS Permission Banner — shown when user denied GPS */}
      <AnimatePresence>
        {showGpsBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-[72px] left-0 right-0 z-[90] flex justify-center px-4 pointer-events-none"
          >
            <div className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-slate-900/98 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white leading-snug">
                  {lang === "vi"
                    ? "Bật định vị để trải nghiệm tốt hơn"
                    : "Enable location for better experience"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                  {lang === "vi"
                    ? "App sẽ tính đường từ chỗ bạn đứng và đề xuất lịch trình chính xác hơn."
                    : "App will route from your location and give more accurate recommendations."}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleRequestGps}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-wide transition-all"
                >
                  {lang === "vi" ? "Bật GPS" : "Enable"}
                </button>
                <button
                  onClick={() => setShowGpsBanner(false)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & List Sidebar */}

      <div className="w-full lg:w-[450px] flex flex-col border-r border-border bg-background z-20">
        <div className="p-8 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {itinT.sidebarTitle}
              </h2>
              <p className="text-xs text-slate-500 font-medium tracking-wide">
                {itinT.sidebarSubtitle}
              </p>
            </div>
          </div>

          {/* Reset Action */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            title={
              lang === "vi"
                ? "Tạo chuyến đi mới (Xóa lịch trình hiện tại)"
                : "Start new trip (Clear current itinerary)"
            }
            className="group/reset relative w-10 h-10 rounded-2xl hover:bg-rose-500/10 flex items-center justify-center transition-colors border border-transparent hover:border-rose-500/20"
          >
            <Trash2 className="w-4 h-4 text-slate-600 group-hover/reset:text-rose-400 transition-colors" />
          </motion.button>

          {itineraryResult && !journeyActive && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setJourneyActive(true);
                setJourneyStepIdx(0);
                const firstAct = flatActivities[0];
                if (firstAct) setActiveLocation(firstAct);
                showJourneyNotif(
                  lang === "vi"
                    ? "🦭 Bắt đầu hành trình! Nhấn Check-in khi đến từng địa điểm."
                    : "🦭 Journey started! Tap Check-in at each stop.",
                );
              }}
              className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/20 transition-all group/start"
              title={lang === "vi" ? "Bắt đầu hành trình" : "Start Journey"}
            >
              <Navigation2
                className="w-4 h-4 text-emerald-400 group-hover/start:text-emerald-300"
                strokeWidth={2}
              />
            </motion.button>
          )}
          {journeyActive && (
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setJourneyActive(false);
                  showJourneyNotif(
                    lang === "vi" ? "Hủy hành trình." : "Journey cancelled.",
                  );
                }}
                className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500/20 transition-all"
                title={lang === "vi" ? "Dừng/Hoãn hành trình" : "Stop Journey"}
              >
                <span className="text-rose-400 text-xs font-black">⏸</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // Preemptively mark all completed (user requested fast-forward)
                  if (itineraryResult) {
                     const fullyCompleted = itineraryResult.map(day => {
                        const patchAll = (arr: any[]) => arr.map(a => ({ ...a, completed: true }));
                        if (day.sessions) {
                           return {
                              ...day,
                              sessions: {
                                morning: patchAll(day.sessions.morning || []),
                                afternoon: patchAll(day.sessions.afternoon || []),
                                evening: patchAll(day.sessions.evening || [])
                              }
                           };
                        }
                        return { ...day, locations: patchAll(day.locations || day.activities || []) };
                     });
                     setItineraryResult(fullyCompleted);
                  }
                  setShowFinishTripModal(true);
                }}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-indigo-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {lang === "vi" ? "Hoàn thành" : "Finish"}
              </motion.button>
            </div>
          )}
        </div>

        {/* Phase 17+19: Search Mode Toggle + Local Filter */}
        {/* Phase 20: Search Mode Tabs — Now with History Persistence */}
        <div className="px-6 pt-4 pb-2 space-y-2">
          <div className="flex p-1 bg-slate-900/60 rounded-xl border border-white/5">
            <button
              onClick={() => {
                setSearchTab("ai");
                setSearchMode("ai");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                searchTab === "ai"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {lang === "vi" ? "AI Planner" : "AI Planner"}
            </button>
            <button
              onClick={() => {
                setSearchTab("local");
                setSearchMode("local");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                searchTab === "local"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {lang === "vi" ? "Tìm quanh đây" : "Nearby"}
            </button>
            <button
              onClick={() => setSearchTab("history")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                searchTab === "history"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {lang === "vi" ? "Lịch sử" : "History"}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {searchTab === "history" && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3 pt-2"
              >
                {itineraryHistory.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto opacity-20">
                      <Clock className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">
                      {lang === "vi" ? "Chưa có lịch sử chuyến đi" : "No travel history yet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar pr-1">
                    {itineraryHistory.map((item) => (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => {
                          setItineraryResult(item.result);
                          setPrompt(item.prompt);
                          setSearchTab("ai");
                          setSearchMode("ai");
                          showJourneyNotif(
                            lang === "vi" 
                              ? "⚡ Đã khôi phục hành trình từ lịch sử!" 
                              : "⚡ Restored from history!"
                          );
                        }}
                        className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-black text-indigo-400/60 uppercase tracking-tighter bg-indigo-500/10 px-2 py-0.5 rounded-md">{item.date}</span>
                          <Sparkles className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs font-bold text-white line-clamp-1 mb-1 group-hover:text-indigo-300 transition-colors uppercase tracking-tight">{item.title}</p>
                        <p className="text-[10px] text-slate-500 italic line-clamp-1 border-l-2 border-white/5 pl-2">"{item.prompt}"</p>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {searchTab === "local" && (
              <motion.div 
                key="local"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-0.5"
              >
                {(
                  [
                    { key: "all", viLabel: "Tất cả", enLabel: "All" },
                    { key: "attraction", viLabel: "🌄 Du lịch", enLabel: "🌄 Attraction" },
                    { key: "restaurant", viLabel: "🍻 Nhà hàng", enLabel: "🍻 Restaurant" },
                    { key: "hotel", viLabel: "🏨 Khách sạn", enLabel: "🏨 Hotel" },
                  ] as { key: "all" | "attraction" | "restaurant" | "hotel"; viLabel: string; enLabel: string; }[]
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setLocalFilterType(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                      localFilterType === f.key
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-slate-900/50 text-slate-500 border-white/5 hover:border-slate-600"
                    }`}
                  >
                    {lang === "vi" ? f.viLabel : f.enLabel}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="space-y-6">
            {/* Phase 21: Province Context Selector */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                {lang === "vi" ? "Địa điểm mỏ neo (Tỉnh/Thành)" : "Anchor Location (Province)"}
              </span>
              <ProvinceSelector 
                selected={selectedProvince} 
                onSelect={setSelectedProvince} 
                lang={lang} 
              />
            </div>

            {/* Input Area */}
            <div className="relative group">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder={itinT.promptPlaceholder}
                className="w-full min-h-[160px] bg-slate-900/50 border border-white/10 rounded-[24px] p-6 text-sm leading-relaxed placeholder:text-slate-600 focus:bg-slate-900/80 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none shadow-inner"
              />
              <motion.button
                whileHover={{
                  scale: 1.05,
                  backgroundColor: "rgba(79, 70, 229, 1)",
                }}
                whileTap={{ scale: 0.95 }}
                disabled={isGenerating || !prompt.trim()}
                onClick={() => handleGenerate()}
                className="absolute bottom-5 right-5 p-3.5 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-500/20 disabled:opacity-30 disabled:scale-100 transition-all flex items-center justify-center"
              >
                {isGenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" strokeWidth={2} />
                )}
              </motion.button>
            </div>

            {/* Search Suggestion Chips */}
            {!itineraryResult && !isGenerating && (
              <SearchPromptChips
                province={selectedProvince}
                onSelect={(text) => {
                  setPrompt(text);
                  setTimeout(() => handleGenerate(text), 50);
                }}
              />
            )}

            {/* Options Toolbar (Always visible if not generating, or even when generating to show applied setting) */}
            <div className="flex items-center justify-between mt-2">
              {/* Transport Mode — now includes Motorcycle */}
              <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-white/5">
                {(
                  [
                    {
                      mode: "driving",
                      Icon: Car,
                      title: lang === "vi" ? "Ô tô" : "Car",
                    },
                    {
                      mode: "motorcycle",
                      Icon: Bike,
                      title:
                        lang === "vi"
                          ? "Xe máy (tránh cao tốc)"
                          : "Motorcycle (no highway)",
                    },
                    {
                      mode: "cycling",
                      Icon: Bike,
                      title: lang === "vi" ? "Xe đạp" : "Bicycle",
                    },
                    {
                      mode: "walking",
                      Icon: Footprints,
                      title: lang === "vi" ? "Đi bộ" : "Walking",
                    },
                  ] as {
                    mode: "driving" | "motorcycle" | "cycling" | "walking";
                    Icon: any;
                    title: string;
                  }[]
                ).map(({ mode, Icon, title }) => (
                  <button
                    title={title}
                    key={mode}
                    onClick={() => setTransportMode(mode)}
                    className={`p-2 rounded-lg transition-all relative ${
                      transportMode === mode
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {mode === "motorcycle" && (
                      <span className="absolute -top-1 -right-1 text-[7px] font-black bg-amber-500 text-slate-900 rounded-sm px-0.5">
                        M
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* GPS Status Indicator (replaces old toggle) */}
              <div
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold ${
                  gpsStatus === "granted"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : gpsStatus === "denied"
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400 cursor-pointer hover:bg-rose-500/20"
                      : "bg-slate-900/50 border-white/5 text-slate-500"
                }`}
                onClick={gpsStatus === "denied" ? handleRequestGps : undefined}
                title={
                  gpsStatus === "denied"
                    ? lang === "vi"
                      ? "Click để bật lại GPS"
                      : "Click to enable GPS"
                    : undefined
                }
              >
                <MapPin className="w-3.5 h-3.5" />
                {gpsStatus === "granted"
                  ? lang === "vi"
                    ? "GPS: Bật"
                    : "GPS: On"
                  : gpsStatus === "denied"
                    ? lang === "vi"
                      ? "GPS: Tắt"
                      : "GPS: Off"
                    : lang === "vi"
                      ? "GPS..."
                      : "GPS..."}
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs text-rose-400 font-medium"
              >
                {error}
              </motion.div>
            )}

            {/* Route fetching indicator */}
            {isFetchingRoute && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-xs text-slate-500"
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{itinT.calculatingRoute}</span>
              </motion.div>
            )}

            {/* Results Staggered List */}
            <AnimatePresence mode="popLayout">
              {!isGenerating &&
                (searchMode === "ai" ? !!itineraryResult : !!localResults) && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-8 pb-32"
                  >
                    {/* Phase 17/18: Branch between AI and Local List Rendering */}
                    {searchMode === "ai" && itineraryResult ? (
                      <div className="space-y-6">
                        {/* Day Tabs */}
                        {itineraryResult.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                            {itineraryResult.map((day, idx) => (
                              <button
                                key={`tab-${idx}`}
                                onClick={() => setActiveDayIdx(idx)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                                  activeDayIdx === idx
                                    ? "bg-indigo-600 text-white border-indigo-500 shadow-lg"
                                    : "bg-slate-900/50 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-slate-200"
                                }`}
                              >
                                {typeof day.title === "string"
                                  ? day.title
                                  : day.title?.[lang as "vi" | "en"] ||
                                    day.title?.vi ||
                                    `Day ${day.day_number || idx + 1}`}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Active Day Content — Session-aware rendering */}
                        {itineraryResult[activeDayIdx] &&
                          (() => {
                            const day = itineraryResult[activeDayIdx];

                            // Flat global step index tracker for journey mode
                            let globalStepIdx = 0;

                            const renderSession = (
                              sessionActs: Activity[],
                              sessionLabel: string,
                              sessionIcon: string,
                              bgClass: string,
                              borderClass: string,
                            ) => {
                              if (!sessionActs || sessionActs.length === 0)
                                return null;
                              return (
                                <div key={sessionLabel} className="space-y-1">
                                  {/* Session Divider */}
                                  <div
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-2 ${bgClass} border ${borderClass}`}
                                  >
                                    <span className="text-sm">
                                      {sessionIcon}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
                                      {sessionLabel}
                                    </span>
                                  </div>
                                  {sessionActs.map((act) => {
                                    const stepIdx = globalStepIdx++;
                                    const nextAct =
                                      flatActivities[
                                        stepIdx + 1
                                      ];
                                    const leg =
                                      nextAct &&
                                      act.lat &&
                                      act.lng &&
                                      nextAct.lat &&
                                      nextAct.lng &&
                                      legs[
                                        stepIdx +
                                          (useGps && userLocation ? 1 : 0)
                                      ]
                                        ? legs[
                                            stepIdx +
                                              (useGps && userLocation ? 1 : 0)
                                          ]
                                        : null;
                                    return (
                                      <PlaceItem
                                        key={stepIdx}
                                        act={act}
                                        leg={leg}
                                        activeLocation={activeLocation}
                                        setActiveLocation={handleSelectLocation}
                                        lang={lang}
                                        searchMode={searchMode}
                                        isCompleted={!!act.completed}
                                        isCurrentStep={
                                          journeyActive &&
                                          journeyStepIdx === stepIdx
                                        }
                                        onCheckin={handleCheckin}
                                        stepIndex={stepIdx}
                                      />
                                    );
                                  })}
                                </div>
                              );
                            };

                            return (
                              <motion.div
                                key={`day-content-${activeDayIdx}`}
                                variants={itemVariants}
                                initial="hidden"
                                animate="show"
                                className="space-y-4"
                              >
                                {useGps && userLocation && legs[0] && (
                                  <motion.div
                                    variants={legVariants}
                                    className="flex items-center gap-3 px-4 py-4 mb-2 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl shadow-inner"
                                  >
                                    <div className="p-2 bg-indigo-500/20 rounded-xl">
                                      <MapPin className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs font-bold text-slate-300">
                                        {lang === "vi"
                                          ? "Từ Vị trí của bạn"
                                          : "From Your Location"}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-1">
                                        {transportMode === "driving" ? (
                                          <Car className="w-3.5 h-3.5 text-indigo-400" />
                                        ) : transportMode === "cycling" ? (
                                          <Bike className="w-3.5 h-3.5 text-indigo-400" />
                                        ) : (
                                          <Footprints className="w-3.5 h-3.5 text-indigo-400" />
                                        )}
                                        <span className="text-[11px] font-bold text-indigo-400 tabular-nums">
                                          {legs[0]?.distance || ""}
                                        </span>
                                        <span className="mx-1 text-slate-600">
                                          ·
                                        </span>
                                        <span className="text-[11px] font-bold text-indigo-400 tabular-nums">
                                          {legs[0]?.duration || ""}
                                        </span>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}

                                {/* Journey mode tooltip */}
                                {journeyActive && (
                                  <div className="px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[10px] text-emerald-400 font-semibold">
                                    💡{" "}
                                    {lang === "vi"
                                      ? "Nhấn Check-in khi đến từng địa điểm để App dẫn bạn tới điểm tiếp theo."
                                      : "Tap Check-in at each stop so App guides you to the next."}
                                  </div>
                                )}

                                {/* New sessions format */}
                                {day.sessions ? (
                                  <>
                                    {renderSession(
                                      day.sessions.morning || [],
                                      lang === "vi" ? "Buổi Sáng" : "Morning",
                                      "☀️",
                                      "bg-amber-500/5 text-amber-300",
                                      "border-amber-500/15",
                                    )}
                                    {renderSession(
                                      day.sessions.afternoon || [],
                                      lang === "vi"
                                        ? "Buổi Chiều"
                                        : "Afternoon",
                                      "🌞",
                                      "bg-orange-500/5 text-orange-300",
                                      "border-orange-500/15",
                                    )}
                                    {renderSession(
                                      day.sessions.evening || [],
                                      lang === "vi" ? "Buổi Tối" : "Evening",
                                      "🌙",
                                      "bg-indigo-500/5 text-indigo-300",
                                      "border-indigo-500/15",
                                    )}
                                  </>
                                ) : (
                                  /* Fallback: flat locations list */
                                  (day.locations || day.activities || []).map(
                                    (act) => {
                                      const stepIdx = globalStepIdx++;
                                      const nextAct =
                                        flatActivities[
                                          stepIdx + 1
                                        ];
                                      const leg =
                                        nextAct &&
                                        act.lat &&
                                        act.lng &&
                                        nextAct.lat &&
                                        nextAct.lng &&
                                        legs[
                                          stepIdx +
                                            (useGps && userLocation ? 1 : 0)
                                        ]
                                          ? legs[
                                              stepIdx +
                                                (useGps && userLocation ? 1 : 0)
                                            ]
                                          : null;
                                      return (
                                        <PlaceItem
                                          key={stepIdx}
                                          act={act}
                                          leg={leg}
                                          activeLocation={activeLocation}
                                          setActiveLocation={handleSelectLocation}
                                          lang={lang}
                                          searchMode={searchMode}
                                          isCompleted={!!act.completed}
                                          isCurrentStep={
                                            journeyActive &&
                                            journeyStepIdx === stepIdx
                                          }
                                          onCheckin={handleCheckin}
                                          stepIndex={stepIdx}
                                        />
                                      );
                                    },
                                  )
                                )}
                              </motion.div>
                            );
                          })()}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-2 px-2">
                          <MapPin className="w-4 h-4 text-indigo-500" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
                            {lang === "vi"
                              ? "Kết quả gần đây"
                              : "Nearby Results"}
                          </span>
                        </div>
                        {localResults?.map((act, idx) => (
                          <PlaceItem
                            key={idx}
                            act={act}
                            activeLocation={activeLocation}
                            setActiveLocation={handleSelectLocation}
                            lang={lang}
                            searchMode={searchMode}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State */}
            {!isGenerating && !itineraryResult && !localResults && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center pt-20 text-center"
              >
                <div className="w-20 h-20 bg-indigo-500/5 border border-indigo-500/10 rounded-[32px] flex items-center justify-center mb-8">
                  <MapPin
                    className="w-8 h-8 text-indigo-500/30"
                    strokeWidth={2}
                  />
                </div>
                <h3 className="text-md font-bold text-foreground mb-1">
                  {itinT.emptyTitle}
                </h3>
                <p className="text-xs text-slate-500 max-w-[180px] leading-relaxed tracking-tight">
                  {itinT.emptySubtitle}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Place Detail Overlay / Community Reviews Panel (Phase 17) */}
      <AnimatePresence>
        {activeLocation && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-slate-950/95 backdrop-blur-xl border-l border-white/10 z-[100] p-8 shadow-2xl flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/20">
                {lang === "vi" ? "Chi tiết địa điểm" : "Place Details"}
              </span>
              <button
                onClick={() => handleSelectLocation(null as any)}
                className="p-2 hover:bg-white/5 rounded-xl transition-all"
              >
                <Trash2 className="w-5 h-5 text-slate-500 rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-white leading-tight">
                  {activePlaceName}
                </h2>
                {checkins[getLocString(activeLocation?.place_name || activeLocation?.place, "en")] && (
                   <motion.div
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     className="bg-emerald-500/20 p-1 rounded-full border border-emerald-500/30"
                   >
                     <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                   </motion.div>
                )}
              </div>
              {(() => {
                  const placeKey = getLocString(activeLocation?.place_name || activeLocation?.place, "en");
                  const currentReviews = reviewsByPlace[placeKey] || [];
                  const baseCount = 1200; // Simulated legacy reviews
                  const totalCount = baseCount + currentReviews.length;
                  const avgRating = currentReviews.length > 0 
                    ? ( (4.2 * baseCount) + currentReviews.reduce((sum: number, r: Review) => sum + r.rating, 0) ) / totalCount
                    : 4.2;
                  
                  return (
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                           <Star 
                             key={s} 
                             className={`w-4 h-4 ${s <= Math.round(avgRating) ? "fill-current" : "text-slate-700"}`} 
                           />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-white">{avgRating.toFixed(1)}</span>
                      <span className="text-xs text-slate-500">({totalCount >= 1000 ? (totalCount/1000).toFixed(1) + "k" : totalCount} {lang === "vi" ? "đánh giá" : "reviews"})</span>
                    </div>
                  );
                })()}

              <div className="space-y-4 mb-10">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <h4 className="flex items-center gap-2 text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wide">
                    <Sparkles className="w-3 h-3" />
                    {lang === "vi" ? "AI Tóm tắt" : "AI Insight"}
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed italic">
                    {lang === "vi"
                      ? `Đây là một địa điểm tuyệt vời để trải nghiệm ${activePlaceName}. Không gian thoáng đãng, dịch vụ được đánh giá cao và phù hợp cho chuyến đi của bạn.`
                      : `A great spot to experience ${activePlaceName}. Beautiful vibes and highly recommended.`}
                  </p>
                </div>

                <div className="p-4 bg-green-500/5 rounded-2xl border border-green-500/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-green-400 uppercase">
                      {lang === "vi" ? "Đang mở cửa" : "Open Now"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      08:00 - 22:00
                    </span>
                  </div>
                </div>
              </div>

              {/* Community Reviews Section — Interactive */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                    <MessageSquare className="w-4 h-4" />
                    {lang === "vi" ? "Cộng đồng" : "Community"}
                  </h3>
                  {!showReviewForm && (
                   <button 
                     onClick={() => setShowReviewForm(true)}
                     className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider"
                    >
                     {lang === "vi" ? "+ Gửi đánh giá" : "+ Add Review"}
                   </button>
                  )}
                </div>
                
                {showReviewForm && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-[28px] space-y-4"
                  >
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lang === "vi" ? "Xếp hạng của bạn" : "Your Rating"}</span>
                       <div className="flex gap-1.5">
                         {[1, 2, 3, 4, 5].map((star) => (
                           <button 
                             key={star} 
                             onClick={() => setNewRating(star)}
                             className="focus:outline-none transition-transform active:scale-90"
                           >
                             <Star 
                               className={`w-5 h-5 ${star <= newRating ? "text-amber-400 fill-current" : "text-slate-700"}`} 
                             />
                           </button>
                         ))}
                       </div>
                    </div>
                    
                    <textarea 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={lang === "vi" ? "Chia sẻ trải nghiệm của bạn..." : "Share your experience..."}
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl p-4 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 min-h-[80px] transition-all"
                    />
                    
                    <div className="flex gap-2">
                       <button 
                        onClick={() => setShowReviewForm(false)}
                        className="flex-1 py-3 px-4 bg-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:bg-slate-700 transition-all"
                       >
                         {lang === "vi" ? "HỦY" : "CANCEL"}
                       </button>
                       <button 
                        disabled={!newComment.trim()}
                        onClick={handleSubmitReview}
                        className="flex-[2] py-3 px-4 bg-indigo-600 rounded-xl text-[10px] font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
                       >
                         {lang === "vi" ? "GỬI ĐÁNH GIÁ" : "POST REVIEW"}
                       </button>
                    </div>
                  </motion.div>
                )}

                {/* Dynamic reviews list */}
                {(() => {
                  const placeKey = getLocString(activeLocation?.place_name || activeLocation?.place, "en");
                  const currentReviews = reviewsByPlace[placeKey] || [
                    { id: "m1", user: "User_123", rating: 4, text: lang === "vi" ? "Trải nghiệm rất tuyệt vời!" : "Great vibes here!", date: "12/04/2026" },
                    { id: "m2", user: "User_246", rating: 5, text: lang === "vi" ? "Phục vụ nhiệt tình, không gian đẹp." : "Excellent service, beautiful view.", date: "11/04/2026" }
                  ];

                  return currentReviews.map((rev: Review) => (
                    <div key={rev.id} className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                          {rev.user.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-white">{rev.user}</p>
                            <span className="text-[10px] text-slate-600 font-mono italic">{rev.date}</span>
                          </div>
                          <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-2.5 h-2.5 ${i < rev.rating ? "fill-current" : "text-slate-800"}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed pl-11">
                        {rev.text}
                      </p>
                    </div>
                  ));
                })()}

                {!showReviewForm && (
                  <button 
                    onClick={() => setShowReviewForm(true)}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl font-bold text-xs text-slate-400 transition-all"
                  >
                    {lang === "vi" ? "Viết đánh giá mới..." : "Write a new review..."}
                  </button>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-3">
              {/* Route summary before starting */}
              {(legs.length > 0 || (useGps && userLocation && legs[0])) &&
                (() => {
                  const totalDistance =
                    allLocations.length >= 2
                      ? legs
                          .reduce((sum, l) => sum + parseFloat(l.distance), 0)
                          .toFixed(1) + " km"
                      : null;
                  const totalDuration =
                    allLocations.length >= 2
                      ? (() => {
                          const totalMins = legs.reduce(
                            (sum, l) => sum + l.rawMins,
                            0,
                          );
                          return totalMins >= 60
                            ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}ph`
                            : `${totalMins} ph`;
                        })()
                      : null;
                  if (!totalDistance) return null;
                  return (
                    <div className="flex items-center justify-around px-4 py-3 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                      <div className="text-center">
                        <p className="text-lg font-black text-indigo-300">
                          {totalDistance}
                        </p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">
                          {lang === "vi" ? "Khoảng cách" : "Distance"}
                        </p>
                      </div>
                      <div className="w-px h-8 bg-white/5" />
                      <div className="text-center">
                        <p className="text-lg font-black text-indigo-300">
                          {totalDuration}
                        </p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">
                          {lang === "vi" ? "Thời gian" : "Duration"}
                        </p>
                      </div>
                      <div className="w-px h-8 bg-white/5" />
                      <div className="text-center">
                        <p className="text-lg font-black text-indigo-300">
                          {transportMode === "motorcycle"
                            ? "🏍"
                            : transportMode === "driving"
                              ? "🚗"
                              : transportMode === "cycling"
                                ? "🚲"
                                : "🚶"}
                        </p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">
                          {transportMode === "motorcycle"
                            ? lang === "vi"
                              ? "Xe máy"
                              : "Moto"
                            : transportMode === "driving"
                              ? lang === "vi"
                                ? "Ô tô"
                                : "Car"
                              : transportMode === "cycling"
                                ? lang === "vi"
                                  ? "Xe đạp"
                                  : "Bike"
                                : lang === "vi"
                                  ? "Đi bộ"
                                  : "Walk"}
                        </p>
                      </div>
                    </div>
                  );
                })()}

              <button
                onClick={() => {
                  if (navSteps.length > 0) {
                    setIsNavigating(true);
                    setActiveStepIdx(0);
                    // Lock in destination name AND coordinates before closing the panel.
                    // This is critical: after setActiveLocation(null), allLocations would revert
                    // to the full-day itinerary (many waypoints) causing wrong directions.
                    // navTargetCoords ensures we keep the 2-point (user → dest) accurate route.
                    setNavTargetName(activePlaceName);
                    setNavTargetCoords(
                      activeLocation?.lat && activeLocation?.lng
                        ? { lat: activeLocation.lat, lng: activeLocation.lng }
                        : null
                    );
                    setActiveLocation(null);
                    speakInstruction(lang === "vi" ? "Bắt đầu dẫn đường. Hãy lái xe an toàn." : "Starting navigation. Please drive safely.");
                  } else {
                    // Fallback: open Google Maps with current location if available
                    const origin = userLocation
                      ? `${userLocation.lat},${userLocation.lng}`
                      : "";
                    const dest = `${activeLocation.lat},${activeLocation.lng}`;
                    const modeParam =
                      transportMode === "walking"
                        ? "walking"
                        : transportMode === "cycling"
                          ? "bicycling"
                          : "driving";
                    const gmUrl = `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ""}&destination=${dest}&travelmode=${modeParam}`;
                    window.open(gmUrl, "_blank");
                  }
                }}
                disabled={isFetchingRoute}
                className="w-full h-14 bg-white text-slate-950 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-2xl active:scale-[0.98] disabled:opacity-50"
              >
                {isFetchingRoute ? (
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                ) : (
                  <Play className="w-5 h-5 fill-current text-indigo-600" />
                )}
                <span className="tracking-tight uppercase">
                  {navSteps.length > 0
                    ? lang === "vi"
                      ? "BẮT ĐẦU DẪN ĐƯỜNG"
                      : "START NAVIGATION"
                    : lang === "vi"
                      ? "MỞ BẢN ĐỒ DẪN ĐƯỜNG"
                      : "OPEN MAPS NAVIGATION"}
                </span>
              </button>
              <a
                href={`https://www.google.com/maps/dir/?api=1${userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : ""}&destination=${activeLocation.lat},${activeLocation.lng}`}
                target="_blank"
                className="w-full h-12 bg-slate-900 border border-white/10 rounded-2xl font-bold text-xs text-slate-400 flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
              >
                <MapIcon className="w-4 h-4" />
                {lang === "vi" ? "Mở Google Maps" : "Open Google Maps"}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 bg-slate-950 relative overflow-hidden">
        <MapComponent
          locations={allLocations}
          activeLocation={
            activeLocation &&
            activeLocation.lat !== undefined &&
            activeLocation.lng !== undefined
              ? {
                  lat: activeLocation.lat,
                  lng: activeLocation.lng,
                  place: activePlaceName,
                }
              : null
          }
          routeGeoJSON={routeGeoJSON}
          userLocation={userLocation}
          isNavigating={isNavigating}
          navFocusPoint={
            isNavigating && navSteps[activeStepIdx]
              ? {
                  lat: navSteps[activeStepIdx].maneuver.location[1],
                  lng: navSteps[activeStepIdx].maneuver.location[0],
                }
              : activeLocation && activeLocation.lat && activeLocation.lng
                ? { lat: activeLocation.lat, lng: activeLocation.lng }
                : null
          }
          targetPoint={
            // Show red destination pin:
            // - detail panel open → use activeLocation coords
            // - navigating (panel closed) → use locked navTargetCoords
            activeLocation && activeLocation.lat && activeLocation.lng
              ? { lat: activeLocation.lat, lng: activeLocation.lng }
              : (isNavigating && navTargetCoords)
                ? navTargetCoords
                : null
          }
        />

        {/* Phase 17: Navigation HUD UI */}
        <AnimatePresence>
          {isNavigating && navSteps.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-10 left-10 right-10 z-50 flex justify-center"
            >
              <div className="w-full max-w-3xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 shadow-2xl flex items-center gap-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${
                   navStatus === "arrived" ? "bg-green-600 shadow-green-500/40" : "bg-indigo-600 shadow-indigo-500/40"
                }`}>
                  {navStatus === "arrived" 
                    ? <MapIcon className="w-8 h-8 text-white" /> 
                    : <Navigation className="w-8 h-8 text-white animate-pulse" />
                  }
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                       navStatus === "arrived" ? "bg-green-500/20 text-green-400" : "bg-indigo-500/20 text-indigo-400"
                    }`}>
                      {navStatus === "arrived" 
                        ? (lang === "vi" ? "Đã đến nơi" : "Arrived") 
                        : (lang === "vi" ? "Đang dẫn đường" : "Navigating")
                      }
                    </span>
                    {navStatus === "routing" && (
                      <span className="text-xs text-slate-500 font-mono">
                        {lang === "vi" ? "Bước" : "Step"} {activeStepIdx + 1}/{navSteps.length}
                      </span>
                    )}
                  </div>
                  
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    {navStatus === "arrived" 
                      ? (
                        <>
                          <span className="line-clamp-1">{lang === "vi" ? `Bạn đã đến ${activePlaceName || navTargetName}` : `You've reached ${activePlaceName || navTargetName}`}</span>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        </>
                      )
                      : (navSteps[activeStepIdx]?.maneuver?.instruction || (lang === "vi" ? "Tiếp tục đi thẳng" : "Continue straight"))
                    }
                  </h4>

                  {navStatus === "routing" ? (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                       <Clock className="w-3 h-3" />
                       {lang === "vi" ? "Còn khoảng" : "Approx"}: <span className="text-indigo-400 font-bold">{legs[0]?.duration}</span>
                       <span className="mx-1">·</span>
                       <MapPin className="w-3 h-3" /> {legs[0]?.distance}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">
                       {lang === "vi" ? "Hãy tận hưởng thời gian của bạn. Bấm 'Đi tiếp' khi bạn sẵn sàng." : "Enjoy your time. Press 'Next Stop' when you are ready."}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {navStatus === "routing" ? (
                    <>
                      <button
                        onClick={() => setActiveStepIdx((prev) => Math.max(0, prev - 1))}
                        disabled={activeStepIdx === 0}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-20 transition-all border border-white/5"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setActiveStepIdx((prev) => Math.min(navSteps.length - 1, prev + 1))}
                        className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="w-px h-10 bg-white/10 mx-1" />
                      <button 
                        onClick={handleArrived}
                        className="px-4 h-11 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap"
                      >
                        {lang === "vi" ? "Tôi đã đến" : "I'm here"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          setIsCameraOpen(true);
                        }}
                        className={`flex items-center gap-2 px-5 h-12 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 ${
                          checkins[getLocString(activeLocation?.place_name || activeLocation?.place, "en")]
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-white text-slate-950 hover:bg-slate-100"
                        }`}
                      >
                        <Camera className="w-4 h-4" />
                        {(() => {
                           const count = journeyMemories.filter(m => m.placeName === activePlaceName).length;
                           if (count > 0) {
                             return lang === "vi" ? `Chụp thêm ảnh (${count})` : `Capture More (${count})`;
                           }
                           return lang === "vi" ? "Check-in & Ảnh" : "Check-in & Photo";
                        })()}
                      </button>
                      <button 
                        onClick={handleNextLeg}
                        className="flex items-center gap-2 px-5 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-500/30 transition-all"
                      >
                        {lang === "vi" ? "ĐIỂM TIẾP THEO" : "NEXT STOP"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  
                  <div className="w-px h-10 bg-white/10 mx-1" />
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-3 rounded-xl transition-all border ${
                      isMuted 
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={() => setIsNavigating(false)}
                  >
                    {lang === "vi" ? "Thoát" : "Exit"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 19+20: HD Camera Modal */}
        <HDCameraModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={handlePhotoCapture}
          lang={lang}
        />

        {/* Phase 21: Finish Trip Modal */}
        <AnimatePresence>
          {showFinishTripModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-emerald-500/30 rounded-[32px] p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden"
              >
                {/* Celebration Background Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
                
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 to-indigo-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                
                <h2 className="text-2xl font-black text-white mb-2">
                  {lang === "vi" ? "Chúc mừng!" : "Congratulations!"}
                </h2>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                  {lang === "vi" 
                    ? "Bạn đã hoàn thành tuyệt vời chuyến hành trình. Những kỷ niệm này đã được lưu vào Nhật Ký một cách an toàn." 
                    : "You've successfully completed your journey. Your memories are safely stored in your Journal."}
                </p>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowFinishTripModal(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
                  >
                    {lang === "vi" ? "Đóng" : "Close"}
                  </button>
                  <button
                    onClick={() => {
                      setShowFinishTripModal(false);
                      handleReset();
                    }}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-black hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
                  >
                    {lang === "vi" ? "Lên kế hoạch mới" : "Start New Trip"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Decorative Overlay for Depth */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.4)]" />
      </div>
    </div>
  );
}
