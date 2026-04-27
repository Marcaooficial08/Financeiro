"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type TransactionType = "INCOME" | "EXPENSE";

type MonthlySummaryRow = {
  year: number;
  month: number;
  totalIncome: number | string;
  totalExpense: number | string;
  netBalance: number | string;
  savingsRate: number | string | null;
};

type MonthlyGroupRow = {
  year: number;
  month: number;
  totalIncome: number | string;
  totalExpense: number | string;
};

type CategoryExpenseRow = {
  categoryName: string;
  categoryType: string;
  totalAmount: number | string;
  transactionCount: number | string | bigint;
};

async function requireOwnership(userId: string) {
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!sessionUserId || sessionUserId !== userId) {
    throw new Error("Acesso negado");
  }
}

export async function getMonthlySummary(
  userId: string,
  filters: {
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  try {
    await requireOwnership(userId);

    const params: unknown[] = [userId];
    let idx = 2;
    let dateClause = "";

    if (filters.startDate) {
      dateClause += ` AND "date" >= $${idx++}`;
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      dateClause += ` AND "date" <= $${idx++}`;
      params.push(filters.endDate);
    }

    const raw = await prisma.$queryRawUnsafe<MonthlySummaryRow[]>(
      `SELECT
        EXTRACT(YEAR FROM "date")::int AS year,
        EXTRACT(MONTH FROM "date")::int AS month,
        SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END) AS "totalIncome",
        SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" ELSE 0 END) AS "totalExpense",
        SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE -"amount" END) AS "netBalance",
        CASE
          WHEN SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END) = 0 THEN NULL
          ELSE (
            SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END) -
            SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" ELSE 0 END)
          ) / SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END) * 100
        END AS "savingsRate"
      FROM "Transaction"
      WHERE "userId" = $1${dateClause}
      GROUP BY EXTRACT(YEAR FROM "date"), EXTRACT(MONTH FROM "date")
      ORDER BY year DESC, month DESC`,
      ...params
    );

    return raw.map((row: MonthlySummaryRow) => ({
      year: row.year,
      month: row.month,
      totalIncome: Number(row.totalIncome),
      totalExpense: Number(row.totalExpense),
      netBalance: Number(row.netBalance),
      savingsRate: row.savingsRate != null ? Number(row.savingsRate) : null,
    }));
  } catch (error) {
    console.error("Error fetching monthly summary:", error);
    throw new Error("Failed to fetch monthly summary");
  }
}

export async function getIncomeVsExpenses(
  userId: string,
  filters: {
    startDate?: Date;
    endDate?: Date;
    groupByMonth?: boolean;
  } = {}
) {
  try {
    await requireOwnership(userId);

    if (filters.groupByMonth) {
      const params: unknown[] = [userId];
      let idx = 2;
      let dateClause = "";

      if (filters.startDate) {
        dateClause += ` AND "date" >= $${idx++}`;
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        dateClause += ` AND "date" <= $${idx++}`;
        params.push(filters.endDate);
      }

      const raw = await prisma.$queryRawUnsafe<MonthlyGroupRow[]>(
        `SELECT
          EXTRACT(YEAR FROM "date")::int AS year,
          EXTRACT(MONTH FROM "date")::int AS month,
          SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END) AS "totalIncome",
          SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" ELSE 0 END) AS "totalExpense"
        FROM "Transaction"
        WHERE "userId" = $1${dateClause}
        GROUP BY EXTRACT(YEAR FROM "date"), EXTRACT(MONTH FROM "date")
        ORDER BY year DESC, month DESC`,
        ...params
      );

      return raw.map((row: MonthlyGroupRow) => ({
        year: row.year,
        month: row.month,
        totalIncome: Number(row.totalIncome),
        totalExpense: Number(row.totalExpense),
      }));
    }

    const where: {
      userId: string;
      date?: { gte?: Date; lte?: Date };
    } = { userId };

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    const grouped = await prisma.transaction.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
    });

    const totalIncome =
      grouped.find((g) => g.type === "INCOME")?._sum.amount ?? 0;
    const totalExpense =
      grouped.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0;

    return {
      totalIncome: Number(totalIncome),
      totalExpense: Number(totalExpense),
      netBalance: Number(totalIncome) - Number(totalExpense),
    };
  } catch (error) {
    console.error("Error fetching income vs expenses:", error);
    throw new Error("Failed to fetch income vs expenses");
  }
}

export async function getExpensesByCategory(
  userId: string,
  filters: {
    startDate?: Date;
    endDate?: Date;
    type?: TransactionType;
  } = {}
) {
  try {
    await requireOwnership(userId);

    const params: unknown[] = [userId];
    let idx = 2;
    let extraClause = "";

    if (filters.startDate) {
      extraClause += ` AND t."date" >= $${idx++}`;
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      extraClause += ` AND t."date" <= $${idx++}`;
      params.push(filters.endDate);
    }
    if (filters.type) {
      extraClause += ` AND t."type" = $${idx++}`;
      params.push(filters.type);
    }

    const raw = await prisma.$queryRawUnsafe<CategoryExpenseRow[]>(
      `SELECT
        c."name" AS "categoryName",
        c."type" AS "categoryType",
        SUM(t."amount") AS "totalAmount",
        COUNT(t."id") AS "transactionCount"
      FROM "Transaction" t
      JOIN "Category" c ON t."categoryId" = c."id"
      WHERE t."userId" = $1${extraClause}
      GROUP BY c."id", c."name", c."type"
      ORDER BY "totalAmount" DESC`,
      ...params
    );

    return raw.map((row: CategoryExpenseRow) => ({
      categoryName: row.categoryName,
      categoryType: row.categoryType,
      totalAmount: Number(row.totalAmount),
      transactionCount: Number(row.transactionCount),
    }));
  } catch (error) {
    console.error("Error fetching expenses by category:", error);
    throw new Error("Failed to fetch expenses by category");
  }
}

export async function getCategoriesForFilter(userId: string) {
  try {
    await requireOwnership(userId);
    const categories = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    });

    return categories;
  } catch (error) {
    console.error("Error fetching categories for filter:", error);
    throw new Error("Failed to fetch categories for filter");
  }
}
