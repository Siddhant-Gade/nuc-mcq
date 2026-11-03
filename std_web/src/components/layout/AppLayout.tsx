import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { useLayout } from '../../context/LayoutContext';

export const AppLayout: React.FC = () => {
  const { isSidebarCollapsed } = useLayout();

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#f8fafc] dark:bg-[#19120c] text-slate-900 dark:text-[#fde8d7] transition-colors flex flex-col overflow-x-hidden">
      {/* Collapsible Desktop Sidebar + Mobile Drawer */}
      <Sidebar />

      {/* Main Content Area (Dynamically offsets width for Desktop Sidebar) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding-left] duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-60'
        }`}
      >
        <Navbar />

        {/* Bottom padding pb-24 on mobile ensures content never gets clipped under MobileBottomNav */}
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-8 pb-24 lg:pb-8 min-w-0">
          <Outlet />
        </main>

        <Footer />
      </div>

      {/* Persistent Mobile Bottom Navigation Bar (< lg screens) */}
      <MobileBottomNav />
    </div>
  );
};
