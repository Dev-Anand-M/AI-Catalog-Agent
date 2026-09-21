export function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`surface-card ${onClick ? 'surface-card-interactive' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-5 py-4 border-b border-zinc-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return (
    <div className={`px-5 py-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-5 py-4 border-t border-zinc-100 bg-zinc-50 ${className}`}>
      {children}
    </div>
  );
}
