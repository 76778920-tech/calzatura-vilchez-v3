import { loadQcEnv, hasSupabaseCreds } from "./load-env.mjs";
import { createJsonRepository } from "./repository-json.mjs";
import { createSupabaseRepository } from "./repository-supabase.mjs";

let _repo = null;

function resolveMode() {
  const mode = (process.env.QC_PERSISTENCE || "auto").trim().toLowerCase();
  if (mode === "json") return "json";
  if (mode === "supabase") {
    if (!hasSupabaseCreds()) {
      throw new Error(
        "QC_PERSISTENCE=supabase requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SERVICE_KEY)",
      );
    }
    return "supabase";
  }
  if (mode !== "auto") {
    throw new Error(`QC_PERSISTENCE inválido: ${mode} (use auto, json o supabase)`);
  }
  return hasSupabaseCreds() ? "supabase" : "json";
}

export function getRepository() {
  if (!_repo) {
    loadQcEnv();
    _repo = resolveMode() === "supabase" ? createSupabaseRepository() : createJsonRepository();
  }
  return _repo;
}

/** Reinicia el singleton (tests). */
export function resetRepository() {
  _repo = null;
}

export function getPersistenceInfo() {
  loadQcEnv();
  const mode = resolveMode();
  return {
    mode,
    backend: mode === "supabase" ? "supabase" : "json",
    supabaseConfigured: hasSupabaseCreds(),
  };
}
