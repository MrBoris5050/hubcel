'use client';
import { useState, useEffect, useCallback } from 'react';
import { getBeneficiaries, getActiveSubscription, sendData, getQueueStatus, getQueueJobs } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { Send, CheckCircle, XCircle, HardDrive, Clock, Loader, RefreshCw, ArrowRight, Phone, Users } from 'lucide-react';

export default function SharePage() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [polling, setPolling] = useState(false);

  // Form state
  const [sendMode, setSendMode] = useState('phone'); // 'phone' or 'beneficiary'
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [phone, setPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [dataGB, setDataGB] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [benRes, subRes] = await Promise.all([getBeneficiaries(), getActiveSubscription()]);
      setBeneficiaries(benRes.data.beneficiaries);
      setSubscription(subRes.data.subscription);
    } catch (err) {
      console.error('Failed to load:', err);
    }
    setLoading(false);
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const [statusRes, jobsRes] = await Promise.all([
        getQueueStatus(),
        getQueueJobs({ limit: 10 })
      ]);
      setQueueStatus(statusRes.data);
      setRecentJobs(jobsRes.data.jobs);

      if (statusRes.data.pending > 0 || statusRes.data.processing > 0) {
        setPolling(true);
      } else {
        setPolling(false);
        const subRes = await getActiveSubscription();
        setSubscription(subRes.data.subscription);
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadQueue();
  }, [loadData, loadQueue]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(loadQueue, 3000);
    return () => clearInterval(interval);
  }, [polling, loadQueue]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!dataGB) return;
    if (sendMode === 'beneficiary' && !beneficiaryId) return;
    if (sendMode === 'phone' && !phone) return;

    setSending(true);
    setResult(null);
    try {
      const payload = sendMode === 'beneficiary'
        ? { beneficiaryId, dataGB: parseFloat(dataGB) }
        : { phone, name: recipientName || phone, dataGB: parseFloat(dataGB) };

      const { data } = await sendData(payload);
      setResult(data);
      setBeneficiaryId('');
      setPhone('');
      setRecipientName('');
      setDataGB('');
      // Reload beneficiaries in case a new one was auto-created
      loadData();
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Failed to send' });
    }
    setSending(false);
  };

  if (loading) return <LoadingSpinner message="Loading..." />;

  if (!subscription) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Share Data</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Send data bundles to any phone number</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
              <Send className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-1">No active subscription</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">Activate a bundle package first to start sharing data</p>
          </div>
        </div>
      </div>
    );
  }

  const hasActive = queueStatus && (queueStatus.pending > 0 || queueStatus.processing > 0);
  const selectedBeneficiary = beneficiaries.find((b) => b._id === beneficiaryId);

  const canSend = dataGB && parseFloat(dataGB) > 0 && parseFloat(dataGB) <= subscription.remainingDataGB &&
    ((sendMode === 'phone' && phone.length >= 10) || (sendMode === 'beneficiary' && beneficiaryId));

  const previewName = sendMode === 'beneficiary'
    ? selectedBeneficiary?.name
    : (recipientName || phone);
  const previewPhone = sendMode === 'beneficiary'
    ? selectedBeneficiary?.phone
    : phone;

  const inputClass =
    'w-full h-11 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-gray-800 focus:border-red-500 focus:ring-3 focus:ring-red-500/10';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Share Data</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Send data bundles to any phone number or saved beneficiary</p>
      </div>

      {/* Remaining Data Indicator */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-5 flex items-center gap-4">
        <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
          <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{subscription.packageName}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight mt-0.5">
            {subscription.remainingDataGB}GB{' '}
            <span className="text-sm font-normal text-gray-400">remaining</span>
          </p>
        </div>
      </div>

      {/* Queue Status Banner */}
      {queueStatus && queueStatus.total > 0 && (
        <div className={`rounded-xl p-4 flex items-center justify-between border ${
          hasActive ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200/60 dark:border-blue-700/40' : 'bg-gray-50 dark:bg-gray-900 border-gray-200/60 dark:border-gray-700/60'
        }`}>
          <div className="flex items-center gap-3">
            {hasActive ? (
              <Loader className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                {hasActive ? 'Processing Queue...' : 'Queue Idle'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {queueStatus.pending} pending, {queueStatus.processing} processing, {queueStatus.completed} done, {queueStatus.failed} failed
              </p>
            </div>
          </div>
          <button
            onClick={loadQueue}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/60 dark:hover:bg-gray-700/60 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Result Message */}
      {result && (
        <div className={`rounded-xl p-4 flex items-start gap-3 border ${
          result.success ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200/60 dark:border-emerald-700/40' : 'bg-red-50 dark:bg-red-900/30 border-red-200/60 dark:border-red-700/40'
        }`}>
          {result.success ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          )}
          <div>
            <p className={`text-sm font-medium ${result.success ? 'text-emerald-900 dark:text-emerald-200' : 'text-red-900 dark:text-red-200'}`}>
              {result.success ? 'Sent Successfully' : 'Failed'}
            </p>
            <p className={`text-xs mt-0.5 ${result.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>{result.message}</p>
          </div>
        </div>
      )}

      {/* Share Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-5">Send Data Bundle</h3>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setSendMode('phone')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              sendMode === 'phone'
                ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700'
                : 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Phone className="w-4 h-4" />
            Phone Number
          </button>
          {beneficiaries.length > 0 && (
            <button
              type="button"
              onClick={() => setSendMode('beneficiary')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sendMode === 'beneficiary'
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700'
                  : 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Users className="w-4 h-4" />
              Saved Beneficiary
            </button>
          )}
        </div>

        <form onSubmit={handleSend} className="space-y-5">
          {sendMode === 'phone' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 0241234567"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className={inputClass}
                  placeholder="Recipient name"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Select Beneficiary</label>
              <select
                value={beneficiaryId}
                onChange={(e) => setBeneficiaryId(e.target.value)}
                className={`${inputClass} bg-white dark:bg-gray-900 cursor-pointer`}
                required
              >
                <option value="">Choose a beneficiary...</option>
                {beneficiaries.map((b) => (
                  <option key={b._id} value={b._id}>{b.name} ({b.phone})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Data Amount (GB)
              <span className="text-gray-400 ml-2 font-normal">Remaining: {subscription.remainingDataGB}GB</span>
            </label>
            <input
              type="number"
              value={dataGB}
              onChange={(e) => setDataGB(e.target.value)}
              min="0.1"
              max={subscription.remainingDataGB}
              step="0.1"
              className={inputClass}
              placeholder="e.g. 5"
              required
            />
          </div>

          {/* Preview */}
          {previewName && dataGB && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3.5 flex items-center gap-3">
              <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Send <span className="font-semibold text-gray-900 dark:text-gray-50">{dataGB}GB</span> to{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-50">{previewName}</span>{' '}
                {previewPhone && previewPhone !== previewName && <span className="text-gray-400">({previewPhone})</span>}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !canSend}
            className="w-full h-11 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Data
              </>
            )}
          </button>
        </form>
      </div>

      {/* Recent Transactions */}
      {recentJobs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Recent Sends</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Beneficiary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {recentJobs.map((job) => (
                  <tr key={job._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-gray-900 dark:text-gray-50">{job.beneficiaryName}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{job.beneficiaryPhone}</p>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-gray-700 dark:text-gray-200 tabular-nums">{job.dataGB}GB</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        job.status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        job.status === 'failed' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        job.status === 'processing' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {job.status === 'processing' && <Loader className="w-3 h-3 animate-spin" />}
                        {job.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        {job.status === 'failed' && <XCircle className="w-3 h-3" />}
                        {job.status === 'pending' && <Clock className="w-3 h-3" />}
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-400 max-w-[200px] truncate">
                      {job.result?.message || job.error || '-'}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-400">{formatDate(job.createdAt)}</td>
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
