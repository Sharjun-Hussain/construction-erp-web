"use client";
import { useState, useEffect, useMemo } from "react";
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

const FREQUENT_SITES = ["Riyadh", "Jeddah", "Dammam", "NEOM", "Al Khobar"];

const SALESMEN = [
  "Eng. Tariq Al-Mansoor (Senior Commercial Estimator)",
  "Ahmed Bin Fahad (Bid Director)",
  "Sultan Al-Otaibi (Tender & QS Manager)",
  "Eng. Yasser Al-Ghamdi (Projects Lead)",
  "Ibrahim Al-Harbi (Client Relations & Sales)",
];

const PROJECT_TYPES = [
  "Commercial Tower & Offices",
  "Residential Compound & Villas",
  "Infrastructure & Utilities",
  "Hospitality & Luxury Resort",
  "Healthcare & Hospital Facility",
  "Industrial Warehouse & Factory",
  "Interior Fit-out & Turnkey Refurbishment",
];

const SERVICES = [
  "General Contracting & Turnkey Construction",
  "Civil, Structural & Earthworks",
  "MEP (Mechanical, Electrical, Plumbing) Packages",
  "Architectural & Interior Finishing",
  "QS Measurement & Commercial Cost Engineering",
];

const fmt = (n, d = 0) =>
  Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

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
    site: "Riyadh Head Office & Central",
    copy_estimation_id: "",

    bid_expiry_date: "",
    expected_start_date: "",
    expected_end_date: "",
    salesman: SALESMEN[0],
    similar_projects: "",
    margin_pct: 12,

    customer_name: "",
    customer_address: "",
    contact_person: "",
    contact_phone: "",
    contact_email: "",

    project_type: PROJECT_TYPES[0],
    service: SERVICES[0],
    project_name: "",
    project_name_ar: "",
    extension_no: "",
    parent_project_id: "",
    project_id: "",

    material_cost: 0,
    labor_cost: 0,
    equipment_cost: 0,
    subcontract_cost: 0,
    overhead_pct: 5,
    contingency_pct: 5,
    escalation_pct: 0,

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

  // Close on ESC key press & lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

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

  // Live calculation preview
  const liveTotals = useMemo(() => {
    const m = Number(form.material_cost || 0);
    const l = Number(form.labor_cost || 0);
    const e = Number(form.equipment_cost || 0);
    const s = Number(form.subcontract_cost || 0);
    const base = m + l + e + s;

    const oh = base * (Number(form.overhead_pct || 5) / 100);
    const directPlusOh = base + oh;
    const cont = directPlusOh * (Number(form.contingency_pct || 5) / 100);
    const esc = directPlusOh * (Number(form.escalation_pct || 0) / 100);
    const totalCost = directPlusOh + cont + esc;

    const margin = Number(form.margin_pct || 0);
    const sellTotal = totalCost * (1 + margin / 100);
    const grossProfit = sellTotal - totalCost;

    return {
      baseDirect: base,
      totalCost,
      sellTotal,
      grossProfit,
      marginPct: margin,
    };
  }, [form]);

  // When Enquiry is selected, auto-populate customer details, project info, and scope
  const handleEnquirySelect = (enqVal) => {
    const enq = enquiries.find((e) => String(e.id) === String(enqVal) || e.number === enqVal);
    if (!enq) {
      setForm((prev) => ({ ...prev, enquiry_id: "", enquiry_no: enqVal }));
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
      material_cost: src.material_cost ?? prev.material_cost,
      labor_cost: src.labor_cost ?? prev.labor_cost,
      equipment_cost: src.equipment_cost ?? prev.equipment_cost,
      subcontract_cost: src.subcontract_cost ?? prev.subcontract_cost,
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
        overhead_pct: Number(form.overhead_pct || 5),
        contingency_pct: Number(form.contingency_pct || 5),
        escalation_pct: Number(form.escalation_pct || 0),
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

  const insertStandardBoilerplate = () => {
    const template = `1. Mobilization, site fencing, occupational health & safety compliance, and temporary site offices.\n2. Civil and reinforced concrete sub-structure (raft foundations, retaining walls, columns) as per approved design drawings.\n3. Superstructure reinforced concrete frame, precast elements, and post-tensioned floor slabs.\n4. Architectural masonry, thermal insulation, damp-proofing, and high-performance waterproofing systems.\n5. Complete MEP infrastructure including HVAC chilled water network, low-current fire alarm, electrical distribution, and sanitary plumbing.\n6. Testing, balancing, commissioning, authority hand-over, and provision of comprehensive as-built documentation.`;
    setForm((prev) => ({ ...prev, scope_of_work: template }));
  };

  if (!isOpen) return null;

  return (
    <div className="tranquil-modal-overlay">
      <div className="tranquil-modal-window">
        {/* 1. TOP NAVY ENTERPRISE HEADER */}
        <div className="tranquil-modal-header">
          <div className="tranquil-modal-title-wrap">
            <span className="badge InProgress">
              {isEdit ? "Takeoff Editor" : "New Estimation"}
            </span>
            <div>
              <div className="tranquil-modal-title">
                {isEdit ? `Edit Estimation Takeoff Sheet — ${form.number || ""}` : "Create Commercial Cost Estimation Takeoff"}
              </div>
              <div className="tranquil-modal-sub">
                Tranquil Enterprise Takeoff & Commercial Specification Suite
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>[Esc to Close]</span>
            <button
              type="button"
              className="tranquil-modal-close"
              onClick={onClose}
              title="Close window"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. TOP OPTIONS CHECKBOX STRIP */}
        <div className="tranquil-top-options-bar">
          <label className="tranquil-opt-label">
            <input
              type="checkbox"
              checked={form.auto_generate_job_no}
              onChange={(e) => setForm({ ...form, auto_generate_job_no: e.target.checked })}
            />
            Auto-generate job number
          </label>

          <label className="tranquil-opt-label">
            <input
              type="checkbox"
              checked={form.copy_attachment_enquiry}
              onChange={(e) => setForm({ ...form, copy_attachment_enquiry: e.target.checked })}
            />
            Copy attachments from enquiry
          </label>

          <label className="tranquil-opt-label">
            <input
              type="checkbox"
              checked={form.copy_attachment_site_inspection}
              onChange={(e) => setForm({ ...form, copy_attachment_site_inspection: e.target.checked })}
            />
            Copy attachments from site inspection
          </label>

          <label className="tranquil-opt-label">
            <input
              type="checkbox"
              checked={form.estimate_without_resource}
              onChange={(e) => setForm({ ...form, estimate_without_resource: e.target.checked })}
            />
            Estimate without resource allocation
          </label>
        </div>

        {/* ERROR NOTIFICATION */}
        {errorMsg && (
          <div
            style={{
              background: "#fef2f2",
              borderBottom: "1px solid #fecaca",
              color: "#991b1b",
              padding: "10px 28px",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* 3. MAIN FULL-SCREEN SCROLLABLE FORM BODY */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: "1 1 0%",
            minHeight: 0,
            height: "calc(100vh - 65px)",
            overflow: "hidden",
          }}
        >
          <div
            className="tranquil-modal-body"
            style={{
              flex: "1 1 0%",
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <div className="tranquil-container-center">
              {/* SECTION 1: COMMERCIAL HEADER & SCHEDULING */}
              <div className="tranquil-card-section">
                <div className="tranquil-section-head">
                  <div className="tranquil-section-title">
                    <span className="dot" />
                    <span>01 Commercial Header & Project Schedules</span>
                  </div>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Tender dates, enquiry origin, and commercial profit margin
                  </span>
                </div>

                {/* ROW 1: Date, Enquiry, Reference, Site, Copy Estimation */}
                <div className="tranquil-form-row tranquil-row-5">
                  <div className="tranquil-field">
                    <label>Date *</label>
                    <input
                      type="date"
                      className="tranquil-input"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="tranquil-field">
                    <label>Enquiry Reference</label>
                    <input
                      type="text"
                      list="enquiry_list_options"
                      className="tranquil-input"
                      value={form.enquiry_no}
                      onChange={(e) => handleEnquirySelect(e.target.value)}
                      placeholder="Select or enter enquiry #"
                    />
                    <datalist id="enquiry_list_options">
                      {enquiries.map((enq) => (
                        <option key={enq.id} value={enq.number}>
                          {enq.number} — {enq.title || enq.client_name}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div className="tranquil-field">
                    <label>Tender Reference</label>
                    <input
                      type="text"
                      className="tranquil-input"
                      value={form.reference}
                      onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      placeholder="e.g. QULF/EST/2026/04"
                    />
                  </div>

                  <div className="tranquil-field">
                    <label>Site Location</label>
                    <select
                      className="tranquil-select"
                      value={form.site}
                      onChange={(e) => setForm({ ...form, site: e.target.value })}
                    >
                      <option value="">Select Site Location</option>
                      {SITES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="tranquil-field">
                    <label>Copy from Existing Estimation</label>
                    <select
                      className="tranquil-select"
                      value={form.copy_estimation_id}
                      onChange={(e) => handleCopyEstSelect(e.target.value)}
                    >
                      <option value="">Select an Option (Optional)</option>
                      {estimations.map((est) => (
                        <option key={est.id} value={est.id}>
                          {est.number} (Rev {est.revision}) — {est.project?.name || "Estimation"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Site Chips */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                    Frequent Sites:
                  </span>
                  {FREQUENT_SITES.map((cityName) => (
                    <button
                      key={cityName}
                      type="button"
                      className="city-chip"
                      onClick={() => {
                        const full = SITES.find((s) => s.toLowerCase().includes(cityName.toLowerCase())) || cityName;
                        setForm({ ...form, site: full });
                      }}
                    >
                      {cityName}
                    </button>
                  ))}
                </div>

                {/* ROW 2: Bid Expiry, Expected Start, Expected End, Salesman, Similar Projects */}
                <div className="tranquil-form-row tranquil-row-5" style={{ marginTop: 16 }}>
                  <div className="tranquil-field">
                    <label>Bid Expiry Date</label>
                    <input
                      type="date"
                      className="tranquil-input"
                      value={form.bid_expiry_date}
                      onChange={(e) => setForm({ ...form, bid_expiry_date: e.target.value })}
                    />
                  </div>

                  <div className="tranquil-field">
                    <label>Expected Start Date</label>
                    <input
                      type="date"
                      className="tranquil-input"
                      value={form.expected_start_date}
                      onChange={(e) => setForm({ ...form, expected_start_date: e.target.value })}
                    />
                  </div>

                  <div className="tranquil-field">
                    <label>Expected Completion Date</label>
                    <input
                      type="date"
                      className="tranquil-input"
                      value={form.expected_end_date}
                      onChange={(e) => setForm({ ...form, expected_end_date: e.target.value })}
                    />
                  </div>

                  <div className="tranquil-field">
                    <label>Commercial Lead / Salesman</label>
                    <select
                      className="tranquil-select"
                      value={form.salesman}
                      onChange={(e) => setForm({ ...form, salesman: e.target.value })}
                    >
                      <option value="">Select Estimator Lead</option>
                      {SALESMEN.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="tranquil-field">
                    <label>Similar / Benchmark Projects</label>
                    <input
                      type="text"
                      className="tranquil-input"
                      value={form.similar_projects}
                      onChange={(e) => setForm({ ...form, similar_projects: e.target.value })}
                      placeholder="e.g. Al-Faisaliyah Tower Expansion"
                    />
                  </div>
                </div>

                {/* ROW 3: Profit Percentage */}
                <div className="tranquil-form-row" style={{ gridTemplateColumns: "220px 1fr", marginTop: 16 }}>
                  <div className="tranquil-field">
                    <label>Profit Margin (%) *</label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="tranquil-input"
                        style={{ width: "100%", paddingRight: 32, fontWeight: 700, fontSize: 13.5 }}
                        value={form.margin_pct}
                        onChange={(e) => setForm({ ...form, margin_pct: e.target.value })}
                        required
                      />
                      <span
                        style={{
                          position: "absolute",
                          right: 12,
                          fontWeight: 700,
                          color: "#0ba360",
                          fontSize: 13,
                          pointerEvents: "none",
                        }}
                      >
                        %
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 6 }}>
                    <span style={{ fontSize: 11.5, color: "#64748b" }}>
                      Commercial margin applied across all direct and indirect cost build-ups to compute final tender sell values.
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CUSTOMER INFORMATION CARD (TRANQUIL GREEN HIGHLIGHT) */}
              <div className="tranquil-customer-box">
                <div className="tranquil-customer-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>02 Client & Stakeholder Profile</span>
                </div>

                <div className="tranquil-form-row tranquil-row-2">
                  <div className="tranquil-field">
                    <label style={{ color: "#166534" }}>Customer / Developer Name *</label>
                    <input
                      type="text"
                      className="tranquil-input"
                      style={{ borderColor: "#a7f3d0", background: "#ffffff", fontWeight: 600 }}
                      value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                      placeholder="Enter customer name or select enquiry to auto-fill"
                      required
                    />
                  </div>

                  <div className="tranquil-field">
                    <label style={{ color: "#166534" }}>Official Address</label>
                    <input
                      type="text"
                      className="tranquil-input"
                      style={{ borderColor: "#a7f3d0", background: "#ffffff" }}
                      value={form.customer_address}
                      onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                      placeholder="e.g. King Fahd Road, Al Olaya District, Riyadh, KSA"
                    />
                  </div>
                </div>

                <div className="tranquil-form-row tranquil-row-3">
                  <div className="tranquil-field">
                    <label style={{ color: "#166534" }}>Contact Person</label>
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
                    <label style={{ color: "#166534" }}>Contact Phone</label>
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
                    <label style={{ color: "#166534" }}>Contact Email</label>
                    <input
                      type="email"
                      className="tranquil-input"
                      style={{ borderColor: "#a7f3d0", background: "#ffffff" }}
                      value={form.contact_email}
                      onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                      placeholder="e.g. procurement@client-corp.com"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: PROJECT SPECIFICATION & CLASSIFICATION */}
              <div className="tranquil-card-section">
                <div className="tranquil-section-head">
                  <div className="tranquil-section-title">
                    <span className="dot" />
                    <span>03 Project Scope Classification & Hierarchy</span>
                  </div>
                </div>

                <div className="tranquil-form-row tranquil-row-4">
                  <div className="tranquil-field">
                    <label>Project Type</label>
                    <select
                      className="tranquil-select"
                      value={form.project_type}
                      onChange={(e) => setForm({ ...form, project_type: e.target.value })}
                    >
                      {PROJECT_TYPES.map((pt) => (
                        <option key={pt} value={pt}>
                          {pt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="tranquil-field">
                    <label>Service Package</label>
                    <select
                      className="tranquil-select"
                      value={form.service}
                      onChange={(e) => setForm({ ...form, service: e.target.value })}
                    >
                      {SERVICES.map((sv) => (
                        <option key={sv} value={sv}>
                          {sv}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="tranquil-field">
                    <label>Project Name *</label>
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
                    <label>Project Name (Arabic)</label>
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

                <div className="tranquil-form-row" style={{ gridTemplateColumns: "180px 340px 1fr", alignItems: "center", marginTop: 16 }}>
                  <div className="tranquil-field">
                    <label>Extension Number</label>
                    <input
                      type="text"
                      className="tranquil-input"
                      value={form.extension_no}
                      onChange={(e) => setForm({ ...form, extension_no: e.target.value })}
                      placeholder="e.g. EXT-01"
                    />
                  </div>

                  <div className="tranquil-field">
                    <label>Parent Project Link</label>
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

                  <div style={{ paddingTop: 20 }}>
                    <label className="tranquil-opt-label" style={{ color: "#334155" }}>
                      <input
                        type="checkbox"
                        checked={form.default_material_cost_pricelist}
                        onChange={(e) => setForm({ ...form, default_material_cost_pricelist: e.target.checked })}
                      />
                      Default material cost based on supplier pricelists
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 4: SCOPE OF WORK WITH FORMATTING TOOLBAR */}
              <div className="tranquil-card-section">
                <div className="tranquil-section-head">
                  <div className="tranquil-section-title">
                    <span className="dot" />
                    <span>04 Technical Scope of Work</span>
                  </div>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={insertStandardBoilerplate}
                    style={{ fontSize: 11.5, padding: "3px 10px", color: "#0284c7", borderColor: "#bae6fd" }}
                  >
                    + Insert Standard Scope Boilerplate
                  </button>
                </div>

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
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>Standard 11pt Regular</span>
                  </div>

                  <textarea
                    id="tranquil_scope_area"
                    className="tranquil-scope-textarea"
                    value={form.scope_of_work}
                    onChange={(e) => setForm({ ...form, scope_of_work: e.target.value })}
                    placeholder="Enter the detailed technical scope of work, structural deliverables, finishes, exclusions, site parameters, and milestone schedules..."
                    rows={4}
                  />
                </div>
              </div>

              {/* SECTION 5: INITIAL DIRECT COST HEADS & LIVE COMMERCIAL WATERFALL */}
              <div className="tranquil-card-section">
                <div className="tranquil-section-head">
                  <div className="tranquil-section-title">
                    <span className="dot" />
                    <span>05 Direct Cost Heads & Pricing Preview (Optional)</span>
                  </div>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Optional quick baseline numbers (can be built up item-by-item in workspace)
                  </span>
                </div>

                <div className="tranquil-form-row tranquil-row-4">
                  <div className="tranquil-field">
                    <label>Direct Materials (SAR)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="tranquil-input"
                      value={form.material_cost}
                      onChange={(e) => setForm({ ...form, material_cost: e.target.value })}
                    />
                  </div>

                  <div className="tranquil-field">
                    <label>Direct Labour / Workforce (SAR)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="tranquil-input"
                      value={form.labor_cost}
                      onChange={(e) => setForm({ ...form, labor_cost: e.target.value })}
                    />
                  </div>

                  <div className="tranquil-field">
                    <label>Plant & Heavy Equipment (SAR)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="tranquil-input"
                      value={form.equipment_cost}
                      onChange={(e) => setForm({ ...form, equipment_cost: e.target.value })}
                    />
                  </div>

                  <div className="tranquil-field">
                    <label>Subcontract Packages (SAR)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="tranquil-input"
                      value={form.subcontract_cost}
                      onChange={(e) => setForm({ ...form, subcontract_cost: e.target.value })}
                    />
                  </div>
                </div>

                {/* Live Preview Ribbon */}
                <div
                  style={{
                    marginTop: 16,
                    padding: "14px 20px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 14,
                  }}
                >
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                      Base Direct Cost:
                    </span>
                    <span style={{ marginLeft: 8, fontWeight: 700, color: "#0f172a", fontSize: 13.5 }}>
                      {fmt(liveTotals.baseDirect)} SAR
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                      Total Cost Baseline:
                    </span>
                    <span style={{ marginLeft: 8, fontWeight: 700, color: "#334155", fontSize: 13.5 }}>
                      {fmt(liveTotals.totalCost)} SAR
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: 11, color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
                      Commercial Sell Total (+{form.margin_pct}%):
                    </span>
                    <span style={{ marginLeft: 8, fontWeight: 800, color: "#0ba360", fontSize: 15.5 }}>
                      {fmt(liveTotals.sellTotal)} SAR
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. PINNED BOTTOM ACTION FOOTER */}
          <div className="tranquil-modal-footer">
            {/* Left: Attachments button */}
            <button
              type="button"
              className="tranquil-btn-attachments"
              onClick={() => setShowAttachDialog(!showAttachDialog)}
              title="Attach tender files and documents"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span>Attachments ({form.attachments.length})</span>
            </button>

            {/* Center: Quick indicator */}
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              Project: <b style={{ color: "#0f172a" }}>{form.project_name || "—"}</b> • Margin: <b style={{ color: "#0ba360" }}>{form.margin_pct}%</b>
            </div>

            {/* Right: Close and Prepare Buttons */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="btn ghost"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn"
                style={{
                  background: "#0ba360",
                  borderColor: "#0ba360",
                  color: "#fff",
                  fontWeight: 600,
                  padding: "8px 26px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
                disabled={busy}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {busy ? "Preparing Takeoff..." : "Prepare Takeoff"}
              </button>
            </div>
          </div>
        </form>

        {/* ATTACHMENTS MINI DIALOG */}
        {showAttachDialog && (
          <div
            style={{
              position: "fixed",
              bottom: 65,
              left: 28,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
              padding: 16,
              width: 340,
              zIndex: 10000,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <b style={{ fontSize: 13, color: "#0f172a" }}>Upload Tender Attachments</b>
              <button
                type="button"
                onClick={() => setShowAttachDialog(false)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b", fontSize: 16 }}
              >
                ×
              </button>
            </div>
            <input
              type="file"
              multiple
              style={{ fontSize: 11.5 }}
              onChange={(e) => {
                const files = Array.from(e.target.files || []).map((f) => f.name);
                setForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...files] }));
              }}
            />
            {form.attachments.length > 0 && (
              <div style={{ marginTop: 10, maxHeight: 120, overflowY: "auto", fontSize: 11.5, color: "#334155" }}>
                {form.attachments.map((name, i) => (
                  <div key={i} style={{ padding: "4px 0", borderBottom: "1px dashed #f1f5f9", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>📄</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
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
