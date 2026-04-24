import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateReport, toPlainReport } from "@/lib/reports";
import ReportView from "./ReportView";

type SearchParams = Promise<{ start?: string; end?: string }>;

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="p-6 text-gray-600 dark:text-gray-300">
        Sessão inválida. Faça login novamente.
      </div>
    );
  }

  const params = await searchParams;
  const startDate = parseDate(params.start);
  const endDate = parseDate(params.end);

  let plain;
  try {
    const report = await generateReport(userId, startDate, endDate);
    plain = toPlainReport(report);
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Relatórios Financeiros
          </h1>
          <div className="mt-6 rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-sm">
            <p className="text-red-600 dark:text-red-400">
              Falha ao carregar o relatório. Verifique se as migrations do Prisma foram aplicadas
              (<code className="rounded bg-gray-100 dark:bg-gray-800 px-1">npx prisma migrate deploy</code>)
              e tente novamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <ReportView report={plain} />;
}
