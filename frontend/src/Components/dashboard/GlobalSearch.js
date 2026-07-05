import { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../../api/client";
import usePermission from "../../hooks/usePermission";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", category: "Home", keywords: ["dashboard", "home", "overview"] },
  { id: "parts", label: "Parts", category: "Assets", keywords: ["parts", "part", "asset"], requires: "canViewParts" },
  { id: "docs", label: "Documents", category: "Assets", keywords: ["docs", "documents", "documentation"], requires: "canViewDocs" },
  { id: "forms-builder", label: "Formbuilder", category: "Forms", keywords: ["forms", "form builder", "builder"], requires: "canCreateForm" },
  { id: "forms-saved", label: "Saved Forms", category: "Forms", keywords: ["saved forms", "templates"], requires: "canViewForms" },
  { id: "training-curriculum", label: "Curriculum", category: "Training", keywords: ["curriculum", "training path"], requires: "canViewTraining" },
  { id: "training-records", label: "Training Records", category: "Training", keywords: ["training", "records", "completion"], requires: "canViewTraining" },
  { id: "approvals-pending", label: "Pending Requests", category: "Approvals", keywords: ["approvals", "pending", "requests"], requires: "canViewApprovals" },
  { id: "approvals-my", label: "My Requests", category: "Approvals", keywords: ["approvals", "my requests", "submissions"], requires: "canViewApprovals" },
  { id: "approvals-approved", label: "Approved", category: "Approvals", keywords: ["approvals", "approved"], requires: "canViewApprovals" },
  { id: "approvals-rejected", label: "Rejected", category: "Approvals", keywords: ["approvals", "rejected", "declined"], requires: "canViewApprovals" },
  { id: "users", label: "Users", category: "Administration", keywords: ["users", "user", "keycloak", "administration"], requires: "canViewUsersAdmin" },
  { id: "groups", label: "Groups", category: "Administration", keywords: ["groups", "group", "teams", "roles", "permissions"], requires: "canViewGroupsAdmin" },
];

function matchesQuery(value, query) {
  return String(value || "")
    .toLowerCase()
    .includes(query);
}

function searchMenuItems(query, permission) {
  return MENU_ITEMS.filter((item) => {
    if (item.requires && !permission[item.requires]) {
      return false;
    }
    return (
      matchesQuery(item.label, query) ||
      item.keywords.some((word) => matchesQuery(word, query))
    );
  }).map((item) => ({
    type: "nav",
    id: `nav-${item.id}`,
    menuId: item.id,
    label: item.label,
    category: item.category,
    subtitle: "Go to section",
  }));
}

async function searchContent(query, permission) {
  const results = [];
  const requests = [];

  if (permission.canViewParts) {
    requests.push(apiClient.get("/parts").then((res) => ({ type: "parts", data: res.data })));
  }
  if (permission.canViewDocs) {
    requests.push(apiClient.get("/docs").then((res) => ({ type: "docs", data: res.data })));
  }
  if (permission.canViewUsersAdmin) {
    requests.push(apiClient.get("/users").then((res) => ({ type: "users", data: res.data })));
  }

  const settled = await Promise.allSettled(requests);

  settled.forEach((entry) => {
    if (entry.status !== "fulfilled") return;
    const { type, data } = entry.value;

    if (type === "parts") {
      data.forEach((part) => {
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

    if (type === "docs") {
      data.forEach((doc) => {
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

    if (type === "users") {
      data.forEach((user) => {
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
  });

  return results;
}

function GlobalSearch({ onNavigate }) {
  const permission = usePermission();
  const searchPlaceholder = useMemo(() => "Search parts, docs, users...", []);
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
        const navResults = searchMenuItems(trimmed, permission);
        const contentResults = await searchContent(trimmed, permission);
        setResults([...navResults, ...contentResults].slice(0, 12));
      } catch (err) {
        console.error("Search failed:", err);
        setResults(searchMenuItems(trimmed, permission));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, permission]);

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
          placeholder={searchPlaceholder}
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
