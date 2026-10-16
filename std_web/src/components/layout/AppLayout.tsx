import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useLayout } from '../../context/LayoutContext';

export const AppLayout: React.FC = () => {
  const { isSidebarCollapsed } = useLayout();

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex">
      {/* Collapsible Desktop Sidebar + Mobile Drawer */}
      <Sidebar />

      {/* Main Content Area (Dynamically offsets width for Desktop Sidebar) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding-left] duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-60'
        }`}
      >
        <Navbar />

        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
};
