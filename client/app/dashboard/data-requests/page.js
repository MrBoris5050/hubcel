'use client';
import { useState, useEffect } from 'react';
import { getAllRequests, approveRequest, rejectRequest } from '../../../lib/api';
import { formatDate, formatCurrency } from '../../../lib/utils';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

const tabs = ['pending', 'approved', 'rejected', 'all'];

export default function DataRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      const { data } = await getAllRequests(params);
      setRequests(data.requests);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load requests' });
    }
    setLoading(false);
  };

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await approveRequest(id, reviewNote);
      setMessage({ type: 'success', text: 'Request approved and queued for sending' });
      setReviewingId(null);
      setReviewNote('');
      loadRequests();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to approve' });
    }
    setActionLoading(null);
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await rejectRequest(id, reviewNote);
      setMessage({ type: 'success', text: 'Request rejected' });
      setReviewingId(null);
      setReviewNote('');
      loadRequests();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to reject' });
    }
    setActionLoading(null);
  };

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
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Data Requests</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Review and manage user data requests.</p>
      </div>

      {message.text && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-3 ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-700/40' : 'bg-red-50 dark:bg-red-900/30 border border-red-200/60 dark:border-red-700/40'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <p className={`text-sm ${message.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{message.text}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm dark:shadow-none'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
        {loading ? (
          <LoadingSpinner message="Loading requests..." />
        ) : requests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No {activeTab !== 'all' ? activeTab : ''} requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">User</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Recipient</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Package</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Reason</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                  {activeTab === 'pending' && (
                    <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {requests.map((req) => {
                  const sc = statusConfig[req.status];
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={req._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3.5">
                        <p className="font-medium text-gray-900 dark:text-gray-50 text-sm">{req.user?.name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{req.user?.email}</p>
                      </td>
                      <td className="py-3.5">
                        <p className="text-sm text-gray-900 dark:text-gray-50">{req.recipientName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{req.recipientPhone}</p>
                      </td>
                      <td className="py-3.5">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{req.packageName || `${req.dataGB} GB`}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {req.dataGB} GB{req.priceGHS != null ? ` - ${formatCurrency(req.priceGHS)}` : ''}
                        </p>
                      </td>
                      <td className="py-3.5 text-xs text-gray-500 dark:text-gray-400 max-w-[150px] truncate">{req.reason || '-'}</td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-gray-400">{formatDate(req.createdAt)}</td>
                      {activeTab === 'pending' && (
                        <td className="py-3.5">
                          {reviewingId === req._id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                placeholder="Note (optional)"
                                className="w-32 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-xs dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-1 focus:ring-red-500/20"
                              />
                              <button
                                onClick={() => handleApprove(req._id)}
                                disabled={actionLoading === req._id}
                                className="px-2.5 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 disabled:opacity-50 transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(req._id)}
                                disabled={actionLoading === req._id}
                                className="px-2.5 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 transition"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => { setReviewingId(null); setReviewNote(''); }}
                                className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReviewingId(req._id)}
                              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                            >
                              Review
                            </button>
                          )}
                        </td>
                      )}
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
