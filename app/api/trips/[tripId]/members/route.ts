import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ tripId: string }> };

// GET /api/trips/[tripId]/members — Lấy danh sách GroupMember của trip
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!sessionUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Kiểm tra user có trong trip không
    const membership = await prisma.groupMember.findUnique({
      where: { tripId_userId: { tripId, userId: sessionUser.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden: not a member of this trip" }, { status: 403 });
    }

    const members = await prisma.groupMember.findMany({
      where: { tripId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            bankName: true,
            bankCode: true,
            bankAccountNumber: true,
            bankAccountName: true,
            image: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json(members);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/trips/[tripId]/members — Thêm thành viên mới vào trip
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { tripId } = await params;
    const { identifier } = await req.json();
    if (!identifier) return NextResponse.json({ error: "No identifier provided" }, { status: 400 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!sessionUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Kiểm tra quyền hạn: Chỉ Trưởng nhóm (Leader) mới được thêm thành viên
    const myMembership = await prisma.groupMember.findUnique({
      where: { tripId_userId: { tripId, userId: sessionUser.id } },
    });
    if (!myMembership || myMembership.role !== "LEADER") {
      return NextResponse.json({ error: "Forbidden: Only leader can add members" }, { status: 403 });
    }

    // Chuẩn hóa identifier (xóa # nếu có)
    let cleanIdentifier = identifier;
    if (identifier.startsWith("#")) {
      cleanIdentifier = identifier.substring(1);
    }

    // Tìm user muốn thêm (chỉ cho phép Email hoặc ID ngắn để đảm bảo chính xác)
    const userToAdd = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanIdentifier, mode: "insensitive" } },
          { id: { endsWith: cleanIdentifier.toLowerCase() } }
        ]
      }
    });

    if (!userToAdd) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Kiểm tra xem đã là thành viên chưa
    const existingMember = await prisma.groupMember.findUnique({
      where: { tripId_userId: { tripId, userId: userToAdd.id } },
    });

    if (existingMember) {
      return NextResponse.json({ error: "User is already a member of this trip" }, { status: 400 });
    }

    // Thêm vào nhóm
    const newMember = await prisma.groupMember.create({
      data: {
        tripId,
        userId: userToAdd.id,
        role: "MEMBER"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            bankName: true,
            bankCode: true,
            bankAccountNumber: true,
            bankAccountName: true,
            image: true,
          }
        }
      }
    });

    return NextResponse.json(newMember);
  } catch (error: any) {
    console.error("Error adding member:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/trips/[tripId]/members — Xóa thành viên khỏi trip
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { tripId } = await params;
    const { searchParams } = new URL(req.url);
    const userIdToRemove = searchParams.get("userId");

    if (!userIdToRemove) return NextResponse.json({ error: "User ID is required" }, { status: 400 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessionUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!sessionUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Kiểm tra quyền: Chỉ Leader mới được xóa người khác, hoặc Member tự rời khỏi nhóm
    const myMembership = await prisma.groupMember.findUnique({
      where: { tripId_userId: { tripId, userId: sessionUser.id } }
    });

    if (!myMembership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (myMembership.role !== "LEADER" && sessionUser.id !== userIdToRemove) {
      return NextResponse.json({ error: "Forbidden: Only leader can remove others" }, { status: 403 });
    }

    // Không cho phép xóa Leader (phải chuyển quyền hoặc xóa cả trip)
    const targetMembership = await prisma.groupMember.findUnique({
      where: { tripId_userId: { tripId, userId: userIdToRemove } }
    });
    if (targetMembership?.role === "LEADER" && sessionUser.id === userIdToRemove) {
      return NextResponse.json({ error: "Leader cannot leave without transferring ownership" }, { status: 400 });
    }

    await prisma.groupMember.delete({
      where: { tripId_userId: { tripId, userId: userIdToRemove } }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
