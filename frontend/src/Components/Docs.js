import { useCallback, useEffect, useMemo, useState } from "react";

import AppDataGrid from "./common/AppDataGrid";
import { createEditColumn, multiRowSelection } from "./common/gridHelpers";
import apiClient from "../api/client";
import { filterBySearch } from "../utils/filterBySearch";

const emptyDoc = {
  id: null,
  dname: "",
  ddesc: "",
  doctype: "",
  fmat: "",
};

function Docs({ searchText = "" }) {
  const [docs, setDocs] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formDoc, setFormDoc] = useState(emptyDoc);

  const documentTypes = [
    "SOP",
    "Work Instruction",
    "Form",
    "Training",
    "Policy",
  ];

  const rowSelection = useMemo(() => multiRowSelection, []);

  const filteredDocs = useMemo(
    () => filterBySearch(docs, searchText, ["dname", "ddesc", "doctype", "fmat", "updated"]),
    [docs, searchText]
  );

  useEffect(() => {
    fetchDocs();
    fetchForms();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDocs = async () => {
    try {
      const res = await apiClient.get("/docs");
      setDocs(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load documents. Check that you are logged in.");
    }
  };

  const fetchForms = async () => {
    try {
      const res = await apiClient.get("/forms/");
      setForms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setFormDoc(emptyDoc);
    setShowModal(true);
  };

  const openEditModal = useCallback((doc) => {
    setFormDoc({
      id: doc.id,
      dname: doc.dname || "",
      ddesc: doc.ddesc || "",
      doctype: doc.doctype || "",
      fmat: doc.fmat || "",
    });
    setShowModal(true);
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setFormDoc(emptyDoc);
  };

  const handleDocChange = (field, value) => {
    setFormDoc((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveDoc = async () => {
    if (!formDoc.dname.trim()) {
      alert("Document name is required.");
      return;
    }

    if (!formDoc.doctype) {
      alert("Document type is required.");
      return;
    }

    const payload = {
      dname: formDoc.dname.trim(),
      ddesc: formDoc.ddesc.trim(),
      doctype: formDoc.doctype,
      fmat: formDoc.fmat,
    };

    setSaving(true);
    try {
      if (formDoc.id) {
        await apiClient.put(`/docs/${formDoc.id}`, payload);
      } else {
        await apiClient.post("/docs/", payload);
      }

      await fetchDocs();
      closeModal();
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.detail || "Failed to save document";
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert("Select at least one document to delete.");
      return;
    }

    if (!window.confirm(`Delete ${selectedIds.length} selected document(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedIds.map((id) => apiClient.delete(`/docs/${id}`))
      );
      setSelectedIds([]);
      await fetchDocs();
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.detail || "Failed to delete document";
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
      { field: "dname", headerName: "Document Name" },
      { field: "ddesc", headerName: "Document Description" },
      { field: "doctype", headerName: "Document Type" },
      { field: "fmat", headerName: "Form" },
      { field: "updated", headerName: "Updated Date", minWidth: 170 },
    ],
    []
  );

  return (
    <div className="grid-wrapper">
      <div className="parts-toolbar">
        <div className="parts-toolbar-left">
          <button type="button" className="parts-btn primary" onClick={openAddModal}>
            Add
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
        rowData={filteredDocs}
        columnDefs={columnDefs}
        context={gridContext}
        rowSelection={rowSelection}
        onSelectionChanged={handleSelectionChanged}
        overlayNoRowsTemplate="<span>No documents found.</span>"
      />

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{formDoc.id ? "Edit Document" : "Add Document"}</h3>

            <input
              placeholder="Document Name"
              value={formDoc.dname}
              onChange={(e) => handleDocChange("dname", e.target.value)}
            />

            <input
              placeholder="Document Description"
              value={formDoc.ddesc}
              onChange={(e) => handleDocChange("ddesc", e.target.value)}
            />

            <select
              value={formDoc.doctype}
              onChange={(e) => {
                handleDocChange("doctype", e.target.value);
                handleDocChange("fmat", "");
              }}
            >
              <option value="">Select Document Type</option>

              {documentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={formDoc.fmat}
              onChange={(e) => handleDocChange("fmat", e.target.value)}
            >
              <option value="">Select Form</option>

              {forms
                .filter((f) => f.dtype === formDoc.doctype)
                .map((f) => (
                  <option key={f.id} value={f.fmname}>
                    {f.fmname}
                  </option>
                ))}
            </select>

            <div className="modal-actions">
              <button
                type="button"
                className="parts-btn primary"
                onClick={saveDoc}
                disabled={saving}
              >
                {saving ? "Saving..." : formDoc.id ? "Save" : "Add"}
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

export default Docs;
