import { useCallback, useEffect, useMemo, useState } from "react";

import { Grid, GridColumn, GridNoRecords } from "@progress/kendo-react-grid";
import "@progress/kendo-theme-default/dist/all.css";

import apiClient from "../api/client";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { useAppFeedback } from "../context/AppFeedbackContext";
import { filterBySearch } from "../utils/filterBySearch";

import "./QualificationMatrix.css";
import "./Training.css";

const PAGE_STATE = {
  skip: 0,
  take: 20,
  sort: [{ field: "user_display", dir: "asc" }],
};

function courseFieldName(courseId) {
  return `course_${courseId}`;
}

function statusSymbol(status) {
  if (!status) return "—";
  if (status === "Completed") return "✔";
  if (status === "Pending") return "…";
  return "!";
}

function compareValues(a, b) {
  const left = a ?? "";
  const right = b ?? "";
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right), undefined, { numeric: true });
}

function pageMatrixRows(rows, { skip, take, sort }) {
  let next = [...rows];

  if (sort?.length) {
    const { field, dir } = sort[0];
    next.sort((a, b) => compareValues(a[field], b[field]));
    if (dir === "desc") {
      next.reverse();
    }
  }

  const total = next.length;
  const data = next.slice(skip, skip + take).map((row, index) => ({
    ...row,
    serial: skip + index + 1,
  }));

  return { data, total };
}

function QualificationMatrix({ searchText = "" }) {
  const { setInsight } = usePageInsight();
  const feedback = useAppFeedback();
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataState, setDataState] = useState(PAGE_STATE);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/training-plm/qualification-matrix");
      setMatrix(res.data || []);
    } catch (err) {
      feedback.error("Failed to load qualification matrix.");
    } finally {
      setLoading(false);
    }
  }, [feedback]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  useEffect(() => {
    setDataState((prev) => ({ ...prev, skip: 0 }));
  }, [searchText]);

  const filtered = useMemo(
    () =>
      filterBySearch(matrix, searchText, ["user_display", "user_id"]).filter((row) =>
        Boolean((row.user_display || "").trim())
      ),
    [matrix, searchText]
  );

  const courseColumns = useMemo(() => {
    const map = new Map();
    matrix.forEach((row) => {
      row.courses?.forEach((course) => {
        if (!map.has(course.course_id)) {
          map.set(course.course_id, course);
        }
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.course_code.localeCompare(b.course_code)
    );
  }, [matrix]);

  const gridRows = useMemo(
    () =>
      filtered.map((row) => {
        const flat = {
          user_id: row.user_id,
          user_display: row.user_display?.trim() || row.user_id || "—",
          completion_percent: row.completion_percent ?? 0,
          completion_label: `${row.completion_percent ?? 0}%`,
        };

        courseColumns.forEach((course) => {
          const field = courseFieldName(course.course_id);
          const match = row.courses?.find((item) => item.course_id === course.course_id);
          flat[field] = statusSymbol(match?.status);
        });

        return flat;
      }),
    [filtered, courseColumns]
  );

  const gridData = useMemo(
    () => pageMatrixRows(gridRows, dataState),
    [gridRows, dataState]
  );

  useEffect(() => {
    setInsight({
      recordCount: filtered.length,
      selectedCount: 0,
      extra: { Courses: courseColumns.length },
    });
  }, [filtered.length, courseColumns.length, setInsight]);

  const handleDataStateChange = (event) => {
    setDataState(event.dataState);
  };

  return (
    <div className="training-plm-page qualification-matrix-page grid-page">
      <div className="training-plm-toolbar">
        <div>
          <h3 className="training-plm-title">Qualification matrix</h3>
          <p className="training-plm-lead">
            Trainee competency status derived from training records. Course cells: ✔ completed,
            … pending, ! other, — not assigned.
          </p>
        </div>
        <button type="button" className="parts-btn" onClick={fetchMatrix} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="qualification-kendo-grid-wrap">
        <Grid
          className="qualification-kendo-grid"
          data={gridData}
          dataItemKey="user_id"
          sortable={{ allowUnsort: true, mode: "single" }}
          pageable={{
            buttonCount: 5,
            pageSizes: [10, 20, 50, 100],
            info: true,
            previousNext: true,
          }}
          scrollable="scrollable"
          size="small"
          style={{ height: "min(68vh, 680px)" }}
          showLoader={loading}
          loader={<span className="qualification-kendo-loading">Loading matrix…</span>}
          onDataStateChange={handleDataStateChange}
          {...dataState}
        >
          <GridColumn field="serial" title="#" width="56px" sortable={false} />
          <GridColumn field="user_display" title="Trainee" width="180px" />
          <GridColumn field="completion_label" title="Completion" width="112px" />
          {courseColumns.map((course) => (
            <GridColumn
              key={course.course_id}
              field={courseFieldName(course.course_id)}
              title={course.course_code}
              width="84px"
            />
          ))}
          <GridNoRecords>
            No qualification data yet. Release a curriculum or course, assign trainees, then return
            here.
          </GridNoRecords>
        </Grid>
      </div>
    </div>
  );
}

export default QualificationMatrix;
