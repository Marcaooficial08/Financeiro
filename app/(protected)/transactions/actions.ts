"use server";

import { prisma, type PrismaTx } from "@/lib/prisma";
import { messages } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getTransactionEffectForCategory } from "@/lib/transactions";
import { validateCategoryOnAccount } from "@/lib/defaults";
import { parseCalendarDate, todayLocalISO } from "@/lib/date";

function coerceCalendarDate(raw: unknown): Date {
  const iso =
    typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? raw
      : todayLocalISO();
  return parseCalendarDate(iso);
}

function parseDecimalInput(raw: unknown): number {
  if (typeof raw !== "string" || raw.trim() === "") return NaN;
  const normalized = raw.trim().replace(/\s/g, "").replace(/R\$/gi, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

const transactionSchema = z.object({
  amount: z.number().positive("O valor deve ser positivo").max(9_999_999_999_999.99, "Valor acima do limite suportado"),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().max(200, "A descrição deve ter menos de 200 caracteres").optional().default(""),
  date: z.date(),
  accountId: z.string().min(1, "Selecione uma conta"),
  categoryId: z.string().min(1, "Selecione uma categoria"),
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
      amount: parseDecimalInput(rawAmount),
      type: typeof rawType === "string" ? rawType as "INCOME" | "EXPENSE" : "EXPENSE",
      description: typeof rawDescription === "string" ? rawDescription.trim() : "",
      date: coerceCalendarDate(rawDate),
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

    // Roteamento categoria → tipo de conta (regras flexíveis em validateCategoryOnAccount).
    const validation = validateCategoryOnAccount(category.systemKey, account.type);
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }

    // Cálculo do efeito no saldo (Uber sempre debita).
    const effect = getTransactionEffectForCategory(data.type, data.amount, category.systemKey);

    // Guarda de saldo: qualquer movimentação que resulte em débito não pode exceder o saldo.
    if (effect < 0) {
      const accountBalance = Number(account.balance);
      if (Math.abs(effect) > accountBalance) {
        return {
          success: false,
          error: `Saldo insuficiente. Saldo atual: R$ ${accountBalance.toFixed(2)}`,
        };
      }
    }

    const result = await prisma.$transaction(async (tx: PrismaTx) => {
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

export async function updateTransaction(id: string, formData: FormData) {
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
      amount: parseDecimalInput(rawAmount),
      type: typeof rawType === "string" ? (rawType as "INCOME" | "EXPENSE") : "EXPENSE",
      description: typeof rawDescription === "string" ? rawDescription.trim() : "",
      date: coerceCalendarDate(rawDate),
      accountId: typeof rawAccountId === "string" ? rawAccountId : "",
      categoryId: typeof rawCategoryId === "string" ? rawCategoryId : "",
    });

    const existing = await prisma.transaction.findFirst({
      where: { id, userId },
      include: { account: true, category: true },
    });
    if (!existing) {
      return { success: false, error: "Transação não encontrada" };
    }

    const newAccount = await prisma.account.findFirst({
      where: { id: data.accountId, userId },
    });
    if (!newAccount) {
      return { success: false, error: "Conta não encontrada" };
    }

    const newCategory = await prisma.category.findFirst({
      where: { id: data.categoryId, userId, type: data.type },
    });
    if (!newCategory) {
      return {
        success: false,
        error: "Categoria não encontrada ou incompatível com o tipo da transação",
      };
    }

    const validation = validateCategoryOnAccount(
      newCategory.systemKey,
      newAccount.type,
    );
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }

    const oldEffect = getTransactionEffectForCategory(
      existing.type,
      Number(existing.amount),
      existing.category?.systemKey,
    );
    const newEffect = getTransactionEffectForCategory(
      data.type,
      data.amount,
      newCategory.systemKey,
    );

    const sameAccount = existing.accountId === data.accountId;

    if (newEffect < 0) {
      const available = sameAccount
        ? Number(newAccount.balance) - oldEffect
        : Number(newAccount.balance);
      if (Math.abs(newEffect) > available) {
        return {
          success: false,
          error: `Saldo insuficiente na conta destino. Saldo disponível: R$ ${available.toFixed(2)}`,
        };
      }
    }

    const result = await prisma.$transaction(async (tx: PrismaTx) => {
      if (sameAccount) {
        const delta = newEffect - oldEffect;
        if (delta !== 0) {
          await tx.account.update({
            where: { id: data.accountId, userId },
            data: { balance: { increment: delta } },
          });
        }
      } else {
        await tx.account.update({
          where: { id: existing.accountId, userId },
          data: { balance: { decrement: oldEffect } },
        });
        await tx.account.update({
          where: { id: data.accountId, userId },
          data: { balance: { increment: newEffect } },
        });
      }

      const updated = await tx.transaction.update({
        where: { id },
        data: {
          amount: data.amount,
          type: data.type,
          description: data.description,
          date: data.date,
          accountId: data.accountId,
          categoryId: data.categoryId,
        },
        include: { account: true, category: true },
      });

      return updated;
    });

    revalidatePath("/transactions");
    return { success: true, data: result, message: "Transação atualizada com sucesso!" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((item) => item.message).join(", "),
      };
    }
    console.error("Error updating transaction:", error);
    return { success: false, error: messages.error.update };
  }
}

export async function deleteTransaction(id: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const result = await prisma.$transaction(async (tx: PrismaTx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id, userId },
        include: {
          account: true,
          category: true,
        },
      });

      if (!transaction) {
        throw new Error("Transação não encontrada");
      }

      // Reverte exatamente o efeito originalmente aplicado, considerando a regra
      // especial do Uber (sempre debita) — do contrário Uber INCOME seria revertido errado.
      const effect = getTransactionEffectForCategory(
        transaction.type,
        Number(transaction.amount),
        transaction.category?.systemKey,
      );
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
