import { useEffect, useState } from "react";
import axios from "axios";

import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { process } from "@progress/kendo-data-query";

function Forms() {

  const [Training, setTraining] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);

  const [newPart, setNewPart] = useState({
    id: null,
    partno: "",
    pdesc: "",
    prev: "",
  });

  const [TrainingState, setTrainingState] = useState({
    sort: [],
    filter: null,
    skip: 0,
    take: 10,
  });

  const openAddModal = () => {
    setNewPart({
      id: null,
      partno: "",
      pdesc: "",
      prev: "",
    });
    setShowAddModal(true);
  };

  const closeAddModal = () => setShowAddModal(false);


  useEffect(() => {
    fetchTraining();
  }, []);

  const fetchTraining = async () => {
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/users"
      );

      setTraining(res.data);
    }
    catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid-wrapper">

      <h3 style={{ marginBottom: "15px" }}>
        Forms
      </h3>

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
        </div>
      </div>

      <Grid
        data={process(Training, TrainingState)}
        {...TrainingState}
        onDataStateChange={(e) =>
          setTrainingState(e.dataState)
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
          field="name"
          title="Name"
        />

        <GridColumn
          field="email"
          title="Email"
        />

        <GridColumn
          field="updated"
          title="Updated Date"
        />
      </Grid>

      {/* MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{newPart.id ? "Edit Form" : "Submit Form"}</h3>

            {/* <input
              placeholder="Part Number"
              //value={newPart.partno}
              onChange={(e) =>
                handleNewChange("", e.target.value)
              }
            />

            <input
              placeholder="Description"
              //value={newPart.pdesc}
              onChange={(e) =>
                handleNewChange("", e.target.value)
              }
            />

            <input
              placeholder="Revision"
              //value={newPart.prev}
              onChange={(e) =>
                handleNewChange("", e.target.value)
              }
            /> */}
            
            {/* <div className="modal-actions">
              <button onClick={savePart}>
                {newPart.id ? "Save" : "Add"}
              </button>
              <button onClick={closeAddModal}>
                Cancel
              </button>
            </div> */}
          </div>
        </div>
      )}
    </div>
  );
}

export default Forms;