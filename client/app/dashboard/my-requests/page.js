'use client';
import { useState, useEffect } from 'react';
import { createDataRequest, getMyRequests, cancelRequest, getUserPackages } from '../../../lib/api';
import { formatDate, formatCurrency } from '../../../lib/utils';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { FileText, Plus, CheckCircle, XCircle, Clock, AlertTriangle, Trash2, Package, Send, Loader2 } from 'lucide-react';

export default function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({ recipientPhone: '', recipientName: '', packageId: '', reason: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reqRes, pkgRes] = await Promise.all([getMyRequests(), getUserPackages()]);
      setRequests(reqRes.data.requests);
      setPackages(pkgRes.data.packages);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load data' });
    }
    setLoading(false);
  };

  const selectedPkg = packages.find(p => p._id === form.packageId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        recipientPhone: form.recipientPhone,
        packageId: form.packageId,
        reason: form.reason
      };
      if (form.recipientName.trim()) payload.recipientName = form.recipientName.trim();

      const { data } = await createDataRequest(payload);
      setMessage({ type: data.success ? 'success' : 'error', text: data.message });
      if (data.success) {
        setForm({ recipientPhone: '', recipientName: '', packageId: '', reason: '' });
      }
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to send data' });
    }
    setSubmitting(false);
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this request?')) return;
    try {
      await cancelRequest(id);
      setMessage({ type: 'success', text: 'Request cancelled' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to cancel' });
    }
  };

  if (loading) return <LoadingSpinner message="Loading..." />;

  const statusConfig = {
    pending: { color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
    approved: { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
    rejected: { color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    completed: { color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
    failed: { color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Send Data</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Send data bundles instantly from your credit balance.</p>
      </div>

      {/* Request Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-gray-400" />
          Send Data Bundle
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  {packages.map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name} - {pkg.dataGB}GB ({formatCurrency(pkg.priceGHS)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Recipient Name <span className="text-gray-300 dark:text-gray-600">(optional)</span></label>
                <input
                  type="text"
                  value={form.recipientName}
                  onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
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
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Reason (optional)</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Why do you need this data?"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !form.packageId || !form.recipientPhone}
              className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4" /> Send Data</>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-5 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          Send History ({requests.length})
        </h3>

        {requests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Recipient</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Package</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Reason</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Review Note</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {requests.map((req) => {
                  const sc = statusConfig[req.status];
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={req._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3.5">
                        <p className="font-medium text-gray-900 dark:text-gray-50 text-sm">{req.recipientName}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{req.recipientPhone}</p>
                      </td>
                      <td className="py-3.5">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{req.packageName || `${req.dataGB} GB`}</p>
                        {req.priceGHS != null && (
                          <p className="text-xs text-gray-400 mt-0.5">{req.dataGB} GB - {formatCurrency(req.priceGHS)}</p>
                        )}
                      </td>
                      <td className="py-3.5 text-xs text-gray-500 dark:text-gray-400 max-w-[120px] truncate">{req.reason || '-'}</td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-gray-500 dark:text-gray-400 max-w-[120px] truncate">
                        {req.reviewNote || '-'}
                      </td>
                      <td className="py-3.5 text-xs text-gray-400">{formatDate(req.createdAt)}</td>
                      <td className="py-3.5">
                        {req.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(req._id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition"
                            title="Cancel request"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
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
