'use client';
import { useState, useEffect } from 'react';
import { getTokenStatus, requestOtp, verifyOtp, setManualToken, getTokenHistory, getConfigs, updateConfig, getPackages } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';
import { useAuth } from '../../../lib/auth';
import OtpModal from '../../../components/OtpModal';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { Shield, Clock, CheckCircle, XCircle, RefreshCw, KeyRound, Settings, Save, Loader, User } from 'lucide-react';

function UserSettings({ user }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Your account information</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <User className="w-[18px] h-[18px] text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Account Information</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Your account details</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Name</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{user?.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-50 dark:border-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-50 dark:border-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">Phone</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{user?.phone}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-50 dark:border-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">Role</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 capitalize">{user?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [tokenStatus, setTokenStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otpModal, setOtpModal] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [manualToken, setManualTokenInput] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Config state
  const [configs, setConfigs] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState({});
  const [savingConfig, setSavingConfig] = useState({});
  const [configMessage, setConfigMessage] = useState({ type: '', text: '' });
  const [packages, setPackages] = useState([]);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadData();
      loadConfigs();
    } else {
      setLoading(false);
      setConfigLoading(false);
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const [statusRes, historyRes] = await Promise.all([getTokenStatus(), getTokenHistory()]);
      setTokenStatus(statusRes.data);
      setHistory(historyRes.data.history);
    } catch (err) {
      console.error('Failed to load token data:', err);
    }
    setLoading(false);
  };

  const loadConfigs = async () => {
    try {
      const [configRes, packagesRes] = await Promise.all([getConfigs(), getPackages()]);
      const cfgs = configRes.data.configs || configRes.data;
      setConfigs(cfgs);
      setPackages(packagesRes.data.packages || packagesRes.data || []);
      // Initialize editing state
      const editState = {};
      cfgs.forEach((c) => {
        editState[c.key] = c.value;
      });
      setEditingConfig(editState);
    } catch (err) {
      console.error('Failed to load configs:', err);
    }
    setConfigLoading(false);
  };

  const handleRequestOtp = async () => {
    setRequesting(true);
    setMessage({ type: '', text: '' });
    try {
      await requestOtp();
      setMessage({ type: 'success', text: 'OTP sent to registered phone number' });
      setOtpModal(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to request OTP' });
    }
    setRequesting(false);
  };

  const handleVerifyOtp = async (otp) => {
    setVerifying(true);
    try {
      await verifyOtp(otp);
      setMessage({ type: 'success', text: 'Token generated successfully!' });
      setOtpModal(false);
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'OTP verification failed' });
    }
    setVerifying(false);
  };

  const handleManualToken = async (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setSavingToken(true);
    setMessage({ type: '', text: '' });
    try {
      await setManualToken(manualToken.trim());
      setMessage({ type: 'success', text: 'Token saved successfully!' });
      setManualTokenInput('');
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save token' });
    }
    setSavingToken(false);
  };

  const handleSaveConfig = async (key) => {
    setSavingConfig((prev) => ({ ...prev, [key]: true }));
    setConfigMessage({ type: '', text: '' });
    try {
      await updateConfig(key, editingConfig[key]);
      setConfigMessage({ type: 'success', text: `"${key}" updated successfully` });
      await loadConfigs();
    } catch (err) {
      setConfigMessage({ type: 'error', text: err.response?.data?.message || `Failed to update "${key}"` });
    }
    setSavingConfig((prev) => ({ ...prev, [key]: false }));
  };

  // Non-admin users see a simple account page
  if (!isAdmin) {
    return <UserSettings user={user} />;
  }

  if (loading) return <LoadingSpinner message="Loading settings..." />;

  const isActive = tokenStatus?.status === 'active';

  const inputClass =
    'w-full h-11 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-gray-800 focus:border-red-500 focus:ring-3 focus:ring-red-500/10';

  // Group configs for display
  const configDescriptions = {
    active_sharer_plan: 'The currently active sharer plan ID',
    subscriber_msisdn: 'Primary subscriber phone number (MSISDN)',
    max_single_send_gb: 'Maximum GB allowed per single send operation',
    queue_concurrency: 'Number of queue jobs to process concurrently',
    queue_delay_ms: 'Delay between queue jobs in milliseconds',
    queue_max_retries: 'Maximum retry attempts for failed queue jobs',
    maintenance_mode: 'Enable maintenance mode (true/false)',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Manage authentication and system configuration</p>
      </div>

      {/* Token Message */}
      {message.text && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm border ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40'
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800/40'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* ========== TOKEN STATUS ========== */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60">
        {/* Section header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <div className="w-9 h-9 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
            <Shield className="w-[18px] h-[18px] text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Telecel Token Status</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Authentication token for the Telecel API</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Status indicator */}
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'} ring-4 ${isActive ? 'ring-emerald-500/20' : 'ring-red-500/20'}`} />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
              {isActive ? 'Active' : tokenStatus?.status === 'expired' ? 'Expired' : 'No Token'}
            </span>
            {isActive && tokenStatus?.hoursRemaining != null && (
              <span className="text-xs text-gray-400 flex items-center gap-1 ml-2">
                <Clock className="w-3.5 h-3.5" />
                {tokenStatus.hoursRemaining} hours remaining
              </span>
            )}
          </div>

          {isActive && tokenStatus?.expiresAt && (
            <p className="text-xs text-gray-400 ml-[22px]">Expires: {formatDate(tokenStatus.expiresAt)}</p>
          )}

          {/* Generate Token via OTP */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-1.5">Generate New Token</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Request an OTP to your registered Telecel phone number, then enter it to generate a new token.
            </p>
            <button
              onClick={handleRequestOtp}
              disabled={requesting}
              className="flex items-center gap-2 h-10 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${requesting ? 'animate-spin' : ''}`} />
              {requesting ? 'Requesting OTP...' : 'Request OTP'}
            </button>
          </div>

          {/* Manual Token Entry */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-1.5">Manual Token Entry</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">If you have a token from another source, paste it here.</p>
            <form onSubmit={handleManualToken} className="flex gap-3">
              <input
                value={manualToken}
                onChange={(e) => setManualTokenInput(e.target.value)}
                className={`${inputClass} flex-1 font-mono`}
                placeholder="Paste token here..."
              />
              <button
                type="submit"
                disabled={savingToken || !manualToken.trim()}
                className="h-11 px-5 bg-gray-900 hover:bg-gray-800 active:bg-gray-950 text-white rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                {savingToken ? 'Saving...' : 'Save Token'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ========== TOKEN HISTORY ========== */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Token History</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {history.map((t) => (
              <div key={t._id} className="px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {t.isActive ? (
                    <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                      <XCircle className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      {t.isActive ? 'Active Token' : 'Expired Token'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{formatDate(t.createdAt)}</p>
                  {t.expiresAt && (
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">Expires: {formatDate(t.expiresAt)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== SYSTEM CONFIGURATION ========== */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <Settings className="w-[18px] h-[18px] text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">System Configuration</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage system-wide settings</p>
          </div>
        </div>

        {configMessage.text && (
          <div className={`mx-6 mt-5 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm border ${
            configMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40'
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800/40'
          }`}>
            {configMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            )}
            {configMessage.text}
          </div>
        )}

        {configLoading ? (
          <div className="px-6 py-12">
            <LoadingSpinner message="Loading configuration..." />
          </div>
        ) : configs.length > 0 ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {configs.map((config) => {
              const hasChanged = editingConfig[config.key] !== config.value;
              const isSaving = savingConfig[config.key];
              const desc = configDescriptions[config.key];
              const isBool = config.value === 'true' || config.value === 'false' || config.value === true || config.value === false;

              return (
                <div key={config.key || config._id} className="px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50 font-mono">{config.key}</p>
                      {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
                    </div>
                    <div className="flex items-center gap-2 sm:w-80 shrink-0">
                      {isBool ? (
                        <button
                          onClick={() => {
                            const newVal = editingConfig[config.key] === 'true' || editingConfig[config.key] === true ? 'false' : 'true';
                            setEditingConfig((prev) => ({ ...prev, [config.key]: newVal }));
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                            editingConfig[config.key] === 'true' || editingConfig[config.key] === true
                              ? 'bg-red-600'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                              editingConfig[config.key] === 'true' || editingConfig[config.key] === true
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      ) : config.key === 'active_sharer_plan' && packages.length > 0 ? (
                        <select
                          value={editingConfig[config.key] ?? ''}
                          onChange={(e) => setEditingConfig((prev) => ({ ...prev, [config.key]: e.target.value }))}
                          className={`${inputClass} flex-1`}
                        >
                          {packages.map((pkg) => (
                            <option key={pkg._id || pkg.name} value={pkg.name}>{pkg.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={editingConfig[config.key] ?? ''}
                          onChange={(e) => setEditingConfig((prev) => ({ ...prev, [config.key]: e.target.value }))}
                          className={`${inputClass} flex-1`}
                        />
                      )}
                      <button
                        onClick={() => handleSaveConfig(config.key)}
                        disabled={!hasChanged || isSaving}
                        className="h-11 w-11 shrink-0 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700 disabled:hover:bg-white dark:disabled:hover:bg-gray-800"
                      >
                        {isSaving ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-400">No configuration found</p>
          </div>
        )}
      </div>

      <OtpModal open={otpModal} onClose={() => setOtpModal(false)} onSubmit={handleVerifyOtp} loading={verifying} />
    </div>
  );
}
