"use strict";

const crypto = require("crypto");
const { withCatalogCache } = require("./catalogCache.cjs");
const { enforceRateLimit } = require("./publicRateLimit.cjs");
const { SURFACES } = require("./securityMonitor.cjs");
const { browseCatalogProducts } = require("../shared/catalogPublicFilter.cjs");
const { slugifyCatalogValue } = require("../shared/catalogMatch.cjs");

const PUBLIC_PRODUCT_COLUMNS = "*";
const INDEX_COLUMNS =
  "id,nombre,precio,descripcion,imagen,imagenes,stock,categoria,marca,tipoCalzado,color,colores,tallas,tallaStock,destacado,descuento,familiaId,activo,material,estilo,campana";
const DEFAULT_PAGE_SIZE = 48;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE_NUMBER = 500;
const MAX_BROWSE_LIMIT = 48;
const SUPABASE_PAGE_SIZE = 1000;

function parsePositiveInt(raw, fallback, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(max, Math.floor(n));
}

function effectiveFamiliaKey(row) {
  const t = typeof row?.familiaId === "string" ? row.familiaId.trim() : "";
  return t || row.id;
}

function tallyFamilyGroupSizes(rows) {
  const tally = new Map();
  for (const row of rows) {
    const key = effectiveFamiliaKey(row);
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(tally);
}

function browseCacheSuffix(query) {
  const keys = Object.keys(query).sort();
  const normalized = keys.map((k) => `${k}=${String(query[k] ?? "")}`).join("&");
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 24);
}

async function fetchAllActiveRows(supabase, selectColumns) {
  const rows = [];
  let from = 0;
  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("productos")
      .select(selectColumns)
      .eq("activo", true)
      .order("destacado", { ascending: false })
      .order("nombre", { ascending: true })
      .range(from, to);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }
  return rows;
}

async function getActiveProductsCached(supabase) {
  return withCatalogCache("active:all", async () => {
    const products = await fetchAllActiveRows(supabase, PUBLIC_PRODUCT_COLUMNS);
    return { products, total: products.length };
  });
}

async function getActiveIndexCached(supabase) {
  return withCatalogCache("active:index", async () => {
    const products = await fetchAllActiveRows(supabase, INDEX_COLUMNS);
    return { products, total: products.length };
  });
}

async function queryActiveProductsPage(supabase, page, limit) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await supabase
    .from("productos")
    .select(PUBLIC_PRODUCT_COLUMNS, { count: "exact" })
    .eq("activo", true)
    .order("destacado", { ascending: false })
    .order("nombre", { ascending: true })
    .range(from, to);
  if (error) throw error;
  const total = typeof count === "number" ? count : (data ?? []).length;
  return {
    products: data ?? [],
    page,
    limit,
    total,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
  };
}

async function queryFamilyCounts(supabase) {
  const rows = await fetchAllActiveRows(supabase, "id, familiaId");
  return tallyFamilyGroupSizes(rows);
}

