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
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar session={session} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-64">
        {/* We could add a top navbar here if needed, but for now we'll just have the main content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}