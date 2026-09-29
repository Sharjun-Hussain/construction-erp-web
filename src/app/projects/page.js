"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

const HEADS = ["Material", "Labor", "Equipment", "Subcontract", "Overhead"];
const PROJECT_TYPES = [
  "Commercial",
  "Residential",
  "Infrastructure & Roads",
  "Industrial & Warehousing",
  "Hospitality & Tourism",
  "Healthcare & Clinics",
  "Educational & Schools",
  "Fit-Out & Interior Design",
  "Mega & Master Developments",
];
const DELIVERY_METHODS = [
  "General Contracting (Lump Sum)",
  "EPC / Turnkey (Engineering, Procurement & Construction)",
  "Design & Build",
  "Construction Management (CM)",
  "Trade Package Subcontract",
];
const CONTRACT_TYPES = [
  "FIDIC Red Book (Measurement & BOQ)",
  "FIDIC Yellow Book (Plant & Design-Build)",
  "FIDIC Silver Book (EPC Turnkey)",
  "Standard Saudi Government Contract (Etimad)",
  "Lump Sum Turnkey",
  "Cost Plus Fixed Fee / Percentage",
];
const ADVANCE_RECOVERY_MODES = [
  "Pro-rata deduction from each IPC",
  "Immediate recovery from initial IPCs",
  "Milestone completion deduction",
  "Equal monthly deductions",
];
const RETENTION_RELEASE_MODES = [
  "50% on TOC (Taking Over) & 50% on DLC (Final)",
  "100% on TOC with Maintenance Bank Guarantee",
  "100% on Final Acceptance Certificate",
];
const SAUDI_CITIES = [
  "Riyadh",
  "Jeddah",
  "Dammam",
  "Mecca",
  "Medina",
  "Khobar",
  "Neom",
  "Tabuk",
  "Al-Ula",
  "Dhahran",
  "Yanbu",
  "Jizan",
  "Jubail",
  "Abha",
];
const PAYMENT_TERMS_LIST = [
  "Immediate on Approval",
  "Net 15 Days",
  "Net 30 Days",
  "Net 45 Days",
  "Net 60 Days",
  "Net 90 Days",
];

const empty = {
  // 1. General & Classification
  code: "",
  name: "",
  name_ar: "",
  project_type: "Commercial",
  delivery_method: "General Contracting (Lump Sum)",
  cost_center: "Central Region HQ",
  status: "Draft",

  // 2. Stakeholders & Authorities
  client_name: "",
  client_cr_vat: "",
  client_rep: "",
  client_phone: "",
  client_email: "",
  consultant_name: "",
  consultant_rep: "",
  consultant_phone: "",

  // 3. Commercial & Contract Terms
  contract_no: "",
  contract_type: "FIDIC Red Book (Measurement & BOQ)",
  contract_value: 0,
  currency: "SAR",
  vat_pct: 15,
  advance_pct: 10,
  advance_recovery_type: "Pro-rata deduction from each IPC",
  advance_guarantee_ref: "",
  retention_pct: 10,
  retention_release_terms: "50% on TOC (Taking Over) & 50% on DLC (Final)",
  performance_bond_pct: 5,
  performance_bond_ref: "",
  dlp_days: 365,
  liquidated_damages_pct: 10,
  billing_type: "Monthly",
  payment_terms: "Net 30 Days",

  // 4. Site Location & Timeline
  city: "Riyadh",
  district: "",
  plot_no: "",
  permit_no: "",
  address: "",
  handover_date: "",
  start_date: "",
  end_date: "",
  description: "",

  // 5. Budget & Contingency
  contingency_pct: 3,
};

// Helper to serialize rich Tranquil metadata into description
function serializeTranquil(formObj) {
  const meta = {
    project_type: formObj.project_type || "Commercial",
    delivery_method: formObj.delivery_method || "General Contracting",
    cost_center: formObj.cost_center || "Central Region HQ",
    client_cr_vat: formObj.client_cr_vat || "",
    client_rep: formObj.client_rep || "",
    consultant_name: formObj.consultant_name || "",
    consultant_rep: formObj.consultant_rep || "",
    consultant_phone: formObj.consultant_phone || "",
    contract_type: formObj.contract_type || "FIDIC Red Book",
    advance_recovery_type: formObj.advance_recovery_type || "Pro-rata",
    advance_guarantee_ref: formObj.advance_guarantee_ref || "",
    retention_release_terms: formObj.retention_release_terms || "50/50",
    performance_bond_pct: formObj.performance_bond_pct ?? 5,
    performance_bond_ref: formObj.performance_bond_ref || "",
    dlp_days: formObj.dlp_days ?? 365,
    liquidated_damages_pct: formObj.liquidated_damages_pct ?? 10,
    district: formObj.district || "",
    plot_no: formObj.plot_no || "",
    permit_no: formObj.permit_no || "",
    handover_date: formObj.handover_date || "",
    contingency_pct: formObj.contingency_pct ?? 3,
  };

  const rawNotes = (formObj.description || "")
    .replace(/<!--TRANQUIL_META:[\s\S]*?:TRANQUIL_META-->/g, "")
    .replace(/\[Tranquil QS Info[\s\S]*?\]/g, "")
    .trim();

  const metaString = `<!--TRANQUIL_META:${JSON.stringify(meta)}:TRANQUIL_META-->`;
  return rawNotes ? `${rawNotes}\n\n${metaString}` : metaString;
}

// Helper to deserialize rich Tranquil metadata from description
function deserializeTranquil(rawDesc) {
  if (!rawDesc) return { notes: "", meta: {} };

  let meta = {};
  const jsonMatch = rawDesc.match(/<!--TRANQUIL_META:([\s\S]*?):TRANQUIL_META-->/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      meta = JSON.parse(jsonMatch[1]);
    } catch (_) {}
  } else {
    // Fallback for earlier plain-text tags: [Tranquil QS Info | Sector: ... | Consultant: ...]
    const tagMatch = rawDesc.match(/\[Tranquil QS Info \| Sector: (.*?) \| Consultant: (.*?) \| ContractType: (.*?) \| Bond: (.*?)%\]/);
    if (tagMatch) {
      meta.project_type = tagMatch[1];
      meta.consultant_name = tagMatch[2] === "N/A" ? "" : tagMatch[2];
      meta.contract_type = tagMatch[3];
      meta.performance_bond_pct = Number(tagMatch[4]) || 5;
    }
  }

  const notes = rawDesc
    .replace(/<!--TRANQUIL_META:[\s\S]*?:TRANQUIL_META-->/g, "")
    .replace(/\[Tranquil QS Info[\s\S]*?\]/g, "")
    .trim();

  return { notes, meta };
}

