import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  Building2,
  FileText,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetricas, type Metricas } from "@/hooks/useMetricas";
import {
  ESTADO_PUBLICACION_GRAFICO,
  ESTADO_PUBLICACION_LABEL,
  TIPO_PUBLICACION_GRAFICO,
  TIPO_PUBLICACION_LABEL,
  URGENCIA_GRAFICO,
  URGENCIA_LABEL_GRAFICO,
  formatearFechaCorta,
} from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Piezas chicas, locales a esta página. Siguiendo el YAGNI de la constitución:
// mientras el dashboard sea la única pantalla con gráficos, no hay abstracción
// compartida que valga la pena extraer a components/.
// ---------------------------------------------------------------------------

// El `fill` va como `var()` y no con el valor resuelto: recharts lo pasa tal
// cual al atributo del SVG, así que el navegador lo resuelve contra el elemento
// y los ejes siguen al tema solos. Con el HSL escrito a mano quedaban ilegibles
// en oscuro (feature 005).
const EJE = { fontSize: 12, fill: "hsl(var(--muted-foreground))" };

function Kpi({
  icono: Icono,
  valor,
  etiqueta,
  detalle,
}: {
  icono: typeof FileText;
  valor: string;
  etiqueta: string;
  detalle?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        {/* La etiqueta envuelve en vez de truncarse: a 375 px "Publicaciones
            cargadas" no entra en una línea y truncada queda "Publicaciones ca…". */}
        <div className="flex items-start gap-2 text-muted-foreground">
          <Icono className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="text-xs md:text-sm leading-tight">{etiqueta}</span>
        </div>
        <p className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight tabular-nums">
          {valor}
        </p>
        {detalle && (
          <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Tooltip propio en vez del de Recharts: el de fábrica trae su propio fondo
// blanco y su propio borde, que no siguen los tokens de la app.
function TooltipGrafico({
  active,
  payload,
  formatoEtiqueta,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; payload?: Record<string, unknown> }[];
  formatoEtiqueta: (fila: Record<string, unknown>) => string;
}) {
  if (!active || !payload?.length) return null;
  const fila = payload[0]?.payload ?? {};
  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-md">
      <p className="text-sm font-medium">{formatoEtiqueta(fila)}</p>
    </div>
  );
}

// El eje de categorías del embudo lleva textos largos ("Pendiente de revisión").
// A 375 px, reservarles 130 px deja las barras en una franja de 170 px. Recharts
// no expone breakpoints, así que el ancho se decide en JS.
function useEsAngosto() {
  const [angosto, setAngosto] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 640,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const onChange = () => setAngosto(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return angosto;
}

function Vacio({ children }: { children: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------

// El embudo se ordena por el ciclo de vida, no por cantidad: leído de arriba
// hacia abajo cuenta el recorrido de una publicación (la IA la deja pendiente →
// un admin la revisa → sale al catálogo, o no).
const ORDEN_EMBUDO = [
  "pendiente",
  "faltan_datos",
  "aprobada",
  "publicada",
  "rechazada",
];

function Contenido({ m }: { m: Metricas }) {
  const { totales } = m;
  const esAngosto = useEsAngosto();

  const porcentajeIA =
    totales.publicaciones === 0
      ? 0
      : Math.round((totales.enriquecidas_ia / totales.publicaciones) * 100);

  const embudo = useMemo(
    () =>
      [...m.por_estado]
        .sort(
          (a, b) =>
            ORDEN_EMBUDO.indexOf(a.estado) - ORDEN_EMBUDO.indexOf(b.estado),
        )
        .map((e) => ({
          ...e,
          label: ESTADO_PUBLICACION_LABEL[e.estado] ?? e.estado,
          color: ESTADO_PUBLICACION_GRAFICO[e.estado] ?? "#94a3b8",
        })),
    [m.por_estado],
  );

  const tipos = m.por_tipo.map((t) => ({
    ...t,
    label: TIPO_PUBLICACION_LABEL[t.tipo] ?? t.tipo,
    color: TIPO_PUBLICACION_GRAFICO[t.tipo] ?? "#94a3b8",
  }));

  const urgencias = m.por_urgencia.map((u) => ({
    ...u,
    label: URGENCIA_LABEL_GRAFICO[u.urgencia] ?? u.urgencia,
    color: URGENCIA_GRAFICO[u.urgencia] ?? "#94a3b8",
  }));

  const linea = m.linea_tiempo.map((d) => ({
    ...d,
    label: formatearFechaCorta(d.dia),
  }));

  const maxConsultas = Math.max(1, ...m.top_consultadas.map((t) => t.n));

  return (
    <div className="space-y-4">
      {/* a) Tarjetas de cabecera */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Kpi
          icono={FileText}
          valor={String(totales.publicaciones)}
          etiqueta="Publicaciones cargadas"
          detalle={`de ${totales.empresas} empresas socias`}
        />
        <Kpi
          icono={Building2}
          valor={String(totales.publicadas)}
          etiqueta="En el catálogo"
          detalle="aprobadas y visibles"
        />
        <Kpi
          icono={MessageSquare}
          valor={String(totales.consultas)}
          etiqueta="Consultas generadas"
          detalle={`${totales.consultas_por_publicada} por publicación`}
        />
        <Kpi
          icono={Sparkles}
          valor={`${porcentajeIA} %`}
          etiqueta="Clasificadas por IA"
          detalle={`${totales.enriquecidas_ia} de ${totales.publicaciones}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* b) Embudo — el gráfico que cuenta el Principio II */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">
              De la carga al catálogo
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Toda publicación que arma la IA pasa por revisión humana antes de
              hacerse visible.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            {embudo.length === 0 ? (
              <Vacio>Todavía no hay publicaciones cargadas.</Vacio>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={embudo}
                  layout="vertical"
                  margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
                >
                  <CartesianGrid horizontal={false} strokeOpacity={0.25} />
                  <XAxis type="number" allowDecimals={false} tick={EJE} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={esAngosto ? 96 : 130}
                    tick={esAngosto ? { ...EJE, fontSize: 11 } : EJE}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fillOpacity: 0.06 }}
                    content={
                      <TooltipGrafico
                        formatoEtiqueta={(f) =>
                          `${f.label}: ${f.n} publicación${f.n === 1 ? "" : "es"}`
                        }
                      />
                    }
                  />
                  <Bar dataKey="n" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {embudo.map((e) => (
                      <Cell key={e.estado} fill={e.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* d) Dona por tipo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">
              Qué se publica
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tipo asignado por la IA sobre lo que está en el catálogo.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            {tipos.length === 0 ? (
              <Vacio>Todavía no hay nada publicado.</Vacio>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Tooltip
                      content={
                        <TooltipGrafico
                          formatoEtiqueta={(f) => `${f.label}: ${f.n}`}
                        />
                      }
                    />
                    <Pie
                      data={tipos}
                      dataKey="n"
                      nameKey="label"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {tipos.map((t) => (
                        <Cell key={t.tipo} fill={t.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-3 space-y-1.5">
                  {tipos.map((t) => (
                    <li
                      key={t.tipo}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="truncate">{t.label}</span>
                      <span className="ml-auto tabular-nums text-muted-foreground">
                        {t.n}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* c) Crecimiento del catálogo */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">
              Crecimiento del catálogo
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Publicaciones acumuladas desde el arranque.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            {linea.length === 0 ? (
              <Vacio>Todavía no hay historial para mostrar.</Vacio>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={linea}
                  margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
                >
                  <defs>
                    <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeOpacity={0.25} />
                  <XAxis
                    dataKey="label"
                    tick={EJE}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={EJE}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip
                    content={
                      <TooltipGrafico
                        formatoEtiqueta={(f) =>
                          `${f.label}: ${f.acum} en total (+${f.n})`
                        }
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="acum"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gradAcum)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* e) Semáforo de urgencia */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">
              Urgencia detectada
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              La IA la infiere del texto de cada publicación.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            {urgencias.length === 0 ? (
              <Vacio>Todavía no hay nada publicado.</Vacio>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={urgencias}
                  margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
                >
                  <CartesianGrid vertical={false} strokeOpacity={0.25} />
                  <XAxis
                    dataKey="label"
                    tick={EJE}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={EJE}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip
                    cursor={{ fillOpacity: 0.06 }}
                    content={
                      <TooltipGrafico
                        formatoEtiqueta={(f) => `${f.label}: ${f.n}`}
                      />
                    }
                  />
                  <Bar dataKey="n" radius={[4, 4, 0, 0]} maxBarSize={56}>
                    {urgencias.map((u) => (
                      <Cell key={u.urgencia} fill={u.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* f) Ranking. Con cinco filas una lista se lee mejor que un gráfico. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg">
            Publicaciones que más contactos generaron
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cada consulta es una empresa socia pidiendo que la conecten con
            otra.
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          {m.top_consultadas.length === 0 ? (
            <Vacio>Todavía no hay consultas registradas.</Vacio>
          ) : (
            <ol className="space-y-3">
              {m.top_consultadas.map((t, i) => (
                <li key={`${t.empresa}-${t.tipo}`} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{t.empresa}</span>
                      <Badge variant="secondary" className="font-normal">
                        {TIPO_PUBLICACION_LABEL[t.tipo] ?? t.tipo}
                      </Badge>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${(t.n / maxConsultas) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {t.n} {t.n === 1 ? "consulta" : "consultas"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useMetricas();

  return (
    <div className="py-2">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Cómo viene funcionando CAPEMISA Conecta, con los datos reales de la
          plataforma.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-80 w-full lg:col-span-2" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No pudimos cargar las métricas</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>Revisá la conexión y probá de nuevo.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && data && <Contenido m={data} />}
    </div>
  );
}
