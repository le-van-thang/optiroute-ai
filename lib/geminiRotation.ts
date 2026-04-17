/**
 * Gemini API Key Rotation Utility
 * Reads GEMINI_API_KEY_1 through GEMINI_API_KEY_5 from env.
 * Automatically rotates to next key on rate limit (429/503) errors.
 */

import { GoogleGenerativeAI, Content, Part, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Collect all valid keys from env (supports GEMINI_API_KEY_1 to GEMINI_API_KEY_20)
function getApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim() !== "" && key !== "your-gemini-api-key-here") {
      keys.push(key.trim());
    }
  }
  return keys;
}

// Check if an error is a quota/rate-limit/overload error
function isQuotaError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("service unavailable") ||
    msg.includes("high demand")
  );
}

interface GeminiRequest {
  modelName?: string;
  systemInstruction?: Content | string;
  history?: Content[];
  message: string;
  imagePart?: Part;
}

/**
 * Sends a Gemini chat request with automatic key rotation.
 * Tries each API key in sequence until one succeeds.
 */
export async function generateWithRotation(params: GeminiRequest): Promise<string> {
  const allKeys = getApiKeys();

  if (allKeys.length === 0) {
    throw new Error("Không tìm thấy GEMINI_API_KEY nào hợp lệ trong file .env");
  }

  // Load Balancing: Randomize the starting key index to distribute traffic
  // evenly across all available projects before hitting rate limits.
  const startIndex = Math.floor(Math.random() * allKeys.length);
  const keys = [...allKeys.slice(startIndex), ...allKeys.slice(0, startIndex)];

  let lastError: any = null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const keyLabel = `Key #${i + 1}`;

    try {
      console.log(`[Gemini Rotation] Thử ${keyLabel}...`);
      
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: params.modelName || "gemini-2.5-flash",
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 8192,
        }
      });

      const chatSession = model.startChat({
        history: params.history,
        systemInstruction: params.systemInstruction,
      });

      let result;
      if (params.imagePart) {
        result = await chatSession.sendMessage([params.message, params.imagePart]);
      } else {
        result = await chatSession.sendMessage(params.message);
      }

      console.log(`[Gemini Rotation] ${keyLabel} thành công!`);
      return result.response.text();

    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (isQuotaError(error)) {
        console.warn(`[Gemini Rotation] ${keyLabel} bị rate limit/overload → nghỉ 1s rồi thử key tiếp theo...`);
        // Add a small delay to avoid hammering the API
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // Non-quota error (auth, bad request, etc.) — rethrow immediately
      throw error;
    }
  }

  // All keys exhausted
  const finalErrorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Tất cả ${keys.length} API key đều đã hết quota hoặc bị overload. ` +
    `Vui lòng thêm key mới hoặc thử lại sau vài phút. ` +
    `(Lỗi cuối: ${finalErrorMessage})`
  );
}
