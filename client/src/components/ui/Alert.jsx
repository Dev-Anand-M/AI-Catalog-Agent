import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

export function Alert({ 
  type = 'info', 
  message, 
  onClose,
  className = '' 
}) {
  const types = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: CheckCircle
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: XCircle
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      icon: AlertCircle
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: Info
    }
  };

  const { bg, text, icon: Icon } = types[type];

  return (
    <div className={`flex items-center p-4 border rounded-lg ${bg} ${className}`}>
      <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${text}`} />
      <p className={`flex-1 text-sm ${text}`}>{message}</p>
      {onClose && (
        <button 
          onClick={onClose}
          className={`ml-3 ${text} hover:opacity-70 min-w-[44px] min-h-[44px] flex items-center justify-center`}
        >
          <XCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
