import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <div>Redirecting to sign in...</div>;
  }

  const user = session.user as SessionUser;

  if (!user?.id) {
    return <div>Erro ao carregar usuário</div>;
  }

  const userId = user.id;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [accounts, monthlySummary, recentTransactions] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      select: { balance: true },
    }),
    prisma.monthlySummary.findFirst({
      where: { userId, year: currentYear, month: currentMonth },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
      include: {
        category: true,
        account: true,
      },
    }),
  ]);

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + Number(acc.balance),
    0
  );

  const totalIncome = Number(monthlySummary?.totalIncome ?? 0);
  const totalExpense = Number(monthlySummary?.totalExpense ?? 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white shadow-sm dark:bg-gray-900 dark:shadow-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard, {user.name}!
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Resumo financeiro de {currentMonth
              .toString()
              .padStart(2, "0")}
            /{currentYear}
          </p>
        </div>
      </header>

      {/* resto do código permanece igual */}
    </div>
  );
}