"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
    const startDateFilter = filters.startDate
      ? Prisma.sql`AND "date" >= ${filters.startDate}`
      : Prisma.empty;

    const endDateFilter = filters.endDate
      ? Prisma.sql`AND "date" <= ${filters.endDate}`
      : Prisma.empty;

    const raw = await prisma.$queryRaw<
      Array<{
        year: number;
        month: number;
        totalIncome: Prisma.Decimal;
        totalExpense: Prisma.Decimal;
        netBalance: Prisma.Decimal;
        savingsRate: Prisma.Decimal | null;
      }>
    >(
      Prisma.sql`
        SELECT
          EXTRACT(YEAR FROM "date")::int as year,
          EXTRACT(MONTH FROM "date")::int as month,
          SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END) as "totalIncome",
          SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" ELSE 0 END) as "totalExpense",
          SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE -"amount" END) as "netBalance",
          CASE
            WHEN SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END) = 0 THEN NULL
            ELSE (
              SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END) -
              SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" ELSE 0 END)
            ) / SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END) * 100
          END as "savingsRate"
        FROM "Transaction"
        WHERE "userId" = ${userId}
        ${startDateFilter}
        ${endDateFilter}
        GROUP BY EXTRACT(YEAR FROM "date"), EXTRACT(MONTH FROM "date")
        ORDER BY year DESC, month DESC
      `
    );

    return raw.map((row: { year: any; month: any; totalIncome: any; totalExpense: any; netBalance: any; savingsRate: any; }) => ({
      year: row.year,
      month: row.month,
      totalIncome: Number(row.totalIncome),
      totalExpense: Number(row.totalExpense),
      netBalance: Number(row.netBalance),
      savingsRate: row.savingsRate ? Number(row.savingsRate) : null,
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
    const where: Prisma.TransactionWhereInput = { userId };

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    if (filters.groupByMonth) {
      const startDateFilter = filters.startDate
        ? Prisma.sql`AND "date" >= ${filters.startDate}`
        : Prisma.empty;

      const endDateFilter = filters.endDate
        ? Prisma.sql`AND "date" <= ${filters.endDate}`
        : Prisma.empty;

      const raw = await prisma.$queryRaw<
        Array<{
          year: number;
          month: number;
          totalIncome: Prisma.Decimal;
          totalExpense: Prisma.Decimal;
        }>
      >(
        Prisma.sql`
          SELECT
            EXTRACT(YEAR FROM "date")::int as year,
            EXTRACT(MONTH FROM "date")::int as month,
            SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END) as "totalIncome",
            SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" ELSE 0 END) as "totalExpense"
          FROM "Transaction"
          WHERE "userId" = ${userId}
          ${startDateFilter}
          ${endDateFilter}
          GROUP BY EXTRACT(YEAR FROM "date"), EXTRACT(MONTH FROM "date")
          ORDER BY year DESC, month DESC
        `
      );

      return raw.map((row: { year: any; month: any; totalIncome: any; totalExpense: any; }) => ({
        year: row.year,
        month: row.month,
        totalIncome: Number(row.totalIncome),
        totalExpense: Number(row.totalExpense),
      }));
    }

    const grouped = await prisma.transaction.groupBy({
      by: ["type"],
      where,
      _sum: {
        amount: true,
      },
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
    const startDateFilter = filters.startDate
      ? Prisma.sql`AND t."date" >= ${filters.startDate}`
      : Prisma.empty;

    const endDateFilter = filters.endDate
      ? Prisma.sql`AND t."date" <= ${filters.endDate}`
      : Prisma.empty;

    const typeFilter = filters.type
      ? Prisma.sql`AND t."type" = ${filters.type}`
      : Prisma.empty;

    const raw = await prisma.$queryRaw<
      Array<{
        categoryName: string;
        categoryType: string;
        totalAmount: Prisma.Decimal;
        transactionCount: bigint;
      }>
    >(
      Prisma.sql`
        SELECT
          c."name" as "categoryName",
          c."type" as "categoryType",
          SUM(t."amount") as "totalAmount",
          COUNT(t."id") as "transactionCount"
        FROM "Transaction" t
        JOIN "Category" c ON t."categoryId" = c."id"
        WHERE t."userId" = ${userId}
        ${startDateFilter}
        ${endDateFilter}
        ${typeFilter}
        GROUP BY c."id", c."name", c."type"
        ORDER BY "totalAmount" DESC
      `
    );

    return raw.map((row: { categoryName: any; categoryType: any; totalAmount: any; transactionCount: any; }) => ({
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