import { useEffect, useState } from "react";
import axios from "axios";

import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { process } from "@progress/kendo-data-query";

import jsPDF from "jspdf";

function Parts() {
  const [parts, setParts] = useState([]);

  const [dataState, setDataState] = useState({
    sort: [],
    filter: null,
    skip: 0,
    take: 10,
  });

  const [selectedParts, setSelectedParts] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);

  const [newPart, setNewPart] = useState({
    id: null,
    partno: "",
    pdesc: "",
    prev: "",
  });

  const [exportType, setExportType] = useState("csv");

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/parts");
      setParts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ================= SELECTION =================
  const toggleSelect = (id) => {
    setSelectedParts((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  // ================= ADD / EDIT =================
  const openAddModal = () => {
    setNewPart({
      id: null,
      partno: "",
      pdesc: "",
      prev: "",
    });
    setShowAddModal(true);
  };

  const openEdit = () => {
    if (selectedParts.length !== 1) {
      alert("Select exactly one row to edit");
      return;
    }

    const row = parts.find((p) => p.id === selectedParts[0]);
    setNewPart(row);
    setShowAddModal(true);
  };

  const closeAddModal = () => setShowAddModal(false);

  const handleNewChange = (field, value) => {
    setNewPart((prev) => ({ ...prev, [field]: value }));
  };

  const savePart = async () => {
    try {
      if (newPart.id) {
        await axios.put(
          `http://127.0.0.1:8000/api/parts/${newPart.id}`,
          newPart
        );
      } else {
        await axios.post("http://127.0.0.1:8000/api/parts", {
          partno: newPart.partno,
          pdesc: newPart.pdesc,
          prev: newPart.prev,
        });
      }

      fetchParts();
      setShowAddModal(false);
      setSelectedParts([]);
    } catch (err) {
      alert("Save failed");
    }
  };

  // ================= DELETE =================
  const deleteSelected = async () => {
    if (selectedParts.length === 0) {
      alert("Select rows first");
      return;
    }

    if (!window.confirm("Delete selected parts?")) return;

    try {
      for (const id of selectedParts) {
        await axios.delete(`http://127.0.0.1:8000/api/parts/${id}`);
      }

      fetchParts();
      setSelectedParts([]);
    } catch (err) {
      alert("Delete failed");
    }
  };

  // ================= EXPORT FUNCTIONS =================
  const exportCSV = () => {
    const headers = ["Part Number", "Description", "Revision", "Updated"];
    const rows = parts.map((p) => [
      p.partno,
      p.pdesc,
      p.prev,
      p.updated,
    ]);

    let csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "parts.csv";
    link.click();
  };

  const exportTXT = () => {
    const text = parts
      .map(
        (p) =>
          `${p.partno} | ${p.pdesc} | ${p.prev} | ${p.updated}`
      )
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

    parts.forEach((p) => {
      doc.text(
        `${p.partno} | ${p.pdesc} | ${p.prev} | ${p.updated}`,
        10,
        y
      );
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
    <div className="grid-wrapper">
      <h3>Parts</h3>

      {/* TOOLBAR */}
      <div
        className="export-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "15px",
        }}
      >
        {/* LEFT SIDE ACTIONS */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={openAddModal}>Add</button>
          <button onClick={openEdit}>Edit</button>
          <button onClick={deleteSelected}>Delete</button>
        </div>

        {/* RIGHT SIDE EXPORT */}
        <div style={{ display: "flex", gap: "10px" }}>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
          >
            <option value="csv">CSV</option>
            <option value="txt">TXT</option>
            <option value="pdf">PDF</option>
          </select>

          <button onClick={handleExport}>Export</button>
        </div>
      </div>

      {/* GRID */}
      <Grid
        data={process(parts, dataState)}
        {...dataState}
        onDataStateChange={(e) => setDataState(e.dataState)}
        sortable
        filterable
        pageable
        style={{ height: "550px", width: "100%" }}
      >
        <GridColumn
          title="Select"
          width="80px"
          cell={(props) => (
            <td>
              <input
                type="checkbox"
                checked={selectedParts.includes(
                  props.dataItem.id
                )}
                onChange={() =>
                  toggleSelect(props.dataItem.id)
                }
              />
            </td>
          )}
        />

        <GridColumn field="partno" title="Part Number" />
        <GridColumn field="pdesc" title="Description" />
        <GridColumn field="prev" title="Revision" />
        <GridColumn field="updated" title="Updated Date" />
      </Grid>

      {/* MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{newPart.id ? "Edit Part" : "Add Part"}</h3>

            <input
              placeholder="Part Number"
              value={newPart.partno}
              onChange={(e) =>
                handleNewChange("partno", e.target.value)
              }
            />

            <input
              placeholder="Description"
              value={newPart.pdesc}
              onChange={(e) =>
                handleNewChange("pdesc", e.target.value)
              }
            />

            <input
              placeholder="Revision"
              value={newPart.prev}
              onChange={(e) =>
                handleNewChange("prev", e.target.value)
              }
            />

            <div className="modal-actions">
              <button onClick={savePart}>
                {newPart.id ? "Save" : "Add"}
              </button>
              <button onClick={closeAddModal}>
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


