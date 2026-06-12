import { useEffect, useState } from "react";
import axios from "axios";

import { Grid, GridColumn } from "@progress/kendo-react-grid";
import { process } from "@progress/kendo-data-query";

function Users() {

  const [users, setUsers] = useState([]);

  const [usersState, setUsersState] = useState({
    sort: [],
    filter: null,
    skip: 0,
    take: 10,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/users"
      );

      setUsers(res.data);
    }
    catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid-wrapper">

      <h3 style={{ marginBottom: "15px" }}>
        Users
      </h3>

      <Grid
        data={process(users, usersState)}
        {...usersState}
        onDataStateChange={(e) =>
          setUsersState(e.dataState)
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

export default Users;