import { useEffect, useRef, useState } from "react";
import apiClient from "../../api/client";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", category: "Home", keywords: ["dashboard", "home", "overview"] },
  { id: "parts", label: "Parts", category: "Assets", keywords: ["parts", "part", "asset"] },
  { id: "docs", label: "Documents", category: "Assets", keywords: ["docs", "documents", "documentation"] },
  { id: "forms-builder", label: "Formbuilder", category: "Forms", keywords: ["forms", "form builder", "builder"] },
  { id: "forms-saved", label: "Saved Forms", category: "Forms", keywords: ["saved forms", "templates"] },
  { id: "training-records", label: "Records", category: "Training", keywords: ["training", "records", "assignments"] },
  { id: "training-curriculum", label: "Curriculum", category: "Training", keywords: ["curriculum", "training path"] },
  { id: "approvals-pending", label: "Pending Requests", category: "Approvals", keywords: ["approvals", "pending", "requests"] },
  { id: "approvals-my", label: "My Requests", category: "Approvals", keywords: ["approvals", "my requests", "submissions"] },
  { id: "approvals-approved", label: "Approved", category: "Approvals", keywords: ["approvals", "approved"] },
  { id: "approvals-rejected", label: "Rejected", category: "Approvals", keywords: ["approvals", "rejected", "declined"] },
  { id: "users", label: "Users", category: "Administration", keywords: ["users", "user", "keycloak", "administration"] },
  { id: "groups", label: "Groups", category: "Administration", keywords: ["groups", "group", "teams", "roles", "permissions"] },
];

function matchesQuery(value, query) {
  return String(value || "")
    .toLowerCase()
    .includes(query);
}

function searchMenuItems(query) {
  return MENU_ITEMS.filter(
    (item) =>
      matchesQuery(item.label, query) ||
      item.keywords.some((word) => matchesQuery(word, query))
  ).map((item) => ({
    type: "nav",
    id: `nav-${item.id}`,
    menuId: item.id,
    label: item.label,
    category: item.category,
    subtitle: "Go to section",
  }));
}

async function searchContent(query) {
  const results = [];

  const [partsRes, docsRes, usersRes] = await Promise.allSettled([
    apiClient.get("/parts"),
    apiClient.get("/docs"),
    apiClient.get("/users"),
  ]);

  if (partsRes.status === "fulfilled") {
    partsRes.value.data.forEach((part) => {
      if (
        matchesQuery(part.partno, query) ||
        matchesQuery(part.pdesc, query) ||
        matchesQuery(part.prev, query)
      ) {
        results.push({
          type: "part",
          id: `part-${part.id}`,
          menuId: "parts",
          label: part.partno,
          category: "Parts",
          subtitle: part.pdesc || "Part record",
          searchText: part.partno,
        });
      }
    });
  }

  if (docsRes.status === "fulfilled") {
    docsRes.value.data.forEach((doc) => {
      if (
        matchesQuery(doc.dname, query) ||
        matchesQuery(doc.ddesc, query) ||
        matchesQuery(doc.dtype, query) ||
        matchesQuery(doc.ftype, query)
      ) {
        results.push({
          type: "doc",
          id: `doc-${doc.id}`,
          menuId: "docs",
          label: doc.dname,
          category: "Docs",
          subtitle: [doc.dtype, doc.ftype].filter(Boolean).join(" · ") || "Document",
          searchText: doc.dname,
        });
      }
    });
  }

  if (usersRes.status === "fulfilled") {
    usersRes.value.data.forEach((user) => {
      if (
        matchesQuery(user.username, query) ||
        matchesQuery(user.name, query) ||
        matchesQuery(user.email, query) ||
        matchesQuery(user.groups, query)
      ) {
        results.push({
          type: "user",
          id: `user-${user.id}`,
          menuId: "users",
          label: user.username,
          category: "Users",
          subtitle: user.name || user.email || "User account",
          searchText: user.username,
        });
      }
    });
  }

  return results;
}

function GlobalSearch({ onNavigate }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setOpen(true);

    const timer = setTimeout(async () => {
      try {
        const navResults = searchMenuItems(trimmed);
        const contentResults = await searchContent(trimmed);
        setResults([...navResults, ...contentResults].slice(0, 12));
      } catch (err) {
        console.error("Search failed:", err);
        setResults(searchMenuItems(trimmed));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result) => {
    onNavigate(result.menuId, result.searchText || query.trim());
    setQuery(result.searchText || query);
    setOpen(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (results.length > 0) {
      handleSelect(results[0]);
    }
  };

  return (
    <div className="global-search" ref={searchRef}>
      <form onSubmit={handleSubmit}>
        <span className="global-search-icon" aria-hidden="true">
          <svg
            className="global-search-icon-svg"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path
              d="M16 16L20 20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input
          type="search"
          className="global-search-input"
          placeholder="Search parts, docs, users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          aria-label="Search TalonVault"
        />
        {query && (
          <button
            type="button"
            className="global-search-clear"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
              onNavigate(null, "");
            }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </form>

      {open && query.trim() && (
        <div className="global-search-results">
          {loading && <div className="global-search-status">Searching...</div>}

          {!loading && results.length === 0 && (
            <div className="global-search-status">No results found</div>
          )}

          {!loading &&
            results.map((result) => (
              <button
                key={result.id}
                type="button"
                className="global-search-result"
                onClick={() => handleSelect(result)}
              >
                <span className="global-search-result-label">{result.label}</span>
                <span className="global-search-result-meta">
                  <span className="global-search-badge">{result.category}</span>
                  {result.subtitle}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
