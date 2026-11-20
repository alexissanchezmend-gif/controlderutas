// Configuración de Supabase para el dashboard "Seguimiento de Ruta".
// Copia estos valores desde Supabase > Project Settings > API.
// La "anon public key" está hecha para ir en el navegador: la seguridad la ponen las políticas RLS de schema.sql.
// NUNCA pongas aquí la "service_role key".
window.CONFIG = {
  SUPABASE_URL: "https://diqwwfowaxqfvzmepeat.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpcXd3Zm93YXhxZnZ6bWVwZWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxMjQxNjIsImV4cCI6MjExMDcwMDE2Mn0.Gn2gHQdUxI-3PmCt-wr9t6AaLzJs3APKXKJbB2ucTDg",

  // Nombre de la Edge Function de patrones IA (opcional). Déjalo en "" para ocultar el botón.
  IA_FUNCION: "patrones-ia",

  // false = cualquiera con el link ve los datos sin iniciar sesión.
  // true  = también hay que iniciar sesión para ver (usa la opción B de schema.sql).
  REQUIERE_LOGIN: false
};
