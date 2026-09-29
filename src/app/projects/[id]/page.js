"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const NEXT = { Draft: ["Tender"], Tender: ["Awarded", "Draft"], Awarded: ["InProgress"], InProgress: ["OnHold", "Completed"], OnHold: ["InProgress"], Completed: ["HandedOver"], HandedOver: [] };
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const TABS = ["overview", "activity", "budget", "advances", "team", "milestones", "documents"];

export default function ProjectDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { lang } = useAppStore();
  const [tab, setTab] = useState("overview");
  const [proj, setProj] = useState(null);
  const [sum, setSum] = useState(null);
  const [wip, setWip] = useState(null);
  const [msg, setMsg] = useState("");
  const [budget, setBudget] = useState([]);
  const [adv, setAdv] = useState([]);
  const [advBal, setAdvBal] = useState(null);
  const [advForm, setAdvForm] = useState({ number: "", amount: 0 });
  const [members, setMembers] = useState([]);
  const [memForm, setMemForm] = useState({ member_name: "", role: "Site Engineer", phone: "" });
  const [miles, setMiles] = useState([]);
  const [msForm, setMsForm] = useState({ title: "", due_date: "", weight_pct: 0 });
  const [activity, setActivity] = useState(null);
  const [docs, setDocs] = useState([]);
  const [customers, setCustomers] = useState([]);

  const loadAll = () => {
    api.get("/projects/" + id).then((r) => { setProj(r.data.data); setBudget(r.data.data.budgets || []); }).catch(() => {});
    api.get("/dashboard/project/" + id).then((r) => setSum(r.data.data)).catch(() => {});
    api.get("/ipc/project/" + id + "/wip").then((r) => setWip(r.data.data)).catch(() => {});
    api.get("/projects/" + id + "/advances").then((r) => setAdv(r.data.data || [])).catch(() => {});
    api.get("/projects/" + id + "/advances-balance").then((r) => setAdvBal(r.data.data)).catch(() => {});
    api.get("/projects/" + id + "/members").then((r) => setMembers(r.data.data || [])).catch(() => {});
    api.get("/site/milestones?project_id=" + id).then((r) => setMiles(r.data.data || [])).catch(() => {});
    api.get("/projects/" + id + "/activity?limit=30").then((r) => setActivity(r.data.data)).catch(() => {});
    api.get("/documents?entity_type=project&entity_id=" + id).then((r) => setDocs(r.data.data || [])).catch(() => {});
    api.get("/customers?limit=200").then((r) => setCustomers(r.data.data || [])).catch(() => {});
  };
  useEffect(() => { loadAll(); }, [id]);

  const act = async (fn, okMsg) => {
    setMsg("");
    try { await fn(); setMsg(""); loadAll(); }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const transition = (s) => act(() => api.post(`/projects/${id}/transition`, { status: s }));
  const del = () => {
    if (!window.confirm(t(lang, "confirmDelete"))) return;
    api.delete("/projects/" + id).then(() => router.replace("/projects")).catch((e) => setMsg(e?.response?.data?.message || "Error"));
  };
  const saveBudget = () => act(() => api.post(`/projects/${id}/budget`, { items: budget.map((b) => ({ head: b.head, budgeted: Number(b.budgeted), actual_manual: Number(b.actual_manual), description: b.description })) }));
  const addAdvance = (e) => { e.preventDefault(); act(() => api.post(`/projects/${id}/advances`, { ...advForm, amount: Number(advForm.amount) })).then(() => setAdvForm({ number: "", amount: 0 })); };
  const receiveAdv = (a) => act(() => api.post(`/projects/${id}/advances/${a.id}/receive`));
  const addMember = (e) => { e.preventDefault(); act(() => api.post(`/projects/${id}/members`, memForm)).then(() => setMemForm({ member_name: "", role: "Site Engineer", phone: "" })); };
  const delMember = (m) => act(() => api.delete(`/projects/${id}/members/${m.id}`));
  const addMile = (e) => { e.preventDefault(); act(() => api.post("/site/milestones", { ...msForm, project_id: id, weight_pct: Number(msForm.weight_pct) })).then(() => setMsForm({ title: "", due_date: "", weight_pct: 0 })); };
  const setMile = (m, status) => act(() => api.put("/site/milestones/" + m.id, { status }));
  const dl = async (d) => {
    try {
      const r = await api.get(`/documents/${d.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = d.file_name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { setMsg("Download failed"); }
  };

  if (!proj) return <div className="card">...</div>;
  return (
    <div className="project-detail">
      <div className="page-head">
        <div>
          <h2>{proj.code} — {proj.name}</h2>
          <p className="sub">{proj.client_name || ""} · {proj.city || ""}</p>
        </div>
        <span className="spacer" />
        <span className={"badge " + proj.status} style={{ fontSize: 13 }}>{proj.status}</span>
      </div>
      {msg && <div className="alert err">{msg}</div>}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <b style={{ fontSize: 13 }}>{t(lang, "moveTo")}:</b>
        {(NEXT[proj.status] || []).map((s) => (<button key={s} className="btn ghost sm" onClick={() => transition(s)}>{s}</button>))}
        {!(NEXT[proj.status] || []).length && <span className="muted">—</span>}
        <span className="spacer" style={{ flex: 1 }} />
        <button className="btn danger sm" onClick={del}>{t(lang, "deleteProject")}</button>
      </div>

      <div className="tabs" style={{ maxWidth: 640 }}>
        {TABS.map((x) => (<button key={x} type="button" className={tab === x ? "on" : ""} onClick={() => setTab(x)}>{t(lang, "tab" + x[0].toUpperCase() + x.slice(1))}</button>))}
      </div>

      {tab === "overview" && (
        <>
          <div className="card" style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <b style={{ fontSize: 13 }}>{t(lang, "customers")}:</b>
            <span>{proj.customer ? `${proj.customer.code} — ${proj.customer.name}` : (proj.client_name || "-")}</span>
            <span style={{ flex: 1 }} />
            <select
              className="select" style={{ maxWidth: 260 }}
              value={proj.client_id || ""}
              onChange={(e) => act(() => api.put("/projects/" + id, { client_id: e.target.value || null }))}
            >
              <option value="">{t(lang, "linkCustomer")}</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.code} — {c.name}</option>))}
            </select>
          </div>
          <div className="grid stats" style={{ marginTop: 14 }}>
          <div className="card stat"><div className="k">{t(lang, "contractValue")}</div><div className="v">{fmt(proj.contract_value)}</div></div>
          <div className="card stat"><div className="k">{t(lang, "progress")}</div><div className="v">{sum?.progress_pct ?? 0}%</div></div>
          <div className="card stat"><div className="k">{t(lang, "billed")}</div><div className="v">{fmt(sum?.ipc_billed)}</div></div>
          <div className="card stat"><div className="k">{t(lang, "committed")}</div><div className="v">{fmt(sum?.po_committed)}</div></div>
          <div className="card stat"><div className="k">{t(lang, "wipTitle")}</div><div className="v">{fmt(wip?.wip_unbilled)}</div></div>
          <div className="card stat"><div className="k">{t(lang, "costIncurred")}</div><div className="v">{fmt(wip?.cost_incurred)}</div></div>
          <div className="card stat"><div className="k">{t(lang, "earnedValue")}</div><div className="v">{fmt(wip?.earned_value)}</div></div>
          <div className="card stat"><div className="k">{t(lang, "balance")}</div><div className="v">{fmt(advBal?.balance)}</div></div>
          </div>
        </>
      )}

      {tab === "budget" && (
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="tbl">
            <thead><tr><th>{t(lang, "head")}</th><th>{t(lang, "budgeted")}</th><th>{t(lang, "manualActual")}</th><th>{t(lang, "description")}</th></tr></thead>
            <tbody>{budget.map((b, i) => (
              <tr key={b.head}>
                <td><b>{b.head}</b></td>
                <td><input className="input" type="number" value={b.budgeted} onChange={(e) => setBudget(budget.map((x, j) => j === i ? { ...x, budgeted: e.target.value } : x))} /></td>
                <td><input className="input" type="number" value={b.actual_manual} onChange={(e) => setBudget(budget.map((x, j) => j === i ? { ...x, actual_manual: e.target.value } : x))} /></td>
                <td><input className="input" value={b.description || ""} onChange={(e) => setBudget(budget.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} /></td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{ padding: 12 }}><button className="btn" onClick={saveBudget}>{t(lang, "saveBudget")}</button></div>
        </div>
      )}

      {tab === "advances" && (
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          <div className="card">
            <b>{t(lang, "balance")}: {fmt(advBal?.balance)} SAR</b>
            <form onSubmit={addAdvance} style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <input className="input" style={{ maxWidth: 160 }} placeholder={t(lang, "advNumber")} value={advForm.number} onChange={(e) => setAdvForm({ ...advForm, number: e.target.value })} required />
              <input className="input" style={{ maxWidth: 160 }} type="number" placeholder={t(lang, "amount")} value={advForm.amount} onChange={(e) => setAdvForm({ ...advForm, amount: e.target.value })} required />
              <button className="btn" type="submit">{t(lang, "addAdvance")}</button>
            </form>
          </div>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>{t(lang, "advNumber")}</th><th>{t(lang, "amount")}</th><th>{t(lang, "recovered")}</th><th>Status</th><th></th></tr></thead>
            <tbody>{adv.map((a) => (
              <tr key={a.id}><td><b>{a.number}</b></td><td>{fmt(a.amount)}</td><td>{fmt(a.recovered)}</td>
                <td><span className={"badge " + (a.status === "Closed" ? "Completed" : a.status === "Draft" ? "Draft" : "Submitted")}>{a.status}</span></td>
                <td>{a.status === "Draft" && <button className="btn ghost sm" onClick={() => receiveAdv(a)}>{t(lang, "markReceived")}</button>}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}

      {tab === "team" && (
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          <div className="card">
            <form onSubmit={addMember} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input className="input" style={{ maxWidth: 200 }} placeholder={t(lang, "memberName")} value={memForm.member_name} onChange={(e) => setMemForm({ ...memForm, member_name: e.target.value })} required />
              <input className="input" style={{ maxWidth: 180 }} placeholder={t(lang, "role")} value={memForm.role} onChange={(e) => setMemForm({ ...memForm, role: e.target.value })} />
              <input className="input" style={{ maxWidth: 160 }} placeholder="05..." value={memForm.phone} onChange={(e) => setMemForm({ ...memForm, phone: e.target.value })} />
              <button className="btn" type="submit">{t(lang, "addMember")}</button>
            </form>
          </div>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>{t(lang, "memberName")}</th><th>{t(lang, "role")}</th><th></th></tr></thead>
            <tbody>{members.map((m) => (
              <tr key={m.id}><td><b>{m.member_name}</b></td><td>{m.role}</td>
                <td><button className="btn ghost sm" onClick={() => delMember(m)}>×</button></td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}

      {tab === "milestones" && (
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          <div className="card">
            <form onSubmit={addMile} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input className="input" style={{ maxWidth: 240 }} placeholder={t(lang, "title")} value={msForm.title} onChange={(e) => setMsForm({ ...msForm, title: e.target.value })} required />
              <input className="input" style={{ maxWidth: 170 }} type="date" value={msForm.due_date} onChange={(e) => setMsForm({ ...msForm, due_date: e.target.value })} />
              <input className="input" style={{ maxWidth: 120 }} type="number" placeholder="%" value={msForm.weight_pct} onChange={(e) => setMsForm({ ...msForm, weight_pct: e.target.value })} />
              <button className="btn" type="submit">{t(lang, "addMilestone")}</button>
            </form>
          </div>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>{t(lang, "title")}</th><th>{t(lang, "dueDate")}</th><th>%</th><th>Status</th><th></th></tr></thead>
            <tbody>{miles.map((m) => (
              <tr key={m.id}><td><b>{m.title}</b></td><td>{m.due_date || "-"}</td><td>{m.weight_pct}</td>
                <td><span className={"badge " + (m.status === "Completed" ? "Completed" : m.status === "InProgress" ? "Submitted" : "Draft")}>{m.status}</span></td>
                <td style={{ display: "flex", gap: 6 }}>
                  {m.status === "Pending" && <button className="btn ghost sm" onClick={() => setMile(m, "InProgress")}>Start</button>}
                  {m.status !== "Completed" && <button className="btn ghost sm" onClick={() => setMile(m, "Completed")}>{t(lang, "markDone")}</button>}
                </td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}

      {tab === "activity" && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="muted" style={{ marginBottom: 10 }}>
            {t(lang, "manpower7")}: <b>{activity?.last_7d_manpower_days ?? 0}</b>
          </div>
          <div className="feed">
            {(activity?.feed || []).map((f, i) => (
              <div key={i} className="feed-row">
                <span className="feed-dot" style={{ background: { dpr: "#16a34a", grn: "#0d9488", sc_cert: "#ea580c", ipc: "#db2777", variation: "#7c3aed", milestone: "#2563eb", tender: "#9333ea", guarantee: "#a86a12" }[f.kind] || "#94a3b8" }} />
                <span className="feed-tag">{f.kind}</span>
                <span className="feed-txt">{f.title}</span>
                <span className={"badge " + (f.status === "Approved" || f.status === "Completed" || f.status === "Paid" ? "Completed" : f.status === "Draft" || f.status === "Pending" ? "Draft" : "Submitted")}>{f.status}</span>
              </div>
            ))}
            {!(activity?.feed || []).length && <p className="muted">{t(lang, "noResults")}</p>}
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="card" style={{ marginTop: 14 }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const file = e.target.file.files[0];
              if (!file) return;
              const fd = new FormData();
              fd.append("file", file);
              fd.append("entity_type", "project");
              fd.append("entity_id", id);
              act(() => api.post("/documents/upload", fd));
              e.target.reset();
            }}
            style={{ display: "flex", gap: 8, marginBottom: 12 }}
          >
            <input type="file" name="file" className="input" style={{ maxWidth: 320 }} />
            <button className="btn sm" type="submit">{t(lang, "uploadLbl")}</button>
          </form>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>{t(lang, "title")}</th><th></th></tr></thead>
            <tbody>{docs.map((d) => (
              <tr key={d.id}><td>{d.file_name}</td>
                <td><button className="btn ghost sm" onClick={() => dl(d)}>{t(lang, "downloadLbl")}</button></td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
