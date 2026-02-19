export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200/60 dark:border-gray-700/60 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-50 mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] text-gray-400 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
