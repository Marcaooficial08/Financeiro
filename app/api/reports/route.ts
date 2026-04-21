import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { generateReport, exportReportCSV } from "@/lib/reports"

async function getUserIdFromRequest(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id ?? token?.sub
  return typeof userId === "string" ? userId : null
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("start") ? new Date(searchParams.get("start")!) : undefined
    const endDate = searchParams.get("end") ? new Date(searchParams.get("end")!) : undefined

    const report = await generateReport(userId, startDate, endDate)
    return NextResponse.json(report)
  } catch (error) {
    console.error("Erro ao gerar relatório:", error)
    return NextResponse.json(
      { error: "Falha ao gerar relatório" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({ }))
    const startDate = body.start ? new Date(body.start) : undefined
    const endDate = body.end ? new Date(body.end) : undefined

    const report = await generateReport(userId, startDate, endDate)
    const csv = exportReportCSV(report)

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=relatorio_financeiro.csv",
      },
    })
  } catch (error) {
    console.error("Erro ao exportar CSV:", error)
    return NextResponse.json(
      { error: "Falha ao exportar CSV" },
      { status: 500 }
    )
  }
}
