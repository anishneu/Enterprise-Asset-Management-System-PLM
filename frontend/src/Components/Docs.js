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

  useEffect(() => {
    fetchDocs();
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

  return (
    <div className="grid-wrapper">

      <h3 style={{ marginBottom: "15px" }}>
        Documentation
      </h3>

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
          field="updated"
          title="Updated Date"
        />
      </Grid>

    </div>
  );
}

export default Docs;