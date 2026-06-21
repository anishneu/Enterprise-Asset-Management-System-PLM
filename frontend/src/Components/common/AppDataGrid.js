import { useMemo } from "react";
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
  height = 550,
  context,
  rowSelection,
  onSelectionChanged,
  onGridReady,
  getRowId,
  loading = false,
  overlayNoRowsTemplate = "<span>No records found.</span>",
}) {
  const resolvedGetRowId = useMemo(
    () => getRowId || ((params) => String(params.data.id)),
    [getRowId]
  );

  return (
    <div
      className="ag-theme-quartz app-data-grid"
      style={{ height, width: "100%" }}
    >
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        context={context}
        pagination
        paginationPageSize={10}
        paginationPageSizeSelector={[10, 20, 50]}
        animateRows
        getRowId={resolvedGetRowId}
        rowSelection={rowSelection}
        onSelectionChanged={onSelectionChanged}
        onGridReady={onGridReady}
        loading={loading}
        overlayNoRowsTemplate={overlayNoRowsTemplate}
        suppressCellFocus
      />
    </div>
  );
}

export default AppDataGrid;
