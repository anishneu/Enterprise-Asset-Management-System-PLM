function PageBreadcrumbs({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav className="page-breadcrumbs" aria-label="Breadcrumb">
      <ol className="page-breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="page-breadcrumbs-item">
              {!isLast && item.onClick ? (
                <button type="button" className="page-breadcrumbs-link" onClick={item.onClick}>
                  {item.label}
                </button>
              ) : (
                <span
                  className={isLast ? "page-breadcrumbs-current" : "page-breadcrumbs-text"}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="page-breadcrumbs-sep" aria-hidden="true">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default PageBreadcrumbs;
