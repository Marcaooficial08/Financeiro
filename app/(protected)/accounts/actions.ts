"use server";

import { prisma } from "@/lib/prisma";
import { messages } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

function parseDecimalInput(raw: unknown): number {
  if (typeof raw !== "string" || raw.trim() === "") return 0;
  const normalized = raw.trim().replace(/\s/g, "").replace(/R\$/gi, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

const accountSchema = z.object({
  name: z.string().min(1, "O nome da conta é obrigatório").max(100, "Nome muito longo"),
  type: z.enum([
    "CHECKING",
    "SAVINGS",
    "CASH",
    "CREDIT_CARD",
    "INVESTMENT",
    "TICKET_MEAL",
    "TICKET_FUEL",
    "TICKET_AWARD",
    "OTHER",
  ]),
  balance: z.number().min(0, "O saldo inicial não pode ser negativo").max(9_999_999_999_999.99, "Valor acima do limite suportado").default(0),
});

const balanceUpdateSchema = z.object({
  balance: z.number().min(0, "O saldo não pode ser negativo").max(9_999_999_999_999.99, "Valor acima do limite suportado"),
});

const nameUpdateSchema = z.object({
  name: z.string().min(1, "O nome da conta é obrigatório").max(100, "Nome muito longo"),
});

const transferSchema = z.object({
  fromAccountId: z.string().min(1, "Selecione a conta de origem"),
  toAccountId: z.string().min(1, "Selecione a conta de destino"),
  amount: z
    .number()
    .positive("O valor deve ser positivo")
    .max(9_999_999_999_999.99, "Valor acima do limite suportado"),
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
      balance: parseDecimalInput(rawBalance),
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
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return { success: true, data: accounts };
  } catch (error) {
    console.error("Erro ao buscar contas:", error);
    return { success: false, error: "Erro ao buscar contas" };
  }
}

export async function updateAccountBalance(id: string, rawBalance: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const existing = await prisma.account.findFirst({ where: { id, userId } });
    if (!existing) {
      return { success: false, error: "Conta não encontrada" };
    }

    const data = balanceUpdateSchema.parse({ balance: parseDecimalInput(rawBalance) });

    await prisma.account.update({
      where: { id },
      data: { balance: data.balance },
    });

    revalidatePath("/accounts");
    return { success: true, message: "Saldo atualizado com sucesso!" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((item) => item.message).join(", ") };
    }
    console.error("Erro ao atualizar saldo:", error);
    return { success: false, error: messages.error.update };
  }
}

export async function updateAccountName(id: string, rawName: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const existing = await prisma.account.findFirst({ where: { id, userId } });
    if (!existing) {
      return { success: false, error: "Conta não encontrada" };
    }

    const data = nameUpdateSchema.parse({
      name: typeof rawName === "string" ? rawName.trim() : rawName,
    });

    if (data.name !== existing.name) {
      const conflict = await prisma.account.findFirst({
        where: { userId, name: data.name, NOT: { id } },
      });
      if (conflict) {
        return { success: false, error: "Já existe outra conta com este nome" };
      }
    }

    await prisma.account.update({
      where: { id },
      data: { name: data.name },
    });

    revalidatePath("/accounts");
    return { success: true, message: "Nome atualizado com sucesso!" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((item) => item.message).join(", ") };
    }
    console.error("Erro ao atualizar nome:", error);
    return { success: false, error: messages.error.update };
  }
}

export async function transferBalance(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const rawFrom = formData.get("fromAccountId");
    const rawTo = formData.get("toAccountId");
    const rawAmount = formData.get("amount");

    const data = transferSchema.parse({
      fromAccountId: typeof rawFrom === "string" ? rawFrom : "",
      toAccountId: typeof rawTo === "string" ? rawTo : "",
      amount: parseDecimalInput(rawAmount),
    });

    if (data.fromAccountId === data.toAccountId) {
      return { success: false, error: "As contas de origem e destino devem ser diferentes" };
    }

    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findFirst({ where: { id: data.fromAccountId, userId } }),
      prisma.account.findFirst({ where: { id: data.toAccountId, userId } }),
    ]);

    if (!fromAccount || !toAccount) {
      return { success: false, error: "Conta não encontrada" };
    }

    const fromBalance = Number(fromAccount.balance);
    if (data.amount > fromBalance) {
      return {
        success: false,
        error: `Saldo insuficiente na conta de origem. Saldo atual: R$ ${fromBalance.toFixed(2)}`,
      };
    }

    await prisma.$transaction([
      prisma.account.update({
        where: { id: data.fromAccountId },
        data: { balance: { decrement: data.amount } },
      }),
      prisma.account.update({
        where: { id: data.toAccountId },
        data: { balance: { increment: data.amount } },
      }),
    ]);

    revalidatePath("/accounts");
    return {
      success: true,
      message: `Transferência de R$ ${data.amount.toFixed(2)} de ${fromAccount.name} para ${toAccount.name} realizada!`,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((item) => item.message).join(", ") };
    }
    console.error("Erro ao transferir saldo:", error);
    return { success: false, error: "Erro ao transferir saldo" };
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
