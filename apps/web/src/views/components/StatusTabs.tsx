type StatusTabsProps<Value extends string> = {
  label: string
  options: readonly { value: Value; label: string }[]
  value: Value
  onChange: (value: Value) => void
}

export function StatusTabs<Value extends string>({
  label,
  options,
  value,
  onChange,
}: StatusTabsProps<Value>) {
  return (
    <div className="status-tabs" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          className={value === option.value ? 'selected' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
