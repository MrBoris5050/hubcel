export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Three-dot pulse spinner */}
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-600 animate-[pulse_1.4s_ease-in-out_infinite]" />
        <span className="w-2 h-2 rounded-full bg-red-600 animate-[pulse_1.4s_ease-in-out_0.2s_infinite]" />
        <span className="w-2 h-2 rounded-full bg-red-600 animate-[pulse_1.4s_ease-in-out_0.4s_infinite]" />
      </div>
      <p className="mt-4 text-[13px] text-gray-400 font-medium">{message}</p>
    </div>
  );
}
