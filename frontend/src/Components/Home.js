import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { API_BASE_URL } from "../config";

function Home({ setIsLoggedIn }) {
  const [companies, setCompanies] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE_URL}/company`)
      .then((res) => res.json())
      .then((data) => setCompanies(data))
      .catch((err) => console.error(err));
  }, []);

  const logout = () => {
    setIsLoggedIn(false);
    navigate("/");
  };

  return (
    <div>
      <h2>Company Table</h2>

      <table border="1">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Updated</th>
          </tr>
        </thead>

        <tbody>
          {companies.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.name}</td>
              <td>{c.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />

      <button onClick={logout}>
        Logout
      </button>
    </div>
  );
}

export default Home;

