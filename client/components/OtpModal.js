'use client';
import { useState } from 'react';
import { X, KeyRound } from 'lucide-react';

export default function OtpModal({ open, onClose, onSubmit, loading }) {
  const [otp, setOtp] = useState('');

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (otp.length >= 4) onSubmit(otp);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
        {/* Subtle top accent */}
        <div className="h-[2px] bg-gradient-to-r from-red-600 via-red-500 to-red-600" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-600/8 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-red-600" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-50">
                  Verify OTP
                </h3>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  Enter the code sent to your phone
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg text-center text-xl tracking-[0.4em] font-mono text-gray-900 dark:text-gray-50 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:tracking-[0.4em]"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-[13px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
