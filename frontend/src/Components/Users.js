import { useCallback, useEffect, useMemo, useState } from "react";

import AppDataGrid from "./common/AppDataGrid";
import UserActionsCellRenderer from "./common/UserActionsCellRenderer";
import { multiRowSelection } from "./common/gridHelpers";
import apiClient from "../api/client";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { filterBySearch } from "../utils/filterBySearch";
import { useAppFeedback } from "../context/AppFeedbackContext";
import usePermission from "../hooks/usePermission";

import "./Users.css";

const emptyAddForm = {
  username: "",
  firstName: "",
  lastName: "",
  email: "",
};

const emptyEditForm = {
  firstName: "",
  lastName: "",
  email: "",
};

function Users({ searchText = "" }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);
  const [actionUser, setActionUser] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [emailForm, setEmailForm] = useState({ email: "" });
  const [statusForm, setStatusForm] = useState({ status: "Active" });
  const [actionMenu, setActionMenu] = useState(null);
  const { setInsight } = usePageInsight();
  const feedback = useAppFeedback();
  const permission = usePermission();

  const filteredUsers = useMemo(
    () =>
      filterBySearch(users, searchText, [
        "username",
        "name",
        "firstName",
        "lastName",
        "email",
        "groups",
        "status",
      ]),
    [users, searchText]
  );

  const activeUser = useMemo(
    () => users.find((user) => user.id === activeUserId) || null,
    [users, activeUserId]
  );

  const rowSelection = useMemo(() => multiRowSelection, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      feedback.error("Failed to load users. Check that you are logged in.");
    } finally {
      setLoading(false);
    }
  }, [feedback]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setInsight({
      recordCount: filteredUsers.length,
      selectedCount: selectedIds.length,
      userDetail: activeUser
        ? {
            id: activeUser.id,
            username: activeUser.username,
            name: activeUser.name,
            email: activeUser.email,
            groups: activeUser.groups,
            status: activeUser.status || (activeUser.enabled ? "Active" : "Inactive"),
          }
        : null,
      auditEntity: activeUser
        ? {
            type: "user",
            id: activeUser.id,
            label: activeUser.username,
          }
        : null,
    });
  }, [filteredUsers.length, selectedIds.length, activeUser, setInsight]);

  const closeActionDialog = () => {
    setActionDialog(null);
    setActionUser(null);
    setEditForm(emptyEditForm);
    setPasswordForm({ password: "", confirm: "" });
    setEmailForm({ email: "" });
    setStatusForm({ status: "Active" });
  };

  const handleUserAction = useCallback((action, user) => {
    setActionMenu(null);
    setActionUser(user);

    if (action === "edit") {
      setEditForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
      setActionDialog("edit");
      return;
    }

    if (action === "password") {
      setPasswordForm({ password: "", confirm: "" });
      setActionDialog("password");
      return;
    }

    if (action === "email") {
      setEmailForm({ email: user.email || "" });
      setActionDialog("email");
      return;
    }

    if (action === "status") {
      setStatusForm({
        status: user.status || (user.enabled ? "Active" : "Inactive"),
      });
      setActionDialog("status");
    }
  }, []);

  const handleOpenUserMenu = useCallback((user, anchor) => {
    const rect = anchor.getBoundingClientRect();
    const menuWidth = 190;

    setActionMenu((current) => {
      if (current?.user?.id === user.id) {
        return null;
      }

      return {
        user,
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - menuWidth),
      };
    });
  }, []);

  useEffect(() => {
    if (!actionMenu) return undefined;

    const handlePointerDown = (event) => {
      if (event.target.closest(".user-actions-menu")) return;
      if (event.target.closest(".user-actions-trigger")) return;
      setActionMenu(null);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setActionMenu(null);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [actionMenu]);

  const gridContext = useMemo(
    () => ({
      onOpenUserMenu: handleOpenUserMenu,
      onUserAction: handleUserAction,
      canEditUser: permission.canEditUser,
    }),
    [handleOpenUserMenu, handleUserAction, permission.canEditUser]
  );

  const columnDefs = useMemo(
    () => {
      const cols = [
      { field: "username", headerName: "Username", minWidth: 150 },
      { field: "firstName", headerName: "First Name", minWidth: 140, flex: 0.8 },
      { field: "lastName", headerName: "Last Name", minWidth: 140, flex: 0.8 },
      { field: "email", headerName: "Email", minWidth: 220, flex: 1.2 },
      { field: "groups", headerName: "Groups", minWidth: 160 },
      {
        field: "status",
        headerName: "Status",
        maxWidth: 120,
        valueGetter: (params) => params.data.status || (params.data.enabled ? "Active" : "Inactive"),
      },
      ];
      if (permission.canEditUser) {
        cols.push({
        headerName: "",
        colId: "actions",
        maxWidth: 72,
        sortable: false,
        filter: false,
        cellClass: "user-actions-column",
        cellRenderer: UserActionsCellRenderer,
        });
      }
      return cols;
    },
    [permission.canEditUser]
  );

  const openAddModal = () => {
    setAddForm(emptyAddForm);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddForm(emptyAddForm);
  };

  const reportEmailStatus = (emailStatus, actionLabel = "Action") => {
    if (!emailStatus) return;

    if (!emailStatus.smtp_configured) {
      feedback.warning(
        `${actionLabel} completed, but email is not configured. Copy backend/.env.example to backend/.env and set SMTP_PASSWORD (Gmail app password).`
      );
      return;
    }

    if (emailStatus.admin_notified === false || emailStatus.welcome_sent === false) {
      const detail = emailStatus.error
        ? ` ${emailStatus.error}`
        : "";
      if (emailStatus.admin_notified === false) {
        feedback.warning(
          `${actionLabel} completed, but the admin notification email could not be sent.${detail}`
        );
      }
      if (emailStatus.welcome_sent === false) {
        feedback.warning(
          `${actionLabel} completed, but the welcome email to the new user could not be sent.${detail}`
        );
      }
      return;
    }
  };

  const saveUser = async () => {
    if (!addForm.username.trim() || !addForm.email.trim()) {
      feedback.error("Username and email are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.post("/users", {
        username: addForm.username.trim(),
        firstName: addForm.firstName.trim() || undefined,
        lastName: addForm.lastName.trim() || undefined,
        email: addForm.email.trim(),
      });
      await fetchUsers();
      closeAddModal();
      reportEmailStatus(res.data?.email_status, "User created");
      if (res.data?.email_status?.welcome_sent) {
        feedback.success(`Welcome email sent to ${addForm.email.trim()}.`);
      }
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to add user");
    } finally {
      setSaving(false);
    }
  };

  const saveEditUser = async () => {
    if (!actionUser) return;

    setSaving(true);
    try {
      const res = await apiClient.put(`/users/${actionUser.id}`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
      });
      await fetchUsers();
      closeActionDialog();
      reportEmailStatus(res.data?.email_status, "User updated");
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!actionUser) return;

    if (!passwordForm.password.trim()) {
      feedback.error("Enter a new password.");
      return;
    }

    if (passwordForm.password !== passwordForm.confirm) {
      feedback.error("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.put(`/users/${actionUser.id}`, {
        password: passwordForm.password.trim(),
      });
      await fetchUsers();
      closeActionDialog();
      reportEmailStatus(res.data?.email_status, "Password reset");
      feedback.success("Password updated successfully.");
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to reset password.");
    } finally {
      setSaving(false);
    }
  };

  const saveEmail = async () => {
    if (!actionUser) return;

    if (!emailForm.email.trim()) {
      feedback.error("Enter an email address.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.put(`/users/${actionUser.id}`, {
        email: emailForm.email.trim(),
      });
      await fetchUsers();
      closeActionDialog();
      reportEmailStatus(res.data?.email_status, "Email reset");
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to reset email.");
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!actionUser) return;

    setSaving(true);
    try {
      const res = await apiClient.put(`/users/${actionUser.id}`, {
        enabled: statusForm.status === "Active",
      });
      await fetchUsers();
      closeActionDialog();
      reportEmailStatus(res.data?.email_status, "Status change");
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to change status.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) {
      feedback.error("Select at least one user to delete.");
      return;
    }

    if (!window.confirm(`Delete ${selectedIds.length} selected user(s)?`)) {
      return;
    }

    try {
      await Promise.all(selectedIds.map((id) => apiClient.delete(`/users/${id}`)));
      if (selectedIds.includes(activeUserId)) {
        setActiveUserId(null);
      }
      setSelectedIds([]);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to delete user(s).");
    }
  };

  const handleSelectionChanged = useCallback((event) => {
    const ids = event.api.getSelectedRows().map((row) => row.id);
    setSelectedIds(ids);
  }, []);

  const handleRowClicked = useCallback((event) => {
    setActiveUserId(event.data?.id ?? null);
  }, []);

  const getUserRowId = useCallback((params) => String(params.data.id), []);

  return (
    <div className="grid-page">
      <AppDataGrid
        rowData={filteredUsers}
        columnDefs={columnDefs}
        context={gridContext}
        rowSelection={rowSelection}
        onSelectionChanged={handleSelectionChanged}
        onRowClicked={handleRowClicked}
        getRowId={getUserRowId}
        loading={loading}
        searchPlaceholder="Search users..."
        overlayNoRowsTemplate="<span>No users found.</span>"
        toolbarActions={
          (permission.canCreateUser || permission.canDeleteUser) ? (
          <>
            {permission.canCreateUser && (
            <button type="button" className="parts-btn primary" onClick={openAddModal}>
              + Add User
            </button>
            )}
            {permission.canDeleteUser && (
            <button
              type="button"
              className="parts-btn danger"
              onClick={deleteSelected}
              disabled={selectedIds.length === 0}
            >
              Delete
            </button>
            )}
            {selectedIds.length > 0 && (
              <span className="parts-selection-count">{selectedIds.length} selected</span>
            )}
          </>
          ) : null
        }
      />

      {actionMenu && (
        <div
          className="user-actions-menu user-actions-menu--portal"
          style={{
            position: "fixed",
            top: actionMenu.top,
            left: actionMenu.left,
            width: 190,
            zIndex: 10000,
          }}
          role="menu"
        >
          <button type="button" onClick={() => handleUserAction("edit", actionMenu.user)}>
            Edit user
          </button>
          <button type="button" onClick={() => handleUserAction("password", actionMenu.user)}>
            Reset password
          </button>
          <button type="button" onClick={() => handleUserAction("email", actionMenu.user)}>
            Reset email
          </button>
          <button type="button" onClick={() => handleUserAction("status", actionMenu.user)}>
            Change status
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal modal-user">
            <h3>Add User</h3>
            <p className="user-modal-intro">
              New users are created as Active, assigned to user-group, and receive a welcome email to set their
              password. You will also receive an admin notification email.
            </p>

            <div className="user-modal-form">
              <div className="user-modal-row">
                <div className="user-modal-field">
                  <label htmlFor="add-first-name">First name</label>
                  <input
                    id="add-first-name"
                    placeholder="First name"
                    value={addForm.firstName}
                    onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                  />
                </div>

                <div className="user-modal-field">
                  <label htmlFor="add-last-name">Last name</label>
                  <input
                    id="add-last-name"
                    placeholder="Last name"
                    value={addForm.lastName}
                    onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="user-modal-field">
                <label htmlFor="add-username">Username</label>
                <input
                  id="add-username"
                  placeholder="Username"
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                />
              </div>

              <div className="user-modal-field">
                <label htmlFor="add-email">Email</label>
                <input
                  id="add-email"
                  placeholder="Email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="parts-btn primary" onClick={saveUser} disabled={saving}>
                {saving ? "Saving..." : "Add"}
              </button>
              <button type="button" className="parts-btn" onClick={closeAddModal} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {actionDialog && actionUser && (
        <div className="modal-overlay">
          <div className="modal modal-user">
            {actionDialog === "edit" && (
              <>
                <h3>Edit user</h3>
                <div className="user-modal-form">
                  <div className="user-modal-field">
                    <label>Username</label>
                    <div className="user-modal-readonly">{actionUser.username}</div>
                  </div>
                  <div className="user-modal-row">
                    <div className="user-modal-field">
                      <label htmlFor="edit-first-name">First name</label>
                      <input
                        id="edit-first-name"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      />
                    </div>
                    <div className="user-modal-field">
                      <label htmlFor="edit-last-name">Last name</label>
                      <input
                        id="edit-last-name"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="user-modal-field">
                    <label htmlFor="edit-email">Email</label>
                    <input
                      id="edit-email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="parts-btn primary" onClick={saveEditUser} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button type="button" className="parts-btn" onClick={closeActionDialog} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </>
            )}

            {actionDialog === "password" && (
              <>
                <h3>Reset password</h3>
                <p className="user-modal-intro">Set a new password for {actionUser.username}.</p>
                <div className="user-modal-form">
                  <div className="user-modal-field">
                  <label htmlFor="new-password">New password</label>
                  <input
                    id="new-password"
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  />
                </div>
                <div className="user-modal-field">
                  <label htmlFor="confirm-password">Confirm password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="parts-btn primary" onClick={savePassword} disabled={saving}>
                    {saving ? "Saving..." : "Reset password"}
                  </button>
                  <button type="button" className="parts-btn" onClick={closeActionDialog} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </>
            )}

            {actionDialog === "email" && (
              <>
                <h3>Reset email</h3>
                <div className="user-modal-form">
                  <div className="user-modal-field">
                  <label htmlFor="reset-email">Email</label>
                  <input
                    id="reset-email"
                    value={emailForm.email}
                    onChange={(e) => setEmailForm({ email: e.target.value })}
                  />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="parts-btn primary" onClick={saveEmail} disabled={saving}>
                    {saving ? "Saving..." : "Save email"}
                  </button>
                  <button type="button" className="parts-btn" onClick={closeActionDialog} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </>
            )}

            {actionDialog === "status" && (
              <>
                <h3>Change status</h3>
                <div className="user-modal-form">
                  <div className="user-modal-field">
                  <label htmlFor="user-status">Status</label>
                  <select
                    id="user-status"
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({ status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="parts-btn primary" onClick={saveStatus} disabled={saving}>
                    {saving ? "Saving..." : "Save status"}
                  </button>
                  <button type="button" className="parts-btn" onClick={closeActionDialog} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
