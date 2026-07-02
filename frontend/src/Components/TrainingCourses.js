import { useCallback, useEffect, useMemo, useState } from "react";

import apiClient from "../api/client";
import AppDataGrid from "./common/AppDataGrid";
import CourseActionsCellRenderer from "./common/CourseActionsCellRenderer";
import WorkflowStatusBadge from "./common/WorkflowStatusBadge";
import TagMultiSelect from "./common/TagMultiSelect";
import { usePageInsight } from "./dashboard/PageInsightContext";
import { useAppFeedback } from "../context/AppFeedbackContext";
import { TRAINING_FORM_TYPE } from "../constants/trainingCatalog";
import { filterBySearch } from "../utils/filterBySearch";
import { formatTrainingDateTime, toDateInputValue } from "../constants/trainingPlm";

import "./Docs.css";
import "./Training.css";

const emptyCourse = {
  course_code: "",
  course_name: "",
  description: "",
  category: "",
  revision: "A",
  form_id: "",
  release_due_date: "",
  trainer_user_id: "",
  trainer_name: "",
  document_ids: [],
  user_ids: [],
  group_ids: [],
};

function resolveTrainerLabel(course, users) {
  if (course?.trainer_name) return course.trainer_name;
  if (course?.trainer_user_id) {
    const user = users.find((item) => item.id === course.trainer_user_id);
    return user?.username || user?.name || course.trainer_user_id;
  }
  return "—";
}

