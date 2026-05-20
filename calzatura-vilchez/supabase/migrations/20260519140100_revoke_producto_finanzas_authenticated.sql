-- ISO/IEC 27001 — costos/márgenes no legibles desde cliente authenticated (solo BFF staff/admin).

REVOKE SELECT ON TABLE "productoFinanzas" FROM authenticated;

DROP POLICY IF EXISTS "authenticated_select_productoFinanzas" ON "productoFinanzas";

NOTIFY pgrst, 'reload schema';
