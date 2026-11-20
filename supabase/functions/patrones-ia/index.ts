// Edge Function "patrones-ia" (opcional)
// Lee los casos de rechazo y devuelve el patrón de cada cliente usando la API de Claude (Anthropic).
// Solo responde a usuarios administradores. La clave de Anthropic queda como secreto en Supabase,
// nunca en la página.
//
// Desplegar:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy patrones-ia
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5";

const PROMPT_FILAS = `Eres analista de distribución de bebidas en un centro de distribución de Lima (CD Cono Norte). Recibes pedidos con rechazo, alerta de modulación o reprogramación del día. Para cada uno identifica el PATRÓN de rechazo del cliente leyendo juntos el motivo, el comentario del modulador, la observación BEEs del conductor, el canal, la condición de pago y el monto. Busca señales como: falta de dinero o deuda (crédito), pedido no reconocido o cantidades distintas a lo pedido (preventa/vendedor), error de facturación, error de carga o producto faltante (almacén), mala calidad del producto, cliente cerrado o ausente y sin contacto, problemas de ubicación o GPS, demoras o atribución de la ruta (transporte). Sé concreto y útil para el supervisor; no repitas el motivo literalmente si el comentario aporta más.
Responde SOLO con JSON con esta forma: {"filas":[{"id":"<código>","patron":"<frase de máximo 14 palabras>","origen":"Cliente|Preventa|Facturación|Almacén|Transporte|Crédito|Calidad"}]}
Casos:
`;
const PROMPT_RESUMEN = `Eres analista de distribución de bebidas. A partir de estos casos de rechazo del día (cada uno con motivo, comentario, ruta, supervisor y patrón detectado), resume entre 4 y 6 patrones principales. Cuenta los casos de cada patrón. Responde SOLO JSON: {"patrones":[{"titulo":"<máx 6 palabras>","pedidos":<número>,"detalle":"<máx 25 palabras, menciona rutas o supervisores que se repiten>","accion":"<máx 15 palabras>"}]}
Casos:
`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    // Solo administradores
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: esAdmin } = await sb.rpc("es_admin");
    if (esAdmin !== true) return json({ error: "Solo administradores" }, 403);

    const { tipo, casos } = await req.json();
    if (!Array.isArray(casos) || casos.length === 0) return json({ error: "Sin casos" }, 400);
    if (casos.length > 400) return json({ error: "Demasiados casos en una llamada" }, 400);
    const prompt = (tipo === "resumen" ? PROMPT_RESUMEN : PROMPT_FILAS) + JSON.stringify(casos);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) return json({ error: `Anthropic ${r.status}: ${await r.text()}` }, 502);
    const out = await r.json();
    const text: string = (out.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a < 0 || b < a) return json({ error: "Respuesta sin JSON" }, 502);
    return json(JSON.parse(text.slice(a, b + 1)));
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
