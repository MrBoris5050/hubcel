'use client';
import { useState, useEffect } from 'react';
import { getUsers, creditUser, debitUser, getAllCredits } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { CreditCard, Plus, Minus, CheckCircle } from 'lucide-react';

export default function CreditUsersPage() {
  const [users, setUsers] = useState([]);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ userId: '', amount: '', note: '', creditType: 'gb', action: 'credit' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, creditsRes] = await Promise.all([getUsers(), getAllCredits()]);
      setUsers(usersRes.data.users);
      setCredits(creditsRes.data.credits);
    } catch (err) {
      setError('Failed to load data');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        userId: form.userId,
        amount: parseFloat(form.amount),
        creditType: form.creditType,
        note: form.note
      };
      const apiFn = form.action === 'debit' ? debitUser : creditUser;
      const { data } = await apiFn(payload);
      setSuccess(data.message);
      setForm({ userId: '', amount: '', note: '', creditType: 'gb', action: form.action });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${form.action} user`);
    }
    setSubmitting(false);
  };

  if (loading) return <LoadingSpinner message="Loading..." />;

  const statusColors = {
    active: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    depleted: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    expired: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Credit Users</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Allocate data credits to users.</p>
      </div>

      {/* Credit Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            {form.action === 'debit' ? <Minus className="w-4 h-4 text-gray-400" /> : <Plus className="w-4 h-4 text-gray-400" />}
            {form.action === 'debit' ? 'Debit User' : 'Credit User'}
          </h3>
          <div className="flex items-center bg-gray-100/80 dark:bg-gray-700/80 rounded-xl p-1 gap-0.5">
            <button
              type="button"
              onClick={() => setForm({ ...form, action: 'credit' })}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                form.action === 'credit'
                  ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm dark:shadow-none'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Credit
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, action: 'debit' })}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                form.action === 'debit'
                  ? 'bg-white dark:bg-gray-700 text-red-700 dark:text-red-400 shadow-sm dark:shadow-none'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Debit
            </button>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-700/40 rounded-lg px-4 py-3 mb-4">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200/60 dark:border-red-700/40 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">User</label>
            <select
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              <option value="">Select user...</option>
              {users.filter(u => u.role === 'user').map((u) => (
                <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Credit Type</label>
            <select
              value={form.creditType}
              onChange={(e) => setForm({ ...form, creditType: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              <option value="gb">GB (Data)</option>
              <option value="ghs">GHS (Money)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              {form.creditType === 'ghs' ? 'Amount (GHS)' : 'Data (GB)'}
            </label>
            <input
              type="number"
              step={form.creditType === 'ghs' ? '0.01' : '1'}
              min={form.creditType === 'ghs' ? '0.01' : '1'}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              placeholder={form.creditType === 'ghs' ? 'e.g. 100.00' : 'e.g. 10'}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Note (optional)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder={form.action === 'debit' ? 'Reason for debit' : 'Reason for credit'}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition ${
                form.action === 'debit'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {submitting
                ? (form.action === 'debit' ? 'Debiting...' : 'Crediting...')
                : (form.action === 'debit' ? 'Debit User' : 'Credit User')}
            </button>
          </div>
        </form>
      </div>

      {/* Credits Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-5 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400" />
          All Credits Issued ({credits.length})
        </h3>

        {credits.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No credits issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">User</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Type</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Credited</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Balance</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Used</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Note</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {credits.map((c) => {
                  const isGHS = c.creditType === 'ghs';
                  return (
                    <tr key={c._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3.5">
                        <p className="font-medium text-gray-900 dark:text-gray-50 text-sm">{c.user?.name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{c.user?.email}</p>
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isGHS ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'}`}>
                          {isGHS ? 'GHS' : 'GB'}
                        </span>
                      </td>
                      <td className="py-3.5 text-sm font-medium text-gray-700 dark:text-gray-200 tabular-nums">
                        {isGHS ? `GHS ${c.amountGHS?.toFixed(2)}` : `${c.dataGB} GB`}
                      </td>
                      <td className="py-3.5 text-sm font-medium text-gray-700 dark:text-gray-200 tabular-nums">
                        {isGHS ? `GHS ${c.balanceGHS?.toFixed(2)}` : `${c.balanceGB} GB`}
                      </td>
                      <td className="py-3.5 text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                        {isGHS ? `GHS ${c.usedGHS?.toFixed(2)}` : `${c.usedGB} GB`}
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[c.status]}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-gray-500 dark:text-gray-400 max-w-[150px] truncate">{c.note || '-'}</td>
                      <td className="py-3.5 text-xs text-gray-400">{formatDate(c.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
