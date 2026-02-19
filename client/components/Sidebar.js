'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  Send,
  Receipt,
  Settings,
  LogOut,
  Wifi,
  X,
  ShieldCheck,
  Key,
  ScrollText,
  CreditCard,
  FileText,
  Wallet,
  ClipboardList,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

const adminMainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  // { href: '/dashboard/packages', label: 'Packages', icon: Package },
  { href: '/dashboard/beneficiaries', label: 'Beneficiaries', icon: Users },
  { href: '/dashboard/share', label: 'Share Data', icon: Send },
  { href: '/dashboard/transactions', label: 'Transactions', icon: Receipt },
  // { href: '/dashboard/credit-users', label: 'Credit Users', icon: CreditCard },
  // { href: '/dashboard/user-packages', label: 'User Packages', icon: ClipboardList },
  // { href: '/dashboard/data-requests', label: 'Data Requests', icon: FileText },
];

const adminSectionNav = [
  // { href: '/dashboard/users', label: 'Users', icon: ShieldCheck },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
  { href: '/dashboard/logs', label: 'Logs', icon: ScrollText },
];

const userMainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/my-balance', label: 'My Balance', icon: Wallet },
  { href: '/dashboard/my-requests', label: 'Send Data', icon: FileText },
  { href: '/dashboard/my-transactions', label: 'My Transactions', icon: Receipt },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
];

const bottomNav = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const isAdmin = user?.role === 'admin';

  const isActive = (href) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const NavItem = ({ item }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={`group relative flex items-center gap-3 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 ${
          active
            ? 'text-red-600 bg-red-600/[0.06] dark:text-red-400 dark:bg-red-500/[0.1]'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-500/[0.04] dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700/40'
        }`}
      >
        <span
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all duration-200 ${
            active ? 'h-4 bg-red-600 dark:bg-red-400' : 'h-0 bg-transparent'
          }`}
        />
        <item.icon
          className={`w-[16px] h-[16px] flex-shrink-0 ${
            active ? 'text-red-600 dark:text-red-400' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'
          }`}
          strokeWidth={active ? 2 : 1.75}
        />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-[248px] bg-[#FAFAFA] dark:bg-gray-800 border-r border-gray-200/80 dark:border-gray-700/60 flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center shadow-sm">
              <Wifi className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-[14px] text-gray-900 dark:text-gray-50 tracking-tight">
              Bundle Sharer
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          <div className="space-y-0.5">
            {(isAdmin ? adminMainNav : userMainNav).map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>

          {isAdmin && (
            <>
              <div className="mt-6 mb-1.5 px-3">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <div className="space-y-0.5">
                {adminSectionNav.map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="px-3 pb-2">
          <div className="space-y-0.5 mb-2">
            {bottomNav.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-[13px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-500/[0.04] dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700/40 transition-all duration-150 mb-2"
          >
            {theme === 'dark' ? (
              <Sun className="w-[16px] h-[16px] flex-shrink-0 text-gray-400 dark:text-gray-500" strokeWidth={1.75} />
            ) : (
              <Moon className="w-[16px] h-[16px] flex-shrink-0 text-gray-400" strokeWidth={1.75} />
            )}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>

          <div className="h-px bg-gray-200/80 dark:bg-gray-700/60 mx-1 mb-3" />

          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate leading-tight">
                  {user?.name || 'User'}
                </p>
                <p className="text-[11px] text-gray-400 truncate leading-tight">
                  {user?.email || ''}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 transition"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
