import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateOTP, send2FAEmail, send2FASMS } from "@/lib/notifications";

/**
 * Hàm hỗ trợ tìm kiếm User linh hoạt (Bắc cầu)
 * Thử tìm theo ID trước, nếu thất bại thử tìm theo Email.
 */
async function findUserFlexible(id?: string, email?: string) {
  if (id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) return user;
  }
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) return user;
  }
  return null;
}

// GET /api/user/profile — Trả về thông tin user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRecord = await findUserFlexible(session?.user?.id, session?.user?.email as string);

    if (!userRecord) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Lấy đầy đủ thông tin kèm quan hệ
    const user = await prisma.user.findUnique({
      where: { id: userRecord.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        country: true,
        phone: true,
        twoFactorEnabled: true,
        twoFactorMethod: true,
        bankName: true,
        bankAccountNumber: true,
        createdAt: true,
        points: true,
        inventory: true,
        trips: {
          select: { id: true, title: true, createdAt: true, city: true }
        },
        groupMembers: {
          select: {
            id: true,
            trip: {
              select: { id: true, title: true, createdAt: true, city: true }
            }
          }
        }
      }
    });

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/user/profile — Cập nhật profile / Yêu cầu gửi mã 2FA
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRecord = await findUserFlexible(session?.user?.id, session?.user?.email as string);
    if (!userRecord) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { 
      name, image, country, phone, 
      twoFactorEnabled, twoFactorMethod, 
      bankName, bankAccountNumber 
    } = body;

    // --- Logic 2FA Đặc biệt ---
    // Nếu người dùng yêu cầu bật 2FA (từ false -> true)
    if (twoFactorEnabled === true && !userRecord.twoFactorEnabled) {
      const code = generateOTP();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

      // Lưu mã vào DB (nhưng chưa bật twoFactorEnabled)
      await prisma.user.update({
        where: { id: userRecord.id },
        data: {
          verificationCode: code,
          codeExpires: expires,
          twoFactorMethod: twoFactorMethod || userRecord.twoFactorMethod || "EMAIL"
        }
      });

      // Gửi mã thật
      const method = twoFactorMethod || userRecord.twoFactorMethod || "EMAIL";
      if (method === "EMAIL") {
        await send2FAEmail(userRecord.email, code);
      } else if (method === "SMS" && (phone || userRecord.phone)) {
        await send2FASMS(phone || userRecord.phone as string, code);
      } else {
        return NextResponse.json({ error: "Thiếu thông tin liên lạc để gửi mã" }, { status: 400 });
      }

      return NextResponse.json({ 
        requiresVerification: true, 
        message: "Mã xác thực đã được gửi. Vui lòng kiểm tra." 
      });
    }

    // --- Cập nhật Profile thông thường ---
    const updated = await prisma.user.update({
      where: { id: userRecord.id },
      data: {
        ...(name !== undefined && { name }),
        ...(image !== undefined && { image }),
        ...(country !== undefined && { country }),
        ...(phone !== undefined && { phone }),
        ...(twoFactorEnabled !== undefined && { twoFactorEnabled }),
        ...(twoFactorMethod !== undefined && { twoFactorMethod }),
        ...(bankName !== undefined && { bankName }),
        ...(bankAccountNumber !== undefined && { bankAccountNumber }),
        ...(body.lastActiveTripId !== undefined && { lastActiveTripId: body.lastActiveTripId }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        bankName: true,
        bankAccountNumber: true,
        lastActiveTripId: true,
        image: true,
        country: true,
        createdAt: true,
        points: true,
        inventory: true,
        phone: true,
        twoFactorEnabled: true,
        twoFactorMethod: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH PROFILE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
