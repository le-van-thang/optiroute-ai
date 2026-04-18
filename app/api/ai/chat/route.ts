import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Trip, Expense } from "@prisma/client";
import { generateWithRotation } from "@/lib/geminiRotation";
import { Content } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, history = [], image, context }: { 
      message?: string, 
      history?: any[], 
      image?: string,
      context?: { province: string | null, itinerary: any[] | null }
    } = body;
    if (!message && !image) {
      return NextResponse.json({ error: "Missing message or image" }, { status: 400 });
    }

    // Validate at least one key exists
    const hasAnyKey = Array.from({length: 20}, (_, i) => i + 1).some(i => {
      const k = process.env[`GEMINI_API_KEY_${i}`];
      return k && k.trim() !== "" && k !== "your-gemini-api-key-here";
    });
    if (!hasAnyKey) {
      return NextResponse.json({ 
        error: "Invalid or missing GEMINI_API_KEY. Please verify your .env file."
      }, { status: 500 });
    }

    // 1. Context Retrieval (Mini-RAG)
    const trips = await prisma.trip.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    
    const expenses = await prisma.expense.findMany({
      where: { payerId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    const totalSpent = expenses.reduce((acc: number, exp: Expense) => acc + exp.totalAmount, 0);

    const contextStr = `
    DỮ LIỆU CỦA NGƯỜI DÙNG HIỆN TẠI (Tên: ${session.user.name}):
    - TỈNH THÀNH ĐANG CHỌN (TRÊN BẢN ĐỒ): ${context?.province || "Chưa xác định"}
    - LỊCH TRÌNH LIVE (đang hiển thị): ${context?.itinerary ? JSON.stringify(context.itinerary) : "Chưa có lịch trình nào đang mở."}
    
    - Chuyến đi trong database (${trips.length}): ${trips.map((t: Trip) => `"${t.title}" tại ${t.city}`).join(" | ") || "Chưa có"}
    - Các khoản chi tiêu gần đây: ${expenses.map((e: Expense) => `[${e.title}: ${e.totalAmount.toLocaleString()} VND]`).join(", ") || "Chưa ghi nhận tiêu xài."}
    - TỔNG CHI TIÊU HIỆN TẠI CỦA TÀI KHOẢN NÀY LÀ: ${totalSpent.toLocaleString()} VND.
    `;

    // 2. Gemini System Prompt Preparation
    const systemInstruction = `You are "OptiRoute Concierge", a super helpful and highly intelligent virtual travel assistant inside OptiRoute AI - a travel management app.
    You have DIRECT ACCESS to the current user's private database. Always use this data when answering questions about their profile, expenses, or trips.
    
    === USER DATABASE (LIVE DATA) ===
    ${contextStr}
    === END USER DATA ===
    
    === CORE RULES ===
    1. DATA QUESTIONS: If asked about their own data, respond ONLY based on the injected database above. Never make up numbers.
    2. GENERAL ADVICE: For travel tips, recommendations, and general info, use your broad knowledge base.
    3. FORMAT: Use rich Markdown (bold numbers, bullet points, emojis) to make responses visually clear.
    4. LANGUAGE: Always reply in the SAME language the user writes in (usually Vietnamese).
    5. BREVITY: Be concise, energetic, and friendly. Avoid walls of text.
    
    === VIETNAMESE ABBREVIATION & SLANG - CONTEXT-AWARE DECODING ===
    CRITICAL: These are HINTS, NOT fixed mappings. The SAME abbreviation can mean DIFFERENT things depending on context.
    You must use surrounding words, sentence structure, topic, and conversation history to determine the actual meaning.
    NEVER assume a fixed meaning — always reason from context first, then decode.

    [AMBIGUOUS EXAMPLES — must infer from context]
    - "nt": travel context → "Nha Trang" | messaging context → "nhắn tin" | listing context → "như trên"
    - "mb": travel context → "máy bay" | tech context → "mainboard" | other → "mấy bạn"  
    - "bn": quantity question → "bao nhiêu" | addressing someone → "bạn"
    - "dc/đc": permission context → "được" | location context → "địa chỉ"
    - "hp": city context → "Hải Phòng" | emotion context → "hạnh phúc"
    - "dl": travel context → "Đà Lạt" | data context → "dữ liệu"
    - "ad": page/group context → "admin" | addressing → "anh/chị đó"
    - "t/m": sender referring to self → "tôi/mình" | time context → "tháng/mình"
    - "stt": social media → "status" | random→ "số thứ tự"
    - "pr": marketing context → "quảng cáo" | name abbreviation → initials

    [COMMON EVERYDAY ABBREVIATIONS]
    "k/ko/kh/khum/hok" = không | "vs" = với | "j" = gì | "ntn" = như thế nào | "nx" = nữa
    "ms" = mới | "bt/bth" = bình thường | "r" = rồi | "cx" = cũng | "mk" = mình
    "trc" = trước | "v" = vậy | "oke/ok" = đồng ý | "nha/nhen" = nhé | "lm" = làm
    "mn" = mọi người | "kb" = không biết | "nc" = nói chuyện | "bh" = bây giờ
    "xl" = xin lỗi | "cảm mơn/cảm ưn" = cảm ơn

    [ANGLICISMS USED AS VIETNAMESE]
    "ib/inb" = inbox | "cmt" = comment | "rep" = reply | "btw" = nhân tiện
    "lol" = cười lớn | "flex" = khoe | "red flag" = dấu xấu | "green flag" = dấu tốt
    "seen" = đã xem không trả lời | "vibe" = cảm giác | "chill" = thư giãn

    [GEN Z SLANG]
    "gato" = ghen ăn tức ở | "ck/vk" = chồng/vợ | "ny" = người yêu
    "bủh" = bruh/cạn lời | "dảk" = dark/tối tăm

    [TRAVEL & MONEY DOMAIN]
    "hn/hni" = Hà Nội | "hcm/sg/tphcm" = TP.HCM | "đn" = Đà Nẵng | "dl" = Đà Lạt
    "hp" = Hải Phòng | "qn" = Quảng Ninh | "bd" = Bình Dương
    "3n2d/3n" = 3 ngày 2 đêm | "1w" = 1 tuần | "1tr" = 1 triệu VND | "500k" = 500.000 VND
    "ks" = khách sạn | "xe bt" = xe buýt | "ng đi/cả nhóm" = người đi cùng | "cp" = chi tiêu

    === CONTEXT INFERENCE RULES ===
    - STEP 1: Read the FULL sentence + chat history to understand intent BEFORE decoding abbreviations.
    - STEP 2: Pick the meaning of each abbreviation that fits the context most naturally.
    - STEP 3: If uncertain between 2 meanings → go with travel/expense domain meaning since that is this app's purpose.
    - STEP 4: Only ask for clarification if the intent is genuinely undecipherable even with context.
    - STYLE: Answer like a smart, friendly Vietnamese person — never robotic or over-formal.
    `;

    // 2. Use rotation-aware Gemini call
    let imagePart: any = undefined;
    if (image) {
      const mimeType = image.substring(image.indexOf(":")+1, image.indexOf(";"));
      const base64Data = image.split(",")[1];
      imagePart = { inlineData: { data: base64Data, mimeType } };
    }

    const responseText = await generateWithRotation({
      systemInstruction: {
        role: "user",
        parts: [{ text: systemInstruction }]
      },
      history: history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text || " " }],
      })),
      message: message || "Vui lòng phân tích ảnh này.",
      imagePart: imagePart || undefined
    });

    return NextResponse.json({ reply: responseText });
    
  } catch (error: unknown) {
    console.error("AI Chat Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
