import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { getSupabaseServiceKey, getSupabaseUrl } from "./load-env.mjs";

const TABLES = {
  evaluaciones: "qc_evaluaciones",
  funciones: "qc_funciones",
  transacciones: "qc_transacciones_funcionales",
  casos_prueba: "qc_casos_prueba",
};

function newId() {
  return randomUUID();
}

function throwDbError(error, fallback) {
  if (error?.code === "23505") {
    const msg = error.message || "";
    if (msg.includes("codigo_rf")) throw new Error("Duplicado: codigo_rf ya registrado en esta evaluación");
    if (msg.includes("codigo")) throw new Error("Duplicado: codigo ya registrado en esta evaluación");
    throw new Error("Registro duplicado (violación UNIQUE)");
  }
  throw new Error(error?.message || fallback);
}

function mapEvaluacionInsert(row) {
  return {
    id: row.id,
    codigo: row.codigo,
    titulo: row.titulo,
    sistema: row.sistema ?? "Sistema de Gestión de Calzados Calzatura Vilchez",
    periodo: row.periodo || null,
    evaluador: row.evaluador || null,
    fecha_evaluacion: row.fecha_evaluacion,
    observaciones: row.observaciones || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapFuncionInsert(row) {
  return {
    id: row.id,
    evaluacion_id: row.evaluacion_id,
    codigo_rf: row.codigo_rf,
    modulo: row.modulo || null,
    nombre: row.nombre,
    descripcion: row.descripcion || null,
    requerida: row.requerida ?? true,
    implementada: row.implementada ?? false,
    evidencia: row.evidencia || null,
    created_at: row.created_at,
  };
}

function mapTransaccionInsert(row) {
  return {
    id: row.id,
    evaluacion_id: row.evaluacion_id,
    codigo: row.codigo,
    modulo: row.modulo || null,
    descripcion: row.descripcion,
    evaluada: row.evaluada ?? false,
    correcta: row.correcta ?? null,
    observaciones: row.observaciones || null,
    created_at: row.created_at,
  };
}

function mapCasoInsert(row) {
  return {
    id: row.id,
    evaluacion_id: row.evaluacion_id,
    codigo: row.codigo,
    nombre: row.nombre,
    modulo: row.modulo || null,
    descripcion: row.descripcion || null,
    ejecutado: row.ejecutado ?? false,
    aprobado: row.aprobado ?? null,
    observaciones: row.observaciones || null,
    created_at: row.created_at,
  };
}

export function createSupabaseRepository() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  async function countEvaluaciones() {
    const { count, error } = await supabase
      .from(TABLES.evaluaciones)
      .select("*", { count: "exact", head: true });
    if (error) throwDbError(error, "No se pudo contar evaluaciones QC");
    return count ?? 0;
  }

  return {
    backend: "supabase",
    supabaseUrl: url,

    async isEmpty() {
      return (await countEvaluaciones()) === 0;
    },

    async listEvaluaciones() {
      const { data, error } = await supabase
        .from(TABLES.evaluaciones)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throwDbError(error, "No se pudo listar evaluaciones QC");
      return data ?? [];
    },

    async getEvaluacion(id) {
      const { data, error } = await supabase.from(TABLES.evaluaciones).select("*").eq("id", id).maybeSingle();
      if (error) throwDbError(error, "No se pudo leer evaluación QC");
      return data;
    },

    async getChildren(evaluacionId) {
      const [funciones, transacciones, casos_prueba] = await Promise.all([
        supabase.from(TABLES.funciones).select("*").eq("evaluacion_id", evaluacionId),
        supabase.from(TABLES.transacciones).select("*").eq("evaluacion_id", evaluacionId),
        supabase.from(TABLES.casos_prueba).select("*").eq("evaluacion_id", evaluacionId),
      ]);
      if (funciones.error) throwDbError(funciones.error, "No se pudieron leer funciones QC");
      if (transacciones.error) throwDbError(transacciones.error, "No se pudieron leer transacciones QC");
      if (casos_prueba.error) throwDbError(casos_prueba.error, "No se pudieron leer casos QC");
      return {
        funciones: funciones.data ?? [],
        transacciones: transacciones.data ?? [],
        casos_prueba: casos_prueba.data ?? [],
      };
    },

    async createEvaluacion(payload) {
      if (!payload.codigo?.trim()) throw new Error("codigo es obligatorio");
      if (!payload.titulo?.trim()) throw new Error("titulo es obligatorio");
      const now = new Date().toISOString();
      const row = {
        id: newId(),
        codigo: payload.codigo.trim(),
        titulo: payload.titulo.trim(),
        sistema: payload.sistema ?? "Sistema de Gestión de Calzados Calzatura Vilchez",
        periodo: payload.periodo ?? "",
        evaluador: payload.evaluador ?? "",
        fecha_evaluacion: payload.fecha_evaluacion ?? now.slice(0, 10),
        observaciones: payload.observaciones ?? "",
        created_at: now,
        updated_at: now,
      };
      const { data, error } = await supabase.from(TABLES.evaluaciones).insert(mapEvaluacionInsert(row)).select().single();
      if (error) {
        if (error.code === "23505") throw new Error(`Código duplicado: ${row.codigo}`);
        throwDbError(error, "No se pudo crear evaluación QC");
      }
      return data;
    },

    async updateEvaluacion(id, payload) {
      const existing = await this.getEvaluacion(id);
      if (!existing) return null;
      if (payload.codigo && payload.codigo !== existing.codigo) {
        const { data: dup } = await supabase
          .from(TABLES.evaluaciones)
          .select("id")
          .eq("codigo", payload.codigo)
          .neq("id", id)
          .maybeSingle();
        if (dup) throw new Error(`Código duplicado: ${payload.codigo}`);
      }
      const patch = {
        ...payload,
        id: undefined,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from(TABLES.evaluaciones)
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throwDbError(error, "No se pudo actualizar evaluación QC");
      return data;
    },

    async deleteEvaluacion(id) {
      const { data, error } = await supabase.from(TABLES.evaluaciones).delete().eq("id", id).select("id");
      if (error) throwDbError(error, "No se pudo eliminar evaluación QC");
      return (data?.length ?? 0) > 0;
    },

    async upsertFuncion(evaluacionId, payload) {
      if (payload.id) {
        const { data, error } = await supabase
          .from(TABLES.funciones)
          .update({ ...payload, id: undefined, evaluacion_id: undefined })
          .eq("id", payload.id)
          .eq("evaluacion_id", evaluacionId)
          .select()
          .single();
        if (error) throwDbError(error, "No se pudo actualizar función QC");
        return data;
      }
      if (!payload.codigo_rf?.trim()) throw new Error("codigo_rf es obligatorio");
      if (!payload.nombre?.trim()) throw new Error("nombre es obligatorio");
      const row = {
        id: newId(),
        evaluacion_id: evaluacionId,
        created_at: new Date().toISOString(),
        requerida: true,
        implementada: false,
        ...payload,
      };
      const { data, error } = await supabase.from(TABLES.funciones).insert(mapFuncionInsert(row)).select().single();
      if (error) throwDbError(error, "No se pudo crear función QC");
      return data;
    },

    async upsertTransaccion(evaluacionId, payload) {
      if (payload.id) {
        const { data, error } = await supabase
          .from(TABLES.transacciones)
          .update({ ...payload, id: undefined, evaluacion_id: undefined })
          .eq("id", payload.id)
          .eq("evaluacion_id", evaluacionId)
          .select()
          .single();
        if (error) throwDbError(error, "No se pudo actualizar transacción QC");
        return data;
      }
      if (!payload.codigo?.trim()) throw new Error("codigo es obligatorio");
      if (!payload.descripcion?.trim()) throw new Error("descripcion es obligatoria");
      const row = {
        id: newId(),
        evaluacion_id: evaluacionId,
        created_at: new Date().toISOString(),
        evaluada: false,
        correcta: null,
        ...payload,
      };
      const { data, error } = await supabase
        .from(TABLES.transacciones)
        .insert(mapTransaccionInsert(row))
        .select()
        .single();
      if (error) throwDbError(error, "No se pudo crear transacción QC");
      return data;
    },

    async upsertCasoPrueba(evaluacionId, payload) {
      if (payload.id) {
        const { data, error } = await supabase
          .from(TABLES.casos_prueba)
          .update({ ...payload, id: undefined, evaluacion_id: undefined })
          .eq("id", payload.id)
          .eq("evaluacion_id", evaluacionId)
          .select()
          .single();
        if (error) throwDbError(error, "No se pudo actualizar caso QC");
        return data;
      }
      if (!payload.codigo?.trim()) throw new Error("codigo es obligatorio");
      if (!payload.nombre?.trim()) throw new Error("nombre es obligatorio");
      const row = {
        id: newId(),
        evaluacion_id: evaluacionId,
        created_at: new Date().toISOString(),
        ejecutado: false,
        aprobado: null,
        ...payload,
      };
      const { data, error } = await supabase.from(TABLES.casos_prueba).insert(mapCasoInsert(row)).select().single();
      if (error) throwDbError(error, "No se pudo crear caso QC");
      return data;
    },

    async deleteFuncion(id) {
      const { data, error } = await supabase.from(TABLES.funciones).delete().eq("id", id).select("id");
      if (error) throwDbError(error, "No se pudo eliminar función QC");
      return (data?.length ?? 0) > 0;
    },

    async deleteTransaccion(id) {
      const { data, error } = await supabase.from(TABLES.transacciones).delete().eq("id", id).select("id");
      if (error) throwDbError(error, "No se pudo eliminar transacción QC");
      return (data?.length ?? 0) > 0;
    },

    async deleteCasoPrueba(id) {
      const { data, error } = await supabase.from(TABLES.casos_prueba).delete().eq("id", id).select("id");
      if (error) throwDbError(error, "No se pudo eliminar caso QC");
      return (data?.length ?? 0) > 0;
    },

    async applySeed(seed) {
      const { data: existing, error: listErr } = await supabase.from(TABLES.evaluaciones).select("id");
      if (listErr) throwDbError(listErr, "No se pudo listar evaluaciones QC para seed");
      const ids = (existing ?? []).map((r) => r.id);
      if (ids.length) {
        const { error: delErr } = await supabase.from(TABLES.evaluaciones).delete().in("id", ids);
        if (delErr) throwDbError(delErr, "No se pudo limpiar datos QC previos al seed");
      }

      if (seed.evaluaciones?.length) {
        const { error } = await supabase
          .from(TABLES.evaluaciones)
          .insert(seed.evaluaciones.map(mapEvaluacionInsert));
        if (error) throwDbError(error, "No se pudo insertar evaluaciones del seed QC");
      }
      if (seed.funciones?.length) {
        const { error } = await supabase.from(TABLES.funciones).insert(seed.funciones.map(mapFuncionInsert));
        if (error) throwDbError(error, "No se pudo insertar funciones del seed QC");
      }
      if (seed.transacciones?.length) {
        const { error } = await supabase
          .from(TABLES.transacciones)
          .insert(seed.transacciones.map(mapTransaccionInsert));
        if (error) throwDbError(error, "No se pudo insertar transacciones del seed QC");
      }
      if (seed.casos_prueba?.length) {
        const { error } = await supabase
          .from(TABLES.casos_prueba)
          .insert(seed.casos_prueba.map(mapCasoInsert));
        if (error) throwDbError(error, "No se pudo insertar casos del seed QC");
      }
    },
  };
}
