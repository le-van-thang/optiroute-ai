import { NextResponse } from "next/server";
import { generateWithRotation } from "@/lib/geminiRotation";

export async function POST(req: Request) {
  try {
    const { prompt, lang = "vi" } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const systemInstruction = `You are an AI Travel Logician. Your job is to parse a natural language trip request into structured data.
    
    CRITICAL:
    - If the user doesn't specify a duration, suggest a reasonable one (usually 3 days for cities, 2 days for short trips).
    - Standardize the city name (e.g., "Sài Gòn" -> "Ho Chi Minh City", "Hà Nội" -> "Hanoi").
    - The "wiki" field should be a professional, engaging magazine-style article in ${lang === "vi" ? "Vietnamese" : "English"} about the destination (300-500 words).
    - "intent" should be one of: "Discovery", "Relaxation", "Adventure", "Foodie", "Party", "Shopping".
    
    Response format: ONLY raw JSON.
    {
      "title": "A short catchy title for the trip",
      "city": "Standardized City Name",
      "intent": "The intent",
      "days": number of days,
      "estimatedBudgetPerDay": number (in VND),
      "wiki": "The magazine article content..."
    }`;

    const responseText = await generateWithRotation({
      systemInstruction: { role: "user", parts: [{ text: systemInstruction }] },
      message: `Parse this trip request: "${prompt}"`,
    });

    const cleanedText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleanedText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Trip AI Parse Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
