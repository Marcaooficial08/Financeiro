import Sidebar from "./sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      <Sidebar session={session} />
      {/* ml-0 em mobile (sidebar colapsada), ml-64 em lg+ (sidebar fixa visível) */}
      <div className="flex-1 flex flex-col ml-0 lg:ml-64 min-w-0">
        {/* pt-14 em mobile reserva espaço para o botão hamburger fixo */}
        <main className="flex-1 p-4 pt-16 sm:p-6 sm:pt-16 lg:p-6 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}