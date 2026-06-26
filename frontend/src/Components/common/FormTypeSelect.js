function FormTypeSelect({
  formTypes,
  value,
  onChange,
  disabled = false,
  loading = false,
  className = "doc-form-control",
}) {
  const typeNames = formTypes.map((item) =>
    typeof item === "string" ? item : item.name
  );

  return (
    <select
      className={className}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled || loading}
    >
      <option value="">{loading ? "Loading..." : "Select an option"}</option>
      {typeNames.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}

export default FormTypeSelect;
