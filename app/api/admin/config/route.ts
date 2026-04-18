import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Lấy cấu hình hệ thống
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Tự động tạo bản ghi nếu chưa có
    const config = await prisma.systemConfig.upsert({
      where: { id: "GLOBAL_CONFIG" },
      update: {},
      create: {
        siteName: "OptiRoute AI",
        maintenanceMode: false,
        allowRegistration: true,
        supportEmail: "support@optiroute.ai",
        adminNotifications: true,
      }
    });

    return NextResponse.json(config);
  } catch (error: any) {
    console.error("ADMIN_CONFIG_GET_ERROR:", error);
    return NextResponse.json({ error: "Lỗi máy chủ nội bộ." }, { status: 500 });
  }
}

// Cập nhật cấu hình hệ thống
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await req.json();

    // Sử dụng upsert để đảm bảo CHẮC CHẮN dữ liệu được lưu/tạo mới
    const updated = await prisma.systemConfig.upsert({
      where: { id: "GLOBAL_CONFIG" },
      update: {
        siteName: data.siteName,
        maintenanceMode: data.maintenanceMode,
        allowRegistration: data.allowRegistration,
        supportEmail: data.supportEmail,
        adminNotifications: data.adminNotifications,
      },
      create: {
        siteName: data.siteName,
        maintenanceMode: data.maintenanceMode,
        allowRegistration: data.allowRegistration,
        supportEmail: data.supportEmail,
        adminNotifications: data.adminNotifications,
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("ADMIN_CONFIG_PATCH_ERROR:", error);
    return NextResponse.json({ error: "Không thể lưu cấu hình." }, { status: 500 });
  }
}
