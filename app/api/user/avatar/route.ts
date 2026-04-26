import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Formato inválido. Use JPG, PNG ou WebP." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo 5 MB." },
      { status: 400 },
    );
  }

  const ext =
    file.type === "image/jpeg" ? ".jpg" : file.type === "image/png" ? ".png" : ".webp";
  const uploadsDir = join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(uploadsDir, { recursive: true });

  // Remove avatar anterior deste usuário (qualquer extensão)
  for (const oldExt of [".jpg", ".png", ".webp"]) {
    const oldPath = join(uploadsDir, `${session.user.id}${oldExt}`);
    if (existsSync(oldPath)) await unlink(oldPath).catch(() => {});
  }

  const bytes = await file.arrayBuffer();
  await writeFile(join(uploadsDir, `${session.user.id}${ext}`), Buffer.from(bytes));

  const url = `/uploads/avatars/${session.user.id}${ext}`;
  await prisma.user.update({ where: { id: session.user.id }, data: { image: url } });

  return NextResponse.json({ url });
}
