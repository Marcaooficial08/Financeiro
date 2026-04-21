'use client';

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { FiLogIn, FiLogOut, FiUsers, FiSettings, FiPieChart, FiDollarSign, FiBarChart2 } from "react-icons/fi";

export default function Sidebar({ session }: { session: any }) {
  const { data: sessionData, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="flex items-center p-6 border-b border-gray-200">
        <img
          src={sessionData?.user?.image || '/default-avatar.png'}
          alt="User avatar"
          className="h-10 w-10 rounded-full mr-3"
        />
        <div>
          <p className="font-medium">{sessionData?.user?.name || 'Usuário'}</p>
          <p className="text-sm text-gray-500">{sessionData?.user?.email}</p>
        </div>
      </div>

      <nav className="flex-1 flex-col pt-4">
        <Link href="/dashboard" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 hover:text-indigo-600">
          <FiPieChart className="mr-4 h-5 w-5" />
          <span>Dashboard</span>
        </Link>

        <Link href="/accounts" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 hover:text-indigo-600">
          <FiDollarSign className="mr-4 h-5 w-5" />
          <span>Contas</span>
        </Link>

        <Link href="/transactions" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 hover:text-indigo-600">
          <FiUsers className="mr-4 h-5 w-5" />
          <span>Transações</span>
        </Link>

        <Link href="/categories" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 hover:text-indigo-600">
          <FiSettings className="mr-4 h-5 w-5" />
          <span>Categorias</span>
        </Link>

        <Link href="/reports" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 hover:text-indigo-600">
          <FiBarChart2 className="mr-4 h-5 w-5" />
          <span>Relatórios</span>
        </Link>
      </nav>

      <div className="pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="flex w-full items-center px-6 py-3 text-left text-gray-700 hover:bg-gray-50 hover:text-red-600"
        >
          <FiLogOut className="mr-4 h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}