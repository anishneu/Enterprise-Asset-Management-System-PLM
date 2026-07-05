import "./HelpSupport.css";
import "./AccountPages.css";

const QUICK_LINKS = [
  {
    title: "Getting started",
    body: "Use the sidebar to navigate modules. The dashboard summarizes parts, documents, forms, training, and approvals.",
  },
  {
    title: "PLM workflow",
    body: "Forms and documents follow Draft → Pending Approval → Released. Use Approvals to review items assigned to you.",
  },
  {
    title: "Training",
    body: "Curriculum lists released modules. Records track trainee assignments with Pending, In Progress, and Completed states.",
  },
  {
    title: "User access",
    body: "Accounts and groups are managed through Keycloak. Contact your administrator for role or permission changes.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Why can’t I edit a form or document?",
    a: "Only Draft items can be edited. Released records must be revised first, which archives the current revision and opens a new Draft.",
  },
  {
    q: "How do approvals work?",
    a: "Submit a Draft item for review. Approvers see it in Pending Requests and can approve or reject with comments.",
  },
  {
    q: "Where is my profile picture stored?",
    a: "Profile pictures are saved locally in your browser for your TalonVault session. They are not synced to Keycloak.",
  },
  {
    q: "Who do I contact for technical issues?",
    a: "Reach your IT administrator or the TalonVault support channel listed below for outages, access, or data questions.",
  },
];

function HelpSupport() {
  return (
    <div className="account-page help-page">
      <section className="account-card help-hero">
        <div>
          <span className="help-hero-eyebrow">Help Center</span>
          <h3>Help &amp; Support</h3>
          <p>
            Guidance for using TalonVault Asset Management System — workflows,
            training, and account access.
          </p>
        </div>
        <div className="help-hero-contact">
          <p className="help-contact-label">Support</p>
          <a href="mailto:support@talonvault.com" className="help-contact-link">
            support@talonvault.com
          </a>
          <p className="help-contact-meta">Mon–Fri · 8:00–17:00 (local time)</p>
        </div>
      </section>

      <div className="help-grid">
        <section className="account-card">
          <div className="account-card-header">
            <h3>Quick guides</h3>
            <p>Common tasks across the workspace.</p>
          </div>
          <ul className="help-link-list">
            {QUICK_LINKS.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="account-card">
          <div className="account-card-header">
            <h3>Resources</h3>
            <p>Documentation and policy references.</p>
          </div>
          <ul className="help-resource-list">
            <li>
              <span className="help-resource-title">Quality manual</span>
              <span className="help-resource-meta">Document control · §4.2</span>
            </li>
            <li>
              <span className="help-resource-title">Training matrix</span>
              <span className="help-resource-meta">Competency requirements</span>
            </li>
            <li>
              <span className="help-resource-title">Approval SOP</span>
              <span className="help-resource-meta">Release &amp; revision process</span>
            </li>
            <li>
              <span className="help-resource-title">Keycloak account guide</span>
              <span className="help-resource-meta">Password &amp; SSO</span>
            </li>
          </ul>
        </section>
      </div>

      <section className="account-card">
        <div className="account-card-header">
          <h3>Frequently asked questions</h3>
          <p>Answers to common TalonVault questions.</p>
        </div>
        <div className="help-faq-list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="help-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="account-card help-status-card">
        <div className="account-card-header">
          <h3>System status</h3>
          <p>Current workspace health.</p>
        </div>
        <div className="help-status-row">
          <span className="help-status-pill help-status-pill--ok">All systems operational</span>
          <span className="help-status-meta">Application v1.0 · Secure Keycloak session</span>
        </div>
      </section>
    </div>
  );
}

export default HelpSupport;
