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

// --- HELPERS (Phải có ở đây hoặc export từ lib) ---

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
    const requestedDays = dayMatch ? parseInt(dayMatch[1]) : 1;
    
    const promptHash = crypto.createHash("sha256").update(normalized + "_v5").digest("hex");

    const cached = await prisma.itineraryCache.findUnique({
      where: { promptHash }
    });

    if (cached) {
      console.log(`[Cache Hit] Serving v5 data for: ${normalized}`);
      return NextResponse.json({ data: cached.intentData });
    }

    const userLocationHint = userLat && userLng 
        ? `The user's current GPS location is: latitude ${userLat}, longitude ${userLng}.`
        : "";

    // --- STEP 3: Research-Grade Prompting (Pha 6.5: Ultra-Stable) ---
    const systemInstruction = `You are a professional Travel Journalist.
    MANDATORY Rules:
    1. Return ONLY raw JSON. NO markdown.
    2. Density: Provide EXACTLY 9 items per day (3 per session). Total items = 9 * ${requestedDays}.
    3. Dragon Bridge Tip: For Sat/Sun, MUST include: "Xem phun lửa và nước lúc 21h00".
    4. Magazine: Provide 4 detailed blocks (Intro, Hotels, Food, Landmarks). MUST be min 60 words each.
    5. Activities: BE CONCISE (max 25 words) to avoid truncation and fit the 45s limit.

    Schema:
    {
      "city": "string",
      "days_count": ${requestedDays},
      "magazine_wiki": { 
        "title": {"vi": "...", "en": "..."}, 
        "content_blocks": [{"heading": {"vi": "...", "en": "..."}, "body": {"vi": "...", "en": "..."}}] 
      },
      "suggested_places": [
        { "place_name": {"vi": "...", "en": "..."}, "category": "attraction", "description": {"vi": "...", "en": "..."}, "tip": {"vi": "...", "en": "..."} }
      ]
    }`;

    console.log(`[Regional Mode] Calling Gemini API for: ${normalized}`);
    const responseText = await generateWithRotation({
      systemInstruction: { role: "user", parts: [{ text: systemInstruction }] },
      message: `Prompt: ${prompt}. ${userLocationHint}`,
    });

    let leanData;
    try {
      // Phase 6.5: Advanced Fault-Tolerant JSON extraction
      let cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      // Fix unclosed strings first
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
      console.error("[JSON Fix Fail]:", responseText);
      return NextResponse.json({ error: "AI response was truncated." }, { status: 500 });
    }

    const targetCity = leanData.city || "Unknown City";
    const cityRes = await geocodePlace(targetCity, lang, 0, 0, userLat, userLng);
    const anchorLat = cityRes.lat || userLat || 0;
    const anchorLng = cityRes.lng || userLng || 0;

    const bbox = [anchorLng - 0.45, anchorLat - 0.45, anchorLng + 0.45, anchorLat + 0.45];

    const geocodedPlaces: any[] = [];
    const seenCoords = new Set<string>();

    for (const p of (leanData.suggested_places || [])) {
      const rawName = typeof p.place_name === "object" ? (p.place_name.vi || p.place_name.en) : p.place_name;
      const baseName = (rawName || "").split(/ và | and | & /i)[0].trim();
      if (!baseName) continue;
      
      let res = await geocodePlace(baseName, lang, 0, 0, anchorLat, anchorLng, bbox);
      const distFromAnchor = calculateHaversine(res.lat, res.lng, anchorLat, anchorLng);
      if (distFromAnchor > 50) {
          res = await geocodePlace(`${baseName}, ${targetCity}`, lang, 0, 0, anchorLat, anchorLng, bbox);
      }

      const coordKey = `${res.lat.toFixed(4)},${res.lng.toFixed(4)}`;
      if (!seenCoords.has(coordKey)) {
          geocodedPlaces.push({ ...p, lat: res.lat, lng: res.lng, geocoded: res.verified });
          seenCoords.add(coordKey);
      }
    }

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

    const finalDays = distributeToSessions(sortedPlaces.map((p, idx) => {
      const times = ["08:00", "14:00", "19:00"];
      return createActivityObj(p, times[idx % 3]);
    }));
    
    const finalResult = {
      ...leanData,
      days: finalDays,
      cost_breakdown: budget,
      total_estimated_cost: budget.total,
      magazine_wiki: leanData.magazine_wiki || { title: { vi: targetCity, en: targetCity }, content_blocks: [] }
    };

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // FIX: Đồng bộ với schema.prisma (query, city, intentData)
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
