"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

export default function BoqsPage() {
  const { lang, projectId } = useAppStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("DESC");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [projects, setProjects] = useState([]);
  const [pid, setPid] = useState(projectId || "");
  const [drawer, setDrawer] = useState(null); // 'create' | 'import'
  const [form, setForm] = useState({ number: "", title: "", title_ar: "", project_id: "" });
  const [templates, setTemplates] = useState([]);
  const [tplId, setTplId] = useState("");
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState({ approved: 0, totalVal: 0 });

  const load = (p = page, l = limit, sb = sortBy, sd = sortDir, sQuery = search) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`, `sortBy=${sb}`, `sortDir=${sd}`];
    if (sQuery) q.push("search=" + encodeURIComponent(sQuery));
    if (status) q.push("status=" + status);
    if (pid) q.push("project_id=" + pid);
    api
      .get("/boqs?" + q.join("&"))
      .then((r) => {
        const list = r.data.data || [];
        setRows(list);
        setTotal(r.data.meta?.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Stats
    api.get("/boqs?limit=100").then((r) => {
      const all = r.data.data || [];
      const app = all.filter((x) => x.status === "Approved").length;
      const sum = all.reduce((acc, x) => acc + Number(x.total_amount || 0), 0);
      setCounts({ approved: app, totalVal: sum });
    }).catch(() => {});
  };

  useEffect(() => {
    api.get("/projects?limit=200").then((r) => setProjects(r.data.data || [])).catch(() => {});
    api.get("/boqs/templates").then((r) => setTemplates(r.data.data || [])).catch(() => {});
    load(1, limit, sortBy, sortDir);
  }, []);

  useEffect(() => {
    setPid(projectId || "");
  }, [projectId]);

  useEffect(() => {
    setPage(1);
    setSelected([]);
    load(1, limit, sortBy, sortDir);
  }, [status, pid]);

  const onSort = (k) => {
    const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC";
    setSortBy(k);
    setSortDir(nd);
    load(page, limit, k, nd);
  };

  const autoGenNumber = () => {
    const yr = new Date().getFullYear();
    const rand = String(total + 1).padStart(3, "0");
    setForm((prev) => ({ ...prev, number: `BOQ-${yr}-${rand}` }));
  };

  const openCreate = () => {
    setForm({
      number: `BOQ-${new Date().getFullYear()}-${String(total + 1).padStart(3, "0")}`,
      title: "",
      title_ar: "",
      project_id: pid || projects[0]?.id || "",
    });
    setTplId("");
    setDrawer("create");
  };

  const openImport = () => {
    setForm((prev) => ({
      ...prev,
      project_id: pid || projects[0]?.id || "",
    }));
    setDrawer("import");
  };

  const createBOQ = async (e) => {
    e.preventDefault();
    if (!form.project_id) {
      alert("Please select a target project");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      if (tplId) {
        // From template
        const r = await api.post(`/boqs/templates/${tplId}/instantiate`, {
          project_id: form.project_id,
          number: form.number,
          title: form.title,
        });
        window.location.href = `/boqs/${r.data.data.id}`;
      } else {
        // Direct
        const r = await api.post("/boqs", form);
        setDrawer(null);
        window.location.href = `/boqs/${r.data.data.id}`;
      }
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to create BOQ");
      setBusy(false);
    }
  };

  const importFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const targetPid = form.project_id || pid || projects[0]?.id;
    if (!targetPid) {
      alert("Please select a project first");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("project_id", targetPid);
      if (form.number) fd.append("number", form.number);
      if (form.title) fd.append("title", form.title);
      const r = await api.post("/boqs/import", fd);
      setMsg(r.data.message || "BOQ Imported successfully");
      setDrawer(null);
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Import failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const columns = [
    {
      key: "number",
      label: "BOQ Number",
      sortable: true,
      render: (b) => (
        <a
          href={"/boqs/" + b.id}
          style={{ textDecoration: "none", color: "inherit" }}
          title="Open BOQ Workspace"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 750, color: "var(--primary-dark)", fontSize: 13.5 }}>
              {b.number}
            </span>
            <span className="badge Active sm">R{b.revision || 1}</span>
          </div>
          {b.title_ar && <div style={{ fontSize: 11, color: "var(--muted)" }}>{b.title_ar}</div>}
        </a>
      ),
    },
    {
      key: "title",
      label: "Bill Title / Description",
      sortable: true,
      render: (b) => (
        <div>
          <div style={{ fontWeight: 600 }}>{b.title}</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
            Created {b.created_at ? new Date(b.created_at).toLocaleDateString() : "—"}
          </div>
        </div>
      ),
    },
    {
      key: "project",
      label: "Project",
      render: (b) => (
        <BiginAvatar
          name={b.project?.name || "Project"}
          subline={b.project?.code || ""}
          color="#0ba360"
        />
      ),
    },
    {
      key: "total_amount",
      label: "Bill Total (SAR)",
      sortable: true,
      render: (b) => (
        <div style={{ fontWeight: 800, color: "var(--fg)" }}>
          {Number(b.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span style={{ fontSize: 11, color: "var(--muted)", marginInlineStart: 4 }}>SAR</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (b) => {
        const cls =
          b.status === "Approved" ? "Active" :
          b.status === "Submitted" ? "Pending" :
          b.status === "Revised" ? "Won" : "Draft";
        return <span className={`badge ${cls}`}>{b.status}</span>;
      },
    },
    {
      key: "actions",
      label: "",
      render: (b) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <a
            href={"/boqs/" + b.id}
            className="btn ghost sm"
            style={{ textDecoration: "none", fontSize: 12, padding: "4px 10px" }}
          >
            Open QS Workspace →
          </a>
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

      {/* BIGIN DATA TABLE */}
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        limit={limit}
        onPage={(p) => {
          setPage(p);
          load(p, limit, sortBy, sortDir);
        }}
        onLimit={(l) => {
          setLimit(l);
          setPage(1);
          load(1, l, sortBy, sortDir);
        }}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        selected={selected}
        onSelect={setSelected}
        keyOf={(b) => b.id}
        loading={loading}
        title="All Bill of Quantities (BOQ)"
        activeFilter={status ? `${status} BOQs` : "All Bill of Quantities (BOQ)"}
        filterOptions={[
          { label: "All Bill of Quantities (BOQ)", value: "" },
          { label: "Draft BOQs", value: "Draft" },
          { label: "Submitted BOQs", value: "Submitted" },
          { label: "Approved BOQs", value: "Approved" },
          { label: "Revised BOQs", value: "Revised" },
        ]}
        onFilterSelect={(val) => setStatus(val)}
        onFilterChange={setStatus}
        searchPlaceholder="Search BOQ by number, title, project..."
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
          clearTimeout(window.__bq);
          window.__bq = setTimeout(() => load(1, limit, sortBy, sortDir, val), 250);
        }}
        primaryAction={{
          label: "BOQ",
          onClick: openCreate,
        }}
        onAdd={openCreate}
        addLabel="BOQ"
        stats={[
          { label: "Total BOQs", value: total },
          { label: "Approved", value: counts.approved },
          {
            label: "Total Value",
            value: counts.totalVal.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " SAR",
          },
        ]}
        bulkActions={[
          {
            label: "Import Excel",
            onClick: openImport,
          },
        ]}
      />

      {/* CREATE / FROM TEMPLATE DRAWER */}
      {drawer === "create" && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div
            className="drawer sheet-wide"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 850, width: "85vw" }}
          >
            <div className="drawer-h">
              <div>
                <h3>Create Bill of Quantities</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Initiate a structured BOQ for tendering, estimation, and IPC progress billing
                </span>
              </div>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>

            <form onSubmit={createBOQ} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label className="label">Project *</label>
                  <select
                    className="input"
                    value={form.project_id}
                    onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code ? `[${p.code}] ` : ""}{p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    BOQ Number *
                    <button
                      type="button"
                      onClick={autoGenNumber}
                      style={{
                        marginInlineStart: 8,
                        background: "none",
                        border: "none",
                        color: "#0ba360",
                        fontSize: 11,
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      [ ⚡ Auto ]
                    </button>
                  </label>
                  <input
                    className="input"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    required
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">BOQ Title / Scope of Work *</label>
                  <input
                    className="input"
                    placeholder="e.g. Architectural & Structural Works Package A"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Title (Arabic) / مسمى جدول الكميات</label>
                  <input
                    className="input"
                    dir="rtl"
                    placeholder="جدول كميات الأعمال المعمارية والإنشائية"
                    value={form.title_ar}
                    onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Start from Standard Template (Optional)</label>
                  <select
                    className="input"
                    value={tplId}
                    onChange={(e) => setTplId(e.target.value)}
                  >
                    <option value="">-- Start with Blank BOQ --</option>
                    {templates.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} ({(x.items || []).length} pre-built items)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg-subtle)",
                  border: "1px dashed var(--border)",
                  borderRadius: 8,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <b>Prefer to import an existing spreadsheet?</b>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    Upload an Excel (.xlsx) file with CSI divisions, units, and rates directly.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setDrawer("import")}
                >
                  Import Excel Instead →
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <button type="button" className="btn ghost" onClick={() => setDrawer(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Creating..." : "Create BOQ & Open Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT BOQ DRAWER */}
      {drawer === "import" && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div
            className="drawer sheet-wide"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 750, width: "80vw" }}
          >
            <div className="drawer-h">
              <div>
                <h3>Import BOQ from Spreadsheet</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Upload an Excel (.xlsx, .xls) or CSV file with itemized quantities and rates
                </span>
              </div>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label className="label">Target Project *</label>
                  <select
                    className="input"
                    value={form.project_id}
                    onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code ? `[${p.code}] ` : ""}{p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">BOQ Number (Optional)</label>
                  <input
                    className="input"
                    placeholder="Auto-generated if left empty"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">BOQ Title (Optional)</label>
                  <input
                    className="input"
                    placeholder="Leave blank to use file name"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                style={{
                  border: "2px dashed var(--border)",
                  borderRadius: 10,
                  padding: "30px 20px",
                  textAlign: "center",
                  background: "var(--bg-subtle)",
                  cursor: "pointer",
                }}
              >
                <label style={{ cursor: "pointer", display: "block" }}>
                  <span style={{ fontSize: 32 }}>📊</span>
                  <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>
                    Click to browse or drop your BOQ spreadsheet here
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    Supports Excel (.xlsx, .xls) and CSV files. Columns mapped: Line No, Description, Unit, Qty, Rate, Division.
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: "none" }}
                    onChange={importFile}
                    disabled={busy}
                  />
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setDrawer("create")}
                >
                  ← Back to Manual Creation
                </button>
                <button type="button" className="btn ghost" onClick={() => setDrawer(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
