import "./Dashboard.css";

import keycloak from "../keycloak";



import { useState, useEffect, useMemo, useCallback } from "react";



import tvAmsIcon from "../media/tv_ams_icon.png";



import DashboardHome from "./DashboardHome";

import Parts from "./Parts";

import Users from "./Users";
import Groups from "./Groups";

import Docs from "./Docs";

import TrainingCourses from "./TrainingCourses";
import TrainingCurriculum from "./TrainingCurriculum";
import TrainingRecords from "./TrainingRecords";
import QualificationMatrix from "./QualificationMatrix";

import Approvals from "./Approvals";

import Forms from "./Forms";

import Settings from "./Settings";

import HelpSupport from "./HelpSupport";

import ProfileMenu from "./dashboard/ProfileMenu";

import GlobalSearch from "./dashboard/GlobalSearch";

import SidebarItem from "./dashboard/SidebarItem";

import SidebarNavGroup from "./dashboard/SidebarNavGroup";

import SectionInsightPanel from "./dashboard/SectionInsightPanel";

import PageBreadcrumbs from "./common/PageBreadcrumbs";

import { PageInsightContext } from "./dashboard/PageInsightContext";

import { useProfile } from "../context/ProfileContext";

import {

  IconFolder,

  IconGraduation,

  IconForm,

  IconHome,

  IconShield,

  IconClipboardCheck,

} from "./dashboard/NavIcons";



const SECTION_LABELS = {

  dashboard: "Dashboard",

  parts: "Parts",

  docs: "Documents",

  "forms-builder": "Formbuilder",

  "forms-saved": "Saved Forms",

  "training-courses": "Courses",

  "training-records": "Records",

  "training-curriculum": "Curriculum",

  "training-qualification": "Qualification Matrix",

  "approvals-pending": "Pending Requests",

  "approvals-my": "My Requests",

  "approvals-approved": "Approved",

  "approvals-rejected": "Rejected",

  users: "Users",

  groups: "Groups",

  settings: "Settings",

  "help-support": "Help & Support",

};



const SECTION_DESCRIPTIONS = {

  dashboard: "Overview of your TalonVault workspace.",

  parts: "Manage part numbers, revisions, and inventory records.",

  docs: "Browse and add documentation linked to forms and types.",

  "forms-builder": "Drag and drop fields to build form templates.",

  "forms-saved": "Review saved form templates and JSON definitions.",

  "training-courses": "Define master training courses linked to controlled documents and revisions.",

  "training-records": "Track who completed each course, scores, trainers, and completion dates.",

  "training-curriculum": "Group released courses into curricula and assign them to trainees.",

  "training-qualification": "View trainee qualification status derived from training records.",

  "approvals-pending": "Review approval requests awaiting your action.",

  "approvals-my": "Track submissions you have sent for approval.",

  "approvals-approved": "Browse requests that have been approved.",

  "approvals-rejected": "Browse requests that were declined or sent back.",

  users: "Manage Keycloak users, groups, and account status.",

  groups: "Browse Keycloak groups with roles and permission mappings.",

  settings: "Manage your profile picture and workspace preferences.",

  "help-support": "Guides, FAQs, and support contact information.",

};



const SCROLLABLE_MENUS = new Set([

  "dashboard",

  "docs",

  "training-qualification",

  "settings",

  "help-support",

]);



const ASSETS_MENUS = new Set(["parts", "docs"]);

const FORMS_MENUS = new Set(["forms-builder", "forms-saved"]);

const TRAINING_MENUS = new Set([
  "training-courses",
  "training-records",
  "training-curriculum",
  "training-qualification",
]);

const APPROVALS_MENUS = new Set([
  "approvals-pending",
  "approvals-my",
  "approvals-approved",
  "approvals-rejected",
]);

const ADMIN_MENUS = new Set(["users", "groups"]);



const ACCOUNT_MENUS = new Set(["settings", "help-support"]);



