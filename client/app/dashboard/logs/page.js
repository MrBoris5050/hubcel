'use client';
import { useState, useEffect } from 'react';
import { getLogs, getLogStats, clearLogs } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { ScrollText, Shield, AlertTriangle, Info, AlertCircle, ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react';

const levelConfig = {
  info: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', label: 'Info' },
  warn: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', label: 'Warning' },
  error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30', label: 'Error' },
  security: { icon: Shield, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30', label: 'Security' }
};

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadLogs(1); }, [levelFilter]);

  const loadStats = async () => {
    try {
      const { data } = await getLogStats();
      setStats(data.stats);
    } catch (err) { /* ignore */ }
  };

  const loadLogs = async (page) => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (levelFilter) params.level = levelFilter;
      if (searchTerm) params.search = searchTerm;
      const { data } = await getLogs(params);
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load logs' });
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadLogs(1);
  };

  const handleClear = async () => {
    if (!confirm('Clear logs older than 30 days?')) return;
    try {
      const { data } = await clearLogs(30);
      setMessage({ type: 'success', text: data.message });
      await loadLogs(1);
      await loadStats();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to clear logs' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">System Logs</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{pagination.total} total log entries</p>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 h-9 px-3.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-red-600 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Old Logs
        </button>
      </div>

      {/* Alert */}
      {message.text && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm border ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40'
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800/40'
        }`}>
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(levelConfig).map(([key, cfg]) => {
            const LevelIcon = cfg.icon;
            return (
              <div
                key={key}
                onClick={() => setLevelFilter(levelFilter === key ? '' : key)}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                  levelFilter === key
                    ? 'border-gray-400 dark:border-gray-600 ring-2 ring-gray-200 dark:ring-gray-700'
                    : 'border-gray-200/80 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{cfg.label}</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                    <LevelIcon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight tabular-nums">{stats[key] || 0}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-gray-800 focus:border-red-500 focus:ring-3 focus:ring-red-500/10"
            placeholder="Search logs..."
          />
        </div>
        <button
          type="submit"
          className="h-11 px-5 bg-gray-900 hover:bg-gray-800 active:bg-gray-950 text-white rounded-xl text-sm font-medium transition-all duration-200 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          Search
        </button>
        {(levelFilter || searchTerm) && (
          <button
            type="button"
            onClick={() => { setLevelFilter(''); setSearchTerm(''); setTimeout(() => loadLogs(1), 0); }}
            className="h-11 px-4 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Logs List */}
      {loading ? (
        <LoadingSpinner message="Loading logs..." />
      ) : logs.length > 0 ? (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 divide-y divide-gray-50 dark:divide-gray-800 overflow-hidden">
            {logs.map((log) => {
              const cfg = levelConfig[log.level] || levelConfig.info;
              const LevelIcon = cfg.icon;
              return (
                <div key={log._id} className="px-6 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors flex items-start gap-3">
                  <div className={`mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <LevelIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.color}`}>{log.action}</span>
                      {log.user && (
                        <span className="text-[10px] text-gray-400">{log.user.email || log.user.name}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 break-words">{log.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                      <span>{formatDate(log.createdAt)}</span>
                      {log.ip && <span>IP: {log.ip}</span>}
                      {log.duration && <span>{log.duration}ms</span>}
                      {log.statusCode && <span>HTTP {log.statusCode}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => loadLogs(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="flex items-center gap-1.5 h-9 px-3.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => loadLogs(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="flex items-center gap-1.5 h-9 px-3.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
              <ScrollText className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-1">No logs found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              {levelFilter || searchTerm ? 'Try adjusting your filters' : 'System logs will appear here as actions are performed'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
