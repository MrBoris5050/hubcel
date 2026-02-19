'use client';
import { formatDate } from '../lib/utils';

const statusStyles = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700/40',
  failed: 'bg-red-50 text-red-700 border-red-200/60 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700/40',
  pending: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/40',
};

const statusDot = {
  success: 'bg-emerald-500',
  failed: 'bg-red-500',
  pending: 'bg-amber-500',
};

export default function TransactionTable({ transactions }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700">
            <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
              Transaction ID
            </th>
            <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
              Beneficiary
            </th>
            <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
              Data
            </th>
            <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
              Status
            </th>
            <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider pb-3">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn, idx) => (
            <tr
              key={txn._id}
              className={`group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 ${
                idx !== transactions.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''
              }`}
            >
              <td className="py-3 pr-4">
                <span className="text-[12px] font-mono text-gray-400">
                  {txn.transactionId}
                </span>
              </td>
              <td className="py-3 pr-4">
                <p className="text-[13px] font-medium text-gray-900 dark:text-gray-50 leading-tight">
                  {txn.beneficiaryName}
                </p>
                <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                  {txn.beneficiaryPhone}
                </p>
              </td>
              <td className="py-3 pr-4">
                <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200 tabular-nums">
                  {txn.dataGB}GB
                </span>
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize ${
                    statusStyles[txn.status] || statusStyles.pending
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      statusDot[txn.status] || statusDot.pending
                    }`}
                  />
                  {txn.status}
                </span>
              </td>
              <td className="py-3">
                <span className="text-[12px] text-gray-400">
                  {formatDate(txn.createdAt)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