function TrainingCourses({ searchText = "" }) {
  const { insight, setInsight } = usePageInsight();
  const feedback = useAppFeedback();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyCourse);
  const [trainingForms, setTrainingForms] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const isCreate = modal === "create";
  const editId = modal?.type === "edit" ? modal.id : null;

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/training-plm/courses");
      setCourses(res.data || []);
    } catch (err) {
      feedback.error("Failed to load training courses.");
    } finally {
      setLoading(false);
    }
  }, [feedback]);

  const fetchOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const [formsRes, docsRes, usersRes, groupsRes] = await Promise.all([
        apiClient.get("/forms/", { params: { ftype: TRAINING_FORM_TYPE } }),
        apiClient.get("/docs"),
        apiClient.get("/users"),
        apiClient.get("/groups"),
      ]);
      setTrainingForms(formsRes.data || []);
      setDocuments((docsRes.data || []).filter((doc) => doc.dstatus === "Released"));
      setUsers(usersRes.data || []);
      setGroups(groupsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
    fetchOptions();
  }, [fetchCourses, fetchOptions]);

  const filtered = useMemo(
    () =>
      filterBySearch(courses, searchText, [
        "course_code",
        "course_name",
        "category",
        "revision",
        "status",
        "form_name",
        "trainer_name",
      ]),
    [courses, searchText]
  );

  const documentOptions = useMemo(
    () =>
      documents.map((doc) => ({
        value: doc.id,
        label: `${doc.dname || "Document"} (Rev ${doc.drev || "—"})`,
      })),
    [documents]
  );

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

  const openCreate = () => {
    setForm(emptyCourse);
    setModal("create");
  };

  const openEdit = useCallback(async (course) => {
    try {
      const res = await apiClient.get(`/training-plm/courses/${course.id}`);
      const detail = res.data;
      setForm({
        course_code: detail.course_code || "",
        course_name: detail.course_name || "",
        description: detail.description || "",
        category: detail.category || "",
        revision: detail.revision || "A",
        form_id: detail.form_id ? String(detail.form_id) : "",
        release_due_date: toDateInputValue(detail.release_due_date),
        trainer_user_id: detail.trainer_user_id || "",
        trainer_name: detail.trainer_name || "",
        document_ids: (detail.documents || []).map((item) => item.doc_id),
        user_ids: (detail.assignees || []).map((item) => item.user_id),
        group_ids: (detail.assignee_groups || []).map((item) => item.group_id),
      });
      setModal({ type: "edit", id: course.id });
    } catch (err) {
      feedback.error("Failed to load course details.");
    }
  }, [feedback]);

  const closeModal = () => {
    setModal(null);
    setForm(emptyCourse);
  };

  const saveSetup = async (courseId) => {
    const groupNames = {};
    form.group_ids.forEach((groupId) => {
      const group = groups.find((item) => item.id === groupId);
      if (group) groupNames[groupId] = group.name;
    });

    await apiClient.put(`/training-plm/courses/${courseId}/setup`, {
      form_id: form.form_id === "" ? null : Number(form.form_id),
      release_due_date: form.release_due_date
        ? new Date(`${form.release_due_date}T00:00:00`).toISOString()
        : null,
      trainer_user_id: form.trainer_user_id || null,
      trainer_name: form.trainer_name.trim() || null,
      documents: form.document_ids.map((docId, index) => ({
        doc_id: docId,
        sequence_order: index,
      })),
      user_ids: form.user_ids,
      group_ids: form.group_ids,
      group_names: groupNames,
    });
  };

  const saveCourse = async () => {
    if (!form.course_code.trim() || !form.course_name.trim()) {
      feedback.error("Course code and name are required.");
      return;
    }

    const payload = {
      course_code: form.course_code.trim(),
      course_name: form.course_name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      revision: form.revision.trim() || "A",
      form_id: form.form_id === "" ? null : Number(form.form_id),
      release_due_date: form.release_due_date
        ? new Date(`${form.release_due_date}T00:00:00`).toISOString()
        : null,
    };

    setSaving(true);
    try {
      let courseId = editId;
      if (isCreate) {
        const res = await apiClient.post("/training-plm/courses", payload);
        courseId = res.data.id;
        feedback.success("Training course created.");
      } else if (editId) {
        await apiClient.put(`/training-plm/courses/${editId}`, payload);
        feedback.success("Training course updated.");
      }
      if (courseId) {
        await saveSetup(courseId);
      }
      closeModal();
      await fetchCourses();
    } catch (err) {
      feedback.error(err.response?.data?.detail || "Failed to save course.");
    } finally {
      setSaving(false);
    }
  };

  const releaseCourse = useCallback(
    async (course) => {
      const audienceCount = (course.assignee_count || 0) + (course.group_count || 0);
      if (audienceCount === 0) {
        feedback.error("Assign trainees or groups before releasing this course.");
        return;
      }
      try {
        await apiClient.post(`/training-plm/courses/${course.id}/release`);
        feedback.success("Course released and training records created.");
        await fetchCourses();
      } catch (err) {
        feedback.error(err.response?.data?.detail || "Failed to release course.");
      }
    },
    [feedback, fetchCourses]
  );

  const reviseCourse = useCallback(
    async (course) => {
      try {
        await apiClient.post(`/training-plm/courses/${course.id}/revise`);
        feedback.success("New course revision created as Draft.");
        await fetchCourses();
      } catch (err) {
        feedback.error(err.response?.data?.detail || "Failed to revise course.");
      }
    },
    [feedback, fetchCourses]
  );

  const selectCourse = useCallback(
    async (course) => {
      if (!course?.id) return;
      try {
        const res = await apiClient.get(`/training-plm/courses/${course.id}`);
        setInsight((prev) => ({
          ...prev,
          recordCount: filtered.length,
          selectedCount: 1,
          courseDetail: res.data,
          courseUsers: users,
          onCourseEdit: openEdit,
          onCourseRelease: releaseCourse,
          onCourseRevise: reviseCourse,
          auditEntity: {
            type: "training",
            id: course.id,
            label: course.course_name,
            revision: course.revision,
          },
        }));
      } catch (err) {
        feedback.error("Failed to load course details.");
      }
    },
    [filtered.length, users, openEdit, releaseCourse, reviseCourse, setInsight, feedback]
  );

  useEffect(() => {
    setInsight((prev) => ({
      ...prev,
      recordCount: filtered.length,
      selectedCount: prev.courseDetail ? 1 : 0,
      courseUsers: users,
      onCourseEdit: openEdit,
      onCourseRelease: releaseCourse,
      onCourseRevise: reviseCourse,
    }));
  }, [filtered.length, users, openEdit, releaseCourse, reviseCourse, setInsight]);

  const handleRowClicked = useCallback(
    (event) => {
      if (event.event?.target?.closest?.("button")) return;
      selectCourse(event.data);
    },
    [selectCourse]
  );

  const getRowClass = useCallback(
    (params) => (params.data?.id === insight.courseDetail?.id ? "training-row-selected" : ""),
    [insight.courseDetail?.id]
  );

  const courseGridContext = useMemo(
    () => ({
      onEditCourse: openEdit,
      onReleaseCourse: releaseCourse,
      onReviseCourse: reviseCourse,
    }),
    [openEdit, releaseCourse, reviseCourse]
  );

  const columnDefs = useMemo(
    () => [
      { field: "course_code", headerName: "Code", flex: 0, width: 112, minWidth: 100 },
      { field: "course_name", headerName: "Course", flex: 1, minWidth: 200, tooltipField: "course_name" },
      { field: "revision", headerName: "Rev", flex: 0, width: 76, minWidth: 68 },
      {
        field: "status",
        headerName: "Status",
        flex: 0,
        width: 120,
        minWidth: 110,
        cellClass: "training-status-cell",
        cellRenderer: (params) => <WorkflowStatusBadge status={params.value} />,
      },
      {
        field: "category",
        headerName: "Category",
        flex: 0,
        width: 150,
        minWidth: 130,
        cellClass: "training-category-cell",
        tooltipField: "category",
        valueFormatter: (params) => params.value?.trim() || "—",
      },
      {
        headerName: "Trainer",
        flex: 0,
        width: 128,
        minWidth: 108,
        tooltipValueGetter: (params) => resolveTrainerLabel(params.data, users),
        valueGetter: (params) => resolveTrainerLabel(params.data, users),
      },
      {
        field: "form_name",
        headerName: "Form",
        flex: 0,
        width: 130,
        minWidth: 110,
        tooltipField: "form_name",
        valueFormatter: (params) => params.value?.trim() || "—",
      },
      {
        field: "document_count",
        headerName: "Documents",
        flex: 0,
        width: 100,
        minWidth: 92,
        headerTooltip: "Number of linked documents",
        valueFormatter: (params) => params.value ?? 0,
      },
      {
        headerName: "Assignees",
        flex: 0,
        width: 96,
        minWidth: 88,
        headerTooltip: "Trainees and groups assigned before release",
        valueGetter: (params) =>
          (params.data?.assignee_count || 0) + (params.data?.group_count || 0),
      },
      {
        field: "release_due_date",
        headerName: "Due date",
        flex: 0,
        width: 168,
        minWidth: 156,
        cellClass: "training-datetime-cell",
        valueFormatter: (params) => formatTrainingDateTime(params.value),
        tooltipValueGetter: (params) => formatTrainingDateTime(params.value),
      },
      {
        headerName: "Actions",
        flex: 0,
        width: 108,
        minWidth: 100,
        maxWidth: 116,
        sortable: false,
        filter: false,
        cellClass: "training-actions-col",
        cellRenderer: CourseActionsCellRenderer,
      },
    ],
    [users]
  );

  return (
    <div className="training-plm-page training-courses-page grid-page">
      <div className="training-plm-toolbar">
        <div>
          <p className="training-plm-lead">
            Define courses with training forms, documents, trainer, and trainees — then release to create records.
          </p>
        </div>
        <button type="button" className="parts-btn primary" onClick={openCreate}>
          New course
        </button>
      </div>

      <div className="training-plm-grid-wrap">
        <AppDataGrid
          rowData={filtered}
          columnDefs={columnDefs}
          context={courseGridContext}
          loading={loading}
          showSerialColumn
          onRowClicked={handleRowClicked}
          getRowClass={getRowClass}
          getRowId={(params) => String(params.data.id)}
        />
      </div>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal training-plm-modal training-plm-modal--wide training-plm-modal--scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{isCreate ? "New training course" : "Edit training course"}</h3>

            <div className="training-plm-form-section">
              <h4>Course details</h4>
              <label>
                Course code
                <input
                  value={form.course_code}
                  disabled={!isCreate}
                  onChange={(e) => setForm((p) => ({ ...p, course_code: e.target.value }))}
                />
              </label>
              <label>
                Course name
                <input
                  value={form.course_name}
                  onChange={(e) => setForm((p) => ({ ...p, course_name: e.target.value }))}
                />
              </label>
              <div className="training-plm-form-row">
                <label>
                  Revision
                  <input
                    value={form.revision}
                    disabled={!isCreate}
                    onChange={(e) => setForm((p) => ({ ...p, revision: e.target.value }))}
                  />
                </label>
                <label>
                  Category
                  <input
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  />
                </label>
              </div>
              <label>
                Description
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </label>
            </div>

            <div className="training-plm-form-section">
              <h4>Training form &amp; documents</h4>
              <p className="training-plm-section-hint">
                Build the form template under Forms → Form Builder (type: Training). Dropdown/radio options
                are set on each field in the builder.
              </p>
              <label>
                Training form
                <select
                  value={form.form_id}
                  onChange={(e) => setForm((p) => ({ ...p, form_id: e.target.value }))}
                  disabled={optionsLoading}
                >
                  <option value="">
                    {optionsLoading ? "Loading forms…" : "Select a training form (optional)"}
                  </option>
                  {trainingForms.map((trainingForm) => (
                    <option key={trainingForm.id} value={trainingForm.id}>
                      {trainingForm.fmname} (ID: {trainingForm.id})
                    </option>
                  ))}
                </select>
              </label>
              <TagMultiSelect
                label="Linked documents (released)"
                options={documentOptions}
                value={form.document_ids}
                onChange={(document_ids) => setForm((p) => ({ ...p, document_ids }))}
                placeholder="Attach one or more documents"
                getOptionValue={(option) => option.value}
                getOptionLabel={(option) => option.label}
              />
            </div>

            <div className="training-plm-form-section">
              <h4>Trainer</h4>
              <label>
                Trainer (user)
                <select
                  value={form.trainer_user_id}
                  onChange={(e) => setForm((p) => ({ ...p, trainer_user_id: e.target.value }))}
                >
                  <option value="">Select a user (optional)</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username || user.name || user.id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Or trainer name (manual)
                <input
                  value={form.trainer_name}
                  placeholder="External trainer or override name"
                  onChange={(e) => setForm((p) => ({ ...p, trainer_name: e.target.value }))}
                />
              </label>
            </div>

            <div className="training-plm-form-section">
              <h4>Trainees (required before release)</h4>
              <TagMultiSelect
                label="Trainees"
                options={userOptions}
                value={form.user_ids}
                onChange={(user_ids) => setForm((p) => ({ ...p, user_ids }))}
                placeholder="Select trainees"
                getOptionValue={(option) => option.value}
                getOptionLabel={(option) => option.label}
              />
              <TagMultiSelect
                label="Groups"
                options={groupOptions}
                value={form.group_ids}
                onChange={(group_ids) => setForm((p) => ({ ...p, group_ids }))}
                placeholder="Select groups"
                getOptionValue={(option) => option.value}
                getOptionLabel={(option) => option.label}
              />
              <label>
                Due date (for assigned records)
                <input
                  type="date"
                  value={form.release_due_date}
                  onChange={(e) => setForm((p) => ({ ...p, release_due_date: e.target.value }))}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="parts-btn" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="parts-btn primary" onClick={saveCourse} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainingCourses;
