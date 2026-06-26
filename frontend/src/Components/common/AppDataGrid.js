import { useCallback, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";

export const defaultColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  flex: 1,
  minWidth: 120,
};

function AppDataGrid({
  rowData,
  columnDefs,
  context,
  rowSelection,
  onSelectionChanged,
  onRowClicked,
  getRowClass,
  onGridReady,
  getRowId,
  isFullWidthRow,
  fullWidthCellRenderer,
  getRowHeight,
  isRowSelectable,
  loading = false,
  overlayNoRowsTemplate = "<span>No records found.</span>",
  showToolbar = true,
  searchPlaceholder = "Search table...",
  toolbarActions = null,
}) {
  const [quickFilter, setQuickFilter] = useState("");
  const gridApiRef = useRef(null);

  const resolvedGetRowId = useMemo(
    () => getRowId || ((params) => String(params.data.id)),
    [getRowId]
  );

  const handleClearFilters = useCallback(() => {
    setQuickFilter("");
    const api = gridApiRef.current;
    if (!api) return;
    api.setFilterModel(null);
    api.setGridOption("quickFilterText", "");
  }, []);

  const handleGridReady = useCallback(
    (event) => {
      gridApiRef.current = event.api;
      onGridReady?.(event);
    },
    [onGridReady]
  );

  const resolvedRowSelection = useMemo(() => {
    if (!rowSelection) return undefined;
    if (!isRowSelectable) return rowSelection;
    return { ...rowSelection, isRowSelectable };
  }, [rowSelection, isRowSelectable]);

  return (
    <div className="app-data-grid-wrap">
      {showToolbar && (
        <div className="grid-table-toolbar">
          <div className="grid-table-toolbar-filters">
            <input
              type="search"
              className="grid-table-search"
              placeholder={searchPlaceholder}
              value={quickFilter}
              onChange={(event) => setQuickFilter(event.target.value)}
              aria-label={searchPlaceholder}
            />
            <button
              type="button"
              className="parts-btn"
              onClick={handleClearFilters}
            >
              Clear filters
            </button>
          </div>
          {toolbarActions && (
            <>
              <div className="grid-table-toolbar-divider" aria-hidden="true" />
              <div className="grid-table-toolbar-actions">{toolbarActions}</div>
            </>
          )}
        </div>
      )}

      <div className="ag-theme-quartz app-data-grid app-data-grid--fill">
        <AgGridReact
          theme="legacy"
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          context={context}
          domLayout="normal"
          pagination
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
          animateRows
          getRowId={resolvedGetRowId}
          rowSelection={resolvedRowSelection}
          onSelectionChanged={onSelectionChanged}
          onRowClicked={onRowClicked}
          getRowClass={getRowClass}
          onGridReady={handleGridReady}
          loading={loading}
          overlayNoRowsTemplate={overlayNoRowsTemplate}
          suppressCellFocus
          quickFilterText={quickFilter}
          rowHeight={52}
          headerHeight={48}
          isFullWidthRow={isFullWidthRow}
          fullWidthCellRenderer={fullWidthCellRenderer}
          getRowHeight={getRowHeight}
          embedFullWidthRows
        />
      </div>
    </div>
  );
}

export default AppDataGrid;
