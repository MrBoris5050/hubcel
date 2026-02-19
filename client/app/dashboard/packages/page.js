'use client';
import { useState, useEffect } from 'react';
import { getPackages, getActiveSubscription, activateSubscription, cancelSubscription } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { Package, HardDrive, Users, Check, Zap, X } from 'lucide-react';

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [activeSub, setActiveSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pkgRes, subRes] = await Promise.all([getPackages(), getActiveSubscription()]);
      setPackages(pkgRes.data.packages);
      setActiveSub(subRes.data.subscription);
    } catch (err) {
      setError('Failed to load packages');
    }
    setLoading(false);
  };

  const handleActivate = async (packageId) => {
    setActivating(true);
    setError('');
    setSuccess('');
    try {
      await activateSubscription(packageId);
      setSuccess('Package activated successfully!');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate package');
    }
    setActivating(false);
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      await cancelSubscription(activeSub._id);
      setSuccess('Subscription cancelled');
      setActiveSub(null);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel');
    }
  };

  if (loading) return <LoadingSpinner message="Loading packages..." />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Bundle Packages</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Choose a prepaid data sharing package</p>
      </div>

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

      {/* Active subscription banner */}
      {activeSub && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <Package className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Active: {activeSub.packageName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activeSub.remainingDataGB}GB remaining of {activeSub.totalDataGB}GB</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <X className="w-3.5 h-3.5" />
            Cancel Plan
          </button>
        </div>
      )}

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {packages.map((pkg) => {
          const isActive = activeSub?.package?._id === pkg._id || activeSub?.package === pkg._id;
          return (
            <div
              key={pkg._id}
              className={`relative bg-white dark:bg-gray-800 rounded-xl border-2 p-6 transition-all duration-200 ${
                isActive
                  ? 'border-red-500/80 ring-4 ring-red-500/5'
                  : 'border-gray-200/80 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {isActive && (
                <div className="absolute -top-3 left-5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                    <Check className="w-3 h-3" />
                    Active Plan
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{pkg.name}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{pkg.description}</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                  <div className="w-7 h-7 rounded-md bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                    <HardDrive className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <span>{pkg.dataGB}GB Data Included</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                  <div className="w-7 h-7 rounded-md bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <span>Up to {pkg.maxBeneficiaries} beneficiaries</span>
                </div>
              </div>

              <div className="pt-5 border-t border-gray-100 dark:border-gray-700 flex items-end justify-between">
                <div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">{formatCurrency(pkg.priceGHS)}</span>
                  <span className="text-gray-400 text-sm ml-1">/month</span>
                </div>
                {!isActive && (
                  <button
                    onClick={() => handleActivate(pkg._id)}
                    disabled={activating}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {activating ? 'Activating...' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
