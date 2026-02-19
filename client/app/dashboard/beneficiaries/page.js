'use client';
import { useState, useEffect } from 'react';
import { getBeneficiaries, addBeneficiary, updateBeneficiary, deleteBeneficiary } from '../../../lib/api';
import { formatPhone, formatDate } from '../../../lib/utils';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { Users, Plus, X, Edit2, Trash2, Check } from 'lucide-react';

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [maxBeneficiaries, setMaxBeneficiaries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await getBeneficiaries();
      setBeneficiaries(data.beneficiaries);
      setMaxBeneficiaries(data.maxBeneficiaries);
    } catch (err) {
      setError('Failed to load beneficiaries');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: '', phone: '' });
    setEditing(null);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editing) {
        await updateBeneficiary(editing._id, form);
        setSuccess('Beneficiary updated');
      } else {
        await addBeneficiary(form);
        setSuccess('Beneficiary added');
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save beneficiary');
    }
    setSaving(false);
  };

  const handleEdit = (b) => {
    setForm({ name: b.name, phone: b.phone });
    setEditing(b);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this beneficiary?')) return;
    try {
      await deleteBeneficiary(id);
      setSuccess('Beneficiary removed');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove');
    }
  };

  if (loading) return <LoadingSpinner message="Loading beneficiaries..." />;

  const inputClass =
    'w-full h-11 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-gray-800 focus:border-red-500 focus:ring-3 focus:ring-red-500/10';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Beneficiaries</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {beneficiaries.length} of {maxBeneficiaries} slots used
          </p>
        </div>
        {maxBeneficiaries > 0 && beneficiaries.length < maxBeneficiaries && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 h-10 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-sm font-medium transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Add Beneficiary
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm border border-red-100 dark:border-red-800/40">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm border border-emerald-100 dark:border-emerald-800/40">
          <Check className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
              {editing ? 'Edit Beneficiary' : 'Add Beneficiary'}
            </h3>
            <button
              onClick={resetForm}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Phone Number</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
                placeholder="0501234567"
                required
              />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 h-10 px-5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : editing ? 'Update Beneficiary' : 'Add Beneficiary'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="h-10 px-4 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Beneficiaries Table */}
      {beneficiaries.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Phone</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Data Sent</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Last Sent</th>
                  <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {beneficiaries.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-50">{b.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 tabular-nums">{formatPhone(b.phone)}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 tabular-nums">{b.totalSentGB}GB</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{b.lastSentAt ? formatDate(b.lastSentAt) : 'Never'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(b)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(b._id)}
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-1">
              {maxBeneficiaries > 0 ? 'No beneficiaries yet' : 'No active subscription'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              {maxBeneficiaries > 0 ? 'Add beneficiaries to start sharing data' : 'Activate a package first to add beneficiaries'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
