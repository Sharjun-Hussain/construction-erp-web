"use client";
import { useState, useEffect, useMemo } from "react";
import api from "@/lib/axios";
import { useAppStore } from "@/store/useAppStore";
import TranquilJobBreakdownModal from "./TranquilJobBreakdownModal";

export default function TranquilProjectModal({ isOpen, onClose, onSaved, editData = null }) {
  const { lang } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("GENERAL");

  // Metadata dropdowns
  const [customers, setCustomers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [services, setServices] = useState([]);
  const [jobSites, setJobSites] = useState([]);

  // Header State (Blue Top Section)
  const [runningProject, setRunningProject] = useState(true);
  const [proposalNo, setProposalNo] = useState("");
  const [projectNo, setProjectNo] = useState("");
  const [projectType, setProjectType] = useState("Unit Rate");
  const [service, setService] = useState("CIVIL WORK");
  const [projectName, setProjectName] = useState("");
  const [projectNameAr, setProjectNameAr] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [jobSite, setJobSite] = useState("");
  const [autoGenerateJobNo, setAutoGenerateJobNo] = useState(true);
  const [currency, setCurrency] = useState("Saudi Arabian Riyal");
  const [contractAmount, setContractAmount] = useState(204872.67);

  // Tab 1: GENERAL
  const [contractNo, setContractNo] = useState("");
  const [reference, setReference] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [budgetOverrun, setBudgetOverrun] = useState("Disallow");
  const [notToExceed, setNotToExceed] = useState(0);
  const [extensionNo, setExtensionNo] = useState("");
  const [parentProject, setParentProject] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [managerName, setManagerName] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [email, setEmail] = useState("");
  const [engineerName, setEngineerName] = useState("");
  const [consultantName, setConsultantName] = useState("");
  const [consultantNameAr, setConsultantNameAr] = useState("");
  const [remark, setRemark] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerAddressAr, setCustomerAddressAr] = useState("");

  // Contact Persons Schedule
  const [contacts, setContacts] = useState([
    {
      id: "c_1",
      name: "Eng. Tariq Al-Otaibi",
      nameAr: "طارق العتيبي",
      department: "Projects",
      mobile: "+966 50 123 4567",
      email: "tariq@client.sa",
      isDefault: true,
    },
  ]);

  // Tab 2 & 3: JOBS & COST BUDGET SCHEDULE
  const [jobs, setJobs] = useState([
    {
      id: "j_1",
      number: "PR001-1",
      title: "Pipe work",
      uom: "kg",
      scope_qty: 120000,
      achieved_qty: 0,
      progress_pct: 0.0,
      unit_price: 2.33,
      contract_amount: 280.0,
      pending_amount: 0.0,
      invoiced_amount: 0.0,
      status: "OPEN",
      original_budget: 280.0,
      co_req_amount: 0.0,
      co_amount: 0.0,
      revised_total: 280.0,
      consumed_cost: 0.0,
      balance: 280.0,
    },
    {
      id: "j_2",
      number: "PR001-2",
      title: "Concrete",
      uom: "M3",
      scope_qty: 2416.4,
      achieved_qty: 0,
      progress_pct: 0.0,
      unit_price: 16.91,
      contract_amount: 40.87,
      pending_amount: 0.0,
      invoiced_amount: 0.0,
      status: "OPEN",
      original_budget: 40.87,
      co_req_amount: 0.0,
      co_amount: 0.0,
      revised_total: 40.87,
      consumed_cost: 0.0,
      balance: 40.87,
    },
    {
      id: "j_3",
      number: "PR001-3",
      title: "Waterproofing",
      uom: "M2",
      scope_qty: 4161.5,
      achieved_qty: 0,
      progress_pct: 0.0,
      unit_price: 220.08,
      contract_amount: 915.87,
      pending_amount: 0.0,
      invoiced_amount: 0.0,
      status: "OPEN",
      original_budget: 915.87,
      co_req_amount: 0.0,
      co_amount: 0.0,
      revised_total: 915.87,
      consumed_cost: 0.0,
      balance: 915.87,
    },
  ]);

  // Tab 11: SETTINGS & GL ACCOUNTS
  const [revenueAccount, setRevenueAccount] = useState("4100 - Project Revenue Account");
  const [equipmentExpenseAccount, setEquipmentExpenseAccount] = useState("5200 - Equipment Expense Account");
  const [labourExpenseAccount, setLabourExpenseAccount] = useState("5100 - Labour Expense Account");
  const [advanceInvoiceAccount, setAdvanceInvoiceAccount] = useState("2200 - Advance Customer Account");
  const [hiredEquipmentAccount, setHiredEquipmentAccount] = useState("5250 - Hired Equipment Account");
  const [subcontractorExpenseAccount, setSubcontractorExpenseAccount] = useState("5300 - Subcontractor Expense Account");

  // Settings Toggles
  const [progressiveInvoice, setProgressiveInvoice] = useState(true);
  const [retentionRequired, setRetentionRequired] = useState(false);
  const [shortTermRetentionRequired, setShortTermRetentionRequired] = useState(false);
  const [performanceBond, setPerformanceBond] = useState(false);
  const [retentionAfterVat, setRetentionAfterVat] = useState(false);
  const [performanceBondAfterVat, setPerformanceBondAfterVat] = useState(false);
  const [notToExceedRule, setNotToExceedRule] = useState(false);
  const [projectActivation, setProjectActivation] = useState(true);

  // Active Job Rate Analysis Breakdown Modal
  const [activeBreakdownJob, setActiveBreakdownJob] = useState(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Fetch metadata
  useEffect(() => {
    if (!isOpen) return;
    api.get("/customers?limit=100").then((r) => setCustomers(r.data.data || [])).catch(() => {});
    api.get("/masters/lookup/site").then((r) => setJobSites(r.data.data || [])).catch(() => {});
    api.get("/masters/lookup/project_type").then((r) => setProjectTypes(r.data.data || [])).catch(() => {});
    api.get("/masters/lookup/service_type").then((r) => setServices(r.data.data || [])).catch(() => {});
  }, [isOpen]);

  // Load Edit Data
  useEffect(() => {
    if (editData && isOpen) {
      setRunningProject(editData.running_project !== false);
      setProposalNo(editData.proposal_no || "PPSL3");
      setProjectNo(editData.code || editData.project_no || "PR001");
      setProjectType(editData.project_type || "Unit Rate");
      setService(editData.service || "CIVIL WORK");
      setProjectName(editData.name || "Fcc tower new");
      setProjectNameAr(editData.project_name_ar || editData.name_ar || "");
      setCustomerId(editData.client_id || "");
      setCustomerName(editData.client_name || "CUST17 - Nesma");
      setJobSite(editData.job_site || "Labour Camp & Accommodation - Riyadh");
      setContractAmount(Number(editData.contract_value || editData.contract_amount || 204872.67));

      setContractNo(editData.contract_no || "");
      setReference(editData.reference || "");
      setStartDate(editData.start_date ? editData.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setEndDate(editData.end_date ? editData.end_date.slice(0, 10) : "");
      setBudgetOverrun(editData.budget_overrun || "Disallow");
      setNotToExceed(Number(editData.not_to_exceed || 0));
      setManagerName(editData.manager_name || "");
      setEngineerName(editData.engineer_name || "");
      setConsultantName(editData.consultant_name || "");
      setRemark(editData.remark || "");
      setDescription(editData.description || "");

      if (editData.jobs && Array.isArray(editData.jobs) && editData.jobs.length) {
        setJobs(editData.jobs);
      }
    }
  }, [editData, isOpen]);

  // Add Contact Row
  const addContactRow = () => {
    setContacts((prev) => [
      ...prev,
      {
        id: `c_${Date.now()}`,
        name: "",
        nameAr: "",
        department: "Projects",
        mobile: "",
        email: "",
        isDefault: false,
      },
    ]);
  };

  // Save Project Handler
  const handleSave = async () => {
    setErrorMsg("");
    if (!projectName.trim()) {
      setErrorMsg("Please enter Project Name.");
      return;
    }

    setBusy(true);
    try {
      const codeStr =
        projectNo.trim() ||
        projectName
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "_")
          .slice(0, 15) ||
        `PR_${Date.now()}`;

      const payload = {
        code: codeStr,
        name: projectName.trim(),
        name_ar: projectNameAr.trim() || null,
        client_name: customerName,
        client_id: customerId || null,
        status: editData?.status || "InProgress",
        contract_value: contractAmount,
        currency: currency === "Saudi Arabian Riyal" ? "SAR" : "SAR",

        running_project: runningProject,
        proposal_no: proposalNo,
        project_no: codeStr,
        project_type: projectType,
        service: service,
        project_name_ar: projectNameAr,
        job_site: jobSite,
        auto_generate_job_no: autoGenerateJobNo,
        contract_amount: contractAmount,

        contract_no: contractNo,
        reference: reference,
        start_date: startDate,
        end_date: endDate,
        budget_overrun: budgetOverrun,
        not_to_exceed: notToExceed,
        extension_no: extensionNo,
        description: description,
        description_ar: descriptionAr,
        manager_name: managerName,
        engineer_name: engineerName,
        consultant_name: consultantName,
        consultant_name_ar: consultantNameAr,
        remark: remark,
        customer_address: customerAddress,
        customer_address_ar: customerAddressAr,
        contacts_data: contacts,

        revenue_account: revenueAccount,
        equipment_expense_account: equipmentExpenseAccount,
        labour_expense_account: labourExpenseAccount,
        advance_invoice_account: advanceInvoiceAccount,
        hired_equipment_account: hiredEquipmentAccount,
        subcontractor_expense_account: subcontractorExpenseAccount,

        progressive_invoice: progressiveInvoice,
        retention_required: retentionRequired,
        short_term_retention_required: shortTermRetentionRequired,
        performance_bond: performanceBond,
        retention_after_vat: retentionAfterVat,
        performance_bond_after_vat: performanceBondAfterVat,
        not_to_exceed_rule: notToExceedRule,
        project_activation: projectActivation,

        jobs: jobs,
      };

      if (editData?.id) {
        await api.put(`/projects/${editData.id}`, payload);
      } else {
        await api.post("/projects", payload);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.response?.data?.message || "Failed to save project. Please check all fields.");
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  const TABS = [
    { key: "GENERAL", label: "GENERAL" },
    { key: "JOBS", label: `JOBS (${jobs.length})` },
    { key: "COST BUDGET", label: "COST BUDGET" },
    { key: "INVOICE", label: "INVOICE" },
    { key: "PROFORMA", label: "PROFORMA" },
    { key: "CHANGE ORDER", label: "CHANGE ORDER" },
    { key: "PAYMILESTONE", label: "PAYMILESTONE" },
    { key: "RELATED DOCS", label: "RELATED DOCS" },
    { key: "HISTORY", label: "HISTORY" },
    { key: "USER", label: "USER" },
    { key: "SETTINGS", label: "SETTINGS" },
  ];

  return (
    <div className="tranquil-modal-overlay" onClick={onClose}>
      <div
        className="tranquil-modal-window project-modal-window"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "98vw",
          maxWidth: 1560,
          height: "94vh",
          background: "#ffffff",
          borderRadius: 10,
          boxShadow: "0 25px 60px rgba(15, 23, 42, 0.45)",
          overflow: "hidden",
        }}
      >
        {/* 1. DARK SLATE HEADER BAR */}
        <div
          style={{
            background: "#0f172a",
            color: "#ffffff",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Project : {projectNo || "PR001"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: 24,
              cursor: "pointer",
              lineHeight: 1,
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* 2. SINGLE SCROLLABLE BODY */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 24px 24px",
            background: "#f8fafc",
          }}
        >
          {errorMsg && (
            <div
              style={{
                marginBottom: 14,
                padding: "10px 14px",
                borderRadius: 6,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: 13,
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {/* TOP HEADER PARAMETERS BLOCK (LIGHT BLUE BACKGROUND MATCHING SCREENSHOTS 1-5) */}
          <div
            style={{
              background: "#e0f2fe", // Tranquil blue panel
              padding: "16px 20px",
              borderRadius: 8,
              border: "1px solid #bae6fd",
              marginBottom: 16,
            }}
          >
            {/* Top Toggle: RUNNING PROJECT */}
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 750,
                  color: "#334155",
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                }}
              >
                <input
                  type="checkbox"
                  checked={runningProject}
                  onChange={(e) => setRunningProject(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: "#0ba360" }}
                />
                <span>RUNNING PROJECT</span>
              </label>
            </div>

            {/* Row 1 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1.5fr 1.5fr 2fr",
                gap: 14,
                marginBottom: 12,
              }}
            >
              <div>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 750, color: "#475569", textTransform: "uppercase" }}>
                  PROPOSAL NO.
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: "100%", height: 33, fontSize: 12.5, background: "#fff" }}
                  value={proposalNo}
                  onChange={(e) => setProposalNo(e.target.value)}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 750, color: "#475569", textTransform: "uppercase" }}>
                  PROJECT NO. *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: "100%", height: 33, fontSize: 12.5, background: "#fff" }}
                  value={projectNo}
                  onChange={(e) => setProjectNo(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 750, color: "#475569", textTransform: "uppercase" }}>
                  PROJECT TYPE
                </label>
                <select
                  className="select"
                  style={{ width: "100%", height: 33, fontSize: 12.5, background: "#fff" }}
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                >
                  <option value="Unit Rate">Unit Rate</option>
                  <option value="Lump Sum">Lump Sum</option>
                  <option value="Cost Plus">Cost Plus</option>
                </select>
              </div>

              <div>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 750, color: "#475569", textTransform: "uppercase" }}>
                  SERVICE
                </label>
                <select
                  className="select"
                  style={{ width: "100%", height: 33, fontSize: 12.5, background: "#fff" }}
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                >
                  <option value="CIVIL WORK">CIVIL WORK</option>
                  <option value="MEP WORK">MEP WORK</option>
                  <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
                </select>
              </div>
            </div>

            {/* Row 2 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginBottom: 12,
              }}
            >
              <div>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 750, color: "#475569", textTransform: "uppercase" }}>
                  PROJECT NAME *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: "100%", height: 33, fontSize: 12.5, background: "#fff" }}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 750, color: "#475569", textTransform: "uppercase" }}>
                  PROJECT NAME ARABIC
                </label>
                <input
                  type="text"
                  className="input"
                  dir="rtl"
                  style={{ width: "100%", height: 33, fontSize: 12.5, background: "#fff" }}
                  value={projectNameAr}
                  onChange={(e) => setProjectNameAr(e.target.value)}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2.5fr 1.5fr auto",
                gap: 14,
                alignItems: "center",
              }}
            >
              <div>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 750, color: "#475569", textTransform: "uppercase" }}>
                  CUSTOMER
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: "100%", height: 33, fontSize: 12.5, background: "#fff" }}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 750, color: "#475569", textTransform: "uppercase" }}>
                  JOB SITE
                </label>
                <select
                  className="select"
                  style={{ width: "100%", height: 33, fontSize: 12.5, background: "#fff" }}
                  value={jobSite}
                  onChange={(e) => setJobSite(e.target.value)}
                >
                  <option value="Labour Camp & Accommodation - Riyadh">Labour Camp & Accommodation - Riyadh</option>
                  <option value="Jeddah North Port Site">Jeddah North Port Site</option>
                  <option value="Dammam Industrial Yard">Dammam Industrial Yard</option>
                </select>
              </div>

              <div style={{ paddingTop: 18 }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#334155", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={autoGenerateJobNo}
                    onChange={(e) => setAutoGenerateJobNo(e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: "#0ba360" }}
                  />
                  <span>AUTO-GENERATE JOB NO</span>
                </label>
              </div>
            </div>

            {/* Row 4 */}
            <div style={{ display: "flex", gap: 24, alignItems: "center", marginTop: 10 }}>
              <div style={{ width: 220 }}>
                <label className="label" style={{ fontSize: 10.5, fontWeight: 750, color: "#475569", textTransform: "uppercase" }}>
                  CURRENCY
                </label>
                <select
                  className="select"
                  style={{ width: "100%", height: 33, fontSize: 12.5, background: "#fff" }}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="Saudi Arabian Riyal">Saudi Arabian Riyal (SAR)</option>
                  <option value="US Dollar">US Dollar (USD)</option>
                </select>
              </div>

              <div>
                <span style={{ fontSize: 10.5, fontWeight: 750, color: "#475569", display: "block" }}>CONTRACT AMOUNT</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#ea580c" }}>
                  ﷼ {contractAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* 3. NAVIGATION TABS RIBBON MATCHING SCREENSHOTS */}
          <div style={{ borderBottom: "2px solid #cbd5e1", marginBottom: 16, display: "flex", gap: 18, overflowX: "auto" }}>
            {TABS.map((tb) => (
              <button
                key={tb.key}
                type="button"
                onClick={() => setActiveTab(tb.key)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === tb.key ? "3px solid #ea580c" : "3px solid transparent",
                  padding: "8px 4px",
                  fontSize: 12,
                  fontWeight: activeTab === tb.key ? 750 : 600,
                  color: activeTab === tb.key ? "#ea580c" : "#64748b",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {tb.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT PANELS */}

          {/* TAB 1: GENERAL */}
          {activeTab === "GENERAL" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Row 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 1.5fr", gap: 14 }}>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>CONTRACT NO.</label>
                  <input type="text" className="input" style={{ width: "100%", height: 33, fontSize: 12 }} value={contractNo} onChange={(e) => setContractNo(e.target.value)} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>REFERENCE</label>
                  <input type="text" className="input" style={{ width: "100%", height: 33, fontSize: 12 }} value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>START DATE</label>
                  <input type="date" className="input" style={{ width: "100%", height: 33, fontSize: 12 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>END DATE</label>
                  <input type="date" className="input" style={{ width: "100%", height: 33, fontSize: 12 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>BUDGET OVERRUN</label>
                  <select className="select" style={{ width: "100%", height: 33, fontSize: 12 }} value={budgetOverrun} onChange={(e) => setBudgetOverrun(e.target.value)}>
                    <option value="Disallow">Disallow</option>
                    <option value="Allow Warning">Allow Warning</option>
                    <option value="Allow Free">Allow Free</option>
                  </select>
                </div>
              </div>

              {/* Row 2 */}
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 2fr", gap: 14 }}>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>NOT TO EXCEED</label>
                  <input type="number" className="input" style={{ width: "100%", height: 33, fontSize: 12 }} value={notToExceed} onChange={(e) => setNotToExceed(e.target.value)} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>EXTENSION NO</label>
                  <input type="text" className="input" style={{ width: "100%", height: 33, fontSize: 12 }} value={extensionNo} onChange={(e) => setExtensionNo(e.target.value)} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>PARENT PROJECT</label>
                  <select className="select" style={{ width: "100%", height: 33, fontSize: 12 }} value={parentProject} onChange={(e) => setParentProject(e.target.value)}>
                    <option value="">Select an Option</option>
                  </select>
                </div>
              </div>

              {/* Text Areas: DESCRIPTION & DESCRIPTION ARABIC */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>DESCRIPTION</label>
                  <textarea rows={3} className="input" style={{ width: "100%", padding: 8, fontSize: 12 }} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>DESCRIPTION ARABIC</label>
                  <textarea rows={3} className="input" dir="rtl" style={{ width: "100%", padding: 8, fontSize: 12 }} value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} />
                </div>
              </div>

              {/* Manager & Consultant details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>MANAGER NAME</label>
                  <input type="text" className="input" style={{ width: "100%", height: 33, fontSize: 12 }} value={managerName} onChange={(e) => setManagerName(e.target.value)} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>CONTACT NO.</label>
                  <input type="text" className="input" style={{ width: "100%", height: 33, fontSize: 12 }} value={contactNo} onChange={(e) => setContactNo(e.target.value)} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>EMAIL</label>
                  <input type="email" className="input" style={{ width: "100%", height: 33, fontSize: 12 }} value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>ENGINEER NAME</label>
                  <input type="text" className="input" style={{ width: "100%", height: 33, fontSize: 12 }} value={engineerName} onChange={(e) => setEngineerName(e.target.value)} />
                </div>
              </div>

              {/* Contact Person Schedule Table */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ea580c", marginBottom: 6 }}>Contact Person</div>
                <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", color: "#334155" }}>
                        <th style={{ padding: "8px 6px", width: 45 }}>SL NO.</th>
                        <th style={{ padding: "8px 10px" }}>CONTACT PERSON</th>
                        <th style={{ padding: "8px 10px" }}>CONTACT PERSON NAME ARABIC</th>
                        <th style={{ padding: "8px 10px" }}>DEPARTMENT</th>
                        <th style={{ padding: "8px 10px" }}>MOBILE</th>
                        <th style={{ padding: "8px 10px" }}>EMAIL</th>
                        <th style={{ padding: "8px 6px", textAlign: "center" }}>DEFAULT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((c, idx) => (
                        <tr key={c.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ textAlign: "center" }}>{idx + 1}</td>
                          <td><input type="text" className="input" style={{ width: "100%", height: 28, fontSize: 11.5 }} value={c.name} onChange={(e) => { const next = [...contacts]; next[idx].name = e.target.value; setContacts(next); }} /></td>
                          <td><input type="text" className="input" dir="rtl" style={{ width: "100%", height: 28, fontSize: 11.5 }} value={c.nameAr} onChange={(e) => { const next = [...contacts]; next[idx].nameAr = e.target.value; setContacts(next); }} /></td>
                          <td><input type="text" className="input" style={{ width: "100%", height: 28, fontSize: 11.5 }} value={c.department} onChange={(e) => { const next = [...contacts]; next[idx].department = e.target.value; setContacts(next); }} /></td>
                          <td><input type="text" className="input" style={{ width: "100%", height: 28, fontSize: 11.5 }} value={c.mobile} onChange={(e) => { const next = [...contacts]; next[idx].mobile = e.target.value; setContacts(next); }} /></td>
                          <td><input type="text" className="input" style={{ width: "100%", height: 28, fontSize: 11.5 }} value={c.email} onChange={(e) => { const next = [...contacts]; next[idx].email = e.target.value; setContacts(next); }} /></td>
                          <td style={{ textAlign: "center" }}><input type="checkbox" checked={c.isDefault} onChange={(e) => { const next = [...contacts]; next[idx].isDefault = e.target.checked; setContacts(next); }} style={{ accentColor: "#0ba360" }} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={addContactRow} style={{ background: "#ea580c", color: "#fff", border: "none", borderRadius: 4, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, marginTop: 6, cursor: "pointer" }}>
                  + Add Row
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: JOBS (MATCHING SCREENSHOT 2) */}
          {activeTab === "JOBS" && (
            <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: "#005b82", color: "#ffffff" }}>
                    <th style={{ padding: "8px 6px", width: 35 }}><input type="checkbox" /></th>
                    <th style={{ padding: "8px 6px", width: 45 }}>SL NO.</th>
                    <th style={{ padding: "8px 8px" }}>START DATE</th>
                    <th style={{ padding: "8px 8px" }}>JOB NO.</th>
                    <th style={{ padding: "8px 10px" }}>JOB</th>
                    <th style={{ padding: "8px 6px" }}>UOM</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>SCOPE</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>ACHIEVED</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>COMPLETED %</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>CONTRACT</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>PENDING</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>INVOICED</th>
                    <th style={{ padding: "8px 8px" }}>STATUS</th>
                    <th style={{ padding: "8px 8px", textAlign: "center" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j, idx) => (
                    <tr key={j.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ textAlign: "center" }}><input type="checkbox" /></td>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td>—</td>
                      <td style={{ fontWeight: 700, color: "#005b82" }}>{j.number}</td>
                      <td style={{ fontWeight: 600 }}>{j.title}</td>
                      <td>{j.uom}</td>
                      <td style={{ textAlign: "right" }}>{j.scope_qty}</td>
                      <td style={{ textAlign: "right" }}>{j.achieved_qty}</td>
                      <td style={{ textAlign: "right" }}>{j.progress_pct.toFixed(2)}%</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{j.contract_amount.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{j.pending_amount.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{j.invoiced_amount.toFixed(2)}</td>
                      <td><span className="badge Approved sm">{j.status}</span></td>
                      <td style={{ textAlign: "center" }}>
                        <select
                          className="select"
                          style={{ height: 26, fontSize: 11, padding: "0 4px" }}
                          value=""
                          onChange={(e) => {
                            if (e.target.value === "breakdown") setActiveBreakdownJob(j);
                          }}
                        >
                          <option value="">ACTION ▾</option>
                          <option value="breakdown">Rate Analysis Breakdown</option>
                          <option value="edit">Edit Job</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: COST BUDGET (MATCHING SCREENSHOT 3) */}
          {activeTab === "COST BUDGET" && (
            <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: "#005b82", color: "#ffffff" }}>
                    <th style={{ padding: "8px 6px", width: 45 }}>SL NO.</th>
                    <th style={{ padding: "8px 8px" }}>JOB NO.</th>
                    <th style={{ padding: "8px 10px" }}>JOB</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>ORIGINAL BUDGET</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>CO REQ AMOUNT</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>CO AMOUNT</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>REVISED TOTAL</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>CONSUMED</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>BALANCE</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>PERFORMANCE %</th>
                    <th style={{ padding: "8px 8px", textAlign: "center" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j, idx) => (
                    <tr key={j.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td style={{ fontWeight: 700, color: "#005b82" }}>{j.number}</td>
                      <td style={{ fontWeight: 600 }}>{j.title}</td>
                      <td style={{ textAlign: "right" }}>{j.original_budget.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{j.co_req_amount.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{j.co_amount.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{j.revised_total.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{j.consumed_cost.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{j.balance.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>0.00</td>
                      <td style={{ textAlign: "center" }}>
                        <button type="button" style={{ background: "#ea580c", color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
                          SET BUDGET
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 11: SETTINGS (MATCHING SCREENSHOT 5) */}
          {activeTab === "SETTINGS" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
              {/* Left Column: GL Account Selectors */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "PROJECT REVENUE ACCOUNT", val: revenueAccount, set: setRevenueAccount },
                  { label: "EQUIPMENT EXPENSE ACCOUNT", val: equipmentExpenseAccount, set: setEquipmentExpenseAccount },
                  { label: "LABOUR EXPENSE ACCOUNT", val: labourExpenseAccount, set: setLabourExpenseAccount },
                  { label: "ADVANCE INVOICE ACCOUNT", val: advanceInvoiceAccount, set: setAdvanceInvoiceAccount },
                  { label: "HIRED EQUIPMENT ACCOUNT", val: hiredEquipmentAccount, set: setHiredEquipmentAccount },
                  { label: "SUBCONTRACTOR EXPENSE ACCOUNT", val: subcontractorExpenseAccount, set: setSubcontractorExpenseAccount },
                ].map((item, idx) => (
                  <div key={idx}>
                    <label className="label" style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>{item.label}</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <select className="select" style={{ flex: 1, height: 33, fontSize: 12.5 }} value={item.val} onChange={(e) => item.set(e.target.value)}>
                        <option value={item.val}>{item.val}</option>
                        <option value="Select Account">Select Account</option>
                      </select>
                      <button type="button" style={{ background: "#ea580c", color: "#fff", border: "none", borderRadius: 4, width: 32, height: 33, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Financial Toggles & Email Alerts */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#fff", padding: "16px", borderRadius: 8, border: "1px solid #cbd5e1" }}>
                  {[
                    { label: "PROGRESSIVE INVOICE", val: progressiveInvoice, set: setProgressiveInvoice },
                    { label: "RETENTION REQUIRED", val: retentionRequired, set: setRetentionRequired },
                    { label: "SHORT TERM RETENTION REQUIRED", val: shortTermRetentionRequired, set: setShortTermRetentionRequired },
                    { label: "PERFORMANCE BOND", val: performanceBond, set: setPerformanceBond },
                    { label: "RETENTION AFTER VAT", val: retentionAfterVat, set: setRetentionAfterVat },
                    { label: "PERFORMANCE BOND AFTER VAT", val: performanceBondAfterVat, set: setPerformanceBondAfterVat },
                    { label: "NOT TO EXCEED", val: notToExceedRule, set: setNotToExceedRule },
                    { label: "PROJECT ACTIVATION", val: projectActivation, set: setProjectActivation },
                  ].map((tg, i) => (
                    <label key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 750, color: "#334155", cursor: "pointer" }}>
                      <input type="checkbox" checked={tg.val} onChange={(e) => tg.set(e.target.checked)} style={{ width: 15, height: 15, accentColor: "#0ba360" }} />
                      <span>{tg.label}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", marginBottom: 6 }}>Email Notification</div>
                  <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                      <thead>
                        <tr style={{ background: "#005b82", color: "#fff" }}>
                          <th style={{ padding: "8px 10px" }}>REMINDER</th>
                          <th style={{ padding: "8px 10px" }}>EMPLOYEE</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: 8 }}>Payment Milestone</td>
                          <td style={{ padding: 8 }}>
                            <select className="select" style={{ width: "100%", height: 28, fontSize: 11.5 }}>
                              <option value="">Select Employee</option>
                            </select>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. PINNED FOOTER */}
        <div
          style={{
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              padding: "8px 22px",
              fontSize: 13,
              fontWeight: 650,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            style={{
              background: activeTab === "SETTINGS" ? "#0ba360" : "#0ba360",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              padding: "8px 26px",
              fontSize: 13,
              fontWeight: 750,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Saving..." : activeTab === "SETTINGS" ? "UPDATE" : "SAVE PROJECT"}
          </button>
        </div>
      </div>

      {/* RATE ANALYSIS BREAKDOWN MODAL */}
      <TranquilJobBreakdownModal
        isOpen={Boolean(activeBreakdownJob)}
        onClose={() => setActiveBreakdownJob(null)}
        jobData={activeBreakdownJob}
        onSaved={() => {
          setActiveBreakdownJob(null);
        }}
      />
    </div>
  );
}
