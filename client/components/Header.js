'use client';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';

const breadcrumbMap = {
  '/dashboard': 'Overview',
  '/dashboard/packages': 'Packages',
  '/dashboard/beneficiaries': 'Beneficiaries',
  '/dashboard/share': 'Share Data',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/users': 'Users',
  '/dashboard/api-keys': 'API Keys',
  '/dashboard/logs': 'Logs',
  '/dashboard/settings': 'Settings',
};

export default function Header({ onMenuClick }) {
  const { user } = useAuth();
  const pathname = usePathname();

  const pageTitle = breadcrumbMap[pathname] || 'Dashboard';

  // Simple token presence check for status dot
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 px-4 lg:px-8 h-12 flex items-center">
      <div className="flex items-center justify-between w-full">
        {/* Left: hamburger + breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
          >
            <Menu className="w-4 h-4" />
          </button>
          <nav className="flex items-center gap-1.5 text-[13px]">
            <span className="text-gray-400">Dashboard</span>
            {pageTitle !== 'Overview' && (
              <>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <span className="text-gray-700 dark:text-gray-200 font-medium">{pageTitle}</span>
              </>
            )}
          </nav>
        </div>

        {/* Right: token status + avatar */}
        <div className="flex items-center gap-3">
          {/* Token status indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasToken ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            <span className="text-[11px] text-gray-400 hidden sm:inline">
              {hasToken ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* User avatar */}
          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
