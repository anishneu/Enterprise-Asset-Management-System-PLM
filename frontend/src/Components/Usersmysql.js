import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import AppDataGrid from "./common/AppDataGrid";
import { API_BASE_URL } from "../config";

function Usersmysql() {
  const [users, setUsers] = useState([]);

  const columnDefs = useMemo(
    () => [
      { field: "name", headerName: "Name" },
      { field: "email", headerName: "Email" },
      { field: "updated", headerName: "Updated Date", minWidth: 170 },
    ],
    []
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/users`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid-wrapper">
      <h3 style={{ marginBottom: "15px" }}>Users</h3>

      <AppDataGrid
        rowData={users}
        columnDefs={columnDefs}
        overlayNoRowsTemplate="<span>No users found.</span>"
      />
    </div>
  );
}

export default Usersmysql;
