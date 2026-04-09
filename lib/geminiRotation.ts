/**
 * Gemini API Key Rotation Utility
 * Reads GEMINI_API_KEY_1 through GEMINI_API_KEY_5 from env.
 * Automatically rotates to next key on rate limit (429/503) errors.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

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
function isQuotaError(error: any): boolean {
  const msg = (error?.message || "").toLowerCase();
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
  systemInstruction: any;
  history: any[];
  message: string;
  imagePart?: any;
}

/**
 * Sends a Gemini chat request with automatic key rotation.
 * Tries each API key in sequence until one succeeds.
 */
export async function generateWithRotation(params: GeminiRequest): Promise<string> {
  const keys = getApiKeys();

  if (keys.length === 0) {
    throw new Error("Không tìm thấy GEMINI_API_KEY nào hợp lệ trong file .env");
  }

  let lastError: any = null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const keyLabel = `Key #${i + 1}`;

    try {
      console.log(`[Gemini Rotation] Thử ${keyLabel}...`);
      
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: params.modelName || "gemini-2.5-flash",
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

    } catch (error: any) {
      lastError = error;

      if (isQuotaError(error)) {
        console.warn(`[Gemini Rotation] ${keyLabel} bị rate limit/overload → thử key tiếp theo...`);
        // Continue to next key
        continue;
      }

      // Non-quota error (auth, bad request, etc.) — rethrow immediately
      throw error;
    }
  }

  // All keys exhausted
  throw new Error(
    `Tất cả ${keys.length} API key đều đã hết quota hoặc bị overload. ` +
    `Vui lòng thêm key mới hoặc thử lại sau vài phút. ` +
    `(Lỗi cuối: ${lastError?.message})`
  );
}
