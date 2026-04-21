"use server";

import { prisma } from "@/lib/prisma";
import { messages } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getTransactionEffect } from "@/lib/transactions";

const transactionSchema = z.object({
  amount: z.number().positive("O valor deve ser positivo"),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().max(200, "A descrição deve ter menos de 200 caracteres"),
  date: z.date(),
  accountId: z.string(),
  categoryId: z.string(),
});

export async function createTransaction(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const rawAmount = formData.get("amount");
    const rawType = formData.get("type");
    const rawDescription = formData.get("description");
    const rawDate = formData.get("date");
    const rawAccountId = formData.get("accountId");
    const rawCategoryId = formData.get("categoryId");

    const data = transactionSchema.parse({
      amount: typeof rawAmount === "string" ? parseFloat(rawAmount) : 0,
      type: typeof rawType === "string" ? rawType as "INCOME" | "EXPENSE" : "EXPENSE",
      description: typeof rawDescription === "string" ? rawDescription.trim() : "",
      date: typeof rawDate === "string" ? new Date(rawDate) : new Date(),
      accountId: typeof rawAccountId === "string" ? rawAccountId : "",
      categoryId: typeof rawCategoryId === "string" ? rawCategoryId : "",
    });

    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId },
    });
    if (!account) {
      return { success: false, error: "Conta não encontrada" };
    }

    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, userId, type: data.type },
    });
    if (!category) {
      return { success: false, error: "Categoria não encontrada ou incompatível com o tipo da transação" };
    }

    if (data.type === "EXPENSE" && data.amount > 0) {
      const accountBalance = Number(account.balance);
      if (data.amount > accountBalance) {
        return { success: false, error: `Saldo insuficiente. Saldo atual: R$ ${accountBalance.toFixed(2)}` };
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amount: data.amount,
          type: data.type,
          description: data.description,
          date: data.date,
          userId,
          accountId: data.accountId,
          categoryId: data.categoryId,
        },
        include: {
          account: true,
          category: true,
        },
      });

      const effect = getTransactionEffect(data.type, data.amount);
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: effect,
          },
        },
      });

      return transaction;
    });

    revalidatePath("/transactions");
    return { success: true, data: result, message: "Transação criada com sucesso!" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((item) => item.message).join(", ") };
    }
    console.error("Error creating transaction:", error);
    return { success: false, error: messages.error.create };
  }
}

export async function getTransactions() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        account: true,
        category: true,
      },
      orderBy: { date: "desc" },
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return { success: false, error: "Erro ao buscar transações" };
  }
}

export async function deleteTransaction(id: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id, userId },
        include: {
          account: true,
        },
      });

      if (!transaction) {
        throw new Error("Transação não encontrada");
      }

      const effect = getTransactionEffect(transaction.type, Number(transaction.amount));
      await tx.account.update({
        where: { id: transaction.accountId, userId },
        data: {
          balance: {
            decrement: effect,
          },
        },
      });

      await tx.transaction.delete({ where: { id } });
      return transaction;
    });

    revalidatePath("/transactions");
    return { success: true, data: result, message: "Transação excluída com sucesso!" };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return { success: false, error: messages.error.delete };
  }
}