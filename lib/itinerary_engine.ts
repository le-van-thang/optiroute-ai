/**
 * OptiRoute Hybrid AI V2 - Itinerary & Budget Engine
 * Specialized in Spatial Routing (TSP) and Deterministic Budget Calculations.
 */

// ─── COST MATRIX & CONFIGURATION ──────────────────────────────────────────

const REGION_COST_MATRIX: Record<string, { meal: number; stay: number; transport_coeff: number }> = {
  VN: { meal: 100000, stay: 500000, transport_coeff: 1 },
  SEA_HIGH: { meal: 350000, stay: 1500000, transport_coeff: 2 },
  WESTERN: { meal: 800000, stay: 4000000, transport_coeff: 5 },
  OTHER: { meal: 200000, stay: 1000000, transport_coeff: 1.5 }
};

const BUDGET_MULTIPLIERS: Record<string, number> = {
  cheap: 0.5,
  medium: 1.0,
  luxury: 3.0
};

const BASE_TRANSPORT_RATES: Record<string, number> = {
  motorbike: 2000,
  car: 15000,
  taxi: 15000,
  walking: 0
};

// ─── UTILITIES ─────────────────────────────────────────────────────────────

/**
 * Calculates ground distance between two points using the Haversine formula (KM).
 */
export function calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Detects the geographic region group based on the city name.
 */
function detectRegion(city: any): string {
  if (!city) return "VN";
  
  // Handle if city is an object {vi: "...", en: "..."}
  const cityName = typeof city === "object" ? (city.vi || city.en || "") : city;
  const c = String(cityName).toLowerCase();
  
  const vnKeywords = ["ha noi", "ho chi minh", "da nang", "ha giang", "da lat", "phu quoc", "sai gon", "viet nam", "vietnam", "hue", "nha trang", "hoi an", "quang nam", "gia lai", "kon tum", "dak lak", "dak nong", "binh dinh", "quang ngai", "phu yen"];
  const seaHighKeywords = ["singapore", "bangkok", "kuala lumpur", "manila", "jakarta", "thailand", "malaysia", "indonesia"];
  const westernKeywords = ["london", "paris", "new york", "tokyo", "seoul", "sydney", "berlin", "usa", "europe", "japan", "korea"];

  if (vnKeywords.some(k => c.includes(k))) return "VN";
  if (seaHighKeywords.some(k => c.includes(k))) return "SEA_HIGH";
  if (westernKeywords.some(k => c.includes(k))) return "WESTERN";
  return "OTHER";
}

// ─── CORE ENGINES ────────────────────────────────────────────────────────

/**
 * Spatial TSP Router (Nearest Neighbor)
 * Sorts activities geographically to minimize travel time.
 */
export function sortPlacesTSP(places: any[], start: { lat: number; lng: number }): any[] {
  const sorted = [];
  const unvisited = [...places];
  let current = start;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist = calculateHaversine(current.lat, current.lng, unvisited[0].lat, unvisited[0].lng);

    for (let i = 1; i < unvisited.length; i++) {
      const d = calculateHaversine(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
      if (d < minDist) {
        minDist = d;
        nearestIdx = i;
      }
    }

    const picked = unvisited.splice(nearestIdx, 1)[0];
    sorted.push(picked);
    current = { lat: picked.lat, lng: picked.lng };
  }
  return sorted;
}

/**
 * Deterministic Budget Engine
 * Calculates costs based on Region Matrix, Budget Multipliers, and Distance.
 */
