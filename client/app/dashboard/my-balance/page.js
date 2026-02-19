'use client';
import { useState, useEffect } from 'react';
import { getMyBalance, getMyCreditHistory, sendFromCredit, getUserPackages } from '../../../lib/api';
import { formatDate, formatCurrency } from '../../../lib/utils';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { Wallet, Send, ArrowUpRight, ArrowDownLeft, CheckCircle, Package } from 'lucide-react';

export default function MyBalancePage() {
  const [balance, setBalance] = useState(0);
  const [creditType, setCreditType] = useState('gb');
  const [history, setHistory] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({ recipientPhone: '', recipientName: '', packageId: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balRes, histRes, pkgRes] = await Promise.all([
        getMyBalance(),
        getMyCreditHistory(),
        getUserPackages()
      ]);
      setBalance(balRes.data.balance);
      setCreditType(balRes.data.creditType || 'gb');
      setHistory(histRes.data.transactions);
      setPackages(pkgRes.data.packages);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load data' });
    }
    setLoading(false);
  };

  const selectedPkg = packages.find(p => p._id === form.packageId);

  const handleSend = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const { data } = await sendFromCredit({
        recipientPhone: form.recipientPhone,
        recipientName: form.recipientName,
        packageId: form.packageId
      });
      setMessage({ type: 'success', text: data.message });
      setForm({ recipientPhone: '', recipientName: '', packageId: '' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to send' });
    }
    setSubmitting(false);
  };

  if (loading) return <LoadingSpinner message="Loading..." />;

  const typeColors = {
    credit: 'text-emerald-600 dark:text-emerald-400',
    debit: 'text-red-600',
    refund: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">My Balance</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">View your credit balance and send data.</p>
      </div>

      {/* Balance Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Available Balance</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-0.5">
              {creditType === 'ghs' ? `GHS ${Number(balance).toFixed(2)}` : `${balance} GB`}
            </p>
          </div>
        </div>
      </div>

      {/* Send Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-gray-400" />
          Send Data from Credit
        </h3>

        {message.text && (
          <div className={`flex items-center gap-2 rounded-lg px-4 py-3 mb-4 ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-700/40' : 'bg-red-50 dark:bg-red-900/30 border border-red-200/60 dark:border-red-700/40'}`}>
            {message.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
            <p className={`text-sm ${message.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{message.text}</p>
          </div>
        )}

        {packages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No data packages available. Contact admin.</p>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Recipient Name</label>
                <input
                  type="text"
                  value={form.recipientName}
                  onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                  required
                  placeholder="John Doe"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={form.recipientPhone}
                  onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })}
                  required
                  placeholder="0241234567"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Package</label>
                <select
                  value={form.packageId}
                  onChange={(e) => setForm({ ...form, packageId: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="">Select package...</option>
                  {packages.map((pkg) => {
                    const cantAfford = creditType === 'ghs' ? pkg.priceGHS > balance : pkg.dataGB > balance;
                    return (
                      <option key={pkg._id} value={pkg._id} disabled={cantAfford}>
                        {pkg.name} - {pkg.dataGB}GB ({formatCurrency(pkg.priceGHS)})
                        {cantAfford ? ' (Insufficient)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Selected package summary */}
            {selectedPkg && (
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-3">
                <Package className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-50">{selectedPkg.name}</span>
                  <span className="text-gray-400 mx-2">|</span>
                  <span className="text-gray-600 dark:text-gray-300">{selectedPkg.dataGB} GB</span>
                  <span className="text-gray-400 mx-2">|</span>
                  <span className="font-medium text-gray-900 dark:text-gray-50">{formatCurrency(selectedPkg.priceGHS)}</span>
                  <span className="text-gray-400 mx-2">|</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Deducts: {creditType === 'ghs' ? `GHS ${selectedPkg.priceGHS}` : `${selectedPkg.dataGB} GB`}
                  </span>
                  {(creditType === 'ghs' ? selectedPkg.priceGHS > balance : selectedPkg.dataGB > balance) && (
                    <span className="text-red-600 ml-2 text-xs">(Insufficient balance)</span>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || balance <= 0 || !form.packageId || (selectedPkg && (creditType === 'ghs' ? selectedPkg.priceGHS > balance : selectedPkg.dataGB > balance))}
              className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Sending...' : 'Send Data'}
            </button>
          </form>
        )}
      </div>

      {/* Credit History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-5">Credit History</h3>

        {history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No credit activity yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((txn) => (
              <div key={txn._id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    txn.type === 'credit' ? 'bg-emerald-50 dark:bg-emerald-900/30' : txn.type === 'debit' ? 'bg-red-50 dark:bg-red-900/30' : 'bg-blue-50 dark:bg-blue-900/30'
                  }`}>
                    {txn.type === 'debit' ? (
                      <ArrowUpRight className={`w-4 h-4 ${typeColors[txn.type]}`} />
                    ) : (
                      <ArrowDownLeft className={`w-4 h-4 ${typeColors[txn.type]}`} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 capitalize">{txn.type}</p>
                    <p className="text-xs text-gray-400">{txn.note || formatDate(txn.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold tabular-nums ${typeColors[txn.type]}`}>
                    {txn.type === 'debit' ? '-' : '+'}
                    {txn.creditType === 'ghs' ? `GHS ${txn.amountGHS?.toFixed(2)}` : `${txn.dataGB} GB`}
                  </span>
                  <p className="text-xs text-gray-400 tabular-nums mt-0.5">
                    Bal: {txn.creditType === 'ghs' ? `GHS ${txn.balanceAfter?.toFixed(2)}` : `${txn.balanceAfter} GB`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
