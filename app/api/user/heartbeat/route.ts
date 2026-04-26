import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Detect city from IP
    let city = "Đang xác định...";
    try {
      const forwarded = req.headers.get("x-forwarded-for");
      const userIp = forwarded ? forwarded.split(",")[0].trim() : null;
      
      // If localhost, just fetch the public IP of the network
      const url = userIp && userIp !== "::1" && userIp !== "127.0.0.1" 
        ? `http://ip-api.com/json/${userIp}` 
        : "http://ip-api.com/json/";

      const ipRes = await fetch(url);
      const ipData = await ipRes.json();
      
      if (ipData.status === "success") {
        city = ipData.city;
        console.log(`[Heartbeat] User: ${session.user.email} | IP: ${userIp || ipData.query} | City: ${city}`);
      } else {
        // Fallback service
        const fbRes = await fetch("https://ipapi.co/json/");
        const fbData = await fbRes.json();
        city = fbData.city || "Đang xác định...";
      }
    } catch (e) {
      console.error("GeoIP failed:", e);
    }

    // Update the lastActiveAt timestamp and lastCity
    await prisma.user.update({
      where: { email: session.user.email },
      data: { 
        lastActiveAt: new Date(),
        lastCity: city
      }
    });

    return NextResponse.json({ success: true, city, timestamp: new Date() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
