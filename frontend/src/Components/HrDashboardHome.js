import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import apiClient from "../api/client";
import keycloak from "../keycloak";
import AuditTimeline from "./common/AuditTimeline";
import { useAuditHistory } from "../hooks/useAuditHistory";

import "./DashboardHome.css";
import "./HrDashboardHome.css";

const STATUS_COLORS = {
  Active: "#16a34a",
  Inactive: "#94a3b8",
};

function HrDashboardHome({ onGoToUsers }) {
  const username = keycloak.tokenParsed?.preferred_username || "there";
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  const {
    items: auditItems,
    total: auditTotal,
    loading: auditLoading,
    error: auditError,
  } = useAuditHistory({
    entityType: "user",
    limit: 5,
    offset: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setLoading(true);
      try {
        const res = await apiClient.get("/users");
        if (!cancelled) {
          setUsers(res.data || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusCounts = useMemo(() => {
    let active = 0;
    let inactive = 0;

    users.forEach((user) => {
      const status = user.status || (user.enabled ? "Active" : "Inactive");
      if (status === "Active") active += 1;
      else inactive += 1;
    });

    return { active, inactive, total: users.length };
  }, [users]);

  const statusChartData = useMemo(
    () =>
      [
        { name: "Active", value: statusCounts.active },
        { name: "Inactive", value: statusCounts.inactive },
      ].filter((row) => row.value > 0),
    [statusCounts]
  );

  const recentUsers = useMemo(
    () =>
      [...users]
        .sort((a, b) => String(a.username || "").localeCompare(String(b.username || "")))
        .slice(0, 6),
    [users]
  );

  if (loading) {
    return <p className="dashboard-home-loading">Loading HR overview</p>;
  }

  return (
    <div className="dashboard-home hr-dashboard-home">
      <section className="dashboard-welcome hr-dashboard-welcome">
        <div className="dashboard-welcome-content">
          <span className="dashboard-welcome-eyebrow">HR workspace</span>
          <h3 className="dashboard-welcome-title">
            Welcome to <span className="dashboard-welcome-brand">TalonVault</span>,{" "}
            <span className="dashboard-welcome-user">{username}</span>
          </h3>
          <p className="dashboard-welcome-desc">
            Review user accounts, track account changes, and work across the user, documents,
            forms, and training areas relevant to HR.
          </p>
        </div>
        {onGoToUsers && (
          <button type="button" className="parts-btn primary hr-dashboard-cta" onClick={onGoToUsers}>
            Manage users
          </button>
        )}
      </section>

      <div className="dashboard-section">
        <h4 className="dashboard-section-title">User directory</h4>
        <div className="dashboard-kpi-grid hr-dashboard-kpi-grid">
          <article className="dashboard-kpi-card dashboard-kpi-card--users">
            <p className="dashboard-kpi-label">Total users</p>
            <p className="dashboard-kpi-value">{statusCounts.total}</p>
            <p className="dashboard-kpi-meta">Accounts in Keycloak</p>
          </article>
          <article className="dashboard-kpi-card dashboard-kpi-card--parts">
            <p className="dashboard-kpi-label">Active</p>
            <p className="dashboard-kpi-value">{statusCounts.active}</p>
            <p className="dashboard-kpi-meta">Enabled accounts</p>
          </article>
          <article className="dashboard-kpi-card dashboard-kpi-card--overdue">
            <p className="dashboard-kpi-label">Inactive</p>
            <p className="dashboard-kpi-value">{statusCounts.inactive}</p>
            <p className="dashboard-kpi-meta">Disabled accounts</p>
          </article>
        </div>
      </div>

      <div className="dashboard-section dashboard-section--charts">
        <h4 className="dashboard-section-title">Overview</h4>
        <div className="dashboard-charts-grid hr-dashboard-charts-grid">
          <section className="dashboard-chart-card">
            <div className="dashboard-chart-header">
              <h4>Account status</h4>
              <p className="dashboard-chart-subtitle">Active vs inactive users</p>
            </div>
            {statusChartData.length === 0 ? (
              <div className="dashboard-chart-empty">No users found yet.</div>
            ) : (
              <div className="dashboard-chart-body">
                <ResponsiveContainer width="100%" height={260} debounce={50}>
                  <PieChart margin={{ top: 8, right: 12, bottom: 36, left: 12 }}>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="44%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={2}
                    >
                      {statusChartData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="dashboard-chart-card hr-dashboard-recent-card">
            <div className="dashboard-chart-header">
              <h4>Directory snapshot</h4>
              <p className="dashboard-chart-subtitle">Sample of user accounts</p>
            </div>
            {recentUsers.length === 0 ? (
              <div className="dashboard-chart-empty">No users to display.</div>
            ) : (
              <ul className="hr-dashboard-user-list">
                {recentUsers.map((user) => (
                  <li key={user.id}>
                    <div>
                      <strong>{user.username}</strong>
                      <span>{user.email || "No email"}</span>
                    </div>
                    <span
                      className={`hr-dashboard-status-pill ${
                        (user.status || (user.enabled ? "Active" : "Inactive")) === "Active"
                          ? "is-active"
                          : "is-inactive"
                      }`}
                    >
                      {user.status || (user.enabled ? "Active" : "Inactive")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-heading">
          <h4 className="dashboard-section-title">Recent user activity</h4>
        </div>
        <section className="dashboard-audit-card">
          {auditError ? (
            <p className="dashboard-audit-error">{auditError}</p>
          ) : (
            <AuditTimeline
              items={auditItems}
              loading={auditLoading}
              compact
              emptyMessage="No user changes recorded yet."
            />
          )}
          {!auditLoading && auditTotal > 5 && (
            <p className="hr-dashboard-audit-note">
              Showing the 5 most recent user events ({auditTotal} total).
            </p>
          )}
        </section>
      </div>

      <div className="dashboard-section">
        <h4 className="dashboard-section-title">Quick reference</h4>
        <div className="dashboard-summary-grid">
          <section className="dashboard-summary-card">
            <span className="dashboard-summary-icon dashboard-summary-icon--users" aria-hidden="true">
              ◉
            </span>
            <div className="dashboard-summary-body">
              <h4>User management</h4>
              <p>
                Open Users under Administration to edit profiles, reset passwords, update email
                addresses, and change account status.
              </p>
            </div>
          </section>
          <section className="dashboard-summary-card">
            <span className="dashboard-summary-icon dashboard-summary-icon--workflow" aria-hidden="true">
              ✓
            </span>
            <div className="dashboard-summary-body">
              <h4>Your permissions</h4>
              <p>
                HR can add, edit, and remove user accounts, review documents and forms, and
                create training records. Groups, parts, and approvals remain outside the HR role.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default HrDashboardHome;
