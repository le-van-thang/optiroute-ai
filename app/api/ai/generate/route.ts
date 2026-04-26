import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { generateWithRotation } from "@/lib/geminiRotation";
import { 
  distributeToSessions, 
  sortPlacesTSP,
  calculateHaversine,
  calculateBudgetDeterministically
} from "@/lib/itinerary_engine";
import crypto from "crypto";

const prisma = new PrismaClient();

/**
 * Geocodes a place name using Mapbox, strictly filtered by a BBox if provided.
 */
async function geocodePlace(name: string, lang: string, lat: number, lng: number, anchorLat?: number, anchorLng?: number, bbox?: number[]) {
  try {
    const proximity = anchorLat && anchorLng ? `&proximity=${anchorLng},${anchorLat}` : "";
    const bboxParam = bbox ? `&bbox=${bbox.join(",")}` : "";
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(name)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&limit=1&language=${lang}${proximity}${bboxParam}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.features && data.features.length > 0) {
      const feat = data.features[0];
      return {
        lat: feat.center[1],
        lng: feat.center[0],
        verified: true,
        place_name: feat.place_name
      };
    }
    return { lat: anchorLat || lat, lng: anchorLng || lng, verified: false, place_name: name };
  } catch (err) {
    return { lat: anchorLat || lat, lng: anchorLng || lng, verified: false, place_name: name };
  }
}

/**
 * Maps AI suggested items to UI-compatible activity objects.
 */
function createActivityObj(item: any, time: string) {
  return {
    id: crypto.randomUUID(),
    time,
    title: item.place_name,
    place: item.place_name,
    description: item.description,
    category: item.category || "attraction",
    lat: item.lat,
    lng: item.lng,
    tip: item.tip,
    geocoded: item.geocoded,
    completed: false
  };
}

