'use client';
import { useState, useEffect } from 'react';
import { getUserPackages, createUserPackage, updateUserPackage, deleteUserPackage } from '../../../lib/api';
import { formatDate, formatCurrency } from '../../../lib/utils';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { Package, Plus, CheckCircle, Edit3, Trash2, XCircle } from 'lucide-react';

export default function UserPackagesPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({ name: '', dataGB: '', priceGHS: '', description: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const { data } = await getUserPackages();
      setPackages(data.packages);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load packages' });
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: '', dataGB: '', priceGHS: '', description: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        name: form.name,
        dataGB: parseFloat(form.dataGB),
        priceGHS: parseFloat(form.priceGHS),
        description: form.description
      };

      if (editingId) {
        await updateUserPackage(editingId, payload);
        setMessage({ type: 'success', text: 'Package updated' });
      } else {
        await createUserPackage(payload);
        setMessage({ type: 'success', text: 'Package created' });
      }

      resetForm();
      loadPackages();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save package' });
    }
    setSubmitting(false);
  };

  const handleEdit = (pkg) => {
    setForm({
      name: pkg.name,
      dataGB: String(pkg.dataGB),
      priceGHS: String(pkg.priceGHS),
      description: pkg.description || ''
    });
    setEditingId(pkg._id);
    setMessage({ type: '', text: '' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this package?')) return;
    try {
      await deleteUserPackage(id);
      setMessage({ type: 'success', text: 'Package deleted' });
      loadPackages();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete' });
    }
  };

  const handleToggle = async (pkg) => {
    try {
      await updateUserPackage(pkg._id, { isActive: !pkg.isActive });
      setMessage({ type: 'success', text: `Package ${pkg.isActive ? 'disabled' : 'enabled'}` });
      loadPackages();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update package' });
    }
  };

  if (loading) return <LoadingSpinner message="Loading..." />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">User Packages</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Manage data packages available to users for sending and requesting data.</p>
      </div>

      {/* Create/Edit Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
          {editingId ? <Edit3 className="w-4 h-4 text-gray-400" /> : <Plus className="w-4 h-4 text-gray-400" />}
          {editingId ? 'Edit Package' : 'Create Package'}
        </h3>

        {message.text && (
          <div className={`flex items-center gap-2 rounded-lg px-4 py-3 mb-4 ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-700/40' : 'bg-red-50 dark:bg-red-900/30 border border-red-200/60 dark:border-red-700/40'}`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
            <p className={`text-sm ${message.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Package Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. 1GB Bundle"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Data (GB)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={form.dataGB}
                onChange={(e) => setForm({ ...form, dataGB: e.target.value })}
                required
                placeholder="e.g. 1"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Price (GHS)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.priceGHS}
                onChange={(e) => setForm({ ...form, priceGHS: e.target.value })}
                required
                placeholder="e.g. 5.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Description (optional)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Daily bundle"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm dark:bg-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Saving...' : editingId ? 'Update Package' : 'Create Package'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Packages Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-5 flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400" />
          All Packages ({packages.length})
        </h3>

        {packages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No packages created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Name</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Data</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Price</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Description</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Created</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {packages.map((pkg) => (
                  <tr key={pkg._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3.5 text-sm font-medium text-gray-900 dark:text-gray-50">{pkg.name}</td>
                    <td className="py-3.5 text-sm font-medium text-gray-700 dark:text-gray-200 tabular-nums">{pkg.dataGB} GB</td>
                    <td className="py-3.5 text-sm font-medium text-gray-700 dark:text-gray-200 tabular-nums">{formatCurrency(pkg.priceGHS)}</td>
                    <td className="py-3.5 text-xs text-gray-500 dark:text-gray-400 max-w-[180px] truncate">{pkg.description || '-'}</td>
                    <td className="py-3.5">
                      <button
                        onClick={() => handleToggle(pkg)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                          pkg.isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {pkg.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3.5 text-xs text-gray-400">{formatDate(pkg.createdAt)}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(pkg)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(pkg._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition"
                          title="Delete"
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
        )}
      </div>
    </div>
  );
}
