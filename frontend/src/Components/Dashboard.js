import "./Dashboard.css";
import keycloak from "../keycloak";

import { useState, useEffect, useMemo } from "react";

import logoBird from "../media/logo_bird.png";

import Parts from "./Parts";
import Users from "./Users";
import Docs from "./Docs";
import Asset from "./Asset";
import Training from "./Training";
import Forms from "./Forms";

import ProfileMenu from "./dashboard/ProfileMenu";
import GlobalSearch from "./dashboard/GlobalSearch";
import SidebarItem from "./dashboard/SidebarItem";
import {
  IconFolder,
  IconBox,
  IconFile,
  IconGraduation,
  IconForm,
  IconUsers,
} from "./dashboard/NavIcons";

const SECTION_LABELS = {
  parts: "Parts",
  docs: "Documentation",
  training: "Training",
  forms: "Forms",
  users: "Users",
  asset: "Assets",
};

const SECTION_DESCRIPTIONS = {
  parts: "Manage part numbers, revisions, and inventory records.",
  docs: "Browse and add documentation linked to forms and types.",
  training: "Track training records and assignments.",
  forms: "Build and manage dynamic form templates.",
  users: "Manage Keycloak user accounts and access.",
  asset: "View asset documentation and metadata.",
};

function Dashboard() {
  const [assetOpen, setAssetOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState("parts");
  const [contentSearch, setContentSearch] = useState("");

  const username = keycloak.tokenParsed?.preferred_username || "User";
  const email = keycloak.tokenParsed?.email || "";

  const activeSectionLabel = SECTION_LABELS[activeMenu] || "Dashboard";

  useEffect(() => {
    document.title = "TalonVault";
  }, []);

  const handleLogout = () => {
    keycloak.logout({
      redirectUri: window.location.origin,
    });
  };

  const navigateToSection = (menuId, searchText = "") => {
    if (menuId) {
      setActiveMenu(menuId);
      if (menuId === "parts" || menuId === "docs") {
        setAssetOpen(true);
      }
    }
    setContentSearch(searchText);
  };

  const handleMenuSelect = (menuId) => {
    setActiveMenu(menuId);
    setContentSearch("");
  };

  const footerStatus = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  return (
    <div
      className={`Dashboard ${sidebarOpen ? "" : "sidebar-collapsed"}`}
      style={{
        gridTemplateColumns: sidebarOpen ? "250px 1fr" : "72px 1fr",
      }}
    >
      <header className="north">
        <div className="navbar-inner">
          <div className="navbar-brand">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <span className="sidebar-toggle-icon" aria-hidden="true">☰</span>
            </button>

            <div className="brand-cluster">
              <img src={logoBird} alt="TalonVault logo" className="logo" />
              <div className="brand-text">
                <h1 className="brand-title">TalonVault</h1>
                <span className="brand-subtitle">Asset Management</span>
              </div>
            </div>
          </div>

          <div className="navbar-search">
            <GlobalSearch onNavigate={navigateToSection} />
          </div>

          <div className="navbar-actions">
            <ProfileMenu
              username={username}
              email={email}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </header>

      <aside className={`west ${sidebarOpen ? "" : "collapsed"}`}>
        {sidebarOpen && (
          <div className="sidebar-section-label">Navigation</div>
        )}
        <ul className="sidebar-list">
          <li
            className={`menu-parent sidebar-item ${sidebarOpen ? "" : "menu-parent-collapsed"}`}
            onClick={() => setAssetOpen(!assetOpen)}
            data-tooltip={!sidebarOpen ? "Asset" : undefined}
          >
            <span className="sidebar-item-content">
              <span className="sidebar-icon" aria-hidden="true">
                <IconFolder />
              </span>
              {sidebarOpen && (
                <span className="sidebar-label">
                  Asset {assetOpen ? "▾" : "▸"}
                </span>
              )}
            </span>
          </li>

          {assetOpen && (
            <ul className={`submenu ${sidebarOpen ? "" : "submenu-collapsed"}`}>
              <SidebarItem
                label="Parts"
                icon={IconBox}
                active={activeMenu === "parts"}
                collapsed={!sidebarOpen}
                onClick={() => handleMenuSelect("parts")}
              />
              <SidebarItem
                label="Docs"
                icon={IconFile}
                active={activeMenu === "docs"}
                collapsed={!sidebarOpen}
                onClick={() => handleMenuSelect("docs")}
              />
            </ul>
          )}

          <SidebarItem
            label="Training"
            icon={IconGraduation}
            active={activeMenu === "training"}
            collapsed={!sidebarOpen}
            onClick={() => handleMenuSelect("training")}
          />

          <SidebarItem
            label="Forms"
            icon={IconForm}
            active={activeMenu === "forms"}
            collapsed={!sidebarOpen}
            onClick={() => handleMenuSelect("forms")}
          />

          <SidebarItem
            label="Users"
            icon={IconUsers}
            active={activeMenu === "users"}
            collapsed={!sidebarOpen}
            onClick={() => handleMenuSelect("users")}
          />
        </ul>
      </aside>

      <main className="center">
        <div className="page-header">
          <div>
            <h2 className="page-title">{activeSectionLabel}</h2>
            <p className="page-subtitle">
              {SECTION_DESCRIPTIONS[activeMenu]}
            </p>
          </div>
        </div>

        <div className="page-card">
          {contentSearch && (
            <div className="content-search-banner">
              Showing results for <strong>{contentSearch}</strong>
              <button
                type="button"
                onClick={() => setContentSearch("")}
              >
                Clear
              </button>
            </div>
          )}

          {activeMenu === "parts" && <Parts searchText={contentSearch} />}
          {activeMenu === "users" && <Users searchText={contentSearch} />}
          {activeMenu === "docs" && <Docs searchText={contentSearch} />}
          {activeMenu === "asset" && <Asset searchText={contentSearch} />}
          {activeMenu === "training" && <Training searchText={contentSearch} />}
          {activeMenu === "forms" && <Forms searchText={contentSearch} />}
        </div>
      </main>

      <footer className="south">
        <div className="footer-section footer-left">
          <span className="footer-brand">TalonVault</span>
          <span className="footer-divider">·</span>
          <span>Asset Store Management</span>
        </div>

        <div className="footer-section footer-center">
          <span className="footer-pill">{activeSectionLabel}</span>
          <span className="footer-divider">·</span>
          <span>{footerStatus}</span>
        </div>

        <div className="footer-section footer-right">
          <span>Secure session via Keycloak</span>
          <span className="footer-divider">·</span>
          <span>v1.0</span>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
