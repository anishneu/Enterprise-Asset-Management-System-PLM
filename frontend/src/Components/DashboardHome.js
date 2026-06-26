import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import apiClient from "../api/client";
import keycloak from "../keycloak";
import {
  buildWorkflowCompareData,
  countOverdueTraining,
  countTrainingCompletion,
  countUnassignedTraining,
} from "../utils/dashboardStats";

import "./DashboardHome.css";

const TRAINING_COLORS = {
  Pending: "#94a3b8",
  "In Progress": "#f59e0b",
  Completed: "#16a34a",
};

const APPROVAL_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#64748b"];
const CHART_HEIGHT = 300;

const WORKFLOW_AXIS_LABELS = {
  Draft: "Draft",
  "Pending Approval": "Pending",
  Released: "Released",
  Obsolete: "Obsolete",
};

const CHART_MARGIN = {
  withLegend: { top: 12, right: 16, left: 8, bottom: 64 },
  compact: { top: 12, right: 16, left: 8, bottom: 36 },
  horizontal: { top: 8, right: 20, left: 4, bottom: 8 },
  pie: { top: 8, right: 12, bottom: 36, left: 12 },
};

function ChartLegend() {
  return (
    <Legend
      verticalAlign="bottom"
      align="center"
      iconType="circle"
      iconSize={8}
      wrapperStyle={{
        paddingTop: 10,
        fontSize: 12,
        lineHeight: "18px",
      }}
    />
  );
}

function DashboardChart({ children, empty, hasData }) {
  if (!hasData) {
    return <div className="dashboard-chart-empty">{empty}</div>;
  }

  return (
    <div className="dashboard-chart-body">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT} debounce={50}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const displayLabel = payload[0]?.payload?.status || label;

  return (
    <div className="dashboard-chart-tooltip">
      {displayLabel && <strong>{displayLabel}</strong>}
      {payload.map((entry) => (
        <div key={entry.name}>
          {entry.name}: {entry.value}
        </div>
      ))}
    </div>
  );
}

