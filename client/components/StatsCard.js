export default function StatsCard({ title, value, subtitle, icon: Icon, color = 'red' }) {
  const accentColors = {
    red: 'border-t-red-600',
    blue: 'border-t-blue-600',
    green: 'border-t-emerald-600',
    orange: 'border-t-amber-500',
    purple: 'border-t-violet-600',
  };

  const iconColors = {
    red: 'text-red-600/50',
    blue: 'text-blue-600/50',
    green: 'text-emerald-600/50',
    orange: 'text-amber-500/50',
    purple: 'text-violet-600/50',
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200/80 dark:border-gray-700/60 border-t-2 ${
        accentColors[color] || accentColors.red
      } px-5 py-4`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">
            {title}
          </p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight leading-none">
            {value}
          </p>
          {subtitle && (
            <p className="text-[12px] text-gray-400 mt-1.5">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <Icon
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              iconColors[color] || iconColors.red
            }`}
            strokeWidth={1.5}
          />
        )}
      </div>
    </div>
  );
}
