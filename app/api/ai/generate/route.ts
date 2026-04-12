import { NextResponse } from "next/server";
import { generateWithRotation } from "@/lib/geminiRotation";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

/**
 * Geocodes a place name using Mapbox Places API to get real, verified coordinates.
 * Falls back to AI-provided coordinates if geocoding fails.
 * This prevents AI from hallucinating coordinates for non-existent or moved places.
 */
async function geocodePlace(
  placeName: string,
  lang: string,
  aiLat?: number,
  aiLng?: number,
  biasLat?: number,
  biasLng?: number
): Promise<{ lat: number; lng: number; verified: boolean }> {
  if (!MAPBOX_TOKEN) {
    return { lat: aiLat ?? 0, lng: aiLng ?? 0, verified: false };
  }

  try {
    const query = encodeURIComponent(placeName);
    // Use proximity bias if we have a center point (e.g., the province center or user location)
    const proximityParam =
      biasLng && biasLat ? `&proximity=${biasLng},${biasLat}` : "";
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&country=vn&language=${lang}&limit=1&types=poi,landmark,place${proximityParam}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding API error: ${res.status}`);
    const data = await res.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng, verified: true };
    }
  } catch (e) {
    console.warn(`[Geocode] Could not verify "${placeName}":`, e);
  }

  // Fallback: return AI coordinates but mark as unverified
  return { lat: aiLat ?? 0, lng: aiLng ?? 0, verified: false };
}

/**
 * Enriches all activities in an itinerary with verified Mapbox coordinates.
 * Processes sessions in parallel for speed.
 */
async function geocodeItinerary(
  days: any[],
  lang: string
): Promise<any[]> {
  return Promise.all(
    days.map(async (day) => {
      if (!day.sessions) return day;

      const geocodeSession = async (activities: any[]) => {
        return Promise.all(
          activities.map(async (act) => {
            const name =
              typeof act.place_name === "object"
                ? act.place_name.vi || act.place_name.en || ""
                : act.place_name || act.place || "";

            if (!name) return act;

            // Use ANY known location in this day as a proximity bias for better results
            const firstActWithCoords = activities.find(
              (a) => a.lat && a.lng
            );
            const biasLat = firstActWithCoords?.lat;
            const biasLng = firstActWithCoords?.lng;

            const { lat, lng, verified } = await geocodePlace(
              name,
              lang,
              act.lat,
              act.lng,
              biasLat,
              biasLng
            );

            return {
              ...act,
              lat,
              lng,
              geocoded: verified,
            };
          })
        );
      };

      return {
        ...day,
        sessions: {
          morning: await geocodeSession(day.sessions.morning || []),
          afternoon: await geocodeSession(day.sessions.afternoon || []),
          evening: await geocodeSession(day.sessions.evening || []),
        },
      };
    })
  );
}

export async function POST(req: Request) {
  try {
    const { prompt, lang = "vi", userLat, userLng } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Validate at least one key exists
    const hasAnyKey = [1, 2, 3, 4, 5].some((i) => {
      const k = process.env[`GEMINI_API_KEY_${i}`];
      return k && k.trim() !== "" && k !== "your-gemini-api-key-here";
    });
    if (!hasAnyKey) {
      return NextResponse.json(
        { error: "Invalid or missing GEMINI_API_KEY. Please verify your .env file." },
        { status: 500 }
      );
    }

    const userLocationHint =
      userLat && userLng
        ? `The user's current GPS location is: latitude ${userLat}, longitude ${userLng}. Use this as the departure point for Day 1 Morning.`
        : "";

    const systemInstruction = `You are an expert local travel planner specializing in immersive, realistic trip itineraries.
    You MUST respond with ONLY a raw JSON object string.
    DO NOT include markdown code blocks like \`\`\`json.
    DO NOT include any explanations, greetings, or trailing text.
    MANDATORY: The "place_name", "title", "description" and "tip" fields must be objects with both "vi" (Vietnamese) and "en" (English) translations.
    ${userLocationHint}

    The JSON MUST follow EXACTLY this schema:
    {
      "days": [
        {
          "day_number": 1,
          "title": {"vi": "Khám phá trung tâm", "en": "City Center Exploration"},
          "sessions": {
            "morning": [
              {
                "place_name": {"vi": "Tên địa điểm", "en": "Place name"},
                "category": "attraction",
                "description": {"vi": "Mô tả", "en": "Description"},
                "tip": {"vi": "Gợi ý nhỏ", "en": "Small tip"},
                "lat": 16.0544,
                "lng": 108.2022,
                "time": "08:00"
              }
            ],
            "afternoon": [],
            "evening": []
          }
        }
      ]
    }

    STRICT SESSION RULES:
    - "morning" session: ONLY "attraction" type locations (sightseeing, parks, temples, nature).
    - "afternoon" session: MUST start with 1+ "attraction", then MUST include 1 "restaurant" for lunch.
    - "evening" session: MUST include 1 "restaurant" for dinner. For multi-day trips, MUST end with 1 "hotel".
    - For SINGLE-DAY trips: "evening" does NOT need a hotel.
    - "category" MUST be EXACTLY one of: "hotel", "restaurant", "attraction".
    - The "tip" field is a short, practical hint (e.g., "Đến sớm để tránh đông đúc", "Gọi thử món đặc sản ở đây").
    - IMPORTANT: Provide ONLY real, well-known establishments that are currently operating. Do NOT invent fictional places.
    - All lat/lng coordinates MUST be best-effort real coordinates for the actual location in Vietnam.
    - Itinerary must be spatially logical - locations within one session should be geographically close.`;

    const responseText = await generateWithRotation({
      systemInstruction: { role: "user", parts: [{ text: systemInstruction }] },
      history: [],
      message: `${systemInstruction}\n\nUser Request: ${prompt}`,
    });
    const cleanedText = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsedData = JSON.parse(cleanedText);
      const rawDays = parsedData.days || parsedData.itinerary || [];

      // 🗺️ Geocode all places using Mapbox to verify/correct AI coordinates
      const geocodedDays = await geocodeItinerary(rawDays, lang);

      return NextResponse.json({ data: { ...parsedData, days: geocodedDays } });
    } catch (parseError) {
      return NextResponse.json(
        { error: "AI failed to generate a valid JSON format.", rawBody: cleanedText },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
