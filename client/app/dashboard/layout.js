'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import LoadingSpinner from '../../components/LoadingSpinner';

const adminOnlyRoutes = [
  '/dashboard/packages',
  '/dashboard/beneficiaries',
  '/dashboard/share',
  '/dashboard/transactions',
  '/dashboard/credit-users',
  '/dashboard/user-packages',
  '/dashboard/data-requests',
  '/dashboard/users',
  '/dashboard/logs',
];

const userOnlyRoutes = [
  '/dashboard/my-balance',
  '/dashboard/my-requests',
  '/dashboard/my-transactions',
];

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user) {
      const isAdmin = user.role === 'admin';
      if (!isAdmin && adminOnlyRoutes.some(r => pathname.startsWith(r))) {
        router.push('/dashboard');
      }
      if (isAdmin && userOnlyRoutes.some(r => pathname.startsWith(r))) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50/80 dark:bg-gray-900/80">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-[248px] flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-5 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
