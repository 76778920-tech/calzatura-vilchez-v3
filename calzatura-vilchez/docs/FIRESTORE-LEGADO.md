# Firestore — uso legado

Los datos de negocio (**pedidos**, **productos**, **ventas**) están en **Supabase PostgreSQL**.

El archivo `firestore.rules` describe reglas históricas para colecciones Firebase que ya no son la fuente de verdad del checkout. No se despliega automáticamente con el pipeline actual (`firebase.json` solo incluye Hosting).

Firebase sigue usándose para **Authentication** (y opcionalmente perfiles auxiliares si existieran en Firestore).
