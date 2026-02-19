'use client';
import { HardDrive, Users, Check } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export default function PackageCard({ pkg, isActive, onActivate, loading }) {
  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-lg border overflow-hidden transition-all duration-200 ${
        isActive
          ? 'border-red-600 ring-1 ring-red-600/20'
          : 'border-gray-200/80 dark:border-gray-700/60 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-600" />
      )}

      <div className="p-5">
        {/* Active badge */}
        {isActive && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/8 text-red-600 text-[11px] font-medium mb-3">
            <Check className="w-3 h-3" />
            Active
          </div>
        )}

        {/* Package info */}
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-50">{pkg.name}</h3>
        <p className="text-[13px] text-gray-400 mt-0.5 leading-relaxed">
          {pkg.description}
        </p>

        {/* Features */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
            <HardDrive className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
            <span>{pkg.dataGB}GB Data</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
            <Users className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
            <span>Up to {pkg.maxBeneficiaries} beneficiaries</span>
          </div>
        </div>

        {/* Price + action */}
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-end justify-between">
          <div>
            <span className="text-xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
              {formatCurrency(pkg.priceGHS)}
            </span>
            <span className="text-[12px] text-gray-400 ml-0.5">/mo</span>
          </div>
          {!isActive && (
            <button
              onClick={() => onActivate(pkg._id)}
              disabled={loading}
              className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 text-white text-[12px] rounded-md font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Activating...' : 'Activate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
