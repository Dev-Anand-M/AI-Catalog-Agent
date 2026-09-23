import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';

/**
 * SparseLoader — Ultra-fast, minimal interstitial screen rendered during
 * route transitions and auth state resolution. Includes a top shimmer bar
 * and an elegant, sparse CatalogAI emblem.
 */
export function SparseLoader({ message = null, fullPage = true }) {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + Math.floor(Math.random() * 15) + 5 : prev));
    }, 120);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`relative z-50 flex flex-col items-center justify-center transition-opacity duration-200 ${
        fullPage ? 'min-h-[60vh] w-full py-16' : 'py-8 w-full'
      }`}
      aria-live="polite"
      aria-busy="true"
    >
      {/* Top Iridescent Progress Shimmer */}
      <div className="fixed top-0 left-0 right-0 h-[2.5px] bg-zinc-200/50 z-50 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 transition-all duration-200 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Sparse Center Emblem */}
      <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-md ring-1 ring-zinc-800">
            <Store className="w-6 h-6 animate-pulse text-zinc-100" />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 ring-2 ring-white animate-ping"></span>
        </div>

        {/* Minimal skeleton line or message */}
        <div className="space-y-1.5 text-center">
          {message ? (
            <p className="text-xs font-semibold text-zinc-600 tracking-tight">{message}</p>
          ) : (
            <div className="flex items-center gap-1.5 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.15s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.3s]"></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
