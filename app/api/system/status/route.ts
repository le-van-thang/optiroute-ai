import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
      select: {
        siteName: true,
        maintenanceMode: true,
        allowRegistration: true,
        supportEmail: true,
      }
    });

    return NextResponse.json(config ?? { maintenanceMode: false, allowRegistration: true });
  } catch (error: any) {
    // DB không khả dụng — trả về JSON hợp lệ thay vì crash
    console.warn("[System/Status] DB unavailable:", error.message);
    return NextResponse.json(
      { maintenanceMode: false, allowRegistration: true, _dbError: true },
      { status: 200 }  // 200 để client không bị crash
    );
  }
}
