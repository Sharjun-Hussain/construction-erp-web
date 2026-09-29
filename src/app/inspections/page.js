"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

function InspectionsInner() {
  const { lang } = useAppStore();
  const sp = useSearchParams();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [status, setStatus] = useState("");
  const [projects, setProjects] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState({ enquiry_id: "", project_id: "", visit_date: new Date().toISOString().slice(0, 10), inspector: "", attendees: "", location: "", site_condition: "", access_notes: "", utilities_notes: "", risks: "", findings: "" });
  const [complete, setComplete] = useState({ findings: "", recommendation: "Go", recommendation_notes: "" });

  const load = (p = page, l = limit) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`];
    if (status) q.push("status=" + status);
    api.get("/prebid/inspections?" + q.join("&")).then((r) => {
      setRows(r.data.data || []); setTotal(r.data.meta?.total || 0); setLoading(false);
      const open = sp.get("open");
      if (open) {
        const hit = (r.data.data || []).find((x) => x.id === open);
        if (hit) openDrawer(hit.id);
      }
    }).catch(() => setLoading(false));
  };
  useEffect(() => {
    api.get("/projects?limit=200").then((r) => setProjects(r.data.data || [])).catch(() => {});
    api.get("/prebid/enquiries?limit=200").then((r) => setEnquiries(r.data.data || [])).catch(() => {});
    load(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setPage(1); load(1, limit); }, [status]);

  const openDrawer = (id) => api.get("/prebid/inspections/" + id).then((r) => { setDrawer(r.data.data); setComplete({ findings: r.data.data.findings || "", recommendation: r.data.data.recommendation || "Go", recommendation_notes: r.data.data.recommendation_notes || "" }); }).catch(() => {});
  const create = async (e) => {
    e.preventDefault(); setMsg("");
    try {
      const payload = { ...form };
      if (!payload.enquiry_id) delete payload.enquiry_id;
      if (!payload.project_id) delete payload.project_id;
      const r = await api.post("/prebid/inspections", payload);
      setShowNew(false); openDrawer(r.data.data.id); load();
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
  };
  const doComplete = () => {
    setMsg(""); setOk("");
    api.post(`/prebid/inspections/${drawer.id}/complete`, complete)
      .then((r) => { setDrawer(r.data.data); setOk("Inspection completed"); load(); })
      .catch((e) => setMsg(e?.response?.data?.message || "Error"));
  };

  const columns = [
    { key: "number", label: "No", render: (x) => <b style={{ fontWeight: 500 }}>{x.number}</b> },
    { key: "visit_date", label: "Visit", render: (x) => dstr(x.visit_date) },
    { key: "ref", label: "Enquiry / Project", render: (x) => (<div>{x.enquiry ? <a href={"/enquiries/" + x.enquiry.id}>{x.enquiry.number}</a> : ""}{x.enquiry && x.project ? " · " : ""}{x.project ? x.project.code : ""}<div className="muted" style={{ fontSize: 11 }}>{x.enquiry?.title || x.project?.name || ""}</div></div>) },
    { key: "inspector", label: "Inspector", render: (x) => x.inspector || "—" },
    { key: "recommendation", label: "Go / No-Go", render: (x) => <span className={"badge " + (x.recommendation === "Go" ? "Approved" : x.recommendation === "NoGo" ? "Cancelled" : "Draft")}>{x.recommendation}</span> },
    { key: "status", label: "Status", render: (x) => <span className={"badge " + x.status}>{x.status}</span> },
    { key: "actions", label: "", render: (x) => <button className="btn ghost sm" onClick={() => openDrawer(x.id)}>{t(lang, "viewDetails")}</button> },
  ];

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "inspections")}</h2></div><span className="spacer" />
        <button className="btn" onClick={() => setShowNew(!showNew)}>+ {t(lang, "inspections")}</button>
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      {ok && <div className="alert ok" style={{ marginBottom: 12 }}>{ok}</div>}

      {showNew && (
        <div className="card" style={{ marginBottom: 14 }}>
          <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 10 }}>
            <div><label className="label">Enquiry</label><select className="select" value={form.enquiry_id} onChange={(e) => setForm({ ...form, enquiry_id: e.target.value })}><option value="">—</option>{enquiries.map((x) => (<option key={x.id} value={x.id}>{x.number} — {x.title}</option>))}</select></div>
            <div><label className="label">Project</label><select className="select" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}><option value="">—</option>{projects.map((x) => (<option key={x.id} value={x.id}>{x.code} — {x.name}</option>))}</select></div>
            <div><label className="label">Visit date *</label><input className="input" type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} required /></div>
            <div><label className="label">Inspector</label><input className="input" value={form.inspector} onChange={(e) => setForm({ ...form, inspector: e.target.value })} /></div>
            <div><label className="label">Attendees</label><input className="input" value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} /></div>
            <div><label className="label">Location</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit">{t(lang, "createLbl")}</button></div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10 }}>
        <select className="select" style={{ maxWidth: 170 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["", "Scheduled", "Completed", "Cancelled"].map((s) => (<option key={s} value={s}>{s || "All statuses"}</option>))}
        </select>
      </div>

      <DataTable
        columns={columns} rows={rows} total={total} page={page} limit={limit}
        onPage={(p) => { setPage(p); load(p, limit); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l); }}
        loading={loading} title={t(lang, "inspections")}
        stats={[{ label: "Total", value: total }]}
      />

      {drawer && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div className="drawer wide" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-h">
              <h3>{drawer.number} <span className={"badge " + drawer.status}>{drawer.status}</span></h3>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              {[["Visit", dstr(drawer.visit_date)], ["Inspector", drawer.inspector], ["Attendees", drawer.attendees], ["Location", drawer.location],
                ["Site condition", drawer.site_condition], ["Access", drawer.access_notes], ["Utilities", drawer.utilities_notes], ["Risks", drawer.risks],
              ].map(([k, v]) => (<div key={k}><div className="label">{k}</div><div>{v || "—"}</div></div>))}
            </div>
            {drawer.status === "Scheduled" ? (
              <div className="card">
                <h3>Complete inspection</h3>
                <div><label className="label">Findings</label><textarea className="input" rows={3} value={complete.findings} onChange={(e) => setComplete({ ...complete, findings: e.target.value })} /></div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "end" }}>
                  <div><label className="label">Recommendation</label>
                    <select className="select" value={complete.recommendation} onChange={(e) => setComplete({ ...complete, recommendation: e.target.value })}>
                      {["Go", "NoGo", "Conditional", "Pending"].map((x) => (<option key={x}>{x}</option>))}
                    </select></div>
                  <button className="btn sm" onClick={doComplete}>Complete</button>
                </div>
              </div>
            ) : (
              <div className="card">
                <div><div className="label">Findings</div><div style={{ whiteSpace: "pre-wrap" }}>{drawer.findings || "—"}</div></div>
                <div style={{ marginTop: 8 }}><div className="label">Recommendation</div><span className={"badge " + (drawer.recommendation === "Go" ? "Approved" : drawer.recommendation === "NoGo" ? "Cancelled" : "Draft")}>{drawer.recommendation}</span></div>
                {drawer.recommendation_notes && <div style={{ marginTop: 8 }}><div className="label">Notes</div><div>{drawer.recommendation_notes}</div></div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Inspections() {
  return <Suspense fallback={<div className="card">...</div>}><InspectionsInner /></Suspense>;
}
