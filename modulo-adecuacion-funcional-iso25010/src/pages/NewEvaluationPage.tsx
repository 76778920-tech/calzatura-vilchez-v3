import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export function NewEvaluationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    codigo: "",
    titulo: "",
    sistema: "Sistema de Gestión de Calzados Calzatura Vilchez",
    periodo: "",
    evaluador: "",
    fecha_evaluacion: new Date().toISOString().slice(0, 10),
    observaciones: "",
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const row = await api.createEvaluacion(form);
    navigate(`/evaluacion/${row.id}`);
  };

  return (
    <div className="page">
      <h1>Nueva evaluación de Adecuación Funcional</h1>
      <form className="panel form-stack" onSubmit={submit}>
        <label>Código<input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="QC-AF-2026-Q3" required /></label>
        <label>Título<input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required /></label>
        <label>Sistema<input value={form.sistema} onChange={(e) => setForm({ ...form, sistema: e.target.value })} /></label>
        <label>Periodo<input value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} placeholder="2026-Q3" /></label>
        <label>Evaluador<input value={form.evaluador} onChange={(e) => setForm({ ...form, evaluador: e.target.value })} /></label>
        <label>Fecha<input type="date" value={form.fecha_evaluacion} onChange={(e) => setForm({ ...form, fecha_evaluacion: e.target.value })} /></label>
        <label>Observaciones<textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={3} /></label>
        <button type="submit" className="btn primary">Crear evaluación</button>
      </form>
    </div>
  );
}
