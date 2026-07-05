function HyperlinkCell({ value }) {
  const href = (value || "").trim();
  if (!href) return <span className="forms-muted">—</span>;

  return (
    <a className="workflow-link" href={href} target="_blank" rel="noreferrer">
      {href}
    </a>
  );
}

export default HyperlinkCell;
