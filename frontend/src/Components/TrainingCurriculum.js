import { useCallback, useEffect, useMemo, useState } from "react";

import apiClient from "../api/client";
import AppDataGrid from "./common/AppDataGrid";
import TagMultiSelect from "./common/TagMultiSelect";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { useAppFeedback } from "../context/AppFeedbackContext";
import WorkflowStatusBadge from "./common/WorkflowStatusBadge";
import { filterBySearch } from "../utils/filterBySearch";
import { courseStatusClass, formatTrainingDateTime } from "../constants/trainingPlm";

import "./Docs.css";
import "./Training.css";

const emptyCurriculum = {
  curriculum_code: "",
  curriculum_name: "",
  description: "",
  revision: "A",
};

function TrainingCurriculum({ searchText = "" }) {
  const { setInsight } = usePageInsight();
  const feedback = useAppFeedback();

  const [curricula, setCurricula] = useState([]);
  const [releasedCourses, setReleasedCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState(emptyCurriculum);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserIds, setAssignUserIds] = useState([]);
  const [assignGroupIds, setAssignGroupIds] = useState([]);
  const [assignDueDate, setAssignDueDate] = useState("");
  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  const selected = useMemo(
    () => curricula.find((item) => item.id === selectedId) || null,
    [curricula, selectedId]
  );

  const availableCourses = useMemo(() => {
    const inCurriculum = new Set(selectedCourses.map((c) => c.course_id));
    return releasedCourses.filter((course) => !inCurriculum.has(course.id));
  }, [releasedCourses, selectedCourses]);

  const filtered = useMemo(
    () =>
      filterBySearch(curricula, searchText, [
        "curriculum_code",
        "curriculum_name",
        "revision",
        "status",
      ]),
    [curricula, searchText]
  );

  const fetchCurricula = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/training-plm/curricula");
      setCurricula(res.data || []);
    } catch (err) {
      feedback.error("Failed to load curricula.");
    } finally {
      setLoading(false);
    }
  }, [feedback]);

  useEffect(() => {
    if (curricula.length > 0 && selectedId == null) {
      setSelectedId(curricula[0].id);
    }
  }, [curricula, selectedId]);

  const fetchReleasedCourses = useCallback(async () => {
    try {
      const res = await apiClient.get("/training-plm/courses", {
        params: { released_only: true },
      });
      setReleasedCourses(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const [usersRes, groupsRes] = await Promise.all([
        apiClient.get("/users"),
        apiClient.get("/groups"),
      ]);
      setUsers(usersRes.data || []);
      setGroups(groupsRes.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadCurriculumDetail = useCallback(async (curriculumId) => {
    const res = await apiClient.get(`/training-plm/curricula/${curriculumId}`);
    setSelectedCourses(res.data?.courses || []);
    return res.data;
  }, []);

  useEffect(() => {
    fetchCurricula();
    fetchReleasedCourses();
    fetchUsers();
  }, [fetchCurricula, fetchReleasedCourses, fetchUsers]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedCourses([]);
      setAssignments([]);
      return;
    }
    loadCurriculumDetail(selectedId).catch(console.error);
  }, [selectedId, loadCurriculumDetail]);

  const fetchAssignments = useCallback(async (curriculumId) => {
    setAssignmentsLoading(true);
    try {
      const res = await apiClient.get("/training-plm/assignments", {
        params: { curriculum_id: curriculumId },
      });
      setAssignments(res.data || []);
    } catch (err) {
      console.error(err);
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetchAssignments(selectedId);
  }, [selectedId, fetchAssignments]);

  useEffect(() => {
    setInsight({
      hideInsightPanel: true,
      recordCount: filtered.length,
      selectedCount: selectedId ? 1 : 0,
    });
    return () => setInsight({ hideInsightPanel: false });
  }, [filtered.length, selectedId, setInsight]);

  const createCurriculum = async () => {
    if (!form.curriculum_code.trim() || !form.curriculum_name.trim()) {
      feedback.error("Curriculum code and name are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.post("/training-plm/curricula", {
        curriculum_code: form.curriculum_code.trim(),
        curriculum_name: form.curriculum_name.trim(),
        description: form.description.trim() || null,
        revision: form.revision.trim() || "A",
      });
      setCreateModal(false);
      setForm(emptyCurriculum);
      await fetchCurricula();
      setSelectedId(res.data.id);
      setSelectedCourses([]);
      feedback.success("Curriculum created.");
    } catch (err) {
      feedback.error(err.response?.data?.detail || "Failed to create curriculum.");
    } finally {
      setSaving(false);
    }
  };

  const addCourse = (course) => {
    setSelectedCourses((prev) => [
      ...prev,
      {
        course_id: course.id,
        sequence_order: prev.length,
        mandatory: true,
        course_code: course.course_code,
        course_name: course.course_name,
        course_revision: course.revision,
      },
    ]);
  };

  const removeCourse = (courseId) => {
    setSelectedCourses((prev) => prev.filter((item) => item.course_id !== courseId));
  };

  const saveCourses = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiClient.put(`/training-plm/curricula/${selected.id}/courses`, {
        courses: selectedCourses.map((item, index) => ({
          course_id: item.course_id,
          sequence_order: index,
          mandatory: item.mandatory !== false,
        })),
      });
      await loadCurriculumDetail(selected.id);
      feedback.success("Curriculum courses saved.");
    } catch (err) {
      feedback.error(err.response?.data?.detail || "Failed to save curriculum courses.");
    } finally {
      setSaving(false);
    }
  };

  const releaseCurriculum = async () => {
    if (!selected) return;
    try {
      await apiClient.post(`/training-plm/curricula/${selected.id}/release`);
      await fetchCurricula();
      await loadCurriculumDetail(selected.id);
      feedback.success("Curriculum released.");
    } catch (err) {
      feedback.error(err.response?.data?.detail || "Failed to release curriculum.");
    }
  };

  const assignCurriculum = async () => {
    if (!selected) return;
    if (assignUserIds.length === 0 && assignGroupIds.length === 0) {
      feedback.error("Select at least one user or group.");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post("/training-plm/assignments", {
        curriculum_id: selected.id,
        user_ids: assignUserIds,
        group_ids: assignGroupIds,
        due_date: assignDueDate ? new Date(assignDueDate).toISOString() : null,
      });
      setAssignOpen(false);
      setAssignUserIds([]);
      setAssignGroupIds([]);
      setAssignDueDate("");
      await fetchAssignments(selected.id);
      feedback.success("Curriculum assigned. Training records were created.");
    } catch (err) {
      feedback.error(err.response?.data?.detail || "Failed to assign curriculum.");
    } finally {
      setSaving(false);
    }
  };

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user.id,
        label: user.username || user.name || user.id,
      })),
    [users]
  );

  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({
        value: group.id,
        label: group.name || group.id,
      })),
    [groups]
  );

  const isDraft = selected?.status === "Draft";

  const assignmentColumnDefs = useMemo(
    () => [
      {
        field: "user_display",
        headerName: "Trainee",
        flex: 1,
        minWidth: 160,
        valueGetter: (params) => {
          const row = params.data;
          if (!row) return "—";
          const user = users.find((item) => item.id === row.user_id);
          return user?.username || user?.name || row.user_id || "—";
        },
      },
      {
        field: "assigned_date",
        headerName: "Assigned",
        flex: 0,
        width: 168,
        minWidth: 156,
        cellClass: "training-datetime-cell",
        valueFormatter: (params) => formatTrainingDateTime(params.value),
        tooltipValueGetter: (params) => formatTrainingDateTime(params.value),
      },
      {
        field: "due_date",
        headerName: "Due date",
        flex: 0,
        width: 168,
        minWidth: 156,
        cellClass: "training-datetime-cell",
        valueFormatter: (params) => formatTrainingDateTime(params.value),
        tooltipValueGetter: (params) => formatTrainingDateTime(params.value),
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0,
        width: 120,
        minWidth: 110,
        cellClass: "training-status-cell",
        cellRenderer: (params) => <WorkflowStatusBadge status={params.value} />,
      },
    ],
    [users]
  );

  return (
    <div className="training-curriculum-page">
      <div className="training-curriculum-frame">
        <div className="training-curriculum-body">
          <aside className="training-curriculum-sidebar">
          <div className="training-curriculum-sidebar-head">
            <div>
              <h3>Curricula</h3>
              <p>{filtered.length} defined</p>
            </div>
            <button
              type="button"
              className="parts-btn primary training-plm-btn--compact"
              onClick={() => setCreateModal(true)}
            >
              New
            </button>
          </div>

          <div className="training-curriculum-sidebar-list">
            {loading && <p className="training-plm-empty">Loading…</p>}
            {!loading && filtered.length === 0 && (
              <p className="training-plm-empty">No curricula yet.</p>
            )}
            {!loading &&
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`training-curriculum-card${
                    item.id === selectedId ? " is-selected" : ""
                  }`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="training-curriculum-card-title">{item.curriculum_name}</span>
                  <span className="training-curriculum-card-meta">
                    {item.curriculum_code} · Rev {item.revision}
                  </span>
                  <span className={`training-status-pill ${courseStatusClass(item.status)}`}>
                    {item.status}
                  </span>
                </button>
              ))}
          </div>
        </aside>

        <section className="training-curriculum-main">
          {!selected ? (
            <div className="training-curriculum-placeholder">
              <h3>Curriculum designer</h3>
              <p>Select a curriculum or create a new one to add courses.</p>
            </div>
          ) : (
            <div className="training-curriculum-workspace">
              <header className="training-curriculum-workspace-head">
                <div>
                  <h3>{selected.curriculum_name}</h3>
                  <p>
                    {selected.curriculum_code} · Revision {selected.revision} ·{" "}
                    <span className={`training-status-pill ${courseStatusClass(selected.status)}`}>
                      {selected.status}
                    </span>
                  </p>
                </div>
                <div className="training-curriculum-actions">
                  {isDraft && (
                    <button type="button" className="parts-btn" onClick={saveCourses} disabled={saving}>
                      Save courses
                    </button>
                  )}
                  {isDraft && (
                    <button type="button" className="parts-btn primary" onClick={releaseCurriculum}>
                      Release
                    </button>
                  )}
                  {selected.status === "Released" && (
                    <button type="button" className="parts-btn primary" onClick={() => setAssignOpen(true)}>
                      Assign
                    </button>
                  )}
                </div>
              </header>

              <div className="training-curriculum-transfer">
                <div className="training-curriculum-panel">
                  <h4>Available courses</h4>
                  <p className="training-curriculum-panel-hint">Released courses you can add</p>
                  <ul className="training-course-pick-list">
                    {availableCourses.map((course) => (
                      <li key={course.id}>
                        <div className="training-course-pick-copy">
                          <strong>{course.course_code}</strong>
                          <span>{course.course_name}</span>
                          <span className="training-course-pick-rev">Rev {course.revision}</span>
                        </div>
                        {isDraft && (
                          <button
                            type="button"
                            className="training-course-pick-btn"
                            onClick={() => addCourse(course)}
                          >
                            Add →
                          </button>
                        )}
                      </li>
                    ))}
                    {availableCourses.length === 0 && (
                      <li className="training-course-pick-empty">No released courses available.</li>
                    )}
                  </ul>
                </div>

                <div className="training-curriculum-transfer-divider" aria-hidden="true">
                  <span>→</span>
                </div>

                <div className="training-curriculum-panel training-curriculum-panel--target">
                  <h4>In this curriculum</h4>
                  <p className="training-curriculum-panel-hint">
                    {selectedCourses.length} course{selectedCourses.length === 1 ? "" : "s"}
                  </p>
                  <ul className="training-course-pick-list">
                    {selectedCourses.map((course) => (
                      <li key={course.course_id}>
                        <div className="training-course-pick-copy">
                          <strong>{course.course_code || "Course"}</strong>
                          <span>{course.course_name}</span>
                          {course.course_revision && (
                            <span className="training-course-pick-rev">Rev {course.course_revision}</span>
                          )}
                        </div>
                        {isDraft && (
                          <button
                            type="button"
                            className="training-course-pick-btn training-course-pick-btn--remove"
                            onClick={() => removeCourse(course.course_id)}
                          >
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                    {selectedCourses.length === 0 && (
                      <li className="training-course-pick-empty">
                        Add courses from the left panel.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>
        </div>
      </div>

      {selected?.status === "Released" && (
        <section className="training-curriculum-assignments-section">
          <div className="training-curriculum-assignments-head">
            <h4>Assignments</h4>
            <p className="training-curriculum-panel-hint">
              {assignmentsLoading
                ? "Loading assignments…"
                : `${assignments.length} trainee assignment${assignments.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="training-assignments-grid-wrap">
            <AppDataGrid
              rowData={assignments}
              columnDefs={assignmentColumnDefs}
              loading={assignmentsLoading}
              showSerialColumn
              domLayout="autoHeight"
              paginationPageSize={10}
              searchPlaceholder="Search assignments..."
              overlayNoRowsTemplate="<span>No assignments yet. Use Assign to add trainees.</span>"
              getRowId={(params) =>
                String(
                  params.data?.id ?? `${params.data?.user_id}-${params.data?.curriculum_id}`
                )
              }
            />
          </div>
        </section>
      )}

      {createModal && (
        <div className="modal-overlay" onClick={() => setCreateModal(false)}>
          <div className="modal training-plm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>New curriculum</h3>
            <label>
              Code
              <input
                value={form.curriculum_code}
                onChange={(e) => setForm((p) => ({ ...p, curriculum_code: e.target.value }))}
              />
            </label>
            <label>
              Name
              <input
                value={form.curriculum_name}
                onChange={(e) => setForm((p) => ({ ...p, curriculum_name: e.target.value }))}
              />
            </label>
            <label>
              Revision
              <input
                value={form.revision}
                onChange={(e) => setForm((p) => ({ ...p, revision: e.target.value }))}
              />
            </label>
            <label>
              Description
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="parts-btn" onClick={() => setCreateModal(false)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="parts-btn primary" onClick={createCurriculum} disabled={saving}>
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignOpen && selected && (
        <div className="modal-overlay" onClick={() => setAssignOpen(false)}>
          <div className="modal training-plm-modal training-plm-modal--wide" onClick={(e) => e.stopPropagation()}>
            <h3>Assign curriculum</h3>
            <p className="training-plm-modal-lead">{selected.curriculum_name}</p>
            <TagMultiSelect
              label="Trainees"
              options={userOptions}
              value={assignUserIds}
              onChange={setAssignUserIds}
              placeholder="Select users"
              getOptionValue={(option) => option.value}
              getOptionLabel={(option) => option.label}
            />
            <TagMultiSelect
              label="Groups"
              options={groupOptions}
              value={assignGroupIds}
              onChange={setAssignGroupIds}
              placeholder="Select groups"
              getOptionValue={(option) => option.value}
              getOptionLabel={(option) => option.label}
            />
            <label>
              Due date
              <input
                type="date"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="parts-btn" onClick={() => setAssignOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="parts-btn primary" onClick={assignCurriculum} disabled={saving}>
                {saving ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainingCurriculum;
