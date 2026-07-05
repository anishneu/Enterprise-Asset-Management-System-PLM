import { useEffect, useMemo, useRef, useState } from "react";

function TagMultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Select...",
  getOptionValue = (option) => option.value,
  getOptionLabel = (option) => option.label,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedOptions = useMemo(
    () =>
      value
        .map((selectedValue) =>
          options.find((option) => getOptionValue(option) === selectedValue)
        )
        .filter(Boolean),
    [value, options, getOptionValue]
  );

  const availableOptions = useMemo(
    () => options.filter((option) => !value.includes(getOptionValue(option))),
    [options, value, getOptionValue]
  );

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const removeValue = (selectedValue) => {
    if (disabled) return;
    onChange(value.filter((item) => item !== selectedValue));
  };

  const addValue = (selectedValue) => {
    if (disabled) return;
    if (value.includes(selectedValue)) return;
    onChange([...value, selectedValue]);
    setOpen(false);
  };

  return (
    <div className="tag-multiselect" ref={rootRef}>
      {label && <label className="tag-multiselect-label">{label}</label>}

      <div
        className={`tag-multiselect-control${open ? " is-open" : ""}${disabled ? " is-disabled" : ""}`}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
      >
        <div className="tag-multiselect-tags">
          {selectedOptions.length === 0 && (
            <span className="tag-multiselect-placeholder">{placeholder}</span>
          )}
          {selectedOptions.map((option) => {
            const optionValue = getOptionValue(option);
            return (
              <span key={optionValue} className="tag-chip">
                <span>{getOptionLabel(option)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${getOptionLabel(option)}`}
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeValue(optionValue);
                  }}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
        <span className="tag-multiselect-chevron" aria-hidden="true">
          ▾
        </span>
      </div>

      {open && !disabled && (
        <ul className="tag-multiselect-dropdown" role="listbox">
          {availableOptions.length === 0 ? (
            <li className="tag-multiselect-empty">No more options</li>
          ) : (
            availableOptions.map((option) => {
              const optionValue = getOptionValue(option);
              return (
                <li key={optionValue}>
                  <button type="button" onClick={() => addValue(optionValue)}>
                    {getOptionLabel(option)}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

export default TagMultiSelect;
