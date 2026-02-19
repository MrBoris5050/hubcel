'use client';
import React, { useState, useEffect } from 'react';
import { getTransactions, getMyCreditHistory } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';
import LoadingSpinner from '../../../components/LoadingSpinner';
import {
  Receipt, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, AlertTriangle, Server,
  ArrowUpRight, ArrowDownLeft, RotateCcw, Send, Wallet
} from 'lucide-react';

export default function MyTransactionsPage() {
  const [tab, setTab] = useState('sends');

  // Data Sends state
  const [sends, setSends] = useState([]);
  const [sendsPag, setSendsPag] = useState({ page: 1, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [sendsLoading, setSendsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  // Credit History state
  const [credits, setCredits] = useState([]);
  const [creditsPag, setCreditsPag] = useState({ page: 1, pages: 1, total: 0 });
  const [typeFilter, setTypeFilter] = useState('');
  const [creditsLoading, setCreditsLoading] = useState(true);

  useEffect(() => { loadSends(1); }, [statusFilter]);
  useEffect(() => { loadCredits(1); }, [typeFilter]);

  const loadSends = async (page) => {
    setSendsLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await getTransactions(params);
      setSends(data.transactions);
      setSendsPag(data.pagination);
    } catch (err) {
      console.error('Failed to load sends:', err);
    }
    setSendsLoading(false);
  };

  const loadCredits = async (page) => {
    setCreditsLoading(true);
    try {
      const params = { page, limit: 20 };
      if (typeFilter) params.type = typeFilter;
      const { data } = await getMyCreditHistory(params);
      setCredits(data.transactions);
      setCreditsPag(data.pagination);
    } catch (err) {
      console.error('Failed to load credits:', err);
    }
    setCreditsLoading(false);
  };

  const sendStatusConfig = {
    success: { icon: CheckCircle, className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    failed: { icon: XCircle, className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    pending: { icon: Clock, className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  };

  const creditTypeConfig = {
    credit: { icon: ArrowDownLeft, label: 'Credit', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    debit: { icon: ArrowUpRight, label: 'Debit', className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    refund: { icon: RotateCcw, label: 'Refund', className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  };

  const statusFilters = [
    { value: '', label: 'All' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
    { value: 'pending', label: 'Pending' },
  ];

  const creditFilters = [
    { value: '', label: 'All' },
    { value: 'credit', label: 'Credits' },
    { value: 'debit', label: 'Debits' },
    { value: 'refund', label: 'Refunds' },
  ];

  const paginationBtnClass = 'flex items-center gap-1.5 h-9 px-3.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700';

  const currentPag = tab === 'sends' ? sendsPag : creditsPag;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">My Transactions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{currentPag.total} total</p>
        </div>

        {/* Tab toggle */}
        <div className="flex items-center bg-gray-100/80 dark:bg-gray-700/80 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setTab('sends')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              tab === 'sends'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm dark:shadow-none'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Send className="w-3 h-3" /> Data Sends
          </button>
          <button
            onClick={() => setTab('credits')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              tab === 'credits'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm dark:shadow-none'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Wallet className="w-3 h-3" /> Credit History
          </button>
        </div>
      </div>

      {/* ========== DATA SENDS TAB ========== */}
      {tab === 'sends' && (
        <>
          {/* Status filters */}
          <div className="flex items-center bg-gray-100/80 dark:bg-gray-700/80 rounded-xl p-1 gap-0.5 w-fit">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  statusFilter === f.value
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm dark:shadow-none'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {sendsLoading ? (
            <LoadingSpinner message="Loading data sends..." />
          ) : sends.length > 0 ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Recipient</th>
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Data</th>
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Response</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {sends.map((txn) => {
                        const config = sendStatusConfig[txn.status] || sendStatusConfig.pending;
                        const StatusIcon = config.icon;
                        const isExpanded = expandedRow === txn._id;
                        const hasResponse = txn.telecelResponse || txn.errorMessage;
                        return (
                          <React.Fragment key={txn._id}>
                            <tr
                              onClick={() => hasResponse && setExpandedRow(isExpanded ? null : txn._id)}
                              className={`transition-colors ${hasResponse ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-gray-50 dark:bg-gray-800/80' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/50'}`}
                            >
                              <td className="px-6 py-4">
                                <p className="font-medium text-gray-900 dark:text-gray-50">{txn.beneficiaryName}</p>
                                <p className="text-gray-400 text-xs mt-0.5">{txn.beneficiaryPhone}</p>
                              </td>
                              <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-200 tabular-nums">{txn.dataGB}GB</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {txn.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-400">{formatDate(txn.createdAt)}</td>
                              <td className="px-6 py-4">
                                {hasResponse ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setExpandedRow(isExpanded ? null : txn._id); }}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                  >
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    {isExpanded ? 'Hide' : 'View'}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && hasResponse && (
                              <tr className="bg-gray-50/80 dark:bg-gray-900/40">
                                <td colSpan={5} className="px-6 py-4">
                                  <div className="space-y-3">
                                    {txn.errorMessage && (
                                      <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/40 rounded-lg">
                                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                        <div>
                                          <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-0.5">Error Message</p>
                                          <p className="text-xs text-red-600 dark:text-red-300">{txn.errorMessage}</p>
                                        </div>
                                      </div>
                                    )}
                                    {txn.telecelResponse && (
                                      <div className="flex items-start gap-2.5 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 rounded-lg">
                                        <Server className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5">Telecel API Response</p>
                                          <pre className="text-xs text-blue-800 dark:text-blue-200 bg-blue-100/60 dark:bg-blue-900/30 p-2.5 rounded-md overflow-x-auto whitespace-pre-wrap break-all font-mono">
                                            {typeof txn.telecelResponse === 'object'
                                              ? JSON.stringify(txn.telecelResponse, null, 2)
                                              : String(txn.telecelResponse)}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                    {txn.requiresNewToken && (
                                      <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 rounded-lg">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Token refresh required — contact admin</p>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {sendsPag.pages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Page {sendsPag.page} of {sendsPag.pages}</p>
                  <div className="flex gap-2">
                    <button onClick={() => loadSends(sendsPag.page - 1)} disabled={sendsPag.page <= 1} className={paginationBtnClass}>
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </button>
                    <button onClick={() => loadSends(sendsPag.page + 1)} disabled={sendsPag.page >= sendsPag.pages} className={paginationBtnClass}>
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
                  <Send className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-1">No data sends yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">Your data send history will appear here</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== CREDIT HISTORY TAB ========== */}
      {tab === 'credits' && (
        <>
          {/* Type filters */}
          <div className="flex items-center bg-gray-100/80 dark:bg-gray-700/80 rounded-xl p-1 gap-0.5 w-fit">
            {creditFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  typeFilter === f.value
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm dark:shadow-none'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {creditsLoading ? (
            <LoadingSpinner message="Loading credit history..." />
          ) : credits.length > 0 ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Type</th>
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Amount</th>
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Credit Type</th>
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Balance After</th>
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">By</th>
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Note</th>
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {credits.map((txn) => {
                        const config = creditTypeConfig[txn.type] || creditTypeConfig.credit;
                        const TypeIcon = config.icon;
                        const prefix = txn.type === 'debit' ? '-' : '+';
                        const amountStr = txn.creditType === 'ghs'
                          ? `${prefix} GHS ${(txn.amountGHS || 0).toFixed(2)}`
                          : `${prefix} ${txn.dataGB || 0} GB`;
                        const balanceStr = txn.creditType === 'ghs'
                          ? `GHS ${(txn.balanceAfter || 0).toFixed(2)}`
                          : `${txn.balanceAfter || 0} GB`;
                        return (
                          <tr key={txn._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
                                <TypeIcon className="w-3 h-3" />
                                {config.label}
                              </span>
                            </td>
                            <td className={`px-6 py-4 font-semibold tabular-nums text-sm ${
                              txn.type === 'debit' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {amountStr}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                txn.creditType === 'ghs'
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                  : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                              }`}>
                                {txn.creditType === 'ghs' ? 'GHS' : 'GB'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-200 tabular-nums text-sm">
                              {balanceStr}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                              {txn.performedBy?.name || '—'}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                              {txn.note || '—'}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-400">{formatDate(txn.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {creditsPag.pages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Page {creditsPag.page} of {creditsPag.pages}</p>
                  <div className="flex gap-2">
                    <button onClick={() => loadCredits(creditsPag.page - 1)} disabled={creditsPag.page <= 1} className={paginationBtnClass}>
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </button>
                    <button onClick={() => loadCredits(creditsPag.page + 1)} disabled={creditsPag.page >= creditsPag.pages} className={paginationBtnClass}>
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
                  <Receipt className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-1">No credit history</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">Your credit transactions will appear here</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
