import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** Serve o avatar do usuário autenticado diretamente do banco. */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  if (!user?.image?.startsWith("data:")) {
    return new NextResponse(null, { status: 404 });
  }

  const commaIdx = user.image.indexOf(",");
  const mimeType = user.image.slice(5, user.image.indexOf(";"));
  const buffer = Buffer.from(user.image.slice(commaIdx + 1), "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      // Sem cache: cada requisição vai ao banco — garante atualização imediata
      "Cache-Control": "private, no-store",
    },
  });
}

/** Recebe o upload, salva base64 no banco e retorna uma URL curta. */
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
      { error: "Arquivo muito grande. Máximo 2 MB." },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const dataUrl = `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: dataUrl },
  });

  // Retorna URL curta — nunca o base64 — para não inflar o JWT/cookie
  return NextResponse.json({ url: "/api/user/avatar" });
}
