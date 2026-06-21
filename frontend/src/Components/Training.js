import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import AppDataGrid from "./common/AppDataGrid";
import { filterBySearch } from "../utils/filterBySearch";

function Training({ searchText = "" }) {
  const [training, setTraining] = useState([]);

  const filteredTraining = useMemo(
    () =>
      filterBySearch(training, searchText, [
        "name",
        "email",
        "username",
        "updated",
      ]),
    [training, searchText]
  );

  const columnDefs = useMemo(
    () => [
      { field: "username", headerName: "Username" },
      { field: "email", headerName: "Email" },
      { field: "updated", headerName: "Updated Date", minWidth: 170 },
    ],
    []
  );

  useEffect(() => {
    fetchTraining();
  }, []);

  const fetchTraining = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/users");
      setTraining(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid-wrapper">
      <AppDataGrid
        rowData={filteredTraining}
        columnDefs={columnDefs}
        overlayNoRowsTemplate="<span>No training records found.</span>"
      />
    </div>
  );
}

export default Training;
