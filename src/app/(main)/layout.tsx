"use client";

import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import { UserProvider } from "@/contexts/UserContext";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <div className="h-screen flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav />
          <main className="flex-1 overflow-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </UserProvider>
  );
}