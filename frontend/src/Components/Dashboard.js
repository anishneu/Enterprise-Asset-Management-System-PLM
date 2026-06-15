import "./Dashboard.css";
import "@progress/kendo-theme-default/dist/all.css";

import { useNavigate } from "react-router-dom";
import { useState } from "react";

import logoBird from "../media/logo_bird.png";

import Parts from "./Parts";
import Users from "./Users";
import Docs from "./Docs";
import Asset from "./Asset";
import Training from "./Training";
import Forms from "./Forms";

function Dashboard({ onLogout }) {
  const navigate = useNavigate();

  const [assetOpen, setAssetOpen] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [activeMenu, setActiveMenu] = useState("parts");

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <div className="Dashboard">

      {/* HEADER */}
      <header className="north">

      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? "☰" : "▶"}
      </button>

        {/* LOGO + TITLE GROUP */}
        <div className="header-left">
          <img
            src={logoBird}
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
      <aside className={`west ${sidebarOpen ? "" : "collapsed"}`}>
        <ul>

          {/* ASSET ACCORDION */}
          <li
            className="menu-parent"
            onClick={() => setAssetOpen(!assetOpen)}
          >
            Asset {assetOpen ? "▼" : "▶"}
          </li>

          {assetOpen && (
            <ul className="submenu">
              <li onClick={() => setActiveMenu("parts")}>
                Parts
              </li>

              <li onClick={() => setActiveMenu("docs")}>
                Docs
              </li>
            </ul>
          )}

          {/* OTHER MENUS */}
          <li onClick={() => setActiveMenu("training")}>
            Training
          </li>

          <li onClick={() => setActiveMenu("forms")}>
            Forms
          </li>

          <li onClick={() => setActiveMenu("users")}>
            Users
          </li>


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

        {activeMenu === "asset" && (
          <Asset />
        )}

        {activeMenu === "training" && (
          <Training />
        )}

        {activeMenu === "forms" && (
          <Forms />
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

