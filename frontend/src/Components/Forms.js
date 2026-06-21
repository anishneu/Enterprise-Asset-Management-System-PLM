import { useEffect, useState, useMemo } from "react";
import apiClient from "../api/client";
import { filterBySearch } from "../utils/filterBySearch";

import {
  DndContext,
  useDraggable,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";

import "./Forms.css";

function Forms({ searchText = "" }) {

  const [formsOpen, setFormsOpen] = useState([]);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("");
  const [fields, setFields] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);

  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const filteredSavedForms = useMemo(
    () => filterBySearch(formsOpen, searchText, ["fmname", "dtype", "updated"]),
    [formsOpen, searchText]
  );

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const res = await apiClient.get("/forms/");

      setFormsOpen(res.data);

    } catch (err) {
      console.error(err);
    }
  };

  const fieldPalette = [
      {
        id: "text",
        label: "Text Input",
        type: "text",
        defaultValue: "",
        required: false,
      },
      {
        id: "textarea",
        label: "Textarea",
        type: "textarea",
        defaultValue: "",
        required: false,
      },
      {
        id: "number",
        label: "Number",
        type: "number",
        defaultValue: 0,
        required: false,
      },
      {
        id: "dropdown",
        label: "Dropdown",
        type: "dropdown",
        options: ["Option 1", "Option 2"],
      },
      { id: "date", label: "Date", type: "date" },
  
      // enterprise additions
      { id: "email", label: "Email", type: "email" },
      { id: "checkbox", label: "Checkbox", type: "checkbox" },
      { id: "radio", label: "Radio Group", type: "radio" },
      { id: "file", label: "File Upload", type: "file" },
  ];
  
  const DraggableField = ({ field }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
      id: field.id,
      data: field,
    });

    const style = {
      transform: transform
        ? `translate(${transform.x}px, ${transform.y}px)`
        : undefined,
      padding: "8px",
      marginBottom: "8px",
      background: "#f4f4f4",
      cursor: "grab",
    };

    return (
      <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
        {field.label}
      </div>
    );
  };

  const CanvasDropZone = ({ children }) => {
      const { setNodeRef, isOver } = useDroppable({
        id: "canvas",
      });

      return (
      <div
        ref={setNodeRef}
        className="fb-canvas"
        style={{
          minHeight: "300px",
          background: isOver ? "#eef6ff" : "transparent",
        }}
      >
        {children}
      </div>
    );
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) return;

    const field = active.data.current;

    if (over.id === "canvas") {
      setFields((prev) => [
        ...prev,
        {
          id: Date.now(),
          label: field.label,
          type: field.type,
        },
      ]);
    }
  };

  const deleteField = (id) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFieldLabel = (id, value) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, label: value } : f)),
    );
  };

  const updateField = (id, updates) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  };

  const saveForm = async () => {
    try {

      const formData = {
        fmname: formName,
        dtype: formType,
        fmjson: JSON.stringify({
          name: formName,
          fields: fields,
        })
      };

      await apiClient.post("/forms/", formData);

      fetchForms();

      setFormName("");
      setFormType("");
      setFields([]);

      alert("Form saved successfully");

    } catch (err) {
      console.error(err);
      alert("Failed to save form");
    }
  };

  return (
    <div>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="fb-layout">
          {/* LEFT - FIELD PALETTE */}
          <div className="fb-left">
            <h3>Field Library</h3>

            {fieldPalette.map((f) => (
              <DraggableField key={f.id} field={f} />
            ))}
          </div>

          {/* CENTER - BUILDER */}
          <div className="fb-center">
            <h2>Form Builder</h2>

            <input
              placeholder="Form Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />

            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
            >
              <option value="">Select Document Type</option>
              <option value="SOP">SOP</option>
              <option value="Work Instruction">Work Instruction</option>
              <option value="Form">Form</option>
              <option value="Training">Training</option>
              <option value="Policy">Policy</option>
            </select>

            {/* ACTIONS (FIXED LOCATION) */}
            <div style={{ margin: "10px 0", display: "flex", gap: 10 }}>
              <button onClick={saveForm}>💾 Save Form</button>

              <button onClick={() => setPreviewMode((p) => !p)}>
                👁 {previewMode ? "Edit Mode" : "Preview Mode"}
              </button>
            </div>

            {/* CANVAS */}
            <CanvasDropZone>
              {fields.length === 0 && <p>Drag fields here...</p>}

              {fields.map((field) => (
                <div
                  key={field.id}
                  className={`fb-field ${
                    selectedFieldId === field.id ? "selected-field" : ""
                  }`}
                  onClick={() =>
                    !previewMode && setSelectedFieldId(field.id)
                  }
                  style={{
                    padding: 10,
                    border:
                      selectedFieldId === field.id
                        ? "2px solid #4f46e5"
                        : "1px solid #ddd",
                    marginBottom: 10,
                    borderRadius: 6,
                    background:
                      selectedFieldId === field.id
                        ? "#f5f7ff"
                        : "white",
                    cursor: previewMode ? "default" : "pointer",
                  }}
                >
                  {/* HEADER */}
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    {previewMode ? (
                      <label style={{ fontWeight: "bold" }}>
                        {field.label}
                      </label>
                    ) : (
                      <input
                        value={field.label}
                        onChange={(e) =>
                          updateFieldLabel(field.id, e.target.value)
                        }
                        style={{ flex: 1 }}
                      />
                    )}

                    {!previewMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteField(field.id);
                        }}
                        style={{
                          color: "red",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 16,
                        }}
                      >
                        ❌
                      </button>
                    )}
                  </div>

                  {/* FIELD BODY */}
                  <div style={{ marginTop: 10 }}>
                    {previewMode ? (
                      <>
                        {field.type === "text" && <input />}
                        {field.type === "textarea" && <textarea />}
                        {field.type === "number" && (
                          <input type="number" />
                        )}
                        {field.type === "date" && <input type="date" />}
                        {field.type === "dropdown" && (
                          <select>
                            <option>Option 1</option>
                          </select>
                        )}
                      </>
                    ) : (
                      <small style={{ color: "#666" }}>
                        type: {field.type}
                      </small>
                    )}
                  </div>
                </div>
              ))}
            </CanvasDropZone>
          </div>

          <div className="fb-properties">
            <h3>Field Properties</h3>

            {!selectedField ? (
              <p className="fb-hint">Select a field to edit its properties</p>
            ) : (
              <>
                <input
                  value={selectedField.label}
                  onChange={(e) =>
                    updateField(selectedField.id, { label: e.target.value })
                  }
                  placeholder="Label"
                />

                <input
                  value={selectedField.placeholder || ""}
                  onChange={(e) =>
                    updateField(selectedField.id, { placeholder: e.target.value })
                  }
                  placeholder="Placeholder"
                />

                <label className="fb-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedField.required || false}
                    onChange={(e) =>
                      updateField(selectedField.id, { required: e.target.checked })
                    }
                  />
                  Required
                </label>
              </>
            )}
          </div>

          {/* RIGHT - SAVED FORMS */}
          <div className="fb-right">
            <h3>Saved Forms</h3>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th>Form Name</th>
                  <th>Doc Type</th>
                  <th>JSON Form</th>
                  <th>Updated</th>
                </tr>
              </thead>

              <tbody>
                {filteredSavedForms.map((form) => (
                  <tr key={form.id}>
                    <td>{form.fmname}</td>
                    <td>{form.dtype}</td>
                    <td>
                      <button
                        onClick={() =>
                          alert(
                            JSON.stringify(
                              JSON.parse(form.fmjson),
                              null,
                              2
                            )
                          )
                        }
                      >
                        View JSON
                      </button>
                    </td>
                    <td>{form.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DndContext>
    </div>
  );
}

export default Forms;
