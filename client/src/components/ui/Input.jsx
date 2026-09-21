export function Input({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = ''
}) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label htmlFor={name} className={`field-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`input ${error ? 'input-error' : ''} ${disabled ? 'opacity-60' : ''} ${className}`}
      />
      {error && (
        <p className="field-error">{error}</p>
      )}
    </div>
  );
}
