'use client';
import { useState, useEffect } from 'react';
import { getDashboardStats } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Package, Users, Send, CheckCircle, XCircle, HardDrive, Clock, AlertTriangle, Loader, Activity, Wallet, FileText, CreditCard, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

function AdminDashboard({ stats, user }) {
  const sub = stats?.subscription;
  const tokenActive = stats?.tokenStatus?.status === 'active';

  const statItems = [
    {
      label: 'Active Package',
      value: sub?.packageName || 'None',
      sub: sub ? `Expires ${sub.liveBalance && sub.expiresAt?.length === 8
        ? `${sub.expiresAt.substring(0,4)}-${sub.expiresAt.substring(4,6)}-${sub.expiresAt.substring(6,8)}`
        : formatDate(sub.expiresAt)}` : 'Activate a package',
      icon: Package,
      accent: 'bg-red-50 dark:bg-red-900/30 text-red-600',
    },
    {
      label: sub?.liveBalance ? 'Live Balance' : 'Remaining Data',
      value: sub ? `${sub.remainingDataGB} GB` : '0 GB',
      sub: sub ? `${sub.usagePercent}% used of ${sub.totalDataGB}GB` : 'No active plan',
      icon: HardDrive,
      accent: sub?.liveBalance
        ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
        : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Beneficiaries',
      value: stats?.beneficiaryCount || 0,
      sub: sub ? `Max ${sub.maxBeneficiaries}` : '',
      icon: Users,
      accent: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Total Data Sent',
      value: `${stats?.totalDataSentGB || 0} GB`,
      sub: `${stats?.transactions?.success || 0} successful sends`,
      icon: Send,
      accent: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    },
  ];

  const successRate = stats?.transactions?.total > 0
    ? Math.round((stats.transactions.success / stats.transactions.total) * 100)
    : null;

  const systemHealth = tokenActive && sub
    ? (successRate === null || successRate >= 80 ? 'healthy' : successRate >= 50 ? 'warning' : 'critical')
    : 'critical';

  const healthConfig = {
    healthy: { color: 'emerald', label: 'All Systems Operational', dot: 'bg-emerald-500 ring-emerald-500/20' },
    warning: { color: 'amber', label: 'Needs Attention', dot: 'bg-amber-500 ring-amber-500/20' },
    critical: { color: 'red', label: 'Action Required', dot: 'bg-red-500 ring-red-500/20' },
  };

  const health = healthConfig[systemHealth];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Here is an overview of your Telecel automation system.</p>
      </div>

      {/* System Status Banner */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">System Status</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${health.dot} ring-4`} />
            <span className={`text-xs font-medium text-${health.color}-600`}>{health.label}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3.5 py-2.5">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Token</p>
            <p className={`text-sm font-semibold mt-0.5 ${tokenActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
              {tokenActive ? 'Active' : 'Expired'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3.5 py-2.5">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Success Rate</p>
            <p className={`text-sm font-semibold mt-0.5 ${
              successRate === null ? 'text-gray-400' : successRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : successRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600'
            }`}>
              {successRate !== null ? `${successRate}%` : 'No data'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3.5 py-2.5">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Queue</p>
            <p className="text-sm font-semibold mt-0.5 text-gray-900 dark:text-gray-50">
              {stats?.queue ? `${stats.queue.pending} pending` : 'Idle'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3.5 py-2.5">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Users</p>
            <p className="text-sm font-semibold mt-0.5 text-gray-900 dark:text-gray-50">{stats?.totalUsers || 0} registered</p>
          </div>
        </div>
      </div>

      {!tokenActive && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-700/40 rounded-xl px-5 py-4">
          <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Telecel Token Required</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              Go to Settings to generate a new Telecel authentication token before sharing data.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item) => (
          <div key={item.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-5 hover:border-gray-300/80 dark:hover:border-gray-600/80 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{item.label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.accent}`}>
                <item.icon className="w-[18px] h-[18px]" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight">{item.value}</p>
            {item.sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{item.sub}</p>}
          </div>
        ))}
      </div>

      {/* Admin Extra Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Users</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Users className="w-[18px] h-[18px]" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight">{stats?.totalUsers || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pending Requests</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <FileText className="w-[18px] h-[18px]" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight">{stats?.pendingRequests || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Credits Issued</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-[18px] h-[18px]" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight">{stats?.totalCreditsIssuedGB || 0} GB</p>
        </div>
      </div>

      {/* Data Usage */}
      {sub && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Data Usage</h3>
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
              {sub.usedDataGB} GB / {sub.totalDataGB} GB
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500 ease-out"
              style={{ width: `${Math.min(sub.usagePercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2.5 text-xs text-gray-400">
            <span>{sub.remainingDataGB} GB remaining</span>
            <span>{sub.usagePercent}% used</span>
          </div>
        </div>
      )}

      {/* Queue Status */}
      {stats?.queue && (stats.queue.pending > 0 || stats.queue.processing > 0) && (
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-700/40 rounded-xl px-5 py-4">
          <Loader className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Queue Processing</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              {stats.queue.pending} pending, {stats.queue.processing} processing, {stats.queue.completed} completed, {stats.queue.failed} failed
            </p>
          </div>
        </div>
      )}

      {/* Bottom grid - Token + Transaction Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4">Telecel Token</h3>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${tokenActive ? 'bg-emerald-500' : 'bg-red-500'} ring-4 ${tokenActive ? 'ring-emerald-500/20' : 'ring-red-500/20'}`} />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{tokenActive ? 'Active' : 'Inactive / Expired'}</span>
          </div>
          {tokenActive && stats?.tokenStatus?.hoursRemaining != null && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-1.5 ml-[22px]">
              <Clock className="w-3.5 h-3.5" />
              {stats.tokenStatus.hoursRemaining} hours remaining
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4">Transaction Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Successful
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-50 tabular-nums">{stats?.transactions?.success || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                Failed
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-50 tabular-nums">{stats?.transactions?.failed || 0}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-50 tabular-nums">{stats?.transactions?.total || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      {stats?.recentTransactions?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-5">Recent Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Beneficiary</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Data</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {stats.recentTransactions.map((txn) => (
                  <tr key={txn._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3.5">
                      <p className="font-medium text-gray-900 dark:text-gray-50 text-sm">{txn.beneficiaryName}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{txn.beneficiaryPhone}</p>
                    </td>
                    <td className="py-3.5 text-sm font-medium text-gray-700 dark:text-gray-200 tabular-nums">{txn.dataGB}GB</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        txn.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : txn.status === 'failed'
                          ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {txn.status === 'success' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {txn.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-xs text-gray-400">{formatDate(txn.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function UserDashboard({ stats, user }) {
  const typeColors = {
    credit: 'text-emerald-600 dark:text-emerald-400',
    debit: 'text-red-600',
    refund: 'text-blue-600 dark:text-blue-400',
  };

  const typeIcons = {
    credit: ArrowDownLeft,
    debit: ArrowUpRight,
    refund: ArrowDownLeft,
  };

  const statusColors = {
    pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    rejected: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    failed: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Here is your data credit overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-5 hover:border-gray-300/80 dark:hover:border-gray-600/80 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Credit Balance</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-[18px] h-[18px]" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
            {stats?.creditType === 'ghs' ? `GHS ${Number(stats?.creditBalance || 0).toFixed(2)}` : `${stats?.creditBalance || 0} GB`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Available to send</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-5 hover:border-gray-300/80 dark:hover:border-gray-600/80 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pending Requests</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Clock className="w-[18px] h-[18px]" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight">{stats?.pendingRequests || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Awaiting admin review</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-5 hover:border-gray-300/80 dark:hover:border-gray-600/80 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Received</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <ArrowDownLeft className="w-[18px] h-[18px]" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
            {stats?.creditType === 'ghs' ? `GHS ${Number(stats?.totalReceivedGHS || 0).toFixed(2)}` : `${stats?.totalReceivedGB || 0} GB`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Total {stats?.creditType === 'ghs' ? 'GHS' : 'data'} credited</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-5 hover:border-gray-300/80 dark:hover:border-gray-600/80 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Sent</span>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/30 text-red-600">
              <ArrowUpRight className="w-[18px] h-[18px]" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
            {stats?.creditType === 'ghs' ? `GHS ${Number(stats?.totalSentGHS || 0).toFixed(2)}` : `${stats?.totalSentGB || 0} GB`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Total {stats?.creditType === 'ghs' ? 'GHS' : 'data'} sent</p>
        </div>
      </div>

      {/* Recent Credit Transactions */}
      {stats?.recentCreditTransactions?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-5">Recent Credit Activity</h3>
          <div className="space-y-3">
            {stats.recentCreditTransactions.map((txn) => {
              const Icon = typeIcons[txn.type] || ArrowDownLeft;
              return (
                <div key={txn._id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      txn.type === 'credit' ? 'bg-emerald-50 dark:bg-emerald-900/30' : txn.type === 'debit' ? 'bg-red-50 dark:bg-red-900/30' : 'bg-blue-50 dark:bg-blue-900/30'
                    }`}>
                      <Icon className={`w-4 h-4 ${typeColors[txn.type]}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50 capitalize">{txn.type}</p>
                      <p className="text-xs text-gray-400">{txn.note || formatDate(txn.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${typeColors[txn.type]}`}>
                    {txn.type === 'debit' ? '-' : '+'}
                    {txn.creditType === 'ghs' ? `GHS ${txn.amountGHS?.toFixed(2)}` : `${txn.dataGB} GB`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Requests */}
      {stats?.recentRequests?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-5">Recent Requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Recipient</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Data</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {stats.recentRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3.5">
                      <p className="font-medium text-gray-900 dark:text-gray-50 text-sm">{req.recipientName}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{req.recipientPhone}</p>
                    </td>
                    <td className="py-3.5 text-sm font-medium text-gray-700 dark:text-gray-200 tabular-nums">{req.dataGB} GB</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[req.status]}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-xs text-gray-400">{formatDate(req.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await getDashboardStats();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
    setLoading(false);
  };

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  if (user?.role === 'admin') {
    return <AdminDashboard stats={stats} user={user} />;
  }

  return <UserDashboard stats={stats} user={user} />;
}
