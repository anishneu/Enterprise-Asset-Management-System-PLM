import { useEffect, useState } from "react";
import axios from "axios";

import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { process } from "@progress/kendo-data-query";

function Docs() {

  const [docs, setDocs] = useState([]);

  const [docsState, setDocsState] = useState({
    sort: [],
    filter: null,
    skip: 0,
    take: 10,
  });

  const [showAddModal, setShowAddModal] = useState(false);

  const [newDoc, setNewDoc] = useState({
    dname: "",
    ddesc: "",
    doctype: "",
    fmat: "",
  });

  const documentTypes = [
    "SOP",
    "Work Instruction",
    "Form",
    "Training",
    "Policy",
  ];

  const [forms, setForms] = useState([]);

  useEffect(() => {
    fetchDocs();
    fetchForms();
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/docs"
      );

      setDocs(res.data);
    }
    catch (err) {
      console.error(err);
    }
  };

  const fetchForms = async () => {
    const res = await axios.get(
      "http://127.0.0.1:8000/api/forms/"
    );

    setForms(res.data);
  };

  const openAddModal = () => {
    setNewDoc({
      dname: "",
      ddesc: "",
      doctype: "",
      fmat: "",
    });

    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
  };

  const handleDocChange = (field, value) => {
    setNewDoc((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveDoc = async () => {
    try {

      await axios.post(
        "http://127.0.0.1:8000/api/docs/",
        newDoc
      );

      fetchDocs();

      setShowAddModal(false);

    } catch (err) {
      console.error(err);
      alert("Failed to save document");
    }
  };

  return (
    <div className="grid-wrapper">

      <h3 style={{ marginBottom: "15px" }}>
        Documentation
      </h3>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "15px",
        }}
      >
        <div>
          <button onClick={openAddModal}>
            Add
          </button>
        </div>
      </div>

      <Grid
        data={process(docs, docsState)}
        {...docsState}
        onDataStateChange={(e) =>
          setDocsState(e.dataState)
        }
        sortable
        filterable
        pageable
        style={{
          flex: 1,
          width: "100%"
        }}
      >
        <GridColumn
          field="dname"
          title="Document Name"
        />

        <GridColumn
          field="ddesc"
          title="Document Description"
        />

        <GridColumn
          field="doctype"
          title="Document Type"
        />

        <GridColumn
          field="fmat"
          title="Form"
        />

        <GridColumn
          field="updated"
          title="Updated Date"
        />
      </Grid>

      {showAddModal && (
      <div className="modal-overlay">
        <div className="modal">

          <h3>Add Document</h3>

          <input
            placeholder="Document Name"
            value={newDoc.dname}
            onChange={(e) =>
              handleDocChange(
                "dname",
                e.target.value
              )
            }
          />

          <input
            placeholder="Document Description"
            value={newDoc.ddesc}
            onChange={(e) =>
              handleDocChange(
                "ddesc",
                e.target.value
              )
            }
          />

          <select
            value={newDoc.doctype}
            onChange={(e) => {
              handleDocChange(
                "doctype",
                e.target.value
              );

              handleDocChange(
                "fmat",
                ""
              );
            }}
          >
            <option value="">
              Select Document Type
            </option>

            {documentTypes.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}
          </select>

          <select
            value={newDoc.fmat}
            onChange={(e) =>
              handleDocChange(
                "fmat",
                e.target.value
              )
            }
          >
            <option value="">
              Select Form
            </option>

            {forms
              .filter(
                (f) => f.dtype === newDoc.doctype
              )
              .map((f) => (
                <option
                  key={f.id}
                  value={f.fmname}
                >
                  {f.fmname}
                </option>
              ))
            }
          </select>

          <div className="modal-actions">
            <button onClick={saveDoc}>
              Save
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

export default Docs;