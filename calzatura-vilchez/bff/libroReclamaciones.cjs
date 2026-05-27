"use strict";

const crypto = require("crypto");
const { sendComplaintNotifyEmail } = require("./complaintNotifyEmail.cjs");
const { isValidPeruPhone, peruPhoneError } = require("./peruPhone.cjs");

const COMPLAINT_RATE_WINDOW_MS = 60 * 60 * 1000;
const COMPLAINT_RATE_MAX = 8;
const complaintIpBuckets = new Map();

const ESTADOS = ["recibido", "en_tramite", "respondido", "cerrado"];

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function hashIp(ip) {
  return crypto.createHash("sha256").update(String(ip)).digest("hex").slice(0, 24);
}

function isComplaintRateLimited(ip) {
  const key = `lr:${ip}`;
  const now = Date.now();
  const bucket = complaintIpBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= COMPLAINT_RATE_WINDOW_MS) {
    complaintIpBuckets.set(key, { windowStart: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > COMPLAINT_RATE_MAX;
}

function generateComplaintCode(date = new Date()) {
  const ymd = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  return `CV-LR-${ymd}-${suffix}`;
}

function trimStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function validateComplaintPayload(body) {
  const errors = {};
  const tipo = trimStr(body?.tipo);
  const nombres = trimStr(body?.nombres);
  const apellidos = trimStr(body?.apellidos);
  const dni = trimStr(body?.dni);
  const domicilio = trimStr(body?.domicilio);
  const telefono = trimStr(body?.telefono);
  const email = trimStr(body?.email);
  const bienContratado = trimStr(body?.bienContratado);
  const monto = trimStr(body?.monto);
  const detalle = trimStr(body?.detalle);

  if (!["reclamo", "queja"].includes(tipo)) errors.tipo = "Tipo no válido";
  if (!nombres) errors.nombres = "Nombres requeridos";
  if (!apellidos) errors.apellidos = "Apellidos requeridos";
  if (!/^\d{8}$/.test(dni)) errors.dni = "DNI no válido";
  if (!domicilio) errors.domicilio = "Domicilio requerido";
  if (!telefono) {
    errors.telefono = "Teléfono requerido";
  } else {
    const phoneErr = peruPhoneError(telefono);
    if (phoneErr || !isValidPeruPhone(telefono)) {
      errors.telefono = phoneErr || "Teléfono no válido";
    }
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Correo no válido";
  if (!bienContratado) errors.bienContratado = "Producto o servicio requerido";
  if (tipo === "reclamo" && !monto) errors.monto = "Monto requerido en reclamo";
  if (monto && !/^\d+(\.\d{1,2})?$/.test(monto)) errors.monto = "Monto no válido";
  if (!detalle || detalle.length < 10) errors.detalle = "Detalle insuficiente";
  if (body?.aceptaPrivacidad !== true) errors.aceptaPrivacidad = "Debes aceptar la política de privacidad";

  if (Object.keys(errors).length > 0) {
    const err = new Error("Datos del formulario incompletos o no válidos");
    err.status = 400;
    err.fields = errors;
    throw err;
  }

  return {
    tipo,
    canal: ["web", "whatsapp", "tienda"].includes(trimStr(body?.canal)) ? trimStr(body.canal) : "web",
    nombres,
    apellidos,
    dni,
    domicilio,
    telefono,
    email,
    bienContratado,
    monto: monto || null,
    numeroPedido: trimStr(body?.numeroPedido) || null,
    detalle,
  };
}

function mapComplaintRow(row) {
  if (!row) return null;
  return {
    codigo: row.codigo,
    tipo: row.tipo,
    canal: row.canal,
    nombres: row.nombres,
    apellidos: row.apellidos,
    dni: row.dni,
    domicilio: row.domicilio,
    telefono: row.telefono,
    email: row.email,
    bienContratado: row.bienContratado,
    monto: row.monto,
    numeroPedido: row.numeroPedido,
    detalle: row.detalle,
    estado: row.estado,
    notasInternas: row.notasInternas,
    creadoEn: row.creadoEn,
    actualizadoEn: row.actualizadoEn,
  };
}

function registerLibroReclamacionesRoutes(app, deps) {
  const {
    cors,
    getSupabaseAdmin,
    verifyFirebaseUser,
    assertAdminRole,
    assertTrabajadorRole,
    logAuditFn,
    logServerError,
    httpErrorStatus,
    publicError,
  } = deps;

  app.post("/libro-reclamaciones", (req, res) => {
    cors(req, res, async () => {
      try {
        const ip = getClientIp(req);
        if (isComplaintRateLimited(ip)) {
          return res.status(429).json({ error: "Demasiados envíos. Intenta más tarde." });
        }

        const payload = validateComplaintPayload(req.body);
        const supabase = getSupabaseAdmin();
        const now = new Date().toISOString();
        let codigo = generateComplaintCode();
        let inserted = null;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const row = {
            codigo,
            ...payload,
            estado: "recibido",
            notasInternas: null,
            ipHash: hashIp(ip),
            creadoEn: now,
            actualizadoEn: now,
          };
          const { data, error } = await supabase.from("libro_reclamaciones").insert(row).select("*").single();
          if (!error) {
            inserted = data;
            break;
          }
          if (error.code === "23505") {
            codigo = generateComplaintCode();
            continue;
          }
          throw error;
        }

        if (!inserted) {
          return res.status(503).json({ error: "No se pudo registrar la hoja. Intenta de nuevo." });
        }

        await logAuditFn(
          supabase,
          "libro_reclamacion_creada",
          "libro_reclamaciones",
          codigo,
          `${payload.nombres} ${payload.apellidos}`,
          null,
          null,
          { tipo: payload.tipo, canal: payload.canal },
        );

        void sendComplaintNotifyEmail(payload, codigo, logServerError).catch(() => {});

        return res.status(201).json({
          complaint: mapComplaintRow(inserted),
          codigo,
          submittedAt: now,
        });
      } catch (error) {
        if (error?.fields) {
          return res.status(400).json({ error: publicError(error), fields: error.fields });
        }
        logServerError("libro-reclamaciones POST:", error);
        return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
      }
    });
  });

  async function listComplaints(req, res, role) {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      if (role === "admin") {
        await assertAdminRole(supabase, decodedToken.uid);
      } else {
        await assertTrabajadorRole(supabase, decodedToken.uid);
      }

      const estado = trimStr(req.query.estado);
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      let query = supabase
        .from("libro_reclamaciones")
        .select("*")
        .order("creadoEn", { ascending: false })
        .limit(limit);
      if (estado && ESTADOS.includes(estado)) {
        query = query.eq("estado", estado);
      }
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({
        complaints: (data ?? []).map(mapComplaintRow),
      });
    } catch (error) {
      logServerError(`libro-reclamaciones list (${role}):`, error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  }

  app.get("/admin/libro-reclamaciones", (req, res) => {
    cors(req, res, () => listComplaints(req, res, "admin"));
  });

  app.get("/staff/libro-reclamaciones", (req, res) => {
    cors(req, res, () => listComplaints(req, res, "staff"));
  });

  async function patchComplaint(req, res, role) {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      if (role === "admin") {
        await assertAdminRole(supabase, decodedToken.uid);
      } else {
        await assertTrabajadorRole(supabase, decodedToken.uid);
      }

      const codigo = trimStr(req.params.codigo);
      if (!codigo) return res.status(400).json({ error: "Código requerido" });

      const estado = trimStr(req.body?.estado);
      const notasInternas =
        req.body?.notasInternas === undefined ? undefined : trimStr(req.body.notasInternas) || null;

      const patch = { actualizadoEn: new Date().toISOString() };
      if (estado) {
        if (!ESTADOS.includes(estado)) {
          return res.status(400).json({ error: "Estado no válido" });
        }
        patch.estado = estado;
      }
      if (notasInternas !== undefined) patch.notasInternas = notasInternas;
      if (!patch.estado && notasInternas === undefined) {
        return res.status(400).json({ error: "Nada que actualizar" });
      }

      const { data, error } = await supabase
        .from("libro_reclamaciones")
        .update(patch)
        .eq("codigo", codigo)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Hoja no encontrada" });

      await logAuditFn(
        supabase,
        "libro_reclamacion_actualizada",
        "libro_reclamaciones",
        codigo,
        codigo,
        decodedToken.uid,
        decodedToken.email || null,
        patch,
      );

      return res.status(200).json({ complaint: mapComplaintRow(data) });
    } catch (error) {
      logServerError(`libro-reclamaciones patch (${role}):`, error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  }

  app.patch("/admin/libro-reclamaciones/:codigo", (req, res) => {
    cors(req, res, () => patchComplaint(req, res, "admin"));
  });

  app.patch("/staff/libro-reclamaciones/:codigo", (req, res) => {
    cors(req, res, () => patchComplaint(req, res, "staff"));
  });
}

module.exports = {
  registerLibroReclamacionesRoutes,
  generateComplaintCode,
  validateComplaintPayload,
};
