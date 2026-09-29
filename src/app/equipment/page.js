"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const CATS = ["Crane", "Excavator", "Loader", "Dozer", "Generator", "Compactor", "Concrete Pump", "Vehicle", "Scaffolding", "Other"];

export default function Equipment() {
  const { lang, projectId } = useAppStore();
  const [tab, setTab] = useState("fleet");
  const [fleet, setFleet] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [trfs, setTrfs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [pid, setPid] = useState(projectId || "");
  const [showFleet, setShowFleet] = useState(false);
  const [showReq, setShowReq] = useState(false);
  const [showTrf, setShowTrf] = useState(false);
  const [fleetForm, setFleetForm] = useState({ name: "", category: "Crane", make_model: "", plate_no: "", serial_no: "", owned: true, daily_rate: 0, current_project_id: "", status: "Available" });
  const [reqForm, setReqForm] = useState({ project_id: "", category: "Crane", qty: 1, date_required: new Date().toISOString().slice(0, 10), duration_days: 1, operator_required: false, requested_by: "" });
  const [trfForm, setTrfForm] = useState({ equipment_id: "", to_project_id: "", transfer_date: new Date().toISOString().slice(0, 10), condition_out: "", handed_by: "", received_by: "" });

  const load = () => {
    api.get("/siteops/equipment?limit=200").then((r) => setFleet(r.data.data || [])).catch(() => {});
    const q = pid ? `?project_id=${pid}&limit=200` : "?limit=200";
    api.get("/siteops/equipment-requests" + q).then((r) => setReqs(r.data.data || [])).catch(() => {});
    api.get("/siteops/transfers?limit=200").then((r) => setTrfs(r.data.data || [])).catch(() => {});
  };
  useEffect(() => {
    api.get("/projects?limit=200").then((r) => setProjects(r.data.data || [])).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [pid]);

  const act = async (fn, okMsg) => {
    setMsg(""); setOk("");
    try { await fn(); if (okMsg) setOk(okMsg); load(); }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "equipment")}</h2></div><span className="spacer" />
        {tab === "fleet" && <button className="btn" onClick={() => setShowFleet(!showFleet)}>+ Unit</button>}
        {tab === "requests" && <button className="btn" onClick={() => setShowReq(!showReq)}>+ Request</button>}
        {tab === "transfers" && <button className="btn" onClick={() => setShowTrf(!showTrf)}>+ Transfer</button>}
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      {ok && <div className="alert ok" style={{ marginBottom: 12 }}>{ok}</div>}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select className="select" style={{ maxWidth: 230 }} value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">{t(lang, "projects")} (all)</option>
          {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
        </select>
      </div>

      <div className="tabs" style={{ maxWidth: 560, marginBottom: 14 }}>
        {[["fleet", "Fleet"], ["requests", "Requests"], ["transfers", "Transfers"]].map(([k, label]) => (
          <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "fleet" && (
        <div>
          {showFleet && (
            <div className="card" style={{ marginBottom: 12 }}>
              <form onSubmit={(e) => { e.preventDefault(); act(() => api.post("/siteops/equipment", { ...fleetForm, daily_rate: Number(fleetForm.daily_rate || 0), current_project_id: fleetForm.current_project_id || null }), "Unit registered").then(() => setShowFleet(false)); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
                <div><label className="label">Name *</label><input className="input" value={fleetForm.name} onChange={(e) => setFleetForm({ ...fleetForm, name: e.target.value })} required /></div>
                <div><label className="label">Category</label><select className="select" value={fleetForm.category} onChange={(e) => setFleetForm({ ...fleetForm, category: e.target.value })}>{CATS.map((x) => (<option key={x}>{x}</option>))}</select></div>
                <div><label className="label">Make / model</label><input className="input" value={fleetForm.make_model} onChange={(e) => setFleetForm({ ...fleetForm, make_model: e.target.value })} /></div>
                <div><label className="label">Plate no</label><input className="input" value={fleetForm.plate_no} onChange={(e) => setFleetForm({ ...fleetForm, plate_no: e.target.value })} /></div>
                <div><label className="label">Daily rate</label><input className="input" type="number" step="0.01" value={fleetForm.daily_rate} onChange={(e) => setFleetForm({ ...fleetForm, daily_rate: e.target.value })} /></div>
                <div><label className="label">Deployed to</label><select className="select" value={fleetForm.current_project_id} onChange={(e) => setFleetForm({ ...fleetForm, current_project_id: e.target.value })}><option value="">Yard</option>{projects.map((p) => (<option key={p.id} value={p.id}>{p.code}</option>))}</select></div>
                <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit">{t(lang, "createLbl")}</button></div>
              </form>
            </div>
          )}
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            {fleet.map((e) => (
              <div key={e.id} className="card" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b>{e.code}</b>
                  <span className={"badge " + (e.status === "Available" ? "Approved" : e.status === "OnSite" ? "Submitted" : "Draft")}>{e.status}</span>
                </div>
                <div style={{ marginTop: 4 }}>{e.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{e.category} {e.plate_no ? "· " + e.plate_no : ""} {e.make_model ? "· " + e.make_model : ""}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{e.current_project ? "📍 " + e.current_project.code + " — " + e.current_project.name : "📍 Yard"} {e.daily_rate ? "· " + fmt(e.daily_rate) + "/day" : ""}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {e.status !== "Maintenance" && <button className="btn ghost sm" onClick={() => act(() => api.put("/siteops/equipment/" + e.id, { status: "Maintenance" }))}>To maintenance</button>}
                  {e.status === "Maintenance" && <button className="btn ghost sm" onClick={() => act(() => api.put("/siteops/equipment/" + e.id, { status: e.current_project_id ? "OnSite" : "Available" }))}>Release</button>}
                </div>
              </div>
            ))}
            {!fleet.length && <div className="card"><p className="muted">No equipment registered yet</p></div>}
          </div>
        </div>
      )}

      {tab === "requests" && (
        <div>
          {showReq && (
            <div className="card" style={{ marginBottom: 12 }}>
              <form onSubmit={(e) => { e.preventDefault(); act(() => api.post("/siteops/equipment-requests", { ...reqForm, qty: Number(reqForm.qty), duration_days: Number(reqForm.duration_days) }), "Request raised").then(() => setShowReq(false)); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
                <div><label className="label">Project *</label><select className="select" value={reqForm.project_id} onChange={(e) => setReqForm({ ...reqForm, project_id: e.target.value })} required><option value="">—</option>{projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}</select></div>
                <div><label className="label">Category</label><select className="select" value={reqForm.category} onChange={(e) => setReqForm({ ...reqForm, category: e.target.value })}>{CATS.map((x) => (<option key={x}>{x}</option>))}</select></div>
                <div><label className="label">Required on</label><input className="input" type="date" value={reqForm.date_required} onChange={(e) => setReqForm({ ...reqForm, date_required: e.target.value })} /></div>
                <div><label className="label">Days</label><input className="input" type="number" value={reqForm.duration_days} onChange={(e) => setReqForm({ ...reqForm, duration_days: e.target.value })} /></div>
                <div><label className="label">Requested by</label><input className="input" value={reqForm.requested_by} onChange={(e) => setReqForm({ ...reqForm, requested_by: e.target.value })} /></div>
                <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit">{t(lang, "createLbl")}</button></div>
              </form>
            </div>
          )}
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>No</th><th>Project</th><th>Category</th><th>Required</th><th>Unit</th><th>Status</th><th></th></tr></thead>
            <tbody>{reqs.map((r) => (
              <tr key={r.id}><td>{r.number}</td><td>{r.project?.code}</td><td>{r.category}</td><td>{dstr(r.date_required)} ({r.duration_days}d)</td>
                <td>{r.equipment ? r.equipment.code : <span className="muted">—</span>}</td>
                <td><span className={"badge " + r.status}>{r.status}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {r.status === "Requested" && <button className="btn ghost sm" onClick={() => act(() => api.post(`/siteops/equipment-requests/${r.id}/transition`, { status: "Approved" }))}>Approve</button>}
                  {r.status === "Approved" && (
                    <span style={{ display: "inline-flex", gap: 4 }}>
                      <select className="select" style={{ maxWidth: 150 }} defaultValue="" onChange={(e) => { if (e.target.value) act(() => api.post(`/siteops/equipment-requests/${r.id}/transition`, { status: "Assigned", equipment_id: e.target.value }), "Unit assigned"); }}>
                        <option value="">Assign unit…</option>
                        {fleet.filter((f) => ["Available", "Idle"].includes(f.status)).map((f) => (<option key={f.id} value={f.id}>{f.code} — {f.name}</option>))}
                      </select>
                    </span>
                  )}
                </td></tr>
            ))}
            {!reqs.length && <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 20 }}>No requests</td></tr>}
            </tbody></table></div>
        </div>
      )}

      {tab === "transfers" && (
        <div>
          {showTrf && (
            <div className="card" style={{ marginBottom: 12 }}>
              <form onSubmit={(e) => { e.preventDefault(); act(() => api.post("/siteops/transfers", trfForm), "Transfer drafted").then(() => setShowTrf(false)); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
                <div><label className="label">Unit *</label><select className="select" value={trfForm.equipment_id} onChange={(e) => setTrfForm({ ...trfForm, equipment_id: e.target.value })} required><option value="">—</option>{fleet.map((f) => (<option key={f.id} value={f.id}>{f.code} — {f.name} ({f.status})</option>))}</select></div>
                <div><label className="label">To project *</label><select className="select" value={trfForm.to_project_id} onChange={(e) => setTrfForm({ ...trfForm, to_project_id: e.target.value })} required><option value="">—</option>{projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}</select></div>
                <div><label className="label">Date</label><input className="input" type="date" value={trfForm.transfer_date} onChange={(e) => setTrfForm({ ...trfForm, transfer_date: e.target.value })} /></div>
                <div><label className="label">Condition out</label><input className="input" value={trfForm.condition_out} onChange={(e) => setTrfForm({ ...trfForm, condition_out: e.target.value })} /></div>
                <div><label className="label">Handed by</label><input className="input" value={trfForm.handed_by} onChange={(e) => setTrfForm({ ...trfForm, handed_by: e.target.value })} /></div>
                <div><label className="label">Received by</label><input className="input" value={trfForm.received_by} onChange={(e) => setTrfForm({ ...trfForm, received_by: e.target.value })} /></div>
                <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit">{t(lang, "createLbl")}</button></div>
              </form>
            </div>
          )}
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>No</th><th>Unit</th><th>From → To</th><th>Date</th><th>Condition</th><th>Status</th><th></th></tr></thead>
            <tbody>{trfs.map((x) => (
              <tr key={x.id}><td>{x.number}</td><td>{x.equipment?.code}</td>
                <td>{x.from_project?.code || "Yard"} → <b>{x.to_project?.code}</b></td>
                <td>{dstr(x.transfer_date)}</td><td style={{ maxWidth: 220 }}>{x.condition_out || "—"}</td>
                <td><span className={"badge " + x.status}>{x.status}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {x.status === "Draft" && <button className="btn ghost sm" onClick={() => act(() => api.post(`/siteops/transfers/${x.id}/transition`, { status: "Approved" }))}>Approve</button>}
                  {x.status === "Approved" && <button className="btn ghost sm" onClick={() => act(() => api.post(`/siteops/transfers/${x.id}/transition`, { status: "Completed" }))}>Complete</button>}
                </td></tr>
            ))}
            {!trfs.length && <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 20 }}>No transfers</td></tr>}
            </tbody></table></div>
        </div>
      )}
    </div>
  );
}
