import { NextResponse } from "next/server";
import { generateWithRotation } from "@/lib/geminiRotation";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Validate at least one key exists
    const hasAnyKey = [1,2,3,4,5].some(i => {
      const k = process.env[`GEMINI_API_KEY_${i}`];
      return k && k.trim() !== "" && k !== "your-gemini-api-key-here";
    });
    if (!hasAnyKey) {
      return NextResponse.json({ 
        error: "Invalid or missing GEMINI_API_KEY. Please verify your .env file." 
      }, { status: 500 });
    }

    const systemInstruction = `You are a professional travel planner. 
    You MUST respond with ONLY a raw JSON object string. 
    DO NOT include markdown code blocks like \`\`\`json. 
    DO NOT include any explanations, greetings, or trailing text. 
    The JSON must EXACTLY follow this schema:
    {"itinerary": [{"day": 1, "activities": [{"time": "08:00", "place": "Place Name", "description": "Short desc", "estimatedCost": 50000}]}]}
    Generate a highly realistic, optimal itinerary based on the user's prompt.`;

    const responseText = await generateWithRotation({
      systemInstruction: { role: "user", parts: [{ text: systemInstruction }] },
      history: [],
      message: `${systemInstruction}\n\nUser Request: ${prompt}`
    });
    const cleanedText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();

    try {
      const parsedData = JSON.parse(cleanedText);
      return NextResponse.json({ data: parsedData });
    } catch (parseError) {
      return NextResponse.json({ 
        error: "AI failed to generate a valid JSON format.", 
        rawBody: cleanedText 
      }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
