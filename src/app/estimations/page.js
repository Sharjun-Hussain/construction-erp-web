"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
export default function Estimations() {
  const [projects, setProjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [form, setForm] = useState({ number: "", material_cost: 0, labor_cost: 0, equipment_cost: 0, overhead_pct: 5, margin_pct: 10 });
  const load = (pid) => {
    if (!pid) return;
    api.get("/estimations?project_id=" + pid).then((r) => setRows(r.data.data || [])).catch(() => {});
  };
  useEffect(() => {
    api.get("/projects").then((r) => {
      const list = r.data.data || [];
      setProjects(list);
      if (list[0]) { setProjectId(list[0].id); load(list[0].id); }
    }).catch(() => {});
  }, []);
  const create = async (ev) => {
    ev.preventDefault();
    const body = { ...form, project_id: projectId };
    Object.keys(body).forEach((k) => { if (["material_cost", "labor_cost", "equipment_cost", "overhead_pct", "margin_pct"].includes(k)) body[k] = Number(body[k]); });
    await api.post("/estimations", body);
    load(projectId);
  };
  const approve = async (id) => { await api.post("/estimations/" + id + "/approve"); load(projectId); };
  return (
    <div>
      <h2>Estimation</h2>
      <select value={projectId} onChange={(ev) => { setProjectId(ev.target.value); load(ev.target.value); }}>
        {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} - {p.name}</option>))}
      </select>
      <form onSubmit={create} style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
        <input placeholder="EST no" value={form.number} onChange={(ev) => setForm({ ...form, number: ev.target.value })} />
        <input placeholder="material" type="number" value={form.material_cost} onChange={(ev) => setForm({ ...form, material_cost: ev.target.value })} />
        <input placeholder="labor" type="number" value={form.labor_cost} onChange={(ev) => setForm({ ...form, labor_cost: ev.target.value })} />
        <input placeholder="equipment" type="number" value={form.equipment_cost} onChange={(ev) => setForm({ ...form, equipment_cost: ev.target.value })} />
        <input placeholder="OH%" type="number" value={form.overhead_pct} onChange={(ev) => setForm({ ...form, overhead_pct: ev.target.value })} />
        <input placeholder="margin%" type="number" value={form.margin_pct} onChange={(ev) => setForm({ ...form, margin_pct: ev.target.value })} />
        <button type="submit">Add</button>
      </form>
      <table border="1" cellPadding="6">
        <thead><tr><th>No</th><th>Cost</th><th>Sell</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.map((x) => (<tr key={x.id}><td>{x.number}</td><td>{x.total_cost}</td><td>{x.sell_total}</td><td>{x.status}</td><td>{x.status !== "Approved" && <button onClick={() => approve(x.id)}>Approve</button>}</td></tr>))}</tbody>
      </table>
    </div>
  );
}
