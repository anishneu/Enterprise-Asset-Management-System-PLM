import { useEffect, useState } from "react";
import axios from "axios";

import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { process } from "@progress/kendo-data-query";

function Training() {

  const [Training, setTraining] = useState([]);

  const [TrainingState, setTrainingState] = useState({
    sort: [],
    filter: null,
    skip: 0,
    take: 10,
  });

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
        Training
      </h3>

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

    </div>
  );
}

export default Training;