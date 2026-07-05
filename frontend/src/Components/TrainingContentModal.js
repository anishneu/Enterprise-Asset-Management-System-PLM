import { useEffect, useMemo, useState } from "react";

import apiClient from "../api/client";
import { useAppFeedback } from "../context/AppFeedbackContext";
import TagMultiSelect from "./common/TagMultiSelect";

const emptyContent = {
  course_code: "",
  course_name: "",
  description: "",
  category: "",
  revision: "A",
  form_id: "",
  trainer_user_id: "",
  trainer_name: "",
  document_ids: [],
};

function TrainingContentModal({
  contentId = null,
  documents = [],
  trainingForms = [],
  users = [],
  optionsLoading = false,
  onClose,
  onSaved,
}) {
  const feedback = useAppFeedback();
  const [form, setForm] = useState(emptyContent);
  const [loading, setLoading] = useState(Boolean(contentId));
  const [saving, setSaving] = useState(false);

  const documentOptions = useMemo(
    () =>
      documents.map((doc) => ({
        value: doc.id,
        label: `${doc.dname || "Document"} (Rev ${doc.drev || "—"})`,
      })),
    [documents]
  );

  useEffect(() => {
    let cancelled = false;
    if (!contentId) {
      setForm(emptyContent);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    apiClient
      .get(`/training-plm/courses/${contentId}`)
      .then((res) => {
        if (cancelled) return;
        const detail = res.data || {};
        setForm({
          course_code: detail.course_code || "",
          course_name: detail.course_name || "",
          description: detail.description || "",
          category: detail.category || "",
          revision: detail.revision || "A",
          form_id: detail.form_id ? String(detail.form_id) : "",
          trainer_user_id: detail.trainer_user_id || "",
          trainer_name: detail.trainer_name || "",
          document_ids: (detail.documents || []).map((item) => item.doc_id),
        });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          feedback.error("Failed to load training content.");
          onClose?.();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contentId, feedback, onClose]);

  const saveSetup = async (courseId) => {
    await apiClient.put(`/training-plm/courses/${courseId}/setup`, {
      form_id: form.form_id === "" ? null : Number(form.form_id),
      trainer_user_id: form.trainer_user_id || null,
      trainer_name: form.trainer_name.trim() || null,
      documents: form.document_ids.map((docId, index) => ({
        doc_id: docId,
        sequence_order: index,
      })),
    });
  };

  const handleSave = async () => {
    if (!form.course_code.trim() || !form.course_name.trim()) {
      feedback.error("Content code and name are required.");
      return;
    }

    const payload = {
      course_code: form.course_code.trim(),
      course_name: form.course_name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      revision: form.revision.trim() || "A",
      form_id: form.form_id === "" ? null : Number(form.form_id),
    };

    setSaving(true);
    try {
      let courseId = contentId;
      if (contentId) {
        await apiClient.put(`/training-plm/courses/${contentId}`, payload);
        feedback.success("Training content updated.");
      } else {
        const res = await apiClient.post("/training-plm/courses", payload);
        courseId = res.data.id;
        feedback.success("Training content created.");
      }
      if (courseId) {
        await saveSetup(courseId);
      }
      await onSaved?.(courseId);
      onClose?.();
    } catch (err) {
      feedback.error(err.response?.data?.detail || "Failed to save training content.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose?.()}>
      <div
        className="modal training-plm-modal training-plm-modal--wide training-plm-modal--scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{contentId ? "Edit training content" : "New training content"}</h3>
        {loading ? (
          <p className="training-plm-empty">Loading content…</p>
        ) : (
          <>
            <div className="training-plm-form-section">
              <h4>Content details</h4>
              <label>
                Content code
                <input
                  value={form.course_code}
                  disabled={Boolean(contentId)}
                  onChange={(e) => setForm((prev) => ({ ...prev, course_code: e.target.value }))}
                />
              </label>
              <label>
                Content name
                <input
                  value={form.course_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, course_name: e.target.value }))}
                />
              </label>
              <div className="training-plm-form-row">
                <label>
                  Revision
                  <input
                    value={form.revision}
                    disabled={Boolean(contentId)}
                    onChange={(e) => setForm((prev) => ({ ...prev, revision: e.target.value }))}
                  />
                </label>
                <label>
                  Category
                  <input
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  />
                </label>
              </div>
              <label>
                Description
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </label>
            </div>

            <div className="training-plm-form-section">
              <h4>Training form &amp; documents</h4>
              <label>
                Training form
                <select
                  value={form.form_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, form_id: e.target.value }))}
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
                onChange={(document_ids) => setForm((prev) => ({ ...prev, document_ids }))}
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
                  onChange={(e) => setForm((prev) => ({ ...prev, trainer_user_id: e.target.value }))}
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
                  onChange={(e) => setForm((prev) => ({ ...prev, trainer_name: e.target.value }))}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="parts-btn" onClick={() => onClose?.()} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="parts-btn primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TrainingContentModal;
