"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
export default function Boqs() {
  const [projects, setProjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [form, setForm] = useState({ number: "", title: "" });
  const [item, setItem] = useState({ boq_id: "", line_no: "", description: "", unit: "M2", quantity: 0, unit_rate: 0 });
  const load = (pid) => {
    if (!pid) return;
    api.get("/boqs?project_id=" + pid).then((r) => setRows(r.data.data || [])).catch(() => {});
  };
  useEffect(() => {
    api.get("/projects").then((r) => {
      const list = r.data.data || [];
      setProjects(list);
      if (list[0]) { setProjectId(list[0].id); load(list[0].id); }
    }).catch(() => {});
  }, []);
  const create = async (e) => {
    e.preventDefault();
    await api.post("/boqs", { ...form, project_id: projectId });
    setForm({ number: "", title: "" });
    load(projectId);
  };
  const addItem = async (e) => {
    e.preventDefault();
    await api.post("/boqs/" + item.boq_id + "/items", { ...item, quantity: Number(item.quantity), unit_rate: Number(item.unit_rate) });
    setItem({ boq_id: "", line_no: "", description: "", unit: "M2", quantity: 0, unit_rate: 0 });
    load(projectId);
  };
  const approve = async (id) => { await api.post("/boqs/" + id + "/approve"); load(projectId); };
  return (
    <div>
      <h2>BOQ</h2>
      <select value={projectId} onChange={(e) => { setProjectId(e.target.value); load(e.target.value); }}>
        {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} - {p.name}</option>))}
      </select>
      <form onSubmit={create} style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <input placeholder="BOQ no" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
        <input placeholder="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <button type="submit">Add BOQ</button>
      </form>
      {rows.map((b) => (
        <div key={b.id} style={{ border: "1px solid #ddd", padding: 8, marginBottom: 8 }}>
          <b>{b.number}</b> {b.title} | rev {b.revision} | {b.status} | total {b.total_amount}
          {b.status !== "Approved" && <button onClick={() => approve(b.id)} style={{ marginLeft: 8 }}>Approve</button>}
          <ul>{(b.items || []).map((i) => (<li key={i.id}>{i.line_no} {i.description} - {i.quantity}{i.unit} x {i.unit_rate} = {i.amount}</li>))}</ul>
        </div>
      ))}
      <h3>Add item</h3>
      <form onSubmit={addItem} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select value={item.boq_id} onChange={(e) => setItem({ ...item, boq_id: e.target.value })}>
          <option value="">select BOQ</option>
          {rows.map((b) => (<option key={b.id} value={b.id}>{b.number}</option>))}
        </select>
        <input placeholder="line" value={item.line_no} onChange={(e) => setItem({ ...item, line_no: e.target.value })} />
        <input placeholder="description" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} />
        <input placeholder="unit" value={item.unit} onChange={(e) => setItem({ ...item, unit: e.target.value })} />
        <input placeholder="qty" type="number" value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} />
        <input placeholder="rate" type="number" value={item.unit_rate} onChange={(e) => setItem({ ...item, unit_rate: e.target.value })} />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
