export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  icon,
  onClick,
  className = ''
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 min-h-[42px] min-w-[42px] active:scale-[0.98]';

  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    success: 'btn-success',
    danger: 'btn-danger',
    emerald: 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white border border-emerald-700 shadow-xs focus-visible:ring-emerald-600 disabled:bg-emerald-300',
    outline: 'border border-zinc-300 hover:border-zinc-400 text-zinc-800 hover:bg-zinc-50 focus-visible:ring-zinc-500 disabled:border-zinc-200 disabled:text-zinc-400',
    accent: 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-600 focus-visible:ring-amber-500 disabled:bg-amber-300',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