export default function Projects() {
  const router = useRouter();
  const { lang } = useAppStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("DESC");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [counts, setCounts] = useState({ active: 0, done: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  // URL Parameter state: ?new=1, ?view=<id>, ?edit=<id>
  const [showNew, setShowNew] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(empty);
  const [editLoading, setEditLoading] = useState(false);
  const [editActiveTab, setEditActiveTab] = useState("edit-basic");

  // New Project Form state
  const [form, setForm] = useState(empty);
  const [activeTab, setActiveTab] = useState("sec-basic");
  const [budgets, setBudgets] = useState(HEADS.map((h) => ({ head: h, budgeted: 0 })));
  const [team, setTeam] = useState([
    { member_name: "", role: "Project Manager", phone: "" },
    { member_name: "", role: "Lead Quantity Surveyor (QS)", phone: "" },
    { member_name: "", role: "Site Construction Engineer", phone: "" },
  ]);
  const [miles, setMiles] = useState([
    { title: "Site Handover & Mobilization", due_date: "", weight_pct: 10 },
    { title: "Substructure & Foundation Package", due_date: "", weight_pct: 25 },
    { title: "Superstructure Frame & Core Works", due_date: "", weight_pct: 35 },
    { title: "MEP Rough-in & Architectural Finishes", due_date: "", weight_pct: 20 },
    { title: "Testing, Commissioning & Handover (TOC)", due_date: "", weight_pct: 10 },
  ]);
  const [busy, setBusy] = useState(false);

  // Live Tranquil calculations (Create Sheet)
  const contractValNum = Number(form.contract_value) || 0;
  const vatRateNum = Number(form.vat_pct) || 0;
  const vatValSar = (contractValNum * vatRateNum) / 100;
  const grossContractSar = contractValNum + vatValSar;
  const advanceValSar = (contractValNum * (Number(form.advance_pct) || 0)) / 100;
  const retentionValSar = (contractValNum * (Number(form.retention_pct) || 0)) / 100;
  const performanceBondSar = (contractValNum * (Number(form.performance_bond_pct) || 0)) / 100;

  const totalBudgetCost = useMemo(
    () => budgets.reduce((sum, b) => sum + (Number(b.budgeted) || 0), 0),
    [budgets]
  );
  const contingencySar = (totalBudgetCost * (Number(form.contingency_pct) || 0)) / 100;
  const totalBudgetWithContingency = totalBudgetCost + contingencySar;
  const projectedMarginSar = contractValNum - totalBudgetWithContingency;
  const projectedMarginPct =
    contractValNum > 0 ? ((projectedMarginSar / contractValNum) * 100).toFixed(1) : 0;

  const durationDays = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    const s = new Date(form.start_date);
    const e = new Date(form.end_date);
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [form.start_date, form.end_date]);
  const durationMonths = durationDays > 0 ? (durationDays / 30.4).toFixed(1) : 0;

  const totalMilestoneWeight = useMemo(
    () => miles.reduce((sum, m) => sum + (Number(m.weight_pct) || 0), 0),
    [miles]
  );

  // Live Calculations (Edit Sheet)
  const editContractValNum = Number(editForm.contract_value) || 0;
  const editVatValSar = (editContractValNum * (Number(editForm.vat_pct) || 0)) / 100;
  const editGrossSar = editContractValNum + editVatValSar;
  const editAdvanceValSar = (editContractValNum * (Number(editForm.advance_pct) || 0)) / 100;
  const editRetentionValSar = (editContractValNum * (Number(editForm.retention_pct) || 0)) / 100;
  const editDurationDays = useMemo(() => {
    if (!editForm.start_date || !editForm.end_date) return 0;
    const s = new Date(editForm.start_date);
    const e = new Date(editForm.end_date);
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [editForm.start_date, editForm.end_date]);

  // Synchronize state with URL parameters
  const updateUrlParam = useCallback((setMap = {}, removeKeys = []) => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    removeKeys.forEach((k) => sp.delete(k));
    Object.entries(setMap).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
      else sp.delete(k);
    });
    const qs = sp.toString();
    const newUrl = window.location.pathname + (qs ? "?" + qs : "");
    window.history.pushState(null, "", newUrl);
  }, []);

  const syncFromUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const n = sp.get("new");
    const v = sp.get("view");
    const e = sp.get("edit");

    setShowNew(n === "1" || n === "true");
    setViewId(v || null);
    setEditId(e || null);
  }, []);

  useEffect(() => {
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [syncFromUrl]);

  // Drawer open / close handlers
  const openNew = () => {
    setShowNew(true);
    setViewId(null);
    setEditId(null);
    updateUrlParam({ new: "1" }, ["view", "edit"]);
  };

  const closeNew = () => {
    setShowNew(false);
    updateUrlParam({}, ["new"]);
  };

  const openView = (id) => {
    setViewId(id);
    setShowNew(false);
    setEditId(null);
    updateUrlParam({ view: id }, ["new", "edit"]);
  };

  const closeView = () => {
    setViewId(null);
    setViewData(null);
    updateUrlParam({}, ["view"]);
  };

  const openEdit = (id) => {
    setEditId(id);
    setShowNew(false);
    setViewId(null);
    updateUrlParam({ edit: id }, ["new", "view"]);
  };

  const closeEdit = () => {
    setEditId(null);
    updateUrlParam({}, ["edit"]);
  };

  // Fetch View details
  useEffect(() => {
    if (!viewId) {
      setViewData(null);
      return;
    }
    setViewLoading(true);
    api.get("/projects/" + viewId)
      .then((r) => {
        const raw = r.data.data;
        if (!raw) {
          setViewData(null);
          return;
        }
        const { notes, meta } = deserializeTranquil(raw.description);
        setViewData({
          ...raw,
          clean_notes: notes,
          tranquil_meta: meta,
        });
      })
      .catch(() => setViewData(null))
      .finally(() => setViewLoading(false));
  }, [viewId]);

  // Fetch Edit details
  useEffect(() => {
    if (!editId) return;
    setEditLoading(true);
    api.get("/projects/" + editId)
      .then((r) => {
        const d = r.data.data || {};
        const { notes, meta } = deserializeTranquil(d.description);
        setEditForm({
          code: d.code || "",
          name: d.name || "",
          name_ar: d.name_ar || "",
          project_type: meta.project_type || d.project_type || "Commercial",
          delivery_method: meta.delivery_method || "General Contracting (Lump Sum)",
          cost_center: meta.cost_center || "Central Region HQ",
          status: d.status || "Draft",

          client_name: d.client_name || "",
          client_cr_vat: meta.client_cr_vat || "",
          client_rep: meta.client_rep || "",
          client_phone: d.client_phone || "",
          client_email: d.client_email || "",
          consultant_name: meta.consultant_name || d.consultant_name || "",
          consultant_rep: meta.consultant_rep || "",
          consultant_phone: meta.consultant_phone || "",

          contract_no: d.contract_no || "",
          contract_type: meta.contract_type || d.contract_type || "FIDIC Red Book (Measurement & BOQ)",
          contract_value: d.contract_value || 0,
          currency: d.currency || "SAR",
          vat_pct: d.vat_pct ?? 15,
          advance_pct: d.advance_pct ?? 10,
          advance_recovery_type: meta.advance_recovery_type || "Pro-rata deduction from each IPC",
          advance_guarantee_ref: meta.advance_guarantee_ref || "",
          retention_pct: d.retention_pct ?? 10,
          retention_release_terms: meta.retention_release_terms || "50% on TOC (Taking Over) & 50% on DLC (Final)",
          performance_bond_pct: meta.performance_bond_pct ?? d.performance_bond_pct ?? 5,
          performance_bond_ref: meta.performance_bond_ref || "",
          dlp_days: meta.dlp_days ?? 365,
          liquidated_damages_pct: meta.liquidated_damages_pct ?? 10,
          billing_type: d.billing_type || "Monthly",
          payment_terms: d.payment_terms || "Net 30 Days",

          city: d.city || "Riyadh",
          district: meta.district || "",
          plot_no: meta.plot_no || "",
          permit_no: meta.permit_no || "",
          address: d.address || "",
          handover_date: meta.handover_date || "",
          start_date: d.start_date ? d.start_date.slice(0, 10) : "",
          end_date: d.end_date ? d.end_date.slice(0, 10) : "",
          description: notes || "",

          contingency_pct: meta.contingency_pct ?? 3,
        });
      })
      .catch(() => {})
      .finally(() => setEditLoading(false));
  }, [editId]);

  // Load project rows
  const load = (p = page, l = limit, sb = sortBy, sd = sortDir, sQuery = search) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`, `sortBy=${sb}`, `sortDir=${sd}`];
    if (sQuery) q.push("search=" + encodeURIComponent(sQuery));
    if (status) q.push("status=" + status);
    api.get("/projects?" + q.join("&")).then((r) => {
      setRows(r.data.data || []);
      setTotal(r.data.meta?.total || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
    api.get("/projects?limit=1&status=InProgress").then((r) => setCounts((c) => ({ ...c, active: r.data.meta?.total || 0 }))).catch(() => {});
    api.get("/projects?limit=1&status=Completed").then((r) => setCounts((c) => ({ ...c, done: r.data.meta?.total || 0 }))).catch(() => {});
  };

  useEffect(() => { load(1, limit, sortBy, sortDir); setPage(1); setSelected([]); }, [status]);
  useEffect(() => {
    const timer = setTimeout(() => {
      load(1, limit, sortBy, sortDir, search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const onSort = (k) => {
    const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC";
    setSortBy(k); setSortDir(nd); load(page, limit, k, nd);
  };

  const bulkDelete = async (ids) => {
    if (!window.confirm(t(lang, "confirmBulk"))) return;
    try {
      const r = await api.delete("/projects/bulk", { data: { ids } });
      setMsg(r.data.data.deleted + " deleted" + (r.data.data.skipped.length ? `, ${r.data.data.skipped.length} skipped (has transactions)` : ""));
      setSelected([]);
      load();
    } catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setVal = (k, v) => setForm({ ...form, [k]: v });
  const setEdit = (k) => (e) => setEditForm({ ...editForm, [k]: e.target.value });
  const setEditVal = (k, v) => setEditForm({ ...editForm, [k]: v });

  // Auto-generate next project code
  const autoGenerateCode = () => {
    const yr = new Date().getFullYear();
    const num = String(total + 1).padStart(3, "0");
    setVal("code", `PRJ-${yr}-${num}`);
  };

  // Create Project submit
  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const packagedDesc = serializeTranquil(form);

      const r = await api.post("/projects", {
        code: form.code,
        name: form.name,
        name_ar: form.name_ar,
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_email: form.client_email,
        city: form.city,
        address: form.address,
        description: packagedDesc,
        status: form.status || "Draft",
        contract_value: Number(form.contract_value || 0),
        currency: form.currency || "SAR",
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        retention_pct: Number(form.retention_pct || 0),
        vat_pct: Number(form.vat_pct || 0),
        advance_pct: Number(form.advance_pct || 0),
        contract_no: form.contract_no || null,
        billing_type: form.billing_type || "Monthly",
        payment_terms: form.payment_terms || "Net 30 Days",
      });

      const id = r.data.data.id;
      const jobs = [
        api.post(`/projects/${id}/budget`, {
          items: budgets.filter((b) => Number(b.budgeted) > 0).map((b) => ({ head: b.head, budgeted: Number(b.budgeted) }))
        }),
        ...team.filter((x) => x.member_name).map((x) => api.post(`/projects/${id}/members`, x)),
        ...miles.filter((x) => x.title).map((x) => api.post("/site/milestones", { ...x, project_id: id, weight_pct: Number(x.weight_pct || 0) })),
      ];
      await Promise.all(jobs.map((p) => p.catch(() => null)));
      setMsg("Project created successfully with Tranquil Construction Master parameters");
      closeNew();
      load();
      router.push("/projects/" + id);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to create project");
    } finally {
      setBusy(false);
    }
  };

  // Update Project submit
  const updateProject = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const packagedDesc = serializeTranquil(editForm);

      await api.put("/projects/" + editId, {
        code: editForm.code,
        name: editForm.name,
        name_ar: editForm.name_ar,
        client_name: editForm.client_name,
        client_phone: editForm.client_phone,
        client_email: editForm.client_email,
        city: editForm.city,
        address: editForm.address,
        description: packagedDesc,
        contract_value: Number(editForm.contract_value || 0),
        currency: editForm.currency || "SAR",
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        retention_pct: Number(editForm.retention_pct || 0),
        vat_pct: Number(editForm.vat_pct || 0),
        advance_pct: Number(editForm.advance_pct || 0),
        contract_no: editForm.contract_no || null,
        billing_type: editForm.billing_type || "Monthly",
        payment_terms: editForm.payment_terms || "Net 30 Days",
      });

      setMsg("Project updated successfully");
      closeEdit();
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const row = (list, setList, i, k) => (e) => setList(list.map((x, j) => j === i ? { ...x, [k]: e.target.value } : x));

  const columns = [
    {
      key: "code",
      label: "Project",
      sortable: true,
      render: (p) => (
        <button
          type="button"
          className="bigin-cell-link"
          onClick={() => openView(p.id)}
          title={`Click to preview ${p.name}`}
        >
          <div style={{ fontWeight: 750, color: "#0ba360" }}>{p.code}</div>
          <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 500 }}>{p.name}</div>
        </button>
      ),
    },
    {
      key: "client_name",
      label: "Client / Organization",
      sortable: true,
      render: (p) => <BiginAvatar name={p.client_name || "—"} />,
    },
    {
      key: "city",
      label: "Location",
      sortable: true,
      render: (p) => p.city || "—",
    },
    {
      key: "contract_value",
      label: "Contract Value (SAR)",
      sortable: true,
      render: (p) => Number(p.contract_value || 0).toLocaleString() + " SAR",
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (p) => <span className={"badge " + p.status}>{p.status}</span>,
    },
    {
      key: "actions",
      label: "",
      render: (p) => (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => openView(p.id)}
            title="Preview Details (?view)"
          >
            {t(lang, "viewDetails") || "Open"}
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => openEdit(p.id)}
            title="Edit Project (?edit)"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="projects-page">
      {msg && (
        <div className="alert ok" style={{ margin: "10px 24px" }} onClick={() => setMsg("")}>
          {msg}
        </div>
      )}

      {/* 1. MAIN BIGIN DATA TABLE */}
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        limit={limit}
        onPage={(p) => { setPage(p); load(p, limit, sortBy, sortDir); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l, sortBy, sortDir); }}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        selected={selected}
        onSelect={setSelected}
        keyOf={(p) => p.id}
        loading={loading}
        title="All Projects"
        activeFilter={status ? `${status} Projects` : "All Projects"}
        filterOptions={[
          { label: "All Projects", value: "" },
          { label: "InProgress Projects", value: "InProgress" },
          { label: "Completed Projects", value: "Completed" },
          { label: "Tender Projects", value: "Tender" },
          { label: "Awarded Projects", value: "Awarded" },
          { label: "Draft Projects", value: "Draft" },
        ]}
        onFilterSelect={(val) => setStatus(val)}
        counts={{
          all: total,
          active: counts.active,
          done: counts.done,
        }}
        searchPlaceholder="Search projects by code, name, client, city..."
        searchValue={search}
        onSearchChange={setSearch}
        primaryAction={{
          label: "Project",
          onClick: openNew,
          title: "New Project Master Sheet (?new=1)",
        }}
        bulkActions={[
          {
            label: "Export Selected",
            onClick: (ids) => {
              const csv = [
                ["ID", "Code", "Name", "Client", "Value", "Status"],
                ...rows.filter((r) => ids.includes(r.id)).map((r) => [r.id, r.code, r.name, r.client_name, r.contract_value, r.status]),
              ].map((line) => line.join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `projects-bulk-export-${ids.length}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            },
          },
          {
            label: "Delete Selected",
            onClick: bulkDelete,
            danger: true,
          },
        ]}
      />

      {/* 2. TRANQUIL UPGRADED PROJECT CREATE SHEET (?new=1) */}
      {showNew && (
        <>
          <div className="bigin-drawer-scrim" onClick={closeNew} />
          <div className="bigin-drawer sheet-wide">
            {/* Sheet Header */}
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge InProgress">Tranquil QS Pro</span>
                <div>
                  <h3 className="bigin-drawer-title">New Project Master Sheet</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>Comprehensive Tranquil & Saudi ZATCA Construction Contracting Setup</span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button type="button" className="bigin-drawer-close" onClick={closeNew} title="Close drawer">
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Section Navigation Tabs */}
            <div className="bigin-sheet-tabs">
              {[
                { id: "sec-basic", label: "1. Classification" },
                { id: "sec-stakeholders", label: "2. Stakeholders & FIDIC" },
                { id: "sec-commercial", label: "3. Commercial & QS" },
                { id: "sec-site", label: "4. Location & Timeline" },
                { id: "sec-budget", label: "5. Opening Budget" },
                { id: "sec-team", label: "6. Team & Milestones" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={"bigin-tab-pill" + (activeTab === tab.id ? " active" : "")}
                  onClick={() => {
                    setActiveTab(tab.id);
                    document.getElementById(tab.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={create} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="bigin-drawer-body">
                {/* Live Tranquil Commercial KPI Banner */}
                <div className="bigin-kpi-banner">
                  <div className="bigin-kpi-item primary">
                    <span className="bigin-kpi-label">Contract Value</span>
                    <span className="bigin-kpi-val">{contractValNum.toLocaleString()} SAR</span>
                    <span className="bigin-kpi-sub">Excl. 15% VAT</span>
                  </div>
                  <div className="bigin-kpi-item">
                    <span className="bigin-kpi-label">Gross Value (Inc. VAT)</span>
                    <span className="bigin-kpi-val">{grossContractSar.toLocaleString()} SAR</span>
                    <span className="bigin-kpi-sub">VAT: {vatValSar.toLocaleString()} SAR</span>
                  </div>
                  <div className="bigin-kpi-item">
                    <span className="bigin-kpi-label">Planned Cost Budget</span>
                    <span className="bigin-kpi-val" style={{ color: "#d97706" }}>
                      {totalBudgetWithContingency.toLocaleString()} SAR
                    </span>
                    <span className="bigin-kpi-sub">Contingency: {contingencySar.toLocaleString()} SAR</span>
                  </div>
                  <div className="bigin-kpi-item">
                    <span className="bigin-kpi-label">Projected Margin</span>
                    <span
                      className="bigin-kpi-val"
                      style={{
                        color: projectedMarginSar >= 0 && Number(projectedMarginPct) >= 10 ? "#0ba360" : projectedMarginSar >= 0 ? "#d97706" : "#dc2626",
                      }}
                    >
                      {projectedMarginSar.toLocaleString()} SAR
                    </span>
                    <span className="bigin-kpi-sub" style={{ fontWeight: 700, color: projectedMarginSar >= 0 ? "#0ba360" : "#dc2626" }}>
                      {projectedMarginPct}% Gross Margin
                    </span>
                  </div>
                  <div className="bigin-kpi-item">
                    <span className="bigin-kpi-label">Advance & Retention</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                        Adv {Number(form.advance_pct || 0)}%
                      </span>
                      <span style={{ color: "#cbd5e1", fontSize: 12 }}>|</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                        Ret {Number(form.retention_pct || 10)}%
                      </span>
                    </div>
                    <span className="bigin-kpi-sub">
                      Adv: {advanceValSar.toLocaleString()} SAR · Ret: {retentionValSar.toLocaleString()} SAR
                    </span>
                  </div>
                  <div className="bigin-kpi-item">
                    <span className="bigin-kpi-label">Contract Duration</span>
                    <span className="bigin-kpi-val">{durationDays ? `${durationDays} Days` : "—"}</span>
                    <span className="bigin-kpi-sub">{durationDays ? `~ ${durationMonths} Months` : "Set Start/End"}</span>
                  </div>
                </div>

                {/* Section 1: Classification & Identification */}
                <div className="bigin-drawer-sec" id="sec-basic">
                  <div className="bigin-drawer-sec-title">1. Project Classification & General Information</div>
                  <div className="form-grid">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <label className="label">Project Code / Identifier *</label>
                        <button
                          type="button"
                          onClick={autoGenerateCode}
                          style={{ border: "none", background: "none", color: "#0ba360", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                        >
                          ⚡ Auto-Generate
                        </button>
                      </div>
                      <input className="input" placeholder="e.g. PRJ-2026-001" value={form.code} onChange={set("code")} required />
                    </div>
                    <div>
                      <label className="label">Project Name (English) *</label>
                      <input className="input" placeholder="e.g. Riyadh Metro Station Package C" value={form.name} onChange={set("name")} required />
                    </div>
                    <div>
                      <label className="label">Project Name (Arabic)</label>
                      <input className="input" placeholder="اسم المشروع بالعربية (مثال: محطة مترو الرياض)" value={form.name_ar} onChange={set("name_ar")} dir="rtl" />
                    </div>
                    <div>
                      <label className="label">Sector / Project Category</label>
                      <select className="select" value={form.project_type} onChange={set("project_type")}>
                        {PROJECT_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Project Nature / Delivery Method</label>
                      <select className="select" value={form.delivery_method} onChange={set("delivery_method")}>
                        {DELIVERY_METHODS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Initial Lifecycle Status</label>
                      <select className="select" value={form.status} onChange={set("status")}>
                        <option value="Draft">Draft (Preliminary Planning)</option>
                        <option value="Tender">Tender (Bidding Stage)</option>
                        <option value="Awarded">Awarded (Contract Mobilization)</option>
                        <option value="InProgress">InProgress (Active Construction)</option>
                        <option value="OnHold">OnHold (Suspended)</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Cost Center / Branch Allocation</label>
                      <input className="input" placeholder="e.g. Central Region HQ / Neom Site Office" value={form.cost_center} onChange={set("cost_center")} />
                    </div>
                  </div>
                </div>

                {/* Section 2: Stakeholders & Authorities */}
                <div className="bigin-drawer-sec" id="sec-stakeholders">
                  <div className="bigin-drawer-sec-title">2. Stakeholders & Authorities (Tranquil Standard)</div>
                  <div className="form-grid">
                    <div>
                      <label className="label">Client / Employer Organization *</label>
                      <input className="input" placeholder="e.g. Red Sea Global / Roshn / Diriyah Gate" value={form.client_name} onChange={set("client_name")} required />
                    </div>
                    <div>
                      <label className="label">Client CR / ZATCA VAT No.</label>
                      <input className="input" placeholder="e.g. 1010XXXXXX / 3000XXXXXXXX" value={form.client_cr_vat} onChange={set("client_cr_vat")} />
                    </div>
                    <div>
                      <label className="label">Client Representative / Project Director</label>
                      <input className="input" placeholder="Eng. Representative Name" value={form.client_rep} onChange={set("client_rep")} />
                    </div>
                    <div>
                      <label className="label">Client Phone / WhatsApp</label>
                      <input className="input" placeholder="+966 5X XXX XXXX" value={form.client_phone} onChange={set("client_phone")} dir="ltr" />
                    </div>
                    <div>
                      <label className="label">Client Official Email</label>
                      <input className="input" type="email" placeholder="client.rep@employer.com" value={form.client_email} onChange={set("client_email")} dir="ltr" />
                    </div>
                    <div>
                      <label className="label">Supervising Engineering Consultant (FIDIC Engineer)</label>
                      <input className="input" placeholder="e.g. Khatib & Alami / Dar Al-Handasah / KEO" value={form.consultant_name} onChange={set("consultant_name")} />
                    </div>
                    <div>
                      <label className="label">Consultant Resident Engineer Name</label>
                      <input className="input" placeholder="Resident Engineer (RE)" value={form.consultant_rep} onChange={set("consultant_rep")} />
                    </div>
                    <div>
                      <label className="label">Consultant Phone / Email</label>
                      <input className="input" placeholder="+966 5X XXX XXXX / consultant@domain.com" value={form.consultant_phone} onChange={set("consultant_phone")} dir="ltr" />
                    </div>
                  </div>
                </div>

                {/* Section 3: Commercial & Contract Terms */}
                <div className="bigin-drawer-sec" id="sec-commercial">
                  <div className="bigin-drawer-sec-title">3. Contract, QS & Commercial Parameters</div>
                  <div className="form-grid">
                    <div>
                      <label className="label">Contract Number / Tender Ref</label>
                      <input className="input" placeholder="e.g. CONT-2026-8841" value={form.contract_no} onChange={set("contract_no")} />
                    </div>
                    <div>
                      <label className="label">Contract Form / Book</label>
                      <select className="select" value={form.contract_type} onChange={set("contract_type")}>
                        {CONTRACT_TYPES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Contract Value (Excl. VAT) *</label>
                      <div className="tranquil-input-affix">
                        <input className="input" type="number" step="0.01" placeholder="0.00" value={form.contract_value} onChange={set("contract_value")} required />
                        <span className="tranquil-affix-label">SAR</span>
                      </div>
                    </div>
                    <div>
                      <label className="label">Contract Currency</label>
                      <select className="select" value={form.currency} onChange={set("currency")}>
                        <option>SAR</option>
                        <option>USD</option>
                        <option>AED</option>
                        <option>QAR</option>
                        <option>KWD</option>
                        <option>BHD</option>
                        <option>EUR</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">VAT Rate % (Saudi ZATCA: 15%)</label>
                      <div className="tranquil-input-affix">
                        <input className="input" type="number" step="0.5" value={form.vat_pct} onChange={set("vat_pct")} />
                        <span className="tranquil-affix-label">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="label">Gross Value (Incl. VAT)</label>
                      <input className="input" readOnly value={`${grossContractSar.toLocaleString()} SAR`} style={{ background: "#f8fafc", fontWeight: 700 }} />
                    </div>
                    <div>
                      <label className="label">Advance Payment % ({form.advance_pct}% = {advanceValSar.toLocaleString()} SAR)</label>
                      <div className="tranquil-input-affix">
                        <input className="input" type="number" step="0.5" value={form.advance_pct} onChange={set("advance_pct")} />
                        <span className="tranquil-affix-label">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="label">Advance Recovery Mechanism</label>
                      <select className="select" value={form.advance_recovery_type} onChange={set("advance_recovery_type")}>
                        {ADVANCE_RECOVERY_MODES.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Advance Bank Guarantee Ref</label>
                      <input className="input" placeholder="e.g. SNB-BG-2026-9001" value={form.advance_guarantee_ref} onChange={set("advance_guarantee_ref")} />
                    </div>
                    <div>
                      <label className="label">Retention Withholding % ({form.retention_pct}% = {retentionValSar.toLocaleString()} SAR)</label>
                      <div className="tranquil-input-affix">
                        <input className="input" type="number" step="0.5" value={form.retention_pct} onChange={set("retention_pct")} />
                        <span className="tranquil-affix-label">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="label">Retention Release Terms</label>
                      <select className="select" value={form.retention_release_terms} onChange={set("retention_release_terms")}>
                        {RETENTION_RELEASE_MODES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Performance Bond % ({form.performance_bond_pct}% = {performanceBondSar.toLocaleString()} SAR)</label>
                      <div className="tranquil-input-affix">
                        <input className="input" type="number" step="0.5" value={form.performance_bond_pct} onChange={set("performance_bond_pct")} />
                        <span className="tranquil-affix-label">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="label">Performance Bond Ref / Bank</label>
                      <input className="input" placeholder="e.g. Al Rajhi Bank PB-8812" value={form.performance_bond_ref} onChange={set("performance_bond_ref")} />
                    </div>
                    <div>
                      <label className="label">Defect Liability Period (DLP)</label>
                      <div className="tranquil-input-affix">
                        <input className="input" type="number" value={form.dlp_days} onChange={set("dlp_days")} />
                        <span className="tranquil-affix-label">Days</span>
                      </div>
                    </div>
                    <div>
                      <label className="label">Delay Liquidated Damages (LD Cap %)</label>
                      <div className="tranquil-input-affix">
                        <input className="input" type="number" step="0.5" value={form.liquidated_damages_pct} onChange={set("liquidated_damages_pct")} />
                        <span className="tranquil-affix-label">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="label">Progress Billing Scheme</label>
                      <select className="select" value={form.billing_type} onChange={set("billing_type")}>
                        <option value="Monthly">Monthly Progress Claims (IPC)</option>
                        <option value="Milestone">Milestone Completion Invoicing</option>
                        <option value="Percentage">Percentage of Completion</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Payment Terms</label>
                      <select className="select" value={form.payment_terms} onChange={set("payment_terms")}>
                        {PAYMENT_TERMS_LIST.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 4: Site Location & Timeline */}
                <div className="bigin-drawer-sec" id="sec-site">
                  <div className="bigin-drawer-sec-title">4. Location, Site & Timeline Parameters</div>
                  <div className="form-grid">
                    <div>
                      <label className="label">City / Region (KSA)</label>
                      <input className="input" value={form.city} onChange={set("city")} placeholder="City" />
                      <div className="city-chips-wrap">
                        {SAUDI_CITIES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={"city-chip" + (form.city === c ? " selected" : "")}
                            onClick={() => setVal("city", c)}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label">District / Zone</label>
                      <input className="input" placeholder="e.g. Al Malqa / Olaya / KAFD" value={form.district} onChange={set("district")} />
                    </div>
                    <div>
                      <label className="label">Plot No / Cadastral Ref</label>
                      <input className="input" placeholder="e.g. Plot 412, Block 8" value={form.plot_no} onChange={set("plot_no")} />
                    </div>
                    <div>
                      <label className="label">Building Permit / Baladiya License No.</label>
                      <input className="input" placeholder="e.g. BLD-MOMRA-2026-99" value={form.permit_no} onChange={set("permit_no")} />
                    </div>
                    <div>
                      <label className="label">Site Handover to Contractor Date</label>
                      <input className="input" type="date" value={form.handover_date} onChange={set("handover_date")} />
                    </div>
                    <div>
                      <label className="label">Contract Commencement / NTP Date</label>
                      <input className="input" type="date" value={form.start_date} onChange={set("start_date")} />
                    </div>
                    <div>
                      <label className="label">Contractual Handover / Completion Date</label>
                      <input className="input" type="date" value={form.end_date} onChange={set("end_date")} />
                    </div>
                    <div>
                      <label className="label">Contract Duration</label>
                      <input className="input" readOnly value={durationDays ? `${durationDays} Days (~ ${durationMonths} Months)` : "Specify Dates"} style={{ background: "#f8fafc", fontWeight: 700 }} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label className="label">Site Address & GPS Location</label>
                      <input className="input" placeholder="e.g. King Fahd Road Intersection, Riyadh" value={form.address} onChange={set("address")} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label className="label">Scope of Works & Specifications Summary</label>
                      <textarea className="textarea" rows={3} placeholder="Comprehensive description of engineering works, special contract conditions, access constraints..." value={form.description} onChange={set("description")} />
                    </div>
                  </div>
                </div>

                {/* Section 5: Opening Cost Budgets (Tranquil Cost Control Heads) */}
                <div className="bigin-drawer-sec" id="sec-budget">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div className="bigin-drawer-sec-title" style={{ margin: 0, border: "none" }}>5. Opening Budget Allocation (5 Cost Heads + Contingency)</div>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>Tranquil Cost Center breakdown for live commercial variance tracking</span>
                    </div>
                    <div style={{ textAlign: "end" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#166534" }}>
                        Total Budget: {totalBudgetWithContingency.toLocaleString()} SAR
                      </div>
                      <div style={{ fontSize: 11, color: projectedMarginSar >= 0 ? "#0ba360" : "#dc2626", fontWeight: 700 }}>
                        Projected Margin: {projectedMarginSar.toLocaleString()} SAR ({projectedMarginPct}%)
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    {budgets.map((b, i) => (
                      <div key={b.head}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <label className="label">{b.head} Budget</label>
                          <span style={{ fontSize: 11, color: "#64748b" }}>
                            {totalBudgetCost > 0 ? `${(((Number(b.budgeted) || 0) / totalBudgetCost) * 100).toFixed(0)}%` : "0%"}
                          </span>
                        </div>
                        <div className="tranquil-input-affix">
                          <input
                            className="input"
                            type="number"
                            placeholder="0.00"
                            value={b.budgeted}
                            onChange={(e) => setBudgets(budgets.map((x, j) => j === i ? { ...x, budgeted: e.target.value } : x))}
                          />
                          <span className="tranquil-affix-label">SAR</span>
                        </div>
                      </div>
                    ))}
                    <div>
                      <label className="label">Contingency Reserve % ({form.contingency_pct}% = {contingencySar.toLocaleString()} SAR)</label>
                      <div className="tranquil-input-affix">
                        <input className="input" type="number" step="0.5" value={form.contingency_pct} onChange={set("contingency_pct")} />
                        <span className="tranquil-affix-label">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 6: Team & Milestones */}
                <div className="bigin-drawer-sec" id="sec-team">
                  <div className="bigin-drawer-sec-title">6. Key Project Team Governance</div>
                  {team.map((m, i) => (
                    <div key={i} className="form-grid" style={{ marginBottom: 8, gridTemplateColumns: "1.2fr 1fr 1fr auto", alignItems: "flex-end" }}>
                      <div>
                        <label className="label">Personnel Name</label>
                        <input className="input" placeholder="Eng. Name" value={m.member_name} onChange={row(team, setTeam, i, "member_name")} />
                      </div>
                      <div>
                        <label className="label">Project Role</label>
                        <input className="input" placeholder="Role" value={m.role} onChange={row(team, setTeam, i, "role")} />
                      </div>
                      <div>
                        <label className="label">Mobile / Contact</label>
                        <input className="input" placeholder="+966 5X XXX XXXX" value={m.phone} onChange={row(team, setTeam, i, "phone")} dir="ltr" />
                      </div>
                      <button
                        type="button"
                        className="btn ghost sm"
                        style={{ color: "#dc2626", border: "1px solid #fecaca", height: 36 }}
                        onClick={() => setTeam(team.filter((_, j) => j !== i))}
                        title="Remove member"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn ghost sm" onClick={() => setTeam([...team, { member_name: "", role: "Site Engineer", phone: "" }])}>
                    + Add Team Member
                  </button>

                  <div style={{ marginTop: 24, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div className="bigin-drawer-sec-title" style={{ margin: 0, border: "none" }}>Master Milestones & Work Breakdown</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: totalMilestoneWeight === 100 ? "#0ba360" : totalMilestoneWeight < 100 ? "#d97706" : "#dc2626" }}>
                        Total Weight: {totalMilestoneWeight}% {totalMilestoneWeight === 100 ? "✓ (Balanced)" : "(Must sum to 100%)"}
                      </span>
                    </div>
                    <div className="tranquil-progress-bar">
                      <div
                        className="tranquil-progress-fill"
                        style={{
                          width: `${Math.min(totalMilestoneWeight, 100)}%`,
                          background: totalMilestoneWeight === 100 ? "#0ba360" : totalMilestoneWeight < 100 ? "#d97706" : "#dc2626",
                        }}
                      />
                    </div>
                  </div>

                  {miles.map((m, i) => (
                    <div key={i} className="form-grid" style={{ marginBottom: 8, gridTemplateColumns: "2fr 1.2fr 1fr auto", alignItems: "flex-end" }}>
                      <div>
                        <label className="label">Milestone Phase / Deliverable</label>
                        <input className="input" placeholder="Milestone Phase Title" value={m.title} onChange={row(miles, setMiles, i, "title")} />
                      </div>
                      <div>
                        <label className="label">Target Completion Date</label>
                        <input className="input" type="date" value={m.due_date} onChange={row(miles, setMiles, i, "due_date")} />
                      </div>
                      <div>
                        <label className="label">Weight %</label>
                        <div className="tranquil-input-affix">
                          <input className="input" type="number" placeholder="%" value={m.weight_pct} onChange={row(miles, setMiles, i, "weight_pct")} />
                          <span className="tranquil-affix-label">%</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn ghost sm"
                        style={{ color: "#dc2626", border: "1px solid #fecaca", height: 36 }}
                        onClick={() => setMiles(miles.filter((_, j) => j !== i))}
                        title="Remove milestone"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn ghost sm" onClick={() => setMiles([...miles, { title: "", due_date: "", weight_pct: 0 }])}>
                    + Add Milestone Phase
                  </button>
                </div>
              </div>

              {/* Sheet Sticky Footer */}
              <div className="bigin-drawer-foot">
                <button type="button" className="btn ghost" onClick={closeNew}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy} style={{ background: "#0ba360" }}>
                  {busy ? "Creating Project..." : "✓ Create Project Master"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* 3. VIEW PROJECT PREVIEW DRAWER (?view=<id>) */}
      {viewId && (
        <>
          <div className="bigin-drawer-scrim" onClick={closeView} />
          <div className="bigin-drawer sheet-wide">
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                {viewData && <span className={"badge " + (viewData.status || "Draft")}>{viewData.status}</span>}
                <div>
                  <h3 className="bigin-drawer-title">{viewData ? viewData.name : "Loading project..."}</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>Code: {viewData?.code || "—"}</span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => openEdit(viewId)}
                  title="Edit this project"
                >
                  ✏ Edit
                </button>
                <a
                  className="btn ghost sm"
                  href={"/projects/" + viewId}
                  title="Open full page"
                >
                  ↗ Full Page
                </a>
                <button type="button" className="bigin-drawer-close" onClick={closeView} title="Close drawer">
                  ✕
                </button>
              </div>
            </div>

            <div className="bigin-drawer-body">
              {viewLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>Loading details...</div>
              ) : viewData ? (
                <>
                  {/* View KPI Summary Banner */}
                  <div className="bigin-kpi-banner">
                    <div className="bigin-kpi-item primary">
                      <span className="bigin-kpi-label">Contract Value</span>
                      <span className="bigin-kpi-val">
                        {Number(viewData.contract_value || 0).toLocaleString()} {viewData.currency || "SAR"}
                      </span>
                      <span className="bigin-kpi-sub">Excl. {Number(viewData.vat_pct || 15)}% VAT</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Gross Value</span>
                      <span className="bigin-kpi-val">
                        {(Number(viewData.contract_value || 0) * (1 + (Number(viewData.vat_pct || 15) / 100))).toLocaleString()} {viewData.currency || "SAR"}
                      </span>
                      <span className="bigin-kpi-sub">Incl. {Number(viewData.vat_pct || 15)}% ZATCA VAT</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Advance & Retention</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                          Adv {Number(viewData.advance_pct || 0)}%
                        </span>
                        <span style={{ color: "#cbd5e1", fontSize: 12 }}>|</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                          Ret {Number(viewData.retention_pct || 10)}%
                        </span>
                      </div>
                      <span className="bigin-kpi-sub">Secured Guarantee Terms</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Planned Timeline</span>
                      <span className="bigin-kpi-val" style={{ fontSize: 13 }}>
                        {viewData.start_date && viewData.end_date
                          ? `${viewData.start_date.slice(0, 10)} → ${viewData.end_date.slice(0, 10)}`
                          : viewData.start_date
                          ? `From ${viewData.start_date.slice(0, 10)}`
                          : "Dates not set"}
                      </span>
                      <span className="bigin-kpi-sub">
                        {viewData.city ? `${viewData.city}, KSA` : "Saudi Arabia"}
                      </span>
                    </div>
                  </div>

                  {/* 1. General & Classification */}
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">1. General & Classification</div>
                    <div className="bigin-drawer-grid">
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Project Code</span>
                        <span className="bigin-drawer-val">{viewData.code}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Sector / Category</span>
                        <span className="bigin-drawer-val">{viewData.tranquil_meta?.project_type || "Commercial"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Project Name (Arabic)</span>
                        <span className="bigin-drawer-val">{viewData.name_ar || "—"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Delivery Method</span>
                        <span className="bigin-drawer-val">{viewData.tranquil_meta?.delivery_method || "General Contracting"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Cost Center / Branch</span>
                        <span className="bigin-drawer-val">{viewData.tranquil_meta?.cost_center || "Central Region HQ"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Lifecycle Status</span>
                        <span className="bigin-drawer-val">{viewData.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Stakeholders & FIDIC Authorities */}
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">2. Stakeholders & Supervising Consultant</div>
                    <div className="bigin-drawer-grid">
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Employer / Client</span>
                        <div style={{ marginTop: 2 }}>
                          <BiginAvatar name={viewData.client_name || "—"} />
                        </div>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Client CR / VAT TIN</span>
                        <span className="bigin-drawer-val">{viewData.tranquil_meta?.client_cr_vat || "—"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Client Representative</span>
                        <span className="bigin-drawer-val">{viewData.tranquil_meta?.client_rep || "—"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Client Contact</span>
                        <span className="bigin-drawer-val">{viewData.client_phone || "—"} · {viewData.client_email || "—"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Supervising Consultant</span>
                        <span className="bigin-drawer-val">{viewData.tranquil_meta?.consultant_name || "—"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Resident Engineer & Contact</span>
                        <span className="bigin-drawer-val">
                          {viewData.tranquil_meta?.consultant_rep || "—"} {viewData.tranquil_meta?.consultant_phone ? `(${viewData.tranquil_meta.consultant_phone})` : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Contract & QS Parameters */}
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">3. Contract, QS & Commercial Parameters</div>
                    <div className="bigin-drawer-grid">
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Contract Agreement Ref</span>
                        <span className="bigin-drawer-val">{viewData.contract_no || "—"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Contract Form / Book</span>
                        <span className="bigin-drawer-val">{viewData.tranquil_meta?.contract_type || "FIDIC Red Book"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Advance Payment Terms</span>
                        <span className="bigin-drawer-val">
                          {viewData.advance_pct ?? 0}% ({viewData.tranquil_meta?.advance_recovery_type || "Pro-rata"})
                        </span>
                        {viewData.tranquil_meta?.advance_guarantee_ref && (
                          <span style={{ fontSize: 11, color: "#64748b" }}>BG: {viewData.tranquil_meta.advance_guarantee_ref}</span>
                        )}
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Retention Terms</span>
                        <span className="bigin-drawer-val">{viewData.retention_pct ?? 10}%</span>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{viewData.tranquil_meta?.retention_release_terms || "50% TOC / 50% DLC"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Performance Bond</span>
                        <span className="bigin-drawer-val">{viewData.tranquil_meta?.performance_bond_pct ?? 5}%</span>
                        {viewData.tranquil_meta?.performance_bond_ref && (
                          <span style={{ fontSize: 11, color: "#64748b" }}>Ref: {viewData.tranquil_meta.performance_bond_ref}</span>
                        )}
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">DLP & Delay LD</span>
                        <span className="bigin-drawer-val">
                          DLP: {viewData.tranquil_meta?.dlp_days ?? 365} Days · LD: {viewData.tranquil_meta?.liquidated_damages_pct ?? 10}% max
                        </span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Progress Billing Scheme</span>
                        <span className="bigin-drawer-val">{viewData.billing_type || "Monthly IPC"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Payment Terms</span>
                        <span className="bigin-drawer-val">{viewData.payment_terms || "Net 30 Days"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Location & Timeline */}
                  <div className="bigin-drawer-sec">
                    <div className="bigin-drawer-sec-title">4. Location, Site & Timeline</div>
                    <div className="bigin-drawer-grid">
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">City / Region</span>
                        <span className="bigin-drawer-val">{viewData.city || "—"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">District & Plot No.</span>
                        <span className="bigin-drawer-val">
                          {viewData.tranquil_meta?.district || "—"} {viewData.tranquil_meta?.plot_no ? `(Plot: ${viewData.tranquil_meta.plot_no})` : ""}
                        </span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Baladiya Permit No.</span>
                        <span className="bigin-drawer-val">{viewData.tranquil_meta?.permit_no || "—"}</span>
                      </div>
                      <div className="bigin-drawer-field">
                        <span className="bigin-drawer-label">Site Handover Date</span>
                        <span className="bigin-drawer-val">{viewData.tranquil_meta?.handover_date || "—"}</span>
                      </div>
                      <div className="bigin-drawer-field" style={{ gridColumn: "1 / -1" }}>
                        <span className="bigin-drawer-label">Detailed Site Address</span>
                        <span className="bigin-drawer-val">{viewData.address || "—"}</span>
                      </div>
                      {viewData.clean_notes && (
                        <div className="bigin-drawer-field" style={{ gridColumn: "1 / -1" }}>
                          <span className="bigin-drawer-label">Scope of Works & Specifications</span>
                          <span className="bigin-drawer-val" style={{ fontWeight: 400, whiteSpace: "pre-line" }}>{viewData.clean_notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5. Opening Cost Budgets */}
                  {viewData.budgets && viewData.budgets.length > 0 && (
                    <div className="bigin-drawer-sec">
                      <div className="bigin-drawer-sec-title">5. Opening Cost Budgets</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {viewData.budgets.map((b) => (
                          <div key={b.head} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                            <span style={{ color: "#475569" }}>{b.head} Cost Center</span>
                            <span style={{ fontWeight: 750, color: "#0f172a" }}>
                              {Number(b.budgeted || 0).toLocaleString()} SAR
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 6. Key Team & Milestones */}
                  {viewData.members && viewData.members.length > 0 && (
                    <div className="bigin-drawer-sec">
                      <div className="bigin-drawer-sec-title">6. Key Project Governance Team ({viewData.members.length})</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {viewData.members.map((m) => (
                          <div key={m.id || m.member_name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                            <span style={{ fontWeight: 600 }}>{m.member_name}</span>
                            <span style={{ color: "#64748b" }}>{m.role} {m.phone ? `(${m.phone})` : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewData.milestones && viewData.milestones.length > 0 && (
                    <div className="bigin-drawer-sec">
                      <div className="bigin-drawer-sec-title">Master Milestones ({viewData.milestones.length})</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {viewData.milestones.map((m) => (
                          <div key={m.id || m.title} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                            <span>{m.title}</span>
                            <span style={{ color: "#64748b", fontSize: 12 }}>{m.due_date ? m.due_date.slice(0, 10) : ""} ({m.weight_pct}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#cf3d3d" }}>Project not found</div>
              )}
            </div>

            <div className="bigin-drawer-foot">
              <button type="button" className="btn ghost" onClick={closeView}>Close</button>
              <button type="button" className="btn" onClick={() => openEdit(viewId)}>✏ Edit Project</button>
            </div>
          </div>
        </>
      )}

      {/* 4. TRANQUIL UPGRADED EDIT PROJECT DRAWER (?edit=<id>) */}
      {editId && (
        <>
          <div className="bigin-drawer-scrim" onClick={closeEdit} />
          <div className="bigin-drawer sheet-wide">
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge Draft">Edit</span>
                <div>
                  <h3 className="bigin-drawer-title">Edit Project: {editForm.code || editId}</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>Update Tranquil parameters & contract terms</span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button type="button" className="bigin-drawer-close" onClick={closeEdit} title="Close drawer">
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Section Navigation Tabs for Edit */}
            <div className="bigin-sheet-tabs">
              {[
                { id: "edit-basic", label: "1. Classification" },
                { id: "edit-stakeholders", label: "2. Stakeholders & FIDIC" },
                { id: "edit-commercial", label: "3. Commercial & QS" },
                { id: "edit-site", label: "4. Location & Timeline" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={"bigin-tab-pill" + (editActiveTab === tab.id ? " active" : "")}
                  onClick={() => {
                    setEditActiveTab(tab.id);
                    document.getElementById(tab.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {editLoading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>Loading project data...</div>
            ) : (
              <form onSubmit={updateProject} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <div className="bigin-drawer-body">
                  {/* Live Edit KPI Banner */}
                  <div className="bigin-kpi-banner">
                    <div className="bigin-kpi-item primary">
                      <span className="bigin-kpi-label">Contract Value</span>
                      <span className="bigin-kpi-val">{editContractValNum.toLocaleString()} SAR</span>
                      <span className="bigin-kpi-sub">Excl. {editForm.vat_pct}% VAT</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Gross Value</span>
                      <span className="bigin-kpi-val">{editGrossSar.toLocaleString()} SAR</span>
                      <span className="bigin-kpi-sub">VAT: {editVatValSar.toLocaleString()} SAR</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Advance & Retention</span>
                      <span className="bigin-kpi-val" style={{ fontSize: 13 }}>
                        Adv: {editAdvanceValSar.toLocaleString()} SAR
                      </span>
                      <span className="bigin-kpi-sub">Ret: {editRetentionValSar.toLocaleString()} SAR</span>
                    </div>
                    <div className="bigin-kpi-item">
                      <span className="bigin-kpi-label">Duration</span>
                      <span className="bigin-kpi-val">{editDurationDays ? `${editDurationDays} Days` : "—"}</span>
                      <span className="bigin-kpi-sub">{editForm.city}</span>
                    </div>
                  </div>

                  {/* 1. Basic Classification */}
                  <div className="bigin-drawer-sec" id="edit-basic">
                    <div className="bigin-drawer-sec-title">1. Project Classification & General Information</div>
                    <div className="form-grid">
                      <div><label className="label">Code *</label><input className="input" value={editForm.code} onChange={setEdit("code")} required /></div>
                      <div><label className="label">Name (EN) *</label><input className="input" value={editForm.name} onChange={setEdit("name")} required /></div>
                      <div><label className="label">Name (AR)</label><input className="input" value={editForm.name_ar} onChange={setEdit("name_ar")} dir="rtl" /></div>
                      <div>
                        <label className="label">Sector / Category</label>
                        <select className="select" value={editForm.project_type} onChange={setEdit("project_type")}>
                          {PROJECT_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Delivery Method</label>
                        <select className="select" value={editForm.delivery_method} onChange={setEdit("delivery_method")}>
                          {DELIVERY_METHODS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Cost Center / Branch</label>
                        <input className="input" value={editForm.cost_center} onChange={setEdit("cost_center")} />
                      </div>
                    </div>
                  </div>

                  {/* 2. Stakeholders */}
                  <div className="bigin-drawer-sec" id="edit-stakeholders">
                    <div className="bigin-drawer-sec-title">2. Stakeholders & Supervising Consultant</div>
                    <div className="form-grid">
                      <div><label className="label">Company / Client *</label><input className="input" value={editForm.client_name} onChange={setEdit("client_name")} required /></div>
                      <div><label className="label">Client CR / VAT TIN</label><input className="input" value={editForm.client_cr_vat} onChange={setEdit("client_cr_vat")} /></div>
                      <div><label className="label">Client Representative</label><input className="input" value={editForm.client_rep} onChange={setEdit("client_rep")} /></div>
                      <div><label className="label">Phone</label><input className="input" value={editForm.client_phone} onChange={setEdit("client_phone")} dir="ltr" /></div>
                      <div><label className="label">Email</label><input className="input" value={editForm.client_email} onChange={setEdit("client_email")} dir="ltr" /></div>
                      <div><label className="label">Supervising Consultant</label><input className="input" value={editForm.consultant_name} onChange={setEdit("consultant_name")} /></div>
                      <div><label className="label">Resident Engineer</label><input className="input" value={editForm.consultant_rep} onChange={setEdit("consultant_rep")} /></div>
                      <div><label className="label">Consultant Contact</label><input className="input" value={editForm.consultant_phone} onChange={setEdit("consultant_phone")} dir="ltr" /></div>
                    </div>
                  </div>

                  {/* 3. Commercial Details */}
                  <div className="bigin-drawer-sec" id="edit-commercial">
                    <div className="bigin-drawer-sec-title">3. Commercial Details & Contract Terms</div>
                    <div className="form-grid">
                      <div><label className="label">Contract No</label><input className="input" value={editForm.contract_no} onChange={setEdit("contract_no")} /></div>
                      <div>
                        <label className="label">Contract Form</label>
                        <select className="select" value={editForm.contract_type} onChange={setEdit("contract_type")}>
                          {CONTRACT_TYPES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Contract Value (SAR) *</label>
                        <div className="tranquil-input-affix">
                          <input className="input" type="number" step="0.01" value={editForm.contract_value} onChange={setEdit("contract_value")} required />
                          <span className="tranquil-affix-label">SAR</span>
                        </div>
                      </div>
                      <div>
                        <label className="label">Currency</label>
                        <select className="select" value={editForm.currency} onChange={setEdit("currency")}>
                          <option>SAR</option><option>AED</option><option>QAR</option><option>KWD</option><option>BHD</option><option>OMR</option><option>USD</option><option>EUR</option>
                        </select>
                      </div>
                      <div><label className="label">VAT Rate %</label><input className="input" type="number" step="0.01" value={editForm.vat_pct} onChange={setEdit("vat_pct")} /></div>
                      <div><label className="label">Advance Payment %</label><input className="input" type="number" step="0.01" value={editForm.advance_pct} onChange={setEdit("advance_pct")} /></div>
                      <div><label className="label">Retention Withholding %</label><input className="input" type="number" step="0.01" value={editForm.retention_pct} onChange={setEdit("retention_pct")} /></div>
                      <div><label className="label">Performance Bond %</label><input className="input" type="number" step="0.01" value={editForm.performance_bond_pct} onChange={setEdit("performance_bond_pct")} /></div>
                      <div><label className="label">Bond Ref / Bank</label><input className="input" value={editForm.performance_bond_ref} onChange={setEdit("performance_bond_ref")} /></div>
                      <div><label className="label">DLP (Days)</label><input className="input" type="number" value={editForm.dlp_days} onChange={setEdit("dlp_days")} /></div>
                      <div><label className="label">Liquidated Damages (LD Cap %)</label><input className="input" type="number" step="0.5" value={editForm.liquidated_damages_pct} onChange={setEdit("liquidated_damages_pct")} /></div>
                      <div>
                        <label className="label">Billing Scheme</label>
                        <select className="select" value={editForm.billing_type} onChange={setEdit("billing_type")}>
                          <option value="Monthly">Monthly Progress Claims (IPC)</option>
                          <option value="Milestone">Milestone Completion</option>
                          <option value="Percentage">Percentage of Completion</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Payment Terms</label>
                        <select className="select" value={editForm.payment_terms} onChange={setEdit("payment_terms")}>
                          {PAYMENT_TERMS_LIST.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 4. Location & Timeline */}
                  <div className="bigin-drawer-sec" id="edit-site">
                    <div className="bigin-drawer-sec-title">4. Location & Timeline</div>
                    <div className="form-grid">
                      <div>
                        <label className="label">City</label>
                        <input className="input" value={editForm.city} onChange={setEdit("city")} />
                        <div className="city-chips-wrap">
                          {SAUDI_CITIES.slice(0, 7).map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={"city-chip" + (editForm.city === c ? " selected" : "")}
                              onClick={() => setEditVal("city", c)}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div><label className="label">District / Zone</label><input className="input" value={editForm.district} onChange={setEdit("district")} /></div>
                      <div><label className="label">Plot No.</label><input className="input" value={editForm.plot_no} onChange={setEdit("plot_no")} /></div>
                      <div><label className="label">Permit No.</label><input className="input" value={editForm.permit_no} onChange={setEdit("permit_no")} /></div>
                      <div><label className="label">Start Date</label><input className="input" type="date" value={editForm.start_date} onChange={setEdit("start_date")} /></div>
                      <div><label className="label">End Date</label><input className="input" type="date" value={editForm.end_date} onChange={setEdit("end_date")} /></div>
                      <div style={{ gridColumn: "1 / -1" }}><label className="label">Site Address</label><input className="input" value={editForm.address} onChange={setEdit("address")} /></div>
                      <div style={{ gridColumn: "1 / -1" }}><label className="label">Scope & Technical Notes</label><textarea className="textarea" rows={3} value={editForm.description} onChange={setEdit("description")} /></div>
                    </div>
                  </div>
                </div>

                <div className="bigin-drawer-foot">
                  <button type="button" className="btn ghost" onClick={closeEdit}>Cancel</button>
                  <button type="submit" className="btn" disabled={busy}>{busy ? "Saving..." : "Save Changes"}</button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
