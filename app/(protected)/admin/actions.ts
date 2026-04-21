'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "ADMIN") {
    throw new Error("Acesso negado: permissão de administrador necessária");
  }
  return session;
}

export async function getUsers() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
}

export async function updateUserRole(
  userId: string,
  role: 'USER' | 'ADMIN'
) {
  try {
    await requireAdmin();
    // Prevent removing the last admin? Optional.
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });
    if (role === 'USER' && adminCount <= 1) {
      // Fetch the user to see if they are an admin
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role === 'ADMIN') {
        return { success: false, error: "Cannot remove the last administrator" };
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    revalidatePath("/(protected)/admin/users");
    return { success: true, user: updated };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}

// Optional: basic system stats
export async function getSystemStats() {
  try {
    await requireAdmin();
    const [
      userCount,
      adminCount,
      transactionCount,
      accountCount,
      categoryCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.transaction.count(),
      prisma.account.count(),
      prisma.category.count(),
    ]);

    return {
      userCount,
      adminCount,
      transactionCount,
      accountCount,
      categoryCount,
    };
  } catch (error) {
    console.error("Error fetching system stats:", error);
    throw new Error("Failed to fetch system stats");
  }
}