function DashboardHome() {
  const username = keycloak.tokenParsed?.preferred_username || "there";
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    parts: [],
    docs: [],
    forms: [],
    training: [],
    users: [],
    approvalsPending: [],
    approvalsMy: [],
    approvalsApproved: [],
    approvalsRejected: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      const results = await Promise.allSettled([
        apiClient.get("/parts"),
        apiClient.get("/docs"),
        apiClient.get("/forms/"),
        apiClient.get("/training"),
        apiClient.get("/users"),
        apiClient.get("/approvals", { params: { view: "pending" } }),
        apiClient.get("/approvals", { params: { view: "my" } }),
        apiClient.get("/approvals", { params: { view: "approved" } }),
        apiClient.get("/approvals", { params: { view: "rejected" } }),
      ]);

      if (cancelled) return;

      const pick = (index) =>
        results[index].status === "fulfilled" ? results[index].value.data || [] : [];

      setStats({
        parts: pick(0),
        docs: pick(1),
        forms: pick(2),
        training: pick(3),
        users: pick(4),
        approvalsPending: pick(5),
        approvalsMy: pick(6),
        approvalsApproved: pick(7),
        approvalsRejected: pick(8),
      });
      setLoading(false);
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const workflowChartData = useMemo(
    () =>
      buildWorkflowCompareData(stats.forms, stats.docs).map((row) => ({
        ...row,
        label: WORKFLOW_AXIS_LABELS[row.status] || row.status,
      })),
    [stats.forms, stats.docs]
  );

  const trainingChartData = useMemo(
    () => countTrainingCompletion(stats.training),
    [stats.training]
  );

  const approvalsChartData = useMemo(
    () => [
      { name: "Pending", value: stats.approvalsPending.length },
      { name: "My requests", value: stats.approvalsMy.length },
      { name: "Approved", value: stats.approvalsApproved.length },
      { name: "Rejected", value: stats.approvalsRejected.length },
    ],
    [
      stats.approvalsPending,
      stats.approvalsMy,
      stats.approvalsApproved,
      stats.approvalsRejected,
    ]
  );

  const hasWorkflowData = stats.forms.length > 0 || stats.docs.length > 0;
  const hasTrainingData = stats.training.length > 0;

  const inventoryChartData = useMemo(
    () => [
      { name: "Parts", count: stats.parts.length },
      { name: "Documents", count: stats.docs.length },
      { name: "Forms", count: stats.forms.length },
      { name: "Training", count: stats.training.length },
      { name: "Users", count: stats.users.length },
    ],
    [stats.parts, stats.docs, stats.forms, stats.training, stats.users]
  );

  const overdueTraining = useMemo(
    () => countOverdueTraining(stats.training),
    [stats.training]
  );

  const unassignedTraining = useMemo(
    () => countUnassignedTraining(stats.training),
    [stats.training]
  );

  const pendingApprovals = stats.approvalsPending.length;

  if (loading) {
    return <p className="dashboard-home-loading">Loading workspace overview</p>;
  }

  return (
    <div className="dashboard-home">
      <section className="dashboard-welcome">
        <div className="dashboard-welcome-content">
          <span className="dashboard-welcome-eyebrow">Workspace overview</span>
          <h3 className="dashboard-welcome-title">
            Welcome to <span className="dashboard-welcome-brand">TalonVault</span>,{" "}
            <span className="dashboard-welcome-user">{username}</span>
          </h3>
          <p className="dashboard-welcome-desc">
            Use the navigation to manage assets, forms, training assignments, and users.
          </p>
        </div>
        {(pendingApprovals > 0 || overdueTraining > 0) && (
          <div className="dashboard-welcome-alerts">
            {pendingApprovals > 0 && (
              <span className="dashboard-welcome-alert dashboard-welcome-alert--accent">
                <strong>{pendingApprovals}</strong> pending approval
                {pendingApprovals !== 1 ? "s" : ""}
              </span>
            )}
            {overdueTraining > 0 && (
              <span className="dashboard-welcome-alert dashboard-welcome-alert--danger">
                <strong>{overdueTraining}</strong> overdue training
              </span>
            )}
          </div>
        )}
      </section>

      <div className="dashboard-section dashboard-section--charts">
        <h4 className="dashboard-section-title">Analytics</h4>
        <div className="dashboard-charts-grid">
          <section className="dashboard-chart-card">
            <div className="dashboard-chart-header">
              <h4>Workflow status</h4>
              <p className="dashboard-chart-subtitle">
                Forms and documents by PLM lifecycle state
              </p>
            </div>
            <DashboardChart
              hasData={hasWorkflowData}
              empty="No forms or documents yet."
            >
              <BarChart data={workflowChartData} margin={CHART_MARGIN.withLegend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  height={48}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <Tooltip content={<ChartTooltip />} />
                <ChartLegend />
                <Bar dataKey="Forms" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={48} />
                <Bar dataKey="Documents" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </DashboardChart>
          </section>

          <section className="dashboard-chart-card">
            <div className="dashboard-chart-header">
              <h4>Training completion</h4>
              <p className="dashboard-chart-subtitle">
                Assignment progress across all training records
              </p>
            </div>
            <DashboardChart
              hasData={hasTrainingData}
              empty="No training records yet."
            >
              <PieChart margin={CHART_MARGIN.pie}>
                <Pie
                  data={trainingChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="44%"
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={2}
                >
                  {trainingChartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={TRAINING_COLORS[entry.name] || "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <ChartLegend />
              </PieChart>
            </DashboardChart>
          </section>

          <section className="dashboard-chart-card">
            <div className="dashboard-chart-header">
              <h4>Approvals queue</h4>
              <p className="dashboard-chart-subtitle">Your approval activity summary</p>
            </div>
            <DashboardChart hasData empty="No approval requests yet.">
              <BarChart
                data={approvalsChartData}
                layout="vertical"
                margin={CHART_MARGIN.horizontal}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={112}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {approvalsChartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={APPROVAL_COLORS[index % APPROVAL_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </DashboardChart>
          </section>

          <section className="dashboard-chart-card">
            <div className="dashboard-chart-header">
              <h4>Workspace inventory</h4>
              <p className="dashboard-chart-subtitle">Record counts across modules</p>
            </div>
            <DashboardChart hasData>
              <BarChart data={inventoryChartData} margin={CHART_MARGIN.compact}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  height={52}
                  angle={-18}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={52} />
              </BarChart>
            </DashboardChart>
          </section>
        </div>
      </div>

      <div className="dashboard-section">
        <h4 className="dashboard-section-title">At a glance</h4>
        <div className="dashboard-kpi-grid">
        <article className="dashboard-kpi-card dashboard-kpi-card--parts">
          <p className="dashboard-kpi-label">Parts</p>
          <p className="dashboard-kpi-value">{stats.parts.length}</p>
          <p className="dashboard-kpi-meta">Inventory records</p>
        </article>
        <article className="dashboard-kpi-card dashboard-kpi-card--docs">
          <p className="dashboard-kpi-label">Documents</p>
          <p className="dashboard-kpi-value">{stats.docs.length}</p>
          <p className="dashboard-kpi-meta">Controlled documents</p>
        </article>
        <article className="dashboard-kpi-card dashboard-kpi-card--forms">
          <p className="dashboard-kpi-label">Forms</p>
          <p className="dashboard-kpi-value">{stats.forms.length}</p>
          <p className="dashboard-kpi-meta">Form templates</p>
        </article>
        <article className="dashboard-kpi-card dashboard-kpi-card--training">
          <p className="dashboard-kpi-label">Training</p>
          <p className="dashboard-kpi-value">{stats.training.length}</p>
          <p className="dashboard-kpi-meta">
            {unassignedTraining > 0
              ? `${unassignedTraining} without trainee`
              : "Assignment records"}
          </p>
        </article>
        <article
          className={`dashboard-kpi-card dashboard-kpi-card--approvals${
            pendingApprovals > 0 ? " dashboard-kpi-card--accent" : ""
          }`}
        >
          <p className="dashboard-kpi-label">Pending approvals</p>
          <p className="dashboard-kpi-value">{pendingApprovals}</p>
          <p className="dashboard-kpi-meta">Awaiting your action</p>
        </article>
        <article
          className={`dashboard-kpi-card dashboard-kpi-card--overdue${
            overdueTraining > 0 ? " dashboard-kpi-card--alert" : ""
          }`}
        >
          <p className="dashboard-kpi-label">Overdue training</p>
          <p className="dashboard-kpi-value">{overdueTraining}</p>
          <p className="dashboard-kpi-meta">Past due date</p>
        </article>
        </div>
      </div>

      <div className="dashboard-section">
        <h4 className="dashboard-section-title">Quick reference</h4>
        <div className="dashboard-summary-grid">
        <section className="dashboard-summary-card">
          <span className="dashboard-summary-icon dashboard-summary-icon--workflow" aria-hidden="true">⟳</span>
          <div className="dashboard-summary-body">
          <h4>PLM workflow</h4>
          <p>
            Forms and documents move through Draft → Pending Approval → Released. Use
            Approvals to action pending items.
          </p>
          </div>
        </section>
        <section className="dashboard-summary-card">
          <span className="dashboard-summary-icon dashboard-summary-icon--training" aria-hidden="true">◎</span>
          <div className="dashboard-summary-body">
          <h4>Training lifecycle</h4>
          <p>
            Curriculum defines released modules; Records track Pending → In Progress →
            Completed per trainee.
          </p>
          </div>
        </section>
        <section className="dashboard-summary-card">
          <span className="dashboard-summary-icon dashboard-summary-icon--revision" aria-hidden="true">↻</span>
          <div className="dashboard-summary-body">
          <h4>Revision control</h4>
          <p>
            Released items are revised to the next revision (A→B, 1→2) and return to Draft
            for editing.
          </p>
          </div>
        </section>
        <section className="dashboard-summary-card">
          <span className="dashboard-summary-icon dashboard-summary-icon--users" aria-hidden="true">◉</span>
          <div className="dashboard-summary-body">
          <h4>Users &amp; groups</h4>
          <p>
            {stats.users.length} users managed via Keycloak. Assign trainees and approvers
            from the user directory.
          </p>
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}

export default DashboardHome;
