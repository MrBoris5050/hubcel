'use client';
import { useState, useEffect } from 'react';
import { getApiKeys, createApiKey, updateApiKey, deleteApiKey } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { Key, Plus, Copy, Check, Trash2, ToggleLeft, ToggleRight, X, Clock } from 'lucide-react';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: '', expiresInDays: '', rateLimit: 30 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const allPermissions = [
    { id: 'share:send', label: 'Send Data' },
    { id: 'share:bulk', label: 'Bulk Send' },
    { id: 'beneficiaries:read', label: 'Read Beneficiaries' },
    { id: 'beneficiaries:write', label: 'Write Beneficiaries' },
    { id: 'transactions:read', label: 'Read Transactions' },
    { id: 'queue:read', label: 'Read Queue' }
  ];
  const [selectedPerms, setSelectedPerms] = useState(['share:send', 'beneficiaries:read', 'transactions:read']);

  useEffect(() => { loadKeys(); }, []);

  const loadKeys = async () => {
    try {
      const { data } = await getApiKeys();
      setKeys(data.keys);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load API keys' });
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { data } = await createApiKey({
        name: form.name,
        permissions: selectedPerms,
        expiresInDays: form.expiresInDays ? parseInt(form.expiresInDays) : null,
        rateLimit: parseInt(form.rateLimit) || 30
      });
      setNewKey(data.apiKey.key);
      setMessage({ type: 'success', text: 'API key created! Copy it now - it won\'t be shown again.' });
      setForm({ name: '', expiresInDays: '', rateLimit: 30 });
      setShowCreate(false);
      await loadKeys();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create key' });
    }
    setSaving(false);
  };

  const handleToggle = async (id, isActive) => {
    try {
      await updateApiKey(id, { isActive: !isActive });
      await loadKeys();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update key' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete API key "${name}"?`)) return;
    try {
      await deleteApiKey(id);
      setMessage({ type: 'success', text: 'Key deleted' });
      await loadKeys();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete key' });
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePerm = (perm) => {
    setSelectedPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  if (loading) return <LoadingSpinner message="Loading API keys..." />;

  const inputClass =
    'w-full h-11 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-gray-800 focus:border-red-500 focus:ring-3 focus:ring-red-500/10';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">API Keys</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Manage external API access</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 h-10 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-sm font-medium transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          New Key
        </button>
      </div>

      {/* Alert */}
      {message.text && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm border ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40'
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800/40'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* New Key Banner */}
      {newKey && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-700/40 rounded-xl p-5">
          <p className="font-medium text-amber-800 dark:text-amber-200 text-sm mb-3">Your new API key (copy it now - it won't be shown again):</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white dark:bg-gray-800 px-4 py-2.5 rounded-xl font-mono text-sm text-gray-900 dark:text-gray-50 border border-amber-200 dark:border-amber-700/40 break-all">
              {newKey}
            </code>
            <button
              onClick={copyKey}
              className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 transition-all"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs text-amber-600 dark:text-amber-400 mt-3 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Create API Key</h3>
            <button
              onClick={() => setShowCreate(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  placeholder="My integration"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Expires (days)</label>
                <input
                  type="number"
                  value={form.expiresInDays}
                  onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })}
                  className={inputClass}
                  placeholder="Never"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Rate limit/min</label>
                <input
                  type="number"
                  value={form.rateLimit}
                  onChange={(e) => setForm({ ...form, rateLimit: e.target.value })}
                  className={inputClass}
                  min="1"
                  max="100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Permissions</label>
              <div className="flex flex-wrap gap-2">
                {allPermissions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePerm(p.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                      selectedPerms.includes(p.id)
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/40 text-red-700 dark:text-red-400'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 h-10 px-5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : 'Create Key'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="h-10 px-4 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keys Table */}
      {keys.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Key</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Permissions</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Usage</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {keys.map((k) => (
                  <tr key={k._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-gray-50">{k.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(k.createdAt)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-2.5 py-1 rounded-lg">{k.keyPrefix}...****</code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {k.permissions?.slice(0, 3).map((p) => (
                          <span key={p} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-md">{p}</span>
                        ))}
                        {k.permissions?.length > 3 && (
                          <span className="text-[10px] text-gray-400">+{k.permissions.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                      <p className="tabular-nums">{k.usageCount} requests</p>
                      {k.lastUsedAt && (
                        <p className="text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{formatDate(k.lastUsedAt)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${k.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${k.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        {k.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggle(k._id, k.isActive)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                          title={k.isActive ? 'Disable' : 'Enable'}
                        >
                          {k.isActive ? (
                            <ToggleRight className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(k._id, k.name)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !showCreate && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
                <Key className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-1">No API keys yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                Create an API key to allow external applications to send data bundles
              </p>
            </div>
          </div>
        )
      )}

      {/* API Usage Docs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4">API Usage</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Use your API key in the <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md text-xs font-mono">x-api-key</code> header to access the external API.
        </p>
        <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <pre className="text-sm text-gray-300 font-mono whitespace-pre">{`curl -X POST http://localhost:5000/api/v1/share/send \\
  -H "x-api-key: tbk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"phone": "0501234567", "name": "John", "dataGB": 5}'`}</pre>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Works with both subscription and credit balances. For GHS credit users, include <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono">packageId</code> in the request body.
        </p>
        <div className="mt-5 space-y-2">
          {[
            { method: 'POST', path: '/api/v1/share/send', desc: 'Send data to a beneficiary' },
            // { method: 'POST', path: '/api/v1/share/bulk', desc: 'Bulk send' },
            // { method: 'GET', path: '/api/v1/beneficiaries', desc: 'List beneficiaries' },
            { method: 'GET', path: '/api/v1/transactions', desc: 'List transactions' },
            // { method: 'GET', path: '/api/v1/queue/status', desc: 'Queue status' },
          ].map((ep) => (
            <div key={ep.path} className="flex items-center gap-3 text-xs">
              <span className={`font-mono font-medium ${ep.method === 'POST' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>{ep.method}</span>
              <span className="font-mono text-gray-500 dark:text-gray-400">{ep.path}</span>
              <span className="text-gray-400">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
