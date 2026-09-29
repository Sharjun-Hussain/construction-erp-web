"use client";
import { useState, useEffect } from "react";
import api from "@/lib/axios";

const SITES = [
  "Riyadh Head Office & Central",
  "Jeddah & Western Province",
  "Dammam & Eastern Province",
  "NEOM Mega Project Zone",
  "Al Khobar Commercial",
  "Jubail Industrial City",
  "Makkah Al-Mukarramah",
  "Madinah Al-Munawwarah",
  "Red Sea Development",
  "Tabuk & Northern Borders",
];

const SALESMEN = [
  "Eng. Tariq Al-Mansoor (Senior Commercial Estimator)",
  "Ahmed Bin Fahad (Bid Director)",
  "Sultan Al-Otaibi (Tender & QS Manager)",
  "Eng. Yasser Al-Ghamdi (Projects Lead)",
  "Ibrahim Al-Harbi (Client Relations & Sales)",
];

export default function TranquilEstimationModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  isEdit = false,
}) {
  const today = new Date().toISOString().split("T")[0];

  const defaultForm = {
    auto_generate_job_no: true,
    copy_attachment_enquiry: false,
    copy_attachment_site_inspection: false,
    estimate_without_resource: false,
    default_material_cost_pricelist: false,

    date: today,
    enquiry_id: "",
    enquiry_no: "",
    reference: "",
    site: "",
    copy_estimation_id: "",

    bid_expiry_date: "",
    expected_start_date: "",
    expected_end_date: "",
    salesman: "",
    similar_projects: "",
    margin_pct: 12,

    customer_name: "",
    customer_address: "",
    contact_person: "",
    contact_phone: "",
    contact_email: "",

    project_type: "Commercial Building",
    service: "General Contracting & Turnkey Construction",
    project_name: "",
    project_name_ar: "",
    extension_no: "",
    parent_project_id: "",
    project_id: "",

    scope_of_work: "",
    attachments: [],
  };

  const [form, setForm] = useState(defaultForm);
  const [enquiries, setEnquiries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [estimations, setEstimations] = useState([]);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAttachDialog, setShowAttachDialog] = useState(false);

  // Load supporting lists
  useEffect(() => {
    if (!isOpen) return;
    api.get("/prebid/enquiries?limit=150").then((r) => setEnquiries(r.data.data || [])).catch(() => {});
    api.get("/projects?limit=150").then((r) => setProjects(r.data.data || [])).catch(() => {});
    api.get("/estimations?limit=100").then((r) => setEstimations(r.data.data || [])).catch(() => {});
  }, [isOpen]);

  // If initial data is passed (e.g. edit mode)
  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({
        ...prev,
        ...initialData,
        date: initialData.date ? initialData.date.split("T")[0] : prev.date,
        margin_pct: initialData.margin_pct ?? 12,
        project_name: initialData.project?.name || initialData.project_name || "",
        project_id: initialData.project_id || "",
      }));
    } else {
      setForm(defaultForm);
    }
  }, [initialData, isOpen]);

  // When Enquiry is selected, auto-populate customer details, project info, and scope
  const handleEnquirySelect = (enqId) => {
    const enq = enquiries.find((e) => String(e.id) === String(enqId) || e.number === enqId);
    if (!enq) {
      setForm((prev) => ({ ...prev, enquiry_id: "", enquiry_no: enqId }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      enquiry_id: enq.id,
      enquiry_no: enq.number,
      reference: enq.number,
      customer_name: enq.client_name || enq.client?.name || prev.customer_name,
      customer_address: enq.client?.address || (enq.client?.city ? `${enq.client.city}, Saudi Arabia` : prev.customer_address),
      contact_person: enq.client?.contact_person || enq.client_name || prev.contact_person,
      contact_phone: enq.client?.phone || prev.contact_phone,
      contact_email: enq.client?.email || prev.contact_email,
      project_name: enq.title || prev.project_name,
      scope_of_work: enq.notes || prev.scope_of_work || `Comprehensive turnkey execution of ${enq.title || "the project"} as per contract specifications, architectural drawings, and approved BOQ schedule.`,
      bid_expiry_date: enq.due_date ? enq.due_date.split("T")[0] : prev.bid_expiry_date,
      salesman: enq.assigned_to || prev.salesman,
    }));
  };

  // When Copy Estimation is selected
  const handleCopyEstSelect = (cId) => {
    const src = estimations.find((e) => String(e.id) === String(cId));
    if (!src) {
      setForm((prev) => ({ ...prev, copy_estimation_id: "" }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      copy_estimation_id: src.id,
      margin_pct: src.margin_pct ?? prev.margin_pct,
      project_type: src.project_type || prev.project_type,
      service: src.service || prev.service,
      scope_of_work: src.scope_of_work || prev.scope_of_work,
    }));
  };

  // Submit / Prepare
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setBusy(true);

    try {
      const payload = {
        ...form,
        margin_pct: Number(form.margin_pct || 0),
        overhead_pct: 5,
        contingency_pct: 5,
        escalation_pct: 0,
        material_cost: form.material_cost ? Number(form.material_cost) : 0,
        labor_cost: form.labor_cost ? Number(form.labor_cost) : 0,
        equipment_cost: form.equipment_cost ? Number(form.equipment_cost) : 0,
        subcontract_cost: form.subcontract_cost ? Number(form.subcontract_cost) : 0,
      };

      if (!payload.project_id && form.parent_project_id) {
        payload.project_id = form.parent_project_id;
      }

      let res;
      if (isEdit && initialData?.id) {
        res = await api.put(`/estimations/${initialData.id}`, payload);
      } else {
        res = await api.post("/estimations", payload);
      }

      if (onSuccess) {
        onSuccess(res.data.data);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || "Failed to prepare estimation. Please check all fields.");
    } finally {
      setBusy(false);
    }
  };

  // Text formatting helpers for scope of work
  const insertFormatting = (prefix, suffix = "") => {
    const textarea = document.getElementById("tranquil_scope_area");
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end) || "text";
    const replacement = `${prefix}${selected}${suffix}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    setForm((prev) => ({ ...prev, scope_of_work: newText }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 50);
  };

  if (!isOpen) return null;

  return (
    <div className="tranquil-modal-overlay" onClick={onClose}>
      <div className="tranquil-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* TOP BLUE HEADER */}
        <div className="tranquil-modal-header">
          <div className="tranquil-modal-title">
            {isEdit ? "Modify Estimation Takeoff Sheet" : "New Estimation"}
          </div>
          <button
            type="button"
            className="tranquil-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* TOP OPTIONS CHECKBOX STRIP */}
        <div className="tranquil-top-options-bar">
          <label className="tranquil-opt-label">
            <input
              type="checkbox"
              checked={form.auto_generate_job_no}
              onChange={(e) => setForm({ ...form, auto_generate_job_no: e.target.checked })}
            />
            AUTO-GENERATE JOB NO
          </label>

          <label className="tranquil-opt-label">
            <input
              type="checkbox"
              checked={form.copy_attachment_enquiry}
              onChange={(e) => setForm({ ...form, copy_attachment_enquiry: e.target.checked })}
            />
            COPY ATTACHMENT FROM ENQUIRY
          </label>

          <label className="tranquil-opt-label">
            <input
              type="checkbox"
              checked={form.copy_attachment_site_inspection}
              onChange={(e) => setForm({ ...form, copy_attachment_site_inspection: e.target.checked })}
            />
            COPY ATTACHMENT FROM SITE INSPECTION
          </label>

          <label className="tranquil-opt-label">
            <input
              type="checkbox"
              checked={form.estimate_without_resource}
              onChange={(e) => setForm({ ...form, estimate_without_resource: e.target.checked })}
            />
            ESTIMATE WITHOUT RESOURCE
          </label>
        </div>

        {/* ERROR NOTIFICATION */}
        {errorMsg && (
          <div
            style={{
              background: "#fef2f2",
              borderBottom: "1px solid #fecaca",
              color: "#991b1b",
              padding: "8px 22px",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* MAIN SCROLLABLE FORM BODY */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="tranquil-modal-body">
            {/* ROW 1: DATE, ENQUIRY NO., REFERENCE, SITE, COPY ESTIMATION */}
            <div className="tranquil-form-row tranquil-row-5">
              <div className="tranquil-field">
                <label>DATE</label>
                <input
                  type="date"
                  className="tranquil-input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>

              <div className="tranquil-field">
                <label>ENQUIRY NO.</label>
                <input
                  type="text"
                  list="enquiry_list"
                  className="tranquil-input"
                  value={form.enquiry_no}
                  onChange={(e) => handleEnquirySelect(e.target.value)}
                  placeholder="Select or Enter Enquiry"
                />
                <datalist id="enquiry_list">
                  {enquiries.map((enq) => (
                    <option key={enq.id} value={enq.number}>
                      {enq.number} — {enq.title || enq.client_name}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="tranquil-field">
                <label>REFERENCE</label>
                <input
                  type="text"
                  className="tranquil-input"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="e.g. QULF/EST/2026/04"
                />
              </div>

              <div className="tranquil-field">
                <label>SITE</label>
                <select
                  className="tranquil-select"
                  value={form.site}
                  onChange={(e) => setForm({ ...form, site: e.target.value })}
                >
                  <option value="">Select Site</option>
                  {SITES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tranquil-field">
                <label>COPY ESTIMATION</label>
                <select
                  className="tranquil-select"
                  value={form.copy_estimation_id}
                  onChange={(e) => handleCopyEstSelect(e.target.value)}
                >
                  <option value="">Select an Option</option>
                  {estimations.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.number} (Rev {est.revision}) — {est.project?.name || "Estimation"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 2: BID EXPIRY DATE, EXPECTED START DATE, EXPECTED END DATE, SALESMAN, SIMILAR PROJECTS */}
            <div className="tranquil-form-row tranquil-row-5">
              <div className="tranquil-field">
                <label>BID EXPIRY DATE</label>
                <input
                  type="date"
                  className="tranquil-input"
                  value={form.bid_expiry_date}
                  onChange={(e) => setForm({ ...form, bid_expiry_date: e.target.value })}
                />
              </div>

              <div className="tranquil-field">
                <label>EXPECTED START DATE</label>
                <input
                  type="date"
                  className="tranquil-input"
                  value={form.expected_start_date}
                  onChange={(e) => setForm({ ...form, expected_start_date: e.target.value })}
                />
              </div>

              <div className="tranquil-field">
                <label>EXPECTED END DATE</label>
                <input
                  type="date"
                  className="tranquil-input"
                  value={form.expected_end_date}
                  onChange={(e) => setForm({ ...form, expected_end_date: e.target.value })}
                />
              </div>

              <div className="tranquil-field">
                <label>SALESMAN</label>
                <select
                  className="tranquil-select"
                  value={form.salesman}
                  onChange={(e) => setForm({ ...form, salesman: e.target.value })}
                >
                  <option value="">Select</option>
                  {SALESMEN.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tranquil-field">
                <label>SIMILAR PROJECTS</label>
                <input
                  type="text"
                  className="tranquil-input"
                  value={form.similar_projects}
                  onChange={(e) => setForm({ ...form, similar_projects: e.target.value })}
                  placeholder="e.g. Al-Faisaliyah Tower Refurbishment"
                />
              </div>
            </div>

            {/* ROW 3: PROFIT PERCENTAGE */}
            <div className="tranquil-form-row" style={{ gridTemplateColumns: "220px 1fr" }}>
              <div className="tranquil-field">
                <label>PROFIT PERCENTAGE</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="tranquil-input"
                    style={{ width: "100%", paddingRight: 30 }}
                    value={form.margin_pct}
                    onChange={(e) => setForm({ ...form, margin_pct: e.target.value })}
                    required
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 10,
                      fontWeight: 700,
                      color: "#64748b",
                      fontSize: 12,
                      pointerEvents: "none",
                    }}
                  >
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* CUSTOMER INFORMATION CARD (TRANQUIL GREEN HIGHLIGHT) */}
            <div className="tranquil-customer-box">
              <div className="tranquil-form-row tranquil-row-2">
                <div className="tranquil-field">
                  <label style={{ color: "#166534" }}>CUSTOMER NAME</label>
                  <input
                    type="text"
                    className="tranquil-input"
                    style={{ borderColor: "#a7f3d0", background: "#ffffff" }}
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="Enter or auto-populated from enquiry"
                    required
                  />
                </div>

                <div className="tranquil-field">
                  <label style={{ color: "#166534" }}>ADDRESS</label>
                  <input
                    type="text"
                    className="tranquil-input"
                    style={{ borderColor: "#a7f3d0", background: "#ffffff" }}
                    value={form.customer_address}
                    onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                    placeholder="e.g. King Fahd Road, Al Olaya District, Riyadh"
                  />
                </div>
              </div>

              <div className="tranquil-form-row tranquil-row-3">
                <div className="tranquil-field">
                  <label style={{ color: "#166534" }}>CONTACT PERSON</label>
                  <input
                    type="text"
                    className="tranquil-input"
                    style={{ borderColor: "#a7f3d0", background: "#ffffff" }}
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    placeholder="e.g. Eng. Khalid Al-Otaibi"
                  />
                </div>

                <div className="tranquil-field">
                  <label style={{ color: "#166534" }}>CONTACT NO.</label>
                  <input
                    type="text"
                    className="tranquil-input"
                    style={{ borderColor: "#a7f3d0", background: "#ffffff" }}
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    placeholder="e.g. +966 50 123 4567"
                  />
                </div>

                <div className="tranquil-field">
                  <label style={{ color: "#166534" }}>CONTACT EMAIL</label>
                  <input
                    type="email"
                    className="tranquil-input"
                    style={{ borderColor: "#a7f3d0", background: "#ffffff" }}
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    placeholder="e.g. client.procurement@example.com"
                  />
                </div>
              </div>
            </div>

            {/* PROJECT DETAILS ROW 1: PROJECT TYPE, SERVICE, PROJECT NAME, PROJECT NAME ARABIC */}
            <div className="tranquil-form-row tranquil-row-4">
              <div className="tranquil-field">
                <label>PROJECT TYPE</label>
                <input
                  type="text"
                  className="tranquil-input"
                  value={form.project_type}
                  onChange={(e) => setForm({ ...form, project_type: e.target.value })}
                  placeholder="e.g. Commercial / Residential / Industrial"
                />
              </div>

              <div className="tranquil-field">
                <label>SERVICE</label>
                <input
                  type="text"
                  className="tranquil-input"
                  value={form.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                  placeholder="e.g. General Contracting & MEP"
                />
              </div>

              <div className="tranquil-field">
                <label>PROJECT NAME</label>
                <input
                  type="text"
                  className="tranquil-input"
                  value={form.project_name}
                  onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                  placeholder="e.g. Kingdom Horizon Luxury Towers"
                  required
                />
              </div>

              <div className="tranquil-field">
                <label>PROJECT NAME ARABIC</label>
                <input
                  type="text"
                  dir="rtl"
                  className="tranquil-input"
                  value={form.project_name_ar}
                  onChange={(e) => setForm({ ...form, project_name_ar: e.target.value })}
                  placeholder="اسم المشروع بالعربية"
                />
              </div>
            </div>

            {/* PROJECT DETAILS ROW 2: EXTENSION NO, PARENT PROJECT, SUPPLIER PRICELIST CHECKBOX */}
            <div className="tranquil-form-row" style={{ gridTemplateColumns: "180px 320px 1fr", alignItems: "center" }}>
              <div className="tranquil-field">
                <label>EXTENSION NO</label>
                <input
                  type="text"
                  className="tranquil-input"
                  value={form.extension_no}
                  onChange={(e) => setForm({ ...form, extension_no: e.target.value })}
                  placeholder="e.g. EXT-01"
                />
              </div>

              <div className="tranquil-field">
                <label>PARENT PROJECT</label>
                <select
                  className="tranquil-select"
                  value={form.parent_project_id}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const p = projects.find((proj) => String(proj.id) === String(pid));
                    setForm({
                      ...form,
                      parent_project_id: pid,
                      project_id: pid,
                      project_name: p ? p.name : form.project_name,
                    });
                  }}
                >
                  <option value="">Select Parent Project (Optional)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ paddingTop: 16 }}>
                <label className="tranquil-opt-label" style={{ color: "#334155" }}>
                  <input
                    type="checkbox"
                    checked={form.default_material_cost_pricelist}
                    onChange={(e) => setForm({ ...form, default_material_cost_pricelist: e.target.checked })}
                  />
                  DEFAULT MATERIAL COST BASED ON SUPPLIER PRICELISTS
                </label>
              </div>
            </div>

            {/* SCOPE OF WORK WITH FORMATTING TOOLBAR */}
            <div>
              <div className="tranquil-scope-header">SCOPE OF WORK</div>
              <div className="tranquil-scope-box">
                {/* Formatting Toolbar */}
                <div className="tranquil-toolbar">
                  <button
                    type="button"
                    className="tranquil-tb-btn"
                    onClick={() => insertFormatting("**", "**")}
                    title="Bold"
                  >
                    <b>B</b>
                  </button>
                  <button
                    type="button"
                    className="tranquil-tb-btn"
                    onClick={() => insertFormatting("*", "*")}
                    title="Italic"
                  >
                    <i>I</i>
                  </button>
                  <button
                    type="button"
                    className="tranquil-tb-btn"
                    onClick={() => insertFormatting("<u>", "</u>")}
                    title="Underline"
                  >
                    <u>U</u>
                  </button>
                  <div className="tranquil-tb-divider" />
                  <button
                    type="button"
                    className="tranquil-tb-btn"
                    onClick={() => insertFormatting("\n• ")}
                    title="Bullet List"
                  >
                    • List
                  </button>
                  <button
                    type="button"
                    className="tranquil-tb-btn"
                    onClick={() => insertFormatting("\n1. ")}
                    title="Numbered List"
                  >
                    1. List
                  </button>
                  <div className="tranquil-tb-divider" />
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Font: 11pt Regular</span>
                </div>

                <textarea
                  id="tranquil_scope_area"
                  className="tranquil-scope-textarea"
                  value={form.scope_of_work}
                  onChange={(e) => setForm({ ...form, scope_of_work: e.target.value })}
                  placeholder="Detail the technical scope of work, structural deliverables, finishes, exclusions, and milestone specifications..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* BOTTOM PINNED FOOTER */}
          <div className="tranquil-modal-footer">
            {/* Left: Attachments button */}
            <button
              type="button"
              className="tranquil-btn-attachments"
              onClick={() => setShowAttachDialog(!showAttachDialog)}
              title="Attach tender files and documents"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span>Attachments ({form.attachments.length})</span>
            </button>

            {/* Right: Close and Prepare Buttons */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="tranquil-btn-close"
                onClick={onClose}
                disabled={busy}
              >
                Close
              </button>
              <button
                type="submit"
                className="tranquil-btn-prepare"
                disabled={busy}
              >
                {busy ? "PREPARING..." : "PREPARE"}
              </button>
            </div>
          </div>
        </form>

        {/* ATTACHMENTS MINI DIALOG */}
        {showAttachDialog && (
          <div
            style={{
              position: "absolute",
              bottom: 60,
              left: 20,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              padding: 14,
              width: 320,
              zIndex: 100,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <b style={{ fontSize: 12, color: "#0f172a" }}>Tender Attachments</b>
              <button
                type="button"
                onClick={() => setShowAttachDialog(false)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b" }}
              >
                ×
              </button>
            </div>
            <input
              type="file"
              multiple
              style={{ fontSize: 11 }}
              onChange={(e) => {
                const files = Array.from(e.target.files || []).map((f) => f.name);
                setForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...files] }));
              }}
            />
            {form.attachments.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 100, overflowY: "auto", fontSize: 11, color: "#334155" }}>
                {form.attachments.map((name, i) => (
                  <div key={i} style={{ padding: "2px 0", borderBottom: "1px dashed #f1f5f9" }}>
                    📄 {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
