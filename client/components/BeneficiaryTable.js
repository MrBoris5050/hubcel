'use client';
import { Trash2, Edit2 } from 'lucide-react';
import { formatPhone, formatDate } from '../lib/utils';

export default function BeneficiaryTable({ beneficiaries, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700">
            <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
              Name
            </th>
            <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
              Phone
            </th>
            <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
              Data Sent
            </th>
            <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider pb-3 pr-4">
              Last Sent
            </th>
            <th className="text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider pb-3">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {beneficiaries.map((b, idx) => (
            <tr
              key={b._id}
              className={`group ${
                idx !== beneficiaries.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''
              }`}
            >
              <td className="py-3 pr-4">
                <span className="text-[13px] font-medium text-gray-900 dark:text-gray-50">
                  {b.name}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span className="text-[13px] text-gray-500 dark:text-gray-400 font-mono">
                  {formatPhone(b.phone)}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span className="text-[13px] text-gray-600 dark:text-gray-300 tabular-nums">
                  {b.totalSentGB}GB
                </span>
              </td>
              <td className="py-3 pr-4">
                <span className="text-[12px] text-gray-400">
                  {b.lastSentAt ? formatDate(b.lastSentAt) : 'Never'}
                </span>
              </td>
              <td className="py-3">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(b)}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(b._id)}
                    className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition"
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
  );
}