function normalizePrompt(p: string) {
  return p.trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const { prompt, lang = "vi", userLat, userLng } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // --- STEP 1: Normalize & Check Cache ---
    const normalized = normalizePrompt(prompt);
    const dayMatch = prompt.match(/(\d+)\s*(ngày|day|d)/i);
    const requestedDays = dayMatch ? Math.min(parseInt(dayMatch[1]), 7) : 1; // Cap at 7 days
    
    // v6: bust old cache that had truncation issues
    const promptHash = crypto.createHash("sha256").update(normalized + `_v6_${requestedDays}d`).digest("hex");

    const cached = await prisma.itineraryCache.findUnique({
      where: { promptHash }
    });

    if (cached) {
      console.log(`[Cache Hit v6] Serving data for: ${normalized}`);
      return NextResponse.json({ data: cached.intentData });
    }

    const userLocationHint = userLat && userLng 
        ? `User GPS: lat=${userLat}, lng=${userLng}.`
        : "";

    // --- STEP 2: Smart Prompt - Compact but rich ---
    // Key fix: reduce magazine to avoid truncation, ask for per-day structure
    const ITEMS_PER_DAY = 9; // 3 morning + 3 afternoon + 3 evening
    const totalItems = ITEMS_PER_DAY * requestedDays;

    const systemInstruction = `You are an expert Vietnamese travel journalist. Respond ONLY in raw JSON (no markdown).

RULES:
- "city": main destination city name (string)
- "days_count": ${requestedDays}
- "magazine_wiki": short intro (1 block, max 40 words per section, vi+en)
- "suggested_places": EXACTLY ${totalItems} items total (${ITEMS_PER_DAY} per day × ${requestedDays} days)

DIVERSITY PER DAY (strict):
- Morning (items 0-2): 2 attractions + 1 restaurant (breakfast/brunch)
- Afternoon (items 3-5): 1 attraction + 1 entertainment + 1 restaurant (lunch)
- Evening (items 6-8): 1 hotel OR famous night spot + 1 entertainment/bar/walking area + 1 restaurant (dinner)

CATEGORY: must be one of: attraction | restaurant | hotel | entertainment

INTELLIGENT SUGGESTIONS:
- Only suggest places WITHIN the destination city/province (NOT neighboring provinces)
- Evening: if no beach → suggest night market, local bar, night walk, live music cafe
- Evening: if beach exists → suggest sunset beach walk, seafood dinner, night swimming area
- Always include 1 hotel recommendation per day group
- Tips must be actionable and local (max 20 words)
- Descriptions: vivid, traveler-friendly (max 30 words)

JSON Schema:
{
  "city": "string",
  "days_count": ${requestedDays},
  "magazine_wiki": {
    "title": {"vi": "...", "en": "..."},
    "content_blocks": [{"heading": {"vi": "...", "en": "..."}, "body": {"vi": "...", "en": "..."}}]
  },
  "suggested_places": [
    {"place_name": {"vi": "...", "en": "..."}, "category": "attraction|restaurant|hotel|entertainment", "description": {"vi": "...", "en": "..."}, "tip": {"vi": "...", "en": "..."}}
  ]
}`;

    console.log(`[AI Generate v6] ${requestedDays} days, ${totalItems} places for: ${normalized}`);
    const responseText = await generateWithRotation({
      systemInstruction: { role: "user", parts: [{ text: systemInstruction }] },
      message: `Trip request: "${prompt}". ${userLocationHint} Generate a ${requestedDays}-day itinerary with ${totalItems} places total.`,
    });

    let leanData;
    try {
      let cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      // Advanced fault-tolerant JSON repair
      const quoteCount = (cleanJson.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) cleanJson += '"';

      const openBraces = (cleanJson.match(/\{/g) || []).length;
      const closeBraces = (cleanJson.match(/\}/g) || []).length;
      if (openBraces > closeBraces) cleanJson += "}".repeat(openBraces - closeBraces);
      
      const openBrackets = (cleanJson.match(/\[/g) || []).length;
      const closeBrackets = (cleanJson.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) cleanJson += "]".repeat(openBrackets - closeBrackets);

      leanData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("[JSON Fix Fail]:", responseText.substring(0, 500));
      return NextResponse.json({ error: "AI response was truncated. Please try again." }, { status: 500 });
    }

    // Validate we got at least some places
    const rawPlaces = leanData.suggested_places || [];
    if (rawPlaces.length === 0) {
      return NextResponse.json({ error: "AI returned no places. Please try again." }, { status: 500 });
    }

    const targetCity = leanData.city || "Unknown City";
    // Phase 20 Fix: Geocode destination city WITHOUT user proximity to avoid Da Nang bias
    const cityRes = await geocodePlace(targetCity, lang, 0, 0); 
    const anchorLat = cityRes.lat || userLat || 0;
    const anchorLng = cityRes.lng || userLng || 0;

    // Wider bbox for provincial searches (e.g., Gia Lai is large)
    const bboxRadius = 1.2;
    const bbox = [anchorLng - bboxRadius, anchorLat - bboxRadius, anchorLng + bboxRadius, anchorLat + bboxRadius];

    const geocodedPlaces: any[] = [];
    const seenCoords = new Set<string>();

    for (const p of rawPlaces) {
      const rawName = typeof p.place_name === "object" ? (p.place_name.vi || p.place_name.en) : p.place_name;
      const baseName = (rawName || "").split(/ và | and | & /i)[0].trim();
      if (!baseName) continue;
      
      // Try with city suffix first for accuracy
      let res = await geocodePlace(`${baseName}, ${targetCity}`, lang, 0, 0, anchorLat, anchorLng, bbox);
      
      // If still too far from anchor, try without city suffix
      const distFromAnchor = calculateHaversine(res.lat, res.lng, anchorLat, anchorLng);
      if (distFromAnchor > 80) {
        res = await geocodePlace(baseName, lang, 0, 0, anchorLat, anchorLng, bbox);
      }

      const coordKey = `${res.lat.toFixed(3)},${res.lng.toFixed(3)}`;
      if (!seenCoords.has(coordKey)) {
        geocodedPlaces.push({ ...p, lat: res.lat, lng: res.lng, geocoded: res.verified });
        seenCoords.add(coordKey);
      }
    }

    // TSP sort per-day group to keep days coherent
    const sortedPlaces = sortPlacesTSP(geocodedPlaces, { lat: anchorLat, lng: anchorLng });

    let totalDist = 0;
    for (let i = 0; i < sortedPlaces.length - 1; i++) {
      totalDist += calculateHaversine(sortedPlaces[i].lat, sortedPlaces[i].lng, sortedPlaces[i+1].lat, sortedPlaces[i+1].lng);
    }

    const budget = calculateBudgetDeterministically({
      city: targetCity,
      budgetLevel: leanData.budget_level || "medium",
      daysCount: requestedDays,
      totalDistanceKm: totalDist,
      transportMode: "motorbike",
      activitiesCount: sortedPlaces.length
    });

    // Distribute to sessions - engine now handles variable item counts
    const finalDays = distributeToSessions(sortedPlaces.map((p) => {
      return createActivityObj(p, "00:00"); // Time reassigned by distributeToSessions
    }), requestedDays);
    
    const finalResult = {
      ...leanData,
      days_count: requestedDays,
      days: finalDays,
      cost_breakdown: budget,
      total_estimated_cost: budget.total,
      magazine_wiki: leanData.magazine_wiki || { title: { vi: targetCity, en: targetCity }, content_blocks: [] }
    };

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.itineraryCache.upsert({
      where: { promptHash },
      update: { intentData: finalResult as any, expiresAt },
      create: { 
        promptHash, 
        query: normalized, 
        city: targetCity, 
        intentData: finalResult as any, 
        expiresAt 
      }
    });

    return NextResponse.json({ data: finalResult });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
