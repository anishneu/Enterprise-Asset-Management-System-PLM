import { useEffect, useId, useMemo, useRef, useState } from "react";

function formatUserLabel(user) {
  if (!user) return "";
  const email = user.email ? ` (${user.email})` : "";
  return `${user.username}${email}`;
}

function TraineeCombobox({ users, value, onChange, disabled = false, loading = false }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const listboxId = useId();

  const selectedUser = useMemo(
    () => users.find((user) => user.username === value) || null,
    [users, value]
  );

  useEffect(() => {
    if (selectedUser) {
      setQuery(formatUserLabel(selectedUser));
    } else if (!value) {
      setQuery("");
    }
  }, [selectedUser, value]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return users;

    return users.filter((user) =>
      [user.username, user.email].some((field) =>
        String(field ?? "")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    );
  }, [users, query]);

  const handleInputChange = (event) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    setOpen(true);

    if (!nextQuery.trim()) {
      onChange("");
      return;
    }

    const exactMatch = users.find(
      (user) => formatUserLabel(user).toLowerCase() === nextQuery.trim().toLowerCase()
    );
    if (exactMatch) {
      onChange(exactMatch.username);
    } else if (value) {
      onChange("");
    }
  };

  const handleSelectUser = (user) => {
    onChange(user.username);
    setQuery(formatUserLabel(user));
    setOpen(false);
  };

  const showOptions = open && !disabled && !loading;

  return (
    <div className="trainee-combobox" ref={containerRef}>
      <input
        type="text"
        className="doc-form-control"
        placeholder={loading ? "Loading users..." : "Search or select trainee"}
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        disabled={disabled || loading}
        autoComplete="off"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={showOptions}
        aria-autocomplete="list"
      />
      {showOptions && (
        <ul id={listboxId} className="trainee-combobox-list" role="listbox">
          {filteredUsers.length === 0 ? (
            <li className="trainee-combobox-empty">No users match your search</li>
          ) : (
            filteredUsers.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  className="trainee-combobox-option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelectUser(user)}
                >
                  {formatUserLabel(user)}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default TraineeCombobox;
