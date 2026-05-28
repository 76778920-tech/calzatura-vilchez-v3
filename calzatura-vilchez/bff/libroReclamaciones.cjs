"use strict";

const crypto = require("crypto");
const { getClientIp, hashIp } = require("./clientIp.cjs");
const { sendComplaintNotifyEmail } = require("./complaintNotifyEmail.cjs");
const { sendComplaintConsumerEmail } = require("./complaintConsumerEmail.cjs");
const { onValidationFailure, SURFACES } = require("./securityMonitor.cjs");
const { enforceRateLimit } = require("./publicRateLimit.cjs");
const { isValidPeruPhone, peruPhoneError } = require("./peruPhone.cjs");
const { emailValidationError, normalizeEmailInput } = require("./emailValidation.cjs");
const { COMPLAINT_DETALLE_MIN_LENGTH } = require("./complaintLegalConstants.cjs");

const ESTADOS = ["recibido", "en_tramite", "respondido", "cerrado"];

function generateComplaintCode(date = new Date()) {
  const ymd = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  return `CV-LR-${ymd}-${suffix}`;
}

function trimStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function validateComplaintPayload(body, options = {}) {
  const { requirePrivacyConsent = true, allowedCanales = ["web", "whatsapp", "tienda"] } = options;
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
  const emailErr = emailValidationError(email);
  if (emailErr) errors.email = emailErr;
  if (!bienContratado) errors.bienContratado = "Producto o servicio requerido";
  if (tipo === "reclamo" && !monto) errors.monto = "Monto requerido en reclamo";
  if (monto && !/^\d+(\.\d{1,2})?$/.test(monto)) errors.monto = "Monto no válido";
  if (!detalle || detalle.length < COMPLAINT_DETALLE_MIN_LENGTH) {
    errors.detalle = "Detalle insuficiente";
  }
  const rawCanal = trimStr(body?.canal);
  const canal = rawCanal || (allowedCanales.includes("web") ? "web" : "");
  if (!allowedCanales.includes(canal)) {
    errors.canal = "Canal no válido";
  }
  if (requirePrivacyConsent && body?.aceptaPrivacidad !== true) {
    errors.aceptaPrivacidad = "Debes aceptar la política de privacidad";
  }

  if (Object.keys(errors).length > 0) {
    const err = new Error("Datos del formulario incompletos o no válidos");
    err.status = 400;
    err.fields = errors;
    throw err;
  }

  return {
    tipo,
    canal,
    nombres,
    apellidos,
    dni,
    domicilio,
    telefono,
    email: normalizeEmailInput(email),
    bienContratado,
    monto: monto || null,
    numeroPedido: trimStr(body?.numeroPedido) || null,
    detalle,
  };
}