function Dashboard() {

  const [assetsOpen, setAssetsOpen] = useState(true);

  const [formsOpen, setFormsOpen] = useState(false);

  const [trainingOpen, setTrainingOpen] = useState(false);

  const [approvalsOpen, setApprovalsOpen] = useState(false);

  const [administrationOpen, setAdministrationOpen] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [activeMenu, setActiveMenu] = useState("dashboard");

  const [contentSearch, setContentSearch] = useState("");

  const [pageInsight, setPageInsight] = useState({});

  const { avatarUrl } = useProfile();



  const username = keycloak.tokenParsed?.preferred_username || "User";

  const email = keycloak.tokenParsed?.email || "";



  const activeSectionLabel = SECTION_LABELS[activeMenu] || "Dashboard";



  useEffect(() => {

    document.title = "TalonVault";

  }, []);



  const openParentForMenu = useCallback((menuId) => {

    if (ASSETS_MENUS.has(menuId)) setAssetsOpen(true);

    if (FORMS_MENUS.has(menuId)) setFormsOpen(true);

    if (TRAINING_MENUS.has(menuId)) setTrainingOpen(true);

    if (APPROVALS_MENUS.has(menuId)) setApprovalsOpen(true);

    if (ADMIN_MENUS.has(menuId)) setAdministrationOpen(true);

  }, []);



  const closeAllNavGroups = useCallback(() => {

    setAssetsOpen(false);

    setFormsOpen(false);

    setTrainingOpen(false);

    setApprovalsOpen(false);

    setAdministrationOpen(false);

  }, []);



  const toggleSidebar = useCallback(() => {

    setSidebarOpen((wasOpen) => {

      if (wasOpen) {

        closeAllNavGroups();

      } else {

        openParentForMenu(activeMenu);

      }

      return !wasOpen;

    });

  }, [activeMenu, closeAllNavGroups, openParentForMenu]);



  const createNavGroupToggle = useCallback(

    (setter) => () => {

      if (!sidebarOpen) {

        setSidebarOpen(true);

        closeAllNavGroups();

        setter(true);

        return;

      }

      setter((open) => !open);

    },

    [sidebarOpen, closeAllNavGroups]

  );



  const handleLogout = () => {

    keycloak.logout({

      redirectUri: window.location.origin,

    });

  };



  const navigateToSection = (menuId, searchText = "") => {

    if (menuId) {

      openParentForMenu(menuId);

      setActiveMenu(menuId);

    }

    setContentSearch(searchText);

  };



  const handleMenuSelect = (menuId) => {

    openParentForMenu(menuId);

    setActiveMenu(menuId);

    setContentSearch("");

    setPageInsight({});

  };



  const clearPageDetail = useCallback(() => {
    setPageInsight((prev) => {
      if (
        !prev.courseDetail &&
        !prev.auditEntity &&
        !prev.docDetail &&
        !prev.userDetail &&
        !prev.trainingDetail &&
        !prev.docFormBuilder
      ) {
        return prev;
      }
      const next = { ...prev };
      delete next.courseDetail;
      delete next.auditEntity;
      delete next.docDetail;
      delete next.userDetail;
      delete next.trainingDetail;
      delete next.docFormBuilder;
      next.selectedCount = 0;
      return next;
    });
  }, []);

  const handlePageBodyPointerDown = useCallback(
    (event) => {
      if (pageInsight.hideInsightPanel) return;
      if (event.target.closest(".page-insight")) return;
      if (event.target.closest(".app-data-grid-wrap") || event.target.closest(".ag-root")) return;
      if (event.target.closest(".modal-overlay")) return;
      clearPageDetail();
    },
    [pageInsight.hideInsightPanel, clearPageDetail]
  );

  const insightContextValue = useMemo(
    () => ({
      insight: pageInsight,
      setInsight: setPageInsight,
      clearDetail: clearPageDetail,
    }),
    [pageInsight, clearPageDetail]
  );



  const footerStatus = useMemo(() => {

    const now = new Date();

    return now.toLocaleDateString(undefined, {

      weekday: "short",

      year: "numeric",

      month: "short",

      day: "numeric",

    });

  }, []);



  const insightSection = useMemo(() => {

    if (activeMenu === "docs") return "docs";

    if (FORMS_MENUS.has(activeMenu)) return "forms";

    if (TRAINING_MENUS.has(activeMenu)) return "training";

    if (APPROVALS_MENUS.has(activeMenu)) return "approvals";

    if (ADMIN_MENUS.has(activeMenu)) return activeMenu;

    if (activeMenu === "parts") return "parts";

    if (activeMenu === "dashboard") return "dashboard";

    return activeMenu;

  }, [activeMenu]);



  return (

    <div

      className={`Dashboard ${sidebarOpen ? "" : "sidebar-collapsed"}`}

    >

      <header className="north">

        <div className="navbar-inner">

          <div className="navbar-brand">

            <button

              type="button"

              className="sidebar-toggle"

              onClick={toggleSidebar}

              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}

            >

              <span className="sidebar-toggle-icon" aria-hidden="true">☰</span>

            </button>



            <div className="brand-cluster">

              <img
                src={tvAmsIcon}
                alt=""
                className="brand-logo-mark"
                aria-hidden="true"
              />

              <div className="brand-text">

                <h1 className="brand-title">
                  <span className="brand-title-talon">Talon</span>
                  <span className="brand-title-vault">Vault</span>
                </h1>

                <span className="brand-subtitle">Asset Management System</span>

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

              avatarUrl={avatarUrl}

              onSettings={() => handleMenuSelect("settings")}

              onHelp={() => handleMenuSelect("help-support")}

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

          <SidebarItem

            label="Dashboard"

            icon={IconHome}

            active={activeMenu === "dashboard"}

            collapsed={!sidebarOpen}

            onClick={() => handleMenuSelect("dashboard")}

          />



          <SidebarNavGroup

            label="Assets"

            icon={IconFolder}

            open={assetsOpen}

            onToggle={createNavGroupToggle(setAssetsOpen)}

            collapsed={!sidebarOpen}

            active={ASSETS_MENUS.has(activeMenu)}

          />



          {sidebarOpen && assetsOpen && (

            <ul className="submenu">

              <SidebarItem

                label="Parts"

                showIcon={false}

                active={activeMenu === "parts"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("parts")}

              />

              <SidebarItem

                label="Documents"

                showIcon={false}

                active={activeMenu === "docs"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("docs")}

              />

            </ul>

          )}



          <SidebarNavGroup

            label="Forms"

            icon={IconForm}

            open={formsOpen}

            onToggle={createNavGroupToggle(setFormsOpen)}

            collapsed={!sidebarOpen}

            active={FORMS_MENUS.has(activeMenu)}

          />



          {sidebarOpen && formsOpen && (

            <ul className="submenu">

              <SidebarItem

                label="Formbuilder"

                showIcon={false}

                active={activeMenu === "forms-builder"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("forms-builder")}

              />

              <SidebarItem

                label="Saved Forms"

                showIcon={false}

                active={activeMenu === "forms-saved"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("forms-saved")}

              />

            </ul>

          )}



          <SidebarNavGroup

            label="Training"

            icon={IconGraduation}

            open={trainingOpen}

            onToggle={createNavGroupToggle(setTrainingOpen)}

            collapsed={!sidebarOpen}

            active={TRAINING_MENUS.has(activeMenu)}

          />



          {sidebarOpen && trainingOpen && (

            <ul className="submenu">

              <SidebarItem

                label="Courses"

                showIcon={false}

                active={activeMenu === "training-courses"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("training-courses")}

              />

              <SidebarItem

                label="Curriculum"

                showIcon={false}

                active={activeMenu === "training-curriculum"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("training-curriculum")}

              />

              <SidebarItem

                label="Records"

                showIcon={false}

                active={activeMenu === "training-records"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("training-records")}

              />

              <SidebarItem

                label="Qualification Matrix"

                showIcon={false}

                active={activeMenu === "training-qualification"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("training-qualification")}

              />

            </ul>

          )}



          <SidebarNavGroup

            label="Approvals"

            icon={IconClipboardCheck}

            open={approvalsOpen}

            onToggle={createNavGroupToggle(setApprovalsOpen)}

            collapsed={!sidebarOpen}

            active={APPROVALS_MENUS.has(activeMenu)}

          />



          {sidebarOpen && approvalsOpen && (

            <ul className="submenu">

              <SidebarItem

                label="Pending Requests"

                showIcon={false}

                active={activeMenu === "approvals-pending"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("approvals-pending")}

              />

              <SidebarItem

                label="My Requests"

                showIcon={false}

                active={activeMenu === "approvals-my"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("approvals-my")}

              />

              <SidebarItem

                label="Approved"

                showIcon={false}

                active={activeMenu === "approvals-approved"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("approvals-approved")}

              />

              <SidebarItem

                label="Rejected"

                showIcon={false}

                active={activeMenu === "approvals-rejected"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("approvals-rejected")}

              />

            </ul>

          )}



          <SidebarNavGroup

            label="Administration"

            icon={IconShield}

            open={administrationOpen}

            onToggle={createNavGroupToggle(setAdministrationOpen)}

            collapsed={!sidebarOpen}

            active={ADMIN_MENUS.has(activeMenu)}

          />



          {sidebarOpen && administrationOpen && (

            <ul className="submenu">

              <SidebarItem

                label="Users"

                showIcon={false}

                active={activeMenu === "users"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("users")}

              />

              <SidebarItem

                label="Groups"

                showIcon={false}

                active={activeMenu === "groups"}

                collapsed={!sidebarOpen}

                onClick={() => handleMenuSelect("groups")}

              />

            </ul>

          )}

        </ul>

      </aside>



      <main className={`center${activeMenu === "forms-builder" || pageInsight.formsEditorActive ? " center--builder" : ""}${
        pageInsight.docEditorFullBleed ? " center--doc-editor" : ""
      }`}>

        <div

          className={`page-content${

            activeMenu === "dashboard" || ACCOUNT_MENUS.has(activeMenu)

              ? " page-content--solo"

              : pageInsight.hideInsightPanel

                ? " page-content--solo page-content--full"

                : ""

          }${activeMenu === "forms-builder" || pageInsight.formsEditorActive ? " page-content--builder" : ""}${
            pageInsight.docEditorFullBleed ? " page-content--doc-editor" : ""
          }`}

        >

        {!pageInsight.hidePageHeader && (
        <div className="page-header">

          <div>

            {pageInsight.breadcrumbs?.length ? (
              <PageBreadcrumbs items={pageInsight.breadcrumbs} />
            ) : (
              <>
                <h2 className="page-title">{activeSectionLabel}</h2>

                <p className="page-subtitle">

                  {SECTION_DESCRIPTIONS[activeMenu]}

                </p>
              </>
            )}

          </div>

        </div>
        )}



        {contentSearch && (

          <div className="content-search-banner">

            Showing results for <strong>{contentSearch}</strong>

            <button type="button" onClick={() => setContentSearch("")}>

              Clear

            </button>

          </div>

        )}



        <PageInsightContext.Provider value={insightContextValue}>

          <div className="page-body" onPointerDown={handlePageBodyPointerDown}>

            <div

              className={`page-main${
                activeMenu === "forms-builder" ||
                activeMenu === "forms-saved" ||
                pageInsight.formsEditorActive ||
                (TRAINING_MENUS.has(activeMenu) &&
                  activeMenu !== "training-curriculum")
                  ? " page-main--fill"
                  : ""
              }${
                pageInsight.docEditorFullBleed ? " page-main--fill" : ""
              }${
                SCROLLABLE_MENUS.has(activeMenu) ||
                activeMenu === "training-curriculum"
                  ? " page-main--scroll"
                  : ""
              }${activeMenu === "dashboard" ? " page-main--dashboard" : ""}`}

            >

              {activeMenu === "dashboard" && <DashboardHome />}

              {activeMenu === "parts" && <Parts searchText={contentSearch} />}

              {activeMenu === "docs" && <Docs searchText={contentSearch} />}

              {activeMenu === "forms-builder" && (

                <Forms searchText={contentSearch} view="builder" />

              )}

              {activeMenu === "forms-saved" && (

                <Forms searchText={contentSearch} view="saved" />

              )}

              {activeMenu === "training-courses" && (
                <TrainingCourses searchText={contentSearch} />
              )}

              {activeMenu === "training-records" && (
                <TrainingRecords searchText={contentSearch} />
              )}

              {activeMenu === "training-curriculum" && (
                <TrainingCurriculum searchText={contentSearch} />
              )}

              {activeMenu === "training-qualification" && (
                <QualificationMatrix searchText={contentSearch} />
              )}

              {activeMenu === "approvals-pending" && (
                <Approvals view="pending" searchText={contentSearch} />
              )}

              {activeMenu === "approvals-my" && (
                <Approvals view="my" searchText={contentSearch} />
              )}

              {activeMenu === "approvals-approved" && (
                <Approvals view="approved" searchText={contentSearch} />
              )}

              {activeMenu === "approvals-rejected" && (
                <Approvals view="rejected" searchText={contentSearch} />
              )}

              {activeMenu === "users" && <Users searchText={contentSearch} />}

              {activeMenu === "groups" && <Groups searchText={contentSearch} />}

              {activeMenu === "settings" && <Settings />}

              {activeMenu === "help-support" && <HelpSupport />}

            </div>



            {activeMenu !== "dashboard" && !ACCOUNT_MENUS.has(activeMenu) && !pageInsight.hideInsightPanel && (
              <div className="page-insight-shell" onPointerDown={(e) => e.stopPropagation()}>
                <SectionInsightPanel section={insightSection} insight={pageInsight} />
              </div>
            )}

          </div>

        </PageInsightContext.Provider>

        </div>

      </main>



      <footer className="south">

        <div className="footer-section footer-left">

          <span className="footer-brand">TalonVault</span>

          <span className="footer-divider">·</span>

          <span>Asset Management System</span>

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

