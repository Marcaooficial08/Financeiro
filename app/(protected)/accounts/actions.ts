"use server";

import { prisma } from "@/lib/prisma";
import { messages } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const accountSchema = z.object({
  name: z.string().min(2, "O nome da conta deve ter ao menos 2 caracteres"),
  type: z.enum(["CHECKING", "SAVINGS", "CASH", "CREDIT_CARD", "INVESTMENT", "OTHER"]),
  balance: z.number().min(0, "O saldo inicial não pode ser negativo").default(0),
});

export async function createAccount(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const rawName = formData.get("name");
    const rawType = formData.get("type");
    const rawBalance = formData.get("balance");

    const data = accountSchema.parse({
      name: typeof rawName === "string" ? rawName.trim() : rawName,
      type: typeof rawType === "string" ? rawType : undefined,
      balance: typeof rawBalance === "string" && rawBalance !== "" ? parseFloat(rawBalance) : 0,
    });

    await prisma.account.create({
      data: {
        name: data.name,
        type: data.type,
        balance: data.balance,
        userId,
      },
    });

    revalidatePath("/accounts");

    return { success: true, message: "Conta criada com sucesso!" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((item) => item.message).join(", ") };
    }

    console.error("Erro ao criar conta:", error);
    return { success: false, error: messages.error.create };
  }
}

export async function getAccounts() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: accounts };
  } catch (error) {
    console.error("Erro ao buscar contas:", error);
    return { success: false, error: "Erro ao buscar contas" };
  }
}

export async function deleteAccount(id: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const existingAccount = await prisma.account.findFirst({
      where: { id, userId },
    });
    if (!existingAccount) {
      return { success: false, error: messages.error.delete };
    }

    await prisma.account.delete({ where: { id } });

    revalidatePath("/accounts");
    return { success: true, message: "Conta excluída com sucesso!" };
  } catch (error) {
    console.error("Error deleting account:", error);
    return { success: false, error: messages.error.delete };
  }
}
