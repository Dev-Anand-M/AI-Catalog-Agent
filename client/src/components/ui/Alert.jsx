import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

export function Alert({
  type = 'info',
  message,
  onClose,
  className = '',
}) {
  const types = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-900',
      softText: 'text-emerald-700',
      icon: CheckCircle,
    },
    error: {
      bg: 'bg-rose-50 border-rose-200',
      text: 'text-rose-900',
      softText: 'text-rose-700',
      icon: XCircle,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-900',
      softText: 'text-amber-700',
      icon: AlertCircle,
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-900',
      softText: 'text-blue-700',
      icon: Info,
    },
  };

  const { bg, text, softText, icon: Icon } = types[type];

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-xl ${bg} ${className}`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${text}`} />
      <p className={`flex-1 text-sm leading-relaxed ${softText}`}>{message}</p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={`shrink-0 p-1.5 rounded-lg ${text} hover:opacity-70 min-h-[36px] min-w-[36px] flex items-center justify-center`}
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
