'use client';

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { FiLogOut, FiUsers, FiSettings, FiPieChart, FiDollarSign, FiBarChart2 } from "react-icons/fi";
import ThemeToggle from "@/app/_components/theme-toggle";

export default function Sidebar({ session }: { session: any }) {
  const { data: sessionData, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  const navLinkClass = "flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-indigo-400";

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center p-6 border-b border-gray-200 dark:border-gray-800">
        <img
          src={sessionData?.user?.image || '/default-avatar.png'}
          alt="User avatar"
          className="h-10 w-10 rounded-full mr-3"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate dark:text-gray-100">{sessionData?.user?.name || 'Usuário'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{sessionData?.user?.email}</p>
        </div>
        <ThemeToggle className="ml-2 shrink-0" />
      </div>

      <nav className="flex-1 flex-col pt-4">
        <Link href="/dashboard" className={navLinkClass}>
          <FiPieChart className="mr-4 h-5 w-5" />
          <span>Dashboard</span>
        </Link>

        <Link href="/accounts" className={navLinkClass}>
          <FiDollarSign className="mr-4 h-5 w-5" />
          <span>Contas</span>
        </Link>

        <Link href="/transactions" className={navLinkClass}>
          <FiUsers className="mr-4 h-5 w-5" />
          <span>Transações</span>
        </Link>

        <Link href="/categories" className={navLinkClass}>
          <FiSettings className="mr-4 h-5 w-5" />
          <span>Categorias</span>
        </Link>

        <Link href="/reports" className={navLinkClass}>
          <FiBarChart2 className="mr-4 h-5 w-5" />
          <span>Relatórios</span>
        </Link>
      </nav>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="flex w-full items-center px-6 py-3 text-left text-gray-700 hover:bg-gray-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-red-400"
        >
          <FiLogOut className="mr-4 h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
