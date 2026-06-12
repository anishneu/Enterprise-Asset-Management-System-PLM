import "./Dashboard.css";
import "@progress/kendo-theme-default/dist/all.css";

import { useNavigate } from "react-router-dom";
import { useState } from "react";

import Parts from "./Parts";
import Users from "./Users";
import Docs from "./Docs";

function Dashboard({ onLogout }) {
  const navigate = useNavigate();

  const [activeMenu, setActiveMenu] = useState("parts");

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <div className="Dashboard">

      {/* HEADER */}
      <header className="north">

        {/* LOGO + TITLE GROUP */}
        <div className="header-left">
          <img
            src="C:\Project Programs\Authweb\frontend\src\media\logo_bird.png"
            alt="Logo"
            className="logo"
          />

          <h2>Authweb Dashboard</h2>
        </div>

        <button onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* SIDEBAR */}
      <aside className="west">
        <ul>
          <li onClick={() => setActiveMenu("parts")}>Parts</li>
          <li onClick={() => setActiveMenu("users")}>Users</li>
          <li onClick={() => setActiveMenu("docs")}>Docs</li>
        </ul>
      </aside>

      {/* MAIN */}
      <main className="center">

        {activeMenu === "parts" && (
          <Parts />
        )}

        {activeMenu === "users" && (
          <Users />
        )}

        {activeMenu === "docs" && (
          <Docs />
        )}

      </main>

      {/* FOOTER */}
      <footer className="south">
        Logged in as Admin
      </footer>

    </div>
  );
}

export default Dashboard;

