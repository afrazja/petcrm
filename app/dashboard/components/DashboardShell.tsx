"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import OfflineBanner from "./OfflineBanner";
import { XIcon } from "@/components/icons";

type Props = {
  userEmail: string | null;
  userInitial: string;
  children: React.ReactNode;
};

export default function DashboardShell({
  userEmail,
  userInitial,
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-soft-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-warm-gray/50 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-sage-900/20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar Panel */}
          <aside className="relative w-64 h-full bg-white shadow-xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-sage-400 hover:bg-sage-50 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          userEmail={userEmail}
          userInitial={userInitial}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
