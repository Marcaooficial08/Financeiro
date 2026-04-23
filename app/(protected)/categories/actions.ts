"use server";

import { prisma } from "@/lib/prisma";
import { messages } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(2, "O nome da categoria deve ter ao menos 2 caracteres"),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().optional(),
  icon: z.string().optional(),
});

const categoryUpdateSchema = z.object({
  name: z.string().min(2, "O nome da categoria deve ter ao menos 2 caracteres"),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export async function createCategory(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const rawName = formData.get("name");
    const rawType = formData.get("type");
    const rawColor = formData.get("color");
    const rawIcon = formData.get("icon");

    const data = categorySchema.parse({
      name: typeof rawName === "string" ? rawName.trim() : rawName,
      type: typeof rawType === "string" ? rawType : undefined,
      color: typeof rawColor === "string" ? rawColor.trim() : undefined,
      icon: typeof rawIcon === "string" ? rawIcon.trim() : undefined,
    });

    await prisma.category.create({
      data: {
        name: data.name,
        type: data.type,
        color: data.color,
        icon: data.icon,
        userId,
      },
    });

    revalidatePath("/categories");

    return { success: true, message: "Categoria criada com sucesso!" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((item) => item.message).join(", ") };
    }

    console.error("Erro ao criar categoria:", error);
    return { success: false, error: messages.error.create };
  }
}

export async function getCategories() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: [{ name: "asc" }, { type: "asc" }],
    });

    return { success: true, data: categories };
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return { success: false, error: "Erro ao buscar categorias" };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const existing = await prisma.category.findFirst({ where: { id, userId } });
    if (!existing) {
      return { success: false, error: "Categoria não encontrada" };
    }

    const rawName = formData.get("name");
    const rawColor = formData.get("color");
    const rawIcon = formData.get("icon");

    const data = categoryUpdateSchema.parse({
      name: typeof rawName === "string" ? rawName.trim() : rawName,
      color: typeof rawColor === "string" ? rawColor.trim() : undefined,
      icon: typeof rawIcon === "string" ? rawIcon.trim() : undefined,
    });

    await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        color: data.color,
        icon: data.icon,
      },
    });

    revalidatePath("/categories");
    return { success: true, message: "Categoria atualizada com sucesso!" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((item) => item.message).join(", ") };
    }
    console.error("Erro ao atualizar categoria:", error);
    return { success: false, error: messages.error.update };
  }
}

export async function deleteCategory(id: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const existingCategory = await prisma.category.findFirst({
      where: { id, userId },
    });

    if (!existingCategory) {
      return { success: false, error: messages.error.delete };
    }

    const transactionCount = await prisma.transaction.count({
      where: { categoryId: id },
    });

    if (transactionCount > 0) {
      return {
        success: false,
        error:
          "Não é possível excluir esta categoria pois possui transações associadas. Considere desativar ao invés de excluir.",
      };
    }

    await prisma.category.delete({
      where: { id },
    });

    revalidatePath("/categories");

    return {
      success: true,
      message: "Categoria excluída com sucesso!",
    };
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    return {
      success: false,
      error: messages.error.delete,
    };
  }
}