export function calculateBudgetDeterministically(params: {
  city: string;
  budgetLevel: string;
  daysCount: number;
  totalDistanceKm: number;
  transportMode: string;
  activitiesCount: number;
}) {
  const region = detectRegion(params.city);
  const matrix = REGION_COST_MATRIX[region];
  const multiplier = BUDGET_MULTIPLIERS[params.budgetLevel] || 1.0;
  const transRate = BASE_TRANSPORT_RATES[params.transportMode] || 2000;

  // 1. Accommodation Cost (N-1 nights)
  const stayCost = matrix.stay * multiplier * Math.max(1, params.daysCount - 1);

  // 2. Meal Cost (3 meals per day)
  const mealCost = matrix.meal * multiplier * (params.daysCount * 3);

  // 3. Transport Cost (Distance * BaseRate * RegionCoeff)
  const transportCost = params.totalDistanceKm * transRate * matrix.transport_coeff;

  // 4. Activities (Static estimate e.g. 50k per attraction * multiplier)
  const baseTicket = region === "VN" ? 50000 : 200000;
  const activitiesCost = params.activitiesCount * baseTicket * multiplier;

  return {
    food: Math.round(mealCost),
    stay: Math.round(stayCost),
    activities: Math.round(activitiesCost),
    transport: Math.round(transportCost),
    total: Math.round(stayCost + mealCost + transportCost + activitiesCost)
  };
}

/**
 * Groups a sorted list of activities into daily sessions (Morning, Afternoon, Evening).
 * v6: Fully flexible - handles any number of places and distributes evenly across requestedDays.
 * Always ensures Evening session has content (fallback from afternoon if needed).
 */
export function distributeToSessions(sortedPlaces: any[], requestedDays: number = 1): any[] {
  const days: any[] = [];
  
  // Realistic time slots per session
  const morningTimes = ["08:00", "09:30", "11:00"];
  const afternoonTimes = ["14:00", "15:30", "17:00"];
  const eveningTimes = ["19:00", "20:30", "22:00"];

  const totalPlaces = sortedPlaces.length;
  const targetPerDay = Math.ceil(totalPlaces / requestedDays);

  for (let dayIdx = 0; dayIdx < requestedDays; dayIdx++) {
    const start = dayIdx * targetPerDay;
    const end = Math.min(start + targetPerDay, totalPlaces);
    const chunk = sortedPlaces.slice(start, end);
    
    const dayNum = dayIdx + 1;
    const sMorning: any[] = [];
    const sAfternoon: any[] = [];
    const sEvening: any[] = [];

    const chunkSize = chunk.length;

    if (chunkSize === 0) {
      // Empty day — skip gracefully
      days.push({
        day_number: dayNum,
        title: { vi: `Ngày ${dayNum}`, en: `Day ${dayNum}` },
        sessions: { morning: [], afternoon: [], evening: [] },
      });
      continue;
    }

    if (chunkSize <= 3) {
      // Small chunk: put all in morning, ensure evening gets at least 1 fallback
      chunk.forEach((item, idx) => {
        sMorning.push({ ...item, time: morningTimes[idx] || "08:00" });
      });
    } else if (chunkSize <= 6) {
      // Medium: split between morning and afternoon
      const halfMorning = Math.ceil(chunkSize / 2);
      chunk.forEach((item, idx) => {
        if (idx < halfMorning) {
          sMorning.push({ ...item, time: morningTimes[idx] || "08:00" });
        } else {
          const aIdx = idx - halfMorning;
          sAfternoon.push({ ...item, time: afternoonTimes[aIdx] || "14:00" });
        }
      });
    } else {
      // Full 9+ items: distribute 3-3-3+
      chunk.forEach((item, idx) => {
        if (idx < 3) {
          sMorning.push({ ...item, time: morningTimes[idx] });
        } else if (idx < 6) {
          sAfternoon.push({ ...item, time: afternoonTimes[idx - 3] });
        } else {
          const eIdx = idx - 6;
          sEvening.push({ ...item, time: eveningTimes[eIdx] || "19:00" });
        }
      });
    }

    // Guarantee evening is never empty: pull last item from afternoon if needed
    if (sEvening.length === 0 && sAfternoon.length > 1) {
      const lastAfternoon = sAfternoon.pop()!;
      sEvening.push({ ...lastAfternoon, time: "19:00" });
    }

    days.push({
      day_number: dayNum,
      title: { vi: `Ngày ${dayNum}`, en: `Day ${dayNum}` },
      sessions: {
        morning: sMorning,
        afternoon: sAfternoon,
        evening: sEvening,
      },
    });
  }
  return days;
}
