export function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
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
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`input select ${error ? 'input-error' : ''} ${disabled ? 'opacity-60' : ''} ${className}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="field-error">{error}</p>
      )}
    </div>
  );
}
