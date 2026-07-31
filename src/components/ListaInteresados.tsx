import { Building2, Inbox, Mail, MessageSquare, Phone, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { URGENCIA_COLOR, URGENCIA_LABEL, formatearFecha } from "@/lib/i18n";
import type { Interesado } from "@/hooks/useInteresados";

type Props = {
  interesados: Interesado[];
};

// Los campos opcionales que el interesado no completó se dicen con todas las
// letras (FR-013). Dejar el espacio en blanco es ambiguo: no se distingue "no lo
// dejó" de "la pantalla se rompió".
function NoDejo({ que }: { que: string }) {
  return <span className="text-muted-foreground italic">No dejó {que}</span>;
}

export function ListaInteresados({ interesados }: Props) {
  if (interesados.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center text-center py-10 gap-3">
          <div className="rounded-full bg-muted p-3">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Todavía nadie dejó una consulta</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Cuando alguien se interese en esta publicación desde el catálogo, sus datos de
            contacto van a aparecer acá.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {interesados.map((i) => (
        <li key={i.id}>
          <Card>
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  {i.empresa_interesada}
                </h3>
                {i.urgencia ? (
                  <Badge className={URGENCIA_COLOR[i.urgencia] ?? ""}>
                    Urgencia: {URGENCIA_LABEL[i.urgencia] ?? i.urgencia}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    Sin urgencia indicada
                  </Badge>
                )}
              </div>

              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <dt className="sr-only">Persona de contacto</dt>
                  <dd>{i.persona_contacto}</dd>
                </div>

                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <dt className="sr-only">Teléfono</dt>
                  <dd>
                    <a href={`tel:${i.telefono}`} className="hover:underline">
                      {i.telefono}
                    </a>
                  </dd>
                </div>

                <div className="flex items-center gap-1.5 sm:col-span-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <dt className="sr-only">Email</dt>
                  <dd className="truncate">
                    {i.email ? (
                      <a href={`mailto:${i.email}`} className="hover:underline">
                        {i.email}
                      </a>
                    ) : (
                      <NoDejo que="email" />
                    )}
                  </dd>
                </div>

                <div className="flex items-start gap-1.5 sm:col-span-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <dt className="sr-only">Motivo</dt>
                  <dd>{i.motivo ? i.motivo : <NoDejo que="un motivo" />}</dd>
                </div>
              </dl>

              <p className="text-xs text-muted-foreground">
                Consultó el {formatearFecha(i.created_at)}
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
