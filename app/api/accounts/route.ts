import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.account.findMany({
      where: { userId: token.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}