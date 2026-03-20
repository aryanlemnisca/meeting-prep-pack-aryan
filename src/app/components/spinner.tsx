export function Spinner({ size = 'sm', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export function PulsingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-[#00BFFF] animate-pulse" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-[#00BFFF] animate-pulse" style={{ animationDelay: '300ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-[#00BFFF] animate-pulse" style={{ animationDelay: '600ms' }} />
    </span>
  );
}

export function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="rounded-xl border border-gray-800 bg-[#111827] px-8 py-6 text-center shadow-2xl">
        <div className="mb-4 flex justify-center">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
            <div className="absolute inset-0 rounded-full border-2 border-[#00BFFF] border-t-transparent animate-spin" />
          </div>
        </div>
        <p className="text-sm font-medium text-white">{message}</p>
        <p className="mt-1 text-xs text-gray-500">This may take up to 30 seconds</p>
      </div>
    </div>
  );
}
