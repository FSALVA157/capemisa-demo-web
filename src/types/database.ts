export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      consultas: {
        Row: {
          created_at: string;
          email: string | null;
          empresa_interesada: string;
          estado_seguimiento: string;
          id: string;
          motivo: string | null;
          persona_contacto: string;
          publicacion_id: string;
          telefono: string;
          urgencia: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          empresa_interesada: string;
          estado_seguimiento?: string;
          id?: string;
          motivo?: string | null;
          persona_contacto: string;
          publicacion_id: string;
          telefono: string;
          urgencia?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          empresa_interesada?: string;
          estado_seguimiento?: string;
          id?: string;
          motivo?: string | null;
          persona_contacto?: string;
          publicacion_id?: string;
          telefono?: string;
          urgencia?: string | null;
        };
        Relationships: [];
      };
      perfiles: {
        Row: {
          created_at: string;
          email: string | null;
          empresa: string;
          id: string;
          responsable: string;
          rol: string;
          telefono: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          empresa: string;
          id: string;
          responsable: string;
          rol?: string;
          telefono: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          empresa?: string;
          id?: string;
          responsable?: string;
          rol?: string;
          telefono?: string;
        };
        Relationships: [];
      };
      publicaciones: {
        Row: {
          autor_id: string;
          condicion_comercial: string | null;
          created_at: string;
          descripcion: string;
          descripcion_comercial: string | null;
          disponibilidad: string | null;
          email: string | null;
          empresa: string;
          estado: string;
          id: string;
          imagen_url: string | null;
          matches: Json;
          observaciones_internas: string | null;
          responsable: string;
          rubro: string | null;
          subrubro: string | null;
          telefono: string;
          texto_whatsapp: string | null;
          tipo_publicacion: string;
          updated_at: string;
          urgencia: string | null;
          vencimiento: string | null;
          zona: string | null;
        };
        Insert: {
          autor_id: string;
          condicion_comercial?: string | null;
          created_at?: string;
          descripcion: string;
          descripcion_comercial?: string | null;
          disponibilidad?: string | null;
          email?: string | null;
          empresa: string;
          estado?: string;
          id?: string;
          imagen_url?: string | null;
          matches?: Json;
          observaciones_internas?: string | null;
          responsable: string;
          rubro?: string | null;
          subrubro?: string | null;
          telefono: string;
          texto_whatsapp?: string | null;
          tipo_publicacion: string;
          updated_at?: string;
          urgencia?: string | null;
          vencimiento?: string | null;
          zona?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["publicaciones"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      publicaciones_searchable: {
        Row: {
          autor_id: string | null;
          condicion_comercial: string | null;
          created_at: string | null;
          descripcion: string | null;
          descripcion_comercial: string | null;
          disponibilidad: string | null;
          email: string | null;
          empresa: string | null;
          estado: string | null;
          id: string | null;
          imagen_url: string | null;
          matches: Json | null;
          observaciones_internas: string | null;
          responsable: string | null;
          rubro: string | null;
          search_text: string | null;
          subrubro: string | null;
          telefono: string | null;
          texto_whatsapp: string | null;
          tipo_publicacion: string | null;
          updated_at: string | null;
          urgencia: string | null;
          vencimiento: string | null;
          zona: string | null;
        };
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
