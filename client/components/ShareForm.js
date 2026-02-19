'use client';
import { useState } from 'react';
import { Send, ChevronDown } from 'lucide-react';

export default function ShareForm({ beneficiaries, remainingGB, onSend, loading }) {
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [dataGB, setDataGB] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!beneficiaryId || !dataGB) return;
    onSend({ beneficiaryId, dataGB: parseFloat(dataGB) });
  };

  const selected = beneficiaries.find((b) => b._id === beneficiaryId);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Beneficiary select */}
      <div>
        <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
          Beneficiary
        </label>
        <div className="relative">
          <select
            value={beneficiaryId}
            onChange={(e) => setBeneficiaryId(e.target.value)}
            className="w-full appearance-none px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 placeholder:text-gray-400"
            required
          >
            <option value="">Select a beneficiary...</option>
            {beneficiaries.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} ({b.phone})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Data amount */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Data Amount (GB)
          </label>
          <span className="text-[12px] text-gray-400 tabular-nums">
            {remainingGB}GB remaining
          </span>
        </div>
        <input
          type="number"
          value={dataGB}
          onChange={(e) => setDataGB(e.target.value)}
          min="0.1"
          max={remainingGB}
          step="0.1"
          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 placeholder:text-gray-400"
          placeholder="e.g. 5"
          required
        />
      </div>

      {/* Summary preview */}
      {selected && dataGB && (
        <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-4 py-3">
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
            Sending{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-50">{dataGB}GB</span> to{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-50">{selected.name}</span>
            <span className="text-gray-400 ml-1 text-[12px]">
              ({selected.phone})
            </span>
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={
          loading || !beneficiaryId || !dataGB || parseFloat(dataGB) > remainingGB
        }
        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-2.5 rounded-lg text-[13px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send className="w-3.5 h-3.5" />
        {loading ? 'Sending...' : 'Send Data'}
      </button>
    </form>
  );
}
