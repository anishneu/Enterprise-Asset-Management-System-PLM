import { useCallback, useEffect, useMemo, useState } from "react";

import AppDataGrid from "./common/AppDataGrid";
import { createEditColumn, multiRowSelection } from "./common/gridHelpers";
import apiClient from "../api/client";
import { filterBySearch } from "../utils/filterBySearch";

const emptyUser = {
  id: null,
  username: "",
  email: "",
  password: "",
  enabled: true,
};

function Users({ searchText = "" }) {
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState(emptyUser);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const rowSelection = useMemo(() => multiRowSelection, []);

  const filteredUsers = useMemo(
    () => filterBySearch(users, searchText, ["username", "email", "enabled"]),
    [users, searchText]
  );

  useEffect(() => {
    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load users. Check that you are logged in.");
    }
  };

  const openAddModal = () => {
    setForm(emptyUser);
    setShowModal(true);
  };

  const openEditModal = useCallback((user) => {
    setForm({
      id: user.id,
      username: user.username || "",
      email: user.email || "",
      password: "",
      enabled: user.enabled !== false,
    });
    setShowModal(true);
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setForm(emptyUser);
  };

  const saveUser = async () => {
    if (form.id) {
      if (!form.email.trim()) {
        alert("Email is required.");
        return;
      }

      setSaving(true);
      try {
        const payload = {
          email: form.email.trim(),
          enabled: form.enabled,
        };

        if (form.password.trim()) {
          payload.password = form.password.trim();
        }

        await apiClient.put(`/users/${form.id}`, payload);
        await fetchUsers();
        closeModal();
      } catch (err) {
        console.error(err);
        const message = err.response?.data?.detail || "Failed to update user";
        alert(message);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      alert("Username, email, and password are required.");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post("/users", {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password.trim(),
      });
      await fetchUsers();
      closeModal();
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.detail || "Failed to add user";
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert("Select at least one user to delete.");
      return;
    }

    if (!window.confirm(`Delete ${selectedIds.length} selected user(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedIds.map((id) => apiClient.delete(`/users/${id}`))
      );
      setSelectedIds([]);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.detail || "Failed to delete user";
      alert(message);
    }
  };

  const handleSelectionChanged = useCallback((event) => {
    const ids = event.api.getSelectedRows().map((row) => row.id);
    setSelectedIds(ids);
  }, []);

  const gridContext = useMemo(
    () => ({
      onEdit: openEditModal,
    }),
    [openEditModal]
  );

  const columnDefs = useMemo(
    () => [
      createEditColumn(),
      { field: "username", headerName: "Username" },
      { field: "email", headerName: "Email" },
      {
        field: "enabled",
        headerName: "Active",
        maxWidth: 110,
        valueFormatter: (params) => (params.value ? "Yes" : "No"),
      },
    ],
    []
  );

  return (
    <div className="grid-wrapper">
      <div className="parts-toolbar">
        <div className="parts-toolbar-left">
          <button type="button" className="parts-btn primary" onClick={openAddModal}>
            + Add User
          </button>
          <button
            type="button"
            className="parts-btn danger"
            onClick={deleteSelected}
            disabled={selectedIds.length === 0}
          >
            Delete
          </button>
          {selectedIds.length > 0 && (
            <span className="parts-selection-count">
              {selectedIds.length} selected
            </span>
          )}
        </div>
      </div>

      <AppDataGrid
        rowData={filteredUsers}
        columnDefs={columnDefs}
        context={gridContext}
        rowSelection={rowSelection}
        onSelectionChanged={handleSelectionChanged}
        overlayNoRowsTemplate="<span>No users found.</span>"
      />

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{form.id ? "Edit User" : "Add User"}</h3>

            <input
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={Boolean(form.id)}
            />

            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <input
              placeholder={form.id ? "New password (optional)" : "Password"}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            {form.id && (
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                />
                Active
              </label>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="parts-btn primary"
                onClick={saveUser}
                disabled={saving}
              >
                {saving ? "Saving..." : form.id ? "Save" : "Add"}
              </button>
              <button
                type="button"
                className="parts-btn"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
