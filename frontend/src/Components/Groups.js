import { useCallback, useEffect, useMemo, useState } from "react";

import AppDataGrid from "./common/AppDataGrid";
import GroupEditCellRenderer from "./common/GroupEditCellRenderer";
import TagMultiSelect from "./common/TagMultiSelect";
import apiClient from "../api/client";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { filterBySearch } from "../utils/filterBySearch";
import { useAppFeedback } from "../context/AppFeedbackContext";
import {
  ASSIGNABLE_ROLES,
  groupPermissionsByArea,
  permissionsForRoles,
} from "./groups/groupFormUtils";

import "./Groups.css";

const emptyEditDraft = {
  name: "",
  memberIds: [],
  roles: [],
};

function Groups({ searchText = "" }) {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editGroupId, setEditGroupId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyEditDraft);
  const [detailLoading, setDetailLoading] = useState(false);
  const { setInsight } = usePageInsight();
  const feedback = useAppFeedback();

  const filteredGroups = useMemo(
    () =>
      filterBySearch(groups, searchText, ["name", "members", "roles", "permissions"]),
    [groups, searchText]
  );

  const memberOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user.id,
        label: user.username || user.name || user.email,
      })),
    [users]
  );

  const roleOptions = useMemo(
    () => ASSIGNABLE_ROLES.map((role) => ({ value: role, label: role })),
    []
  );

  const permissionPills = useMemo(
    () => permissionsForRoles(editDraft.roles),
    [editDraft.roles]
  );

  const permissionGroups = useMemo(
    () => groupPermissionsByArea(permissionPills),
    [permissionPills]
  );

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/groups");
      setGroups(res.data);
    } catch (err) {
      console.error(err);
      feedback.error("Failed to load groups from Keycloak.");
    } finally {
      setLoading(false);
    }
  }, [feedback]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, [fetchGroups, fetchUsers]);

  useEffect(() => {
    setInsight({
      recordCount: filteredGroups.length,
      selectedCount: editGroupId ? 1 : 0,
      extra: {
        Source: "Keycloak",
      },
      auditEntity: editGroupId
        ? {
            type: "group",
            id: editGroupId,
            label: editDraft.name || "Group",
          }
        : null,
    });
  }, [filteredGroups.length, editGroupId, editDraft.name, setInsight]);

  const closeEditModal = () => {
    setEditGroupId(null);
    setEditDraft(emptyEditDraft);
  };

  const handleEditGroup = useCallback(async (group) => {
    setEditGroupId(group.id);
    setDetailLoading(true);

    try {
      const res = await apiClient.get(`/groups/${group.id}`);
      const detail = res.data;

      setEditDraft({
        name: detail.name === "—" ? "" : detail.name || "",
        memberIds: detail.memberIds || [],
        roles: detail.rolesList || [],
      });
    } catch (err) {
      console.error(err);
      feedback.error("Failed to load group details.");
      setEditGroupId(null);
      setEditDraft(emptyEditDraft);
    } finally {
      setDetailLoading(false);
    }
  }, [feedback]);

  const saveGroup = async () => {
    if (!editGroupId) return;

    if (!editDraft.name.trim()) {
      feedback.error("Group name is required.");
      return;
    }

    setSaving(true);
    try {
      await apiClient.put(`/groups/${editGroupId}`, {
        name: editDraft.name.trim(),
        memberIds: editDraft.memberIds,
        roles: editDraft.roles,
      });
      await fetchGroups();
      closeEditModal();
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Failed to update group.");
    } finally {
      setSaving(false);
    }
  };

  const gridContext = useMemo(
    () => ({
      onEditGroup: handleEditGroup,
    }),
    [handleEditGroup]
  );

  const columnDefs = useMemo(
    () => [
      { field: "name", headerName: "Group Name", minWidth: 180, flex: 1 },
      { field: "members", headerName: "Members", minWidth: 220, flex: 1.2 },
      { field: "roles", headerName: "Roles", minWidth: 160 },
      { field: "permissions", headerName: "Permissions", minWidth: 280, flex: 1.6 },
      {
        headerName: "",
        colId: "edit",
        maxWidth: 72,
        sortable: false,
        filter: false,
        cellClass: "group-actions-column",
        cellRenderer: GroupEditCellRenderer,
      },
    ],
    []
  );

  const getGroupRowId = useCallback((params) => String(params.data.id), []);

  return (
    <div className="grid-page">
      <AppDataGrid
        rowData={filteredGroups}
        columnDefs={columnDefs}
        context={gridContext}
        getRowId={getGroupRowId}
        loading={loading}
        searchPlaceholder="Search groups..."
        overlayNoRowsTemplate="<span>No groups found.</span>"
      />

      {editGroupId && (
        <div className="modal-overlay">
          <div className="modal modal-user modal-group-edit">
            <h3>Edit Group</h3>

            {detailLoading ? (
              <p className="user-modal-intro">Loading group details...</p>
            ) : (
              <div className="group-edit-form">
                <div className="user-modal-field">
                  <label htmlFor="group-name">Group Name</label>
                  <input
                    id="group-name"
                    value={editDraft.name}
                    onChange={(e) =>
                      setEditDraft((current) => ({ ...current, name: e.target.value }))
                    }
                  />
                </div>

                <TagMultiSelect
                  label="Members"
                  options={memberOptions}
                  value={editDraft.memberIds}
                  onChange={(memberIds) =>
                    setEditDraft((current) => ({ ...current, memberIds }))
                  }
                  placeholder="Select members"
                  getOptionValue={(option) => option.value}
                  getOptionLabel={(option) => option.label}
                />

                <TagMultiSelect
                  label="Roles"
                  options={roleOptions}
                  value={editDraft.roles}
                  onChange={(roles) => setEditDraft((current) => ({ ...current, roles }))}
                  placeholder="Select roles"
                  getOptionValue={(option) => option.value}
                  getOptionLabel={(option) => option.label}
                />

                <div className="user-modal-field permission-preview-field">
                  <div className="permission-preview-header">
                    <label>Permissions (auto)</label>
                    <span className="permission-preview-count">
                      {permissionPills.length} effective
                    </span>
                  </div>
                  <p className="permission-preview-help">
                    Preview only — updates when roles change. Saved with roles on Save.
                  </p>
                  <div className="permission-preview-panel">
                    {permissionGroups.length === 0 ? (
                      <span className="permission-pills-empty">
                        Select at least one role to preview permissions.
                      </span>
                    ) : (
                      permissionGroups.map(([area, permissions]) => (
                        <div key={area} className="permission-preview-group">
                          <h4 className="permission-preview-group-title">{area}</h4>
                          <div className="permission-pills">
                            {permissions.map((permission) => (
                              <span key={permission} className="permission-pill">
                                {permission.replace(/^(USER|GROUP|DOC)_/, "")}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="group-edit-actions">
                  <button
                    type="button"
                    className="parts-btn primary"
                    onClick={saveGroup}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    className="parts-btn"
                    onClick={closeEditModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Groups;
