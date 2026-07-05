import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../api/client";

import AppDataGrid from "./common/AppDataGrid";
import { createEditColumn, multiRowSelection } from "./common/gridHelpers";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { filterBySearch } from "../utils/filterBySearch";
import { useAppFeedback } from "../context/AppFeedbackContext";
import usePermission from "../hooks/usePermission";

import jsPDF from "jspdf";

const emptyPart = {
  id: null,
  partno: "",
  pdesc: "",
  prev: "",
};

function Parts({ searchText = "" }) {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formPart, setFormPart] = useState(emptyPart);
  const [exportType, setExportType] = useState("csv");
  const gridApiRef = useRef(null);
  const { setInsight } = usePageInsight();
  const feedback = useAppFeedback();
  const permission = usePermission();

  const clearSelection = useCallback(() => {
    gridApiRef.current?.deselectAll();
    setSelectedIds([]);
  }, []);

  const filteredParts = useMemo(
    () => filterBySearch(parts, searchText, ["partno", "pdesc", "prev", "updated"]),
    [parts, searchText]
  );

  const activePart = useMemo(
    () =>
      selectedIds.length === 1
        ? parts.find((part) => Number(part.id) === selectedIds[0]) || null
        : null,
    [parts, selectedIds]
  );

  const rowSelection = useMemo(() => multiRowSelection, []);

  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/parts/");
      setParts(res.data);
    } catch (err) {
      console.error(err);
      feedback.error("Failed to load parts.");
    } finally {
      setLoading(false);
    }
  }, [feedback]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  useEffect(() => {
    setInsight({
      recordCount: filteredParts.length,
      selectedCount: selectedIds.length,
      extra: {
        Tab: activeTab === "summary" ? "Summary" : "Details",
      },
      auditEntity: activePart
        ? {
            type: "part",
            id: activePart.id,
            label: activePart.partno,
            revision: activePart.prev || null,
          }
        : null,
    });
  }, [filteredParts.length, selectedIds.length, activeTab, activePart, setInsight]);

  const getPartId = (part) => Number(part.id);

  const openAddModal = () => {
    setFormPart(emptyPart);
    setShowModal(true);
  };

  const openEditModal = useCallback((part) => {
    setFormPart({
      id: getPartId(part),
      partno: part.partno || "",
      pdesc: part.pdesc || "",
      prev: part.prev || "",
    });
    setShowModal(true);
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setFormPart(emptyPart);
  };

  const handleFormChange = (field, value) => {
    setFormPart((prev) => ({ ...prev, [field]: value }));
  };

  const savePart = async () => {
    if (!formPart.partno.trim()) {
      feedback.error("Part number is required.");
      return;
    }

    const payload = {
      partno: formPart.partno.trim(),
      pdesc: formPart.pdesc.trim(),
      prev: formPart.prev.trim(),
    };

    setSaving(true);
    try {
      if (formPart.id) {
        await apiClient.put(`/parts/${formPart.id}`, payload);
      } else {
        await apiClient.post("/parts/", payload);
      }

      await fetchParts();
      closeModal();
      clearSelection();
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) {
      feedback.error("Select at least one part to delete.");
      return;
    }

    if (!window.confirm(`Delete ${selectedIds.length} selected part(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedIds.map((id) => apiClient.delete(`/parts/${id}`))
      );
      clearSelection();
      await fetchParts();
    } catch (err) {
      console.error(err);
      feedback.error(err.response?.data?.detail || "Delete failed.");
    }
  };

  const handleGridReady = useCallback((event) => {
    gridApiRef.current = event.api;
  }, []);

  const handleSelectionChanged = useCallback((event) => {
    const ids = event.api.getSelectedRows().map((row) => Number(row.id));
    setSelectedIds(ids);
  }, []);

  const gridContext = useMemo(
    () => ({
      onEdit: openEditModal,
      canEdit: permission.canEditPart,
    }),
    [openEditModal, permission.canEditPart]
  );

  const columnDefs = useMemo(
    () => [
      ...(permission.canEditPart ? [createEditColumn()] : []),
      { field: "partno", headerName: "Part Number" },
      { field: "pdesc", headerName: "Description" },
      { field: "prev", headerName: "Revision", maxWidth: 120 },
      { field: "updated", headerName: "Updated Date", minWidth: 170 },
    ],
    [permission.canEditPart]
  );

  const exportCSV = () => {
    const headers = ["Part Number", "Description", "Revision", "Updated"];
    const rows = filteredParts.map((p) => [
      p.partno,
      p.pdesc,
      p.prev,
      p.updated,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "parts.csv";
    link.click();
  };

  const exportTXT = () => {
    const text = filteredParts
      .map((p) => `${p.partno} | ${p.pdesc} | ${p.prev} | ${p.updated}`)
      .join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "parts.txt";
    link.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    let y = 10;

    doc.text("Parts List", 10, y);
    y += 10;

    filteredParts.forEach((p) => {
      doc.text(`${p.partno} | ${p.pdesc} | ${p.prev} | ${p.updated}`, 10, y);
      y += 10;
    });

    doc.save("parts.pdf");
  };

  const handleExport = () => {
    if (exportType === "csv") exportCSV();
    if (exportType === "txt") exportTXT();
    if (exportType === "pdf") exportPDF();
  };

  return (
    <div className="grid-page">
      <div className="parts-tabs">
        <button
          type="button"
          className={activeTab === "summary" ? "parts-tab active" : "parts-tab"}
          onClick={() => setActiveTab("summary")}
        >
          Summary
        </button>
        <button
          type="button"
          className={activeTab === "details" ? "parts-tab active" : "parts-tab"}
          onClick={() => setActiveTab("details")}
        >
          Details
        </button>
      </div>

      <div className={`parts-tab-panel${activeTab === "summary" ? "" : " hidden"}`}>
        <AppDataGrid
          rowData={filteredParts}
          columnDefs={columnDefs}
          context={gridContext}
          rowSelection={rowSelection}
          onSelectionChanged={handleSelectionChanged}
          onGridReady={handleGridReady}
          loading={loading}
          searchPlaceholder="Search parts..."
          overlayNoRowsTemplate="<span>No parts found.</span>"
          toolbarActions={
            <>
              {permission.canCreatePart && (
              <button type="button" className="parts-btn primary" onClick={openAddModal}>
                Add
              </button>
              )}
              {permission.canDeletePart && (
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
                <span className="parts-selection-count">
                  {selectedIds.length} selected
                </span>
              )}
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
              >
                <option value="csv">CSV</option>
                <option value="txt">TXT</option>
                <option value="pdf">PDF</option>
              </select>
              <button type="button" className="parts-btn" onClick={handleExport}>
                Export
              </button>
            </>
          }
        />
      </div>

      <div className={`parts-tab-panel${activeTab === "details" ? "" : " hidden"}`}>
        <div className="parts-details">
          {selectedIds.length === 0 ? (
            <p>Select a part from the Summary tab to view details.</p>
          ) : (
            selectedIds.map((id) => {
              const part = parts.find((p) => getPartId(p) === id);
              if (!part) return null;
              return (
                <div key={id} className="part-detail-card">
                  <div className="part-detail-header">
                    <h4>{part.partno}</h4>
                    <button
                      type="button"
                      className="grid-edit-icon-btn"
                      title="Edit"
                      aria-label="Edit part"
                      onClick={() => openEditModal(part)}
                    >
                      <svg
                        className="grid-edit-icon"
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        aria-hidden="true"
                      >
                        <path
                          fill="currentColor"
                          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                        />
                      </svg>
                    </button>
                  </div>
                  <p>
                    <strong>Description:</strong> {part.pdesc}
                  </p>
                  <p>
                    <strong>Revision:</strong> {part.prev}
                  </p>
                  <p>
                    <strong>Updated:</strong> {part.updated}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{formPart.id ? "Edit Part" : "Add Part"}</h3>

            <input
              placeholder="Part Number"
              value={formPart.partno}
              onChange={(e) => handleFormChange("partno", e.target.value)}
            />

            <input
              placeholder="Description"
              value={formPart.pdesc}
              onChange={(e) => handleFormChange("pdesc", e.target.value)}
            />

            <input
              placeholder="Revision"
              value={formPart.prev}
              onChange={(e) => handleFormChange("prev", e.target.value)}
            />

            <div className="modal-actions">
              <button type="button" className="parts-btn primary" onClick={savePart} disabled={saving}>
                {saving ? "Saving..." : formPart.id ? "Save" : "Add"}
              </button>
              <button type="button" className="parts-btn" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Parts;
