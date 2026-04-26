'use client';

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { FiLogOut, FiUsers, FiSettings, FiPieChart, FiDollarSign, FiBarChart2, FiMenu, FiX, FiUser } from "react-icons/fi";
import ThemeToggle from "@/app/_components/theme-toggle";

export default function Sidebar({ session }: { session: any }) {
  const { data: sessionData, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (status === "loading") {
    return null;
  }

  const navLinkClass =
    "flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-indigo-400";

  const close = () => setMobileOpen(false);

  return (
    <>
      {/* Hamburger — mobile only, fica no canto superior esquerdo quando sidebar fechada */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50 lg:hidden dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
      >
        <FiMenu className="h-4 w-4 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Overlay escuro em mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={close}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 dark:border-gray-800 dark:bg-gray-900 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Botão fechar — mobile only */}
        <button
          type="button"
          onClick={close}
          aria-label="Fechar menu"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <FiX className="h-4 w-4" />
        </button>

        {/* Perfil */}
        <div className="flex items-center p-6 border-b border-gray-200 dark:border-gray-800">
          <Link href="/profile" onClick={close} className="mr-3 shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none">
            {sessionData?.user?.image ? (
              <img
                src={sessionData.user.image}
                alt="Foto de perfil"
                className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200 transition hover:opacity-80 dark:ring-gray-700"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200 transition hover:opacity-80 dark:bg-gray-800 dark:ring-gray-700">
                <FiUser className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate dark:text-gray-100">
              {sessionData?.user?.name || 'Usuário'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {sessionData?.user?.email}
            </p>
          </div>
          <ThemeToggle className="ml-2 shrink-0" />
        </div>

        {/* Nav */}
        <nav className="flex-1 flex-col pt-4">
          <Link href="/dashboard" onClick={close} className={navLinkClass}>
            <FiPieChart className="mr-4 h-5 w-5 shrink-0" />
            <span>Dashboard</span>
          </Link>
          <Link href="/accounts" onClick={close} className={navLinkClass}>
            <FiDollarSign className="mr-4 h-5 w-5 shrink-0" />
            <span>Contas</span>
          </Link>
          <Link href="/transactions" onClick={close} className={navLinkClass}>
            <FiUsers className="mr-4 h-5 w-5 shrink-0" />
            <span>Transações</span>
          </Link>
          <Link href="/categories" onClick={close} className={navLinkClass}>
            <FiSettings className="mr-4 h-5 w-5 shrink-0" />
            <span>Categorias</span>
          </Link>
          <Link href="/reports" onClick={close} className={navLinkClass}>
            <FiBarChart2 className="mr-4 h-5 w-5 shrink-0" />
            <span>Relatórios</span>
          </Link>
          <Link href="/profile" onClick={close} className={navLinkClass}>
            <FiUser className="mr-4 h-5 w-5 shrink-0" />
            <span>Perfil</span>
          </Link>
        </nav>

        {/* Sair */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="flex w-full items-center px-6 py-3 text-left text-gray-700 hover:bg-gray-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-red-400"
          >
            <FiLogOut className="mr-4 h-5 w-5 shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