function registerPublicCatalogRoutes(app, deps) {
  const { cors, getSupabaseAdmin, logServerError } = deps;

  const handle = (handler) => (req, res) => {
    cors(req, res, async () => {
      try {
        const { limited } = await enforceRateLimit(req, SURFACES.PUBLIC_CATALOG, logServerError);
        if (limited) {
          return res.status(429).json({ error: "Demasiadas solicitudes. Intenta más tarde." });
        }
        await handler(req, res);
      } catch (err) {
        logServerError(`publicCatalog ${req.path}: ${err?.message || err}`);
        res.status(500).json({ error: "No se pudo cargar el catálogo." });
      }
    });
  };

  app.get(
    "/public/catalog/browse",
    handle(async (req, res) => {
      const page = parsePositiveInt(req.query.page, 1, MAX_PAGE_NUMBER);
      const limit = Math.min(MAX_BROWSE_LIMIT, parsePositiveInt(req.query.limit, 24, MAX_BROWSE_LIMIT));
      const supabase = getSupabaseAdmin();
      const suffix = `browse:${browseCacheSuffix(req.query)}:p${page}:l${limit}`;
      const payload = await withCatalogCache(suffix, async () => {
        const { products: all } = await getActiveProductsCached(supabase);
        const browse = browseCatalogProducts(all, req.query, page, limit);
        const familyGroupCounts = tallyFamilyGroupSizes(all);
        return { ...browse, familyGroupCounts };
      });
      res.status(200).json(payload);
    }),
  );

  app.get(
    "/public/catalog",
    handle(async (req, res) => {
      const page = parsePositiveInt(req.query.page, 1, MAX_PAGE_NUMBER);
      const limit = Math.min(MAX_PAGE_SIZE, parsePositiveInt(req.query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE));
      const supabase = getSupabaseAdmin();
      const payload = await withCatalogCache(`page:${page}:limit:${limit}`, () =>
        queryActiveProductsPage(supabase, page, limit),
      );
      res.status(200).json(payload);
    }),
  );

  app.get(
    "/public/catalog/active",
    handle(async (_req, res) => {
      const supabase = getSupabaseAdmin();
      const payload = await getActiveProductsCached(supabase);
      res.status(200).json(payload);
    }),
  );

  app.get(
    "/public/catalog/index",
    handle(async (_req, res) => {
      const supabase = getSupabaseAdmin();
      const payload = await getActiveIndexCached(supabase);
      res.status(200).json(payload);
    }),
  );

  app.get(
    "/public/catalog/featured",
    handle(async (req, res) => {
      const limit = Math.min(48, parsePositiveInt(req.query.limit, 24, 48));
      const supabase = getSupabaseAdmin();
      const payload = await withCatalogCache(`featured:${limit}`, async () => {
        const { data, error } = await supabase
          .from("productos")
          .select(PUBLIC_PRODUCT_COLUMNS)
          .eq("activo", true)
          .eq("destacado", true)
          .order("nombre", { ascending: true })
          .limit(limit);
        if (error) throw error;
        return { products: data ?? [], total: (data ?? []).length };
      });
      res.status(200).json(payload);
    }),
  );

  app.get(
    "/public/catalog/product/:productId",
    handle(async (req, res) => {
      const productId = String(req.params.productId || "").trim();
      if (!productId) return res.status(400).json({ error: "Producto inválido" });
      const supabase = getSupabaseAdmin();
      const payload = await withCatalogCache(`product:${productId}`, async () => {
        const { data, error } = await supabase
          .from("productos")
          .select(PUBLIC_PRODUCT_COLUMNS)
          .eq("id", productId)
          .eq("activo", true)
          .maybeSingle();
        if (error) throw error;
        return { product: data ?? null };
      });
      res.status(200).json(payload);
    }),
  );

  app.get(
    "/public/catalog/related",
    handle(async (req, res) => {
      const productId = String(req.query.productId || "").trim();
      const familyKey = String(req.query.familyKey || "").trim();
      const supabase = getSupabaseAdmin();
      const cacheKey = `related:${productId || familyKey}`;
      const payload = await withCatalogCache(cacheKey, async () => {
        let key = familyKey;
        if (!key && productId) {
          const { data } = await supabase.from("productos").select("id, familiaId").eq("id", productId).maybeSingle();
          if (!data) return { products: [] };
          key = effectiveFamiliaKey(data);
        }
        if (!key) return { products: [] };
        const { data, error } = await supabase
          .from("productos")
          .select(PUBLIC_PRODUCT_COLUMNS)
          .eq("activo", true)
          .or(`id.eq.${key},familiaId.eq.${key}`);
        if (error) throw error;
        const products = (data ?? []).filter((row) => row.id !== productId);
        return { products };
      });
      res.status(200).json(payload);
    }),
  );

  app.get(
    "/public/catalog/by-ids",
    handle(async (req, res) => {
      const raw = String(req.query.ids || "");
      const ids = [...new Set(raw.split(",").map((id) => id.trim()).filter(Boolean))].slice(0, 80);
      if (!ids.length) return res.status(200).json({ products: [] });
      const supabase = getSupabaseAdmin();
      const sortedKey = ids.slice().sort().join(",");
      const payload = await withCatalogCache(`by-ids:${crypto.createHash("sha256").update(sortedKey).digest("hex").slice(0, 16)}`, async () => {
        const { data, error } = await supabase
          .from("productos")
          .select(PUBLIC_PRODUCT_COLUMNS)
          .in("id", ids)
          .eq("activo", true);
        if (error) throw error;
        const rows = data ?? [];
        const byId = new Map(rows.map((p) => [p.id, p]));
        const products = ids.map((id) => byId.get(id)).filter(Boolean);
        return { products };
      });
      res.status(200).json(payload);
    }),
  );

  app.get(
    "/public/catalog/family-counts",
    handle(async (_req, res) => {
      const supabase = getSupabaseAdmin();
      const counts = await withCatalogCache("family-counts", async () => {
        const map = await queryFamilyCounts(supabase);
        return { counts: map };
      });
      res.status(200).json(counts);
    }),
  );
}

module.exports = {
  registerPublicCatalogRoutes,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  tallyFamilyGroupSizes,
  effectiveFamiliaKey,
  getActiveProductsCached,
};