function validateComplaintLookupQuery(query) {
  const codigo = trimStr(query?.codigo).toUpperCase();
  const dni = trimStr(query?.dni);
  const errors = {};
  if (!/^CV-LR-\d{8}-[A-Z0-9]{6}$/.test(codigo)) errors.codigo = "Código no válido";
  if (!/^\d{8}$/.test(dni)) errors.dni = "DNI no válido";
  if (Object.keys(errors).length > 0) {
    const err = new Error("Datos de consulta inválidos");
    err.status = 400;
    err.fields = errors;
    throw err;
  }
  return { codigo, dni };
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

async function insertComplaintRecord({ supabase, payload, ipHash }) {
  const now = new Date().toISOString();
  let codigo = generateComplaintCode();
  let inserted = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const row = {
      codigo,
      ...payload,
      estado: "recibido",
      notasInternas: null,
      ipHash,
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

  return { inserted, codigo, now };
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
        const ipHash = hashIp(ip);
        const { limited } = await enforceRateLimit(req, SURFACES.LIBRO_RECLAMACIONES, logServerError);
        if (limited) {
          return res.status(429).json({ error: "Demasiados envíos. Intenta más tarde." });
        }

        const payload = validateComplaintPayload(req.body, {
          requirePrivacyConsent: true,
          allowedCanales: ["web"],
        });
        const supabase = getSupabaseAdmin();
        const { inserted, codigo, now } = await insertComplaintRecord({ supabase, payload, ipHash });

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
        void sendComplaintConsumerEmail(payload, codigo, now, logServerError).catch(() => {});

        return res.status(201).json({
          complaint: mapComplaintRow(inserted),
          codigo,
          submittedAt: now,
        });
      } catch (error) {
        if (error?.fields) {
          void onValidationFailure(
            {
              surface: SURFACES.LIBRO_RECLAMACIONES,
              ip: getClientIp(req),
              fields: error.fields,
            },
            logServerError,
          );
          return res.status(400).json({ error: publicError(error), fields: error.fields });
        }
        logServerError("libro-reclamaciones POST:", error);
        return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
      }
    });
  });

  app.get("/libro-reclamaciones/consulta-codigo", (req, res) => {
    cors(req, res, async () => {
      try {
        const { limited } = await enforceRateLimit(req, SURFACES.LIBRO_RECLAMACIONES, logServerError);
        if (limited) {
          return res.status(429).json({ error: "Demasiadas consultas. Intenta más tarde." });
        }
        const { codigo, dni } = validateComplaintLookupQuery(req.query);
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from("libro_reclamaciones")
          .select("codigo, tipo, estado, dni, creadoEn")
          .eq("codigo", codigo)
          .eq("dni", dni)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          return res.status(404).json({ error: "No encontramos una hoja con ese código y DNI." });
        }
        return res.status(200).json({
          complaint: {
            codigo: data.codigo,
            tipo: data.tipo,
            estado: data.estado,
            creadoEn: data.creadoEn,
          },
        });
      } catch (error) {
        if (error?.fields) {
          void onValidationFailure(
            {
              surface: SURFACES.LIBRO_RECLAMACIONES,
              ip: getClientIp(req),
              fields: error.fields,
            },
            logServerError,
          );
          return res.status(400).json({ error: publicError(error), fields: error.fields });
        }
        logServerError("libro-reclamaciones consulta-codigo:", error);
        return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
      }
    });
  });

  async function createComplaintByRole(req, res, role) {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      if (role === "admin") {
        await assertAdminRole(supabase, decodedToken.uid);
      } else {
        await assertTrabajadorRole(supabase, decodedToken.uid);
      }
      const ipHash = hashIp(getClientIp(req));
      const payload = validateComplaintPayload(req.body, {
        requirePrivacyConsent: false,
        allowedCanales: ["tienda", "whatsapp"],
      });
      const { inserted, codigo, now } = await insertComplaintRecord({ supabase, payload, ipHash });
      if (!inserted) {
        return res.status(503).json({ error: "No se pudo registrar la hoja. Intenta de nuevo." });
      }

      await logAuditFn(
        supabase,
        "libro_reclamacion_creada",
        "libro_reclamaciones",
        codigo,
        `${payload.nombres} ${payload.apellidos}`,
        decodedToken.uid,
        decodedToken.email || null,
        { tipo: payload.tipo, canal: payload.canal, origen: role },
      );

      void sendComplaintNotifyEmail(payload, codigo, logServerError).catch(() => {});
      void sendComplaintConsumerEmail(payload, codigo, now, logServerError).catch(() => {});

      return res.status(201).json({
        complaint: mapComplaintRow(inserted),
        codigo,
        submittedAt: now,
      });
    } catch (error) {
      if (error?.fields) {
        return res.status(400).json({ error: publicError(error), fields: error.fields });
      }
      logServerError(`libro-reclamaciones create (${role}):`, error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  }

  app.post("/admin/libro-reclamaciones", (req, res) => {
    cors(req, res, () => createComplaintByRole(req, res, "admin"));
  });

  app.post("/staff/libro-reclamaciones", (req, res) => {
    cors(req, res, () => createComplaintByRole(req, res, "staff"));
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
