export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      assmats: {
        Row: {
          adresse: Json
          agrement_capacite: number
          agrement_date_renouvellement: string | null
          created_at: string
          deleted_at: string | null
          horaires_type: Json
          id: string
          profile_id: string
          reglages_visibilite: Json
          updated_at: string
        }
        Insert: {
          adresse?: Json
          agrement_capacite?: number
          agrement_date_renouvellement?: string | null
          created_at?: string
          deleted_at?: string | null
          horaires_type?: Json
          id?: string
          profile_id: string
          reglages_visibilite?: Json
          updated_at?: string
        }
        Update: {
          adresse?: Json
          agrement_capacite?: number
          agrement_date_renouvellement?: string | null
          created_at?: string
          deleted_at?: string | null
          horaires_type?: Json
          id?: string
          profile_id?: string
          reglages_visibilite?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assmats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_events: {
        Row: {
          child_id: string
          contract_id: string
          corrige: boolean
          created_at: string
          horodatage: string
          horodatage_device: string | null
          id: string
          motif_correction: string | null
          pointe_par: string
          type: Database["public"]["Enums"]["attendance_type"]
          updated_at: string
          valeur_initiale: string | null
        }
        Insert: {
          child_id: string
          contract_id: string
          corrige?: boolean
          created_at?: string
          horodatage?: string
          horodatage_device?: string | null
          id?: string
          motif_correction?: string | null
          pointe_par: string
          type: Database["public"]["Enums"]["attendance_type"]
          updated_at?: string
          valeur_initiale?: string | null
        }
        Update: {
          child_id?: string
          contract_id?: string
          corrige?: boolean
          created_at?: string
          horodatage?: string
          horodatage_device?: string | null
          id?: string
          motif_correction?: string | null
          pointe_par?: string
          type?: Database["public"]["Enums"]["attendance_type"]
          updated_at?: string
          valeur_initiale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_pointe_par_fkey"
            columns: ["pointe_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      authorizations: {
        Row: {
          actif: boolean
          child_id: string
          created_at: string
          deleted_at: string | null
          document_path: string | null
          id: string
          niveau: string | null
          signe_le: string | null
          signe_par: string | null
          type: Database["public"]["Enums"]["authorization_type"]
          updated_at: string
        }
        Insert: {
          actif?: boolean
          child_id: string
          created_at?: string
          deleted_at?: string | null
          document_path?: string | null
          id?: string
          niveau?: string | null
          signe_le?: string | null
          signe_par?: string | null
          type: Database["public"]["Enums"]["authorization_type"]
          updated_at?: string
        }
        Update: {
          actif?: boolean
          child_id?: string
          created_at?: string
          deleted_at?: string | null
          document_path?: string | null
          id?: string
          niveau?: string | null
          signe_le?: string | null
          signe_par?: string | null
          type?: Database["public"]["Enums"]["authorization_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "authorizations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorizations_signe_par_fkey"
            columns: ["signe_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bareme_values: {
        Row: {
          code: string
          created_at: string
          date_effet: string
          date_fin: string | null
          id: string
          notes: string | null
          source_url: string | null
          updated_at: string
          valeur: number
        }
        Insert: {
          code: string
          created_at?: string
          date_effet: string
          date_fin?: string | null
          id?: string
          notes?: string | null
          source_url?: string | null
          updated_at?: string
          valeur: number
        }
        Update: {
          code?: string
          created_at?: string
          date_effet?: string
          date_fin?: string | null
          id?: string
          notes?: string | null
          source_url?: string | null
          updated_at?: string
          valeur?: number
        }
        Relationships: []
      }
      child_guardians: {
        Row: {
          child_id: string
          created_at: string
          deleted_at: string | null
          email: string | null
          est_employeur: boolean
          id: string
          nom: string
          personnes_autorisees: Json
          prenom: string
          profile_id: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          est_employeur?: boolean
          id?: string
          nom: string
          personnes_autorisees?: Json
          prenom: string
          profile_id?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          est_employeur?: boolean
          id?: string
          nom?: string
          personnes_autorisees?: Json
          prenom?: string
          profile_id?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_guardians_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_guardians_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_health: {
        Row: {
          allergies: Json
          child_id: string
          created_at: string
          medecin: Json
          pai_document_path: string | null
          regimes: Json
          updated_at: string
          vaccins: Json
        }
        Insert: {
          allergies?: Json
          child_id: string
          created_at?: string
          medecin?: Json
          pai_document_path?: string | null
          regimes?: Json
          updated_at?: string
          vaccins?: Json
        }
        Update: {
          allergies?: Json
          child_id?: string
          created_at?: string
          medecin?: Json
          pai_document_path?: string | null
          regimes?: Json
          updated_at?: string
          vaccins?: Json
        }
        Relationships: [
          {
            foreignKeyName: "child_health_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          assmat_id: string
          created_at: string
          date_naissance: string
          deleted_at: string | null
          id: string
          nom: string
          notes_privees: string | null
          photo_path: string | null
          prenom: string
          updated_at: string
        }
        Insert: {
          assmat_id: string
          created_at?: string
          date_naissance: string
          deleted_at?: string | null
          id?: string
          nom: string
          notes_privees?: string | null
          photo_path?: string | null
          prenom: string
          updated_at?: string
        }
        Update: {
          assmat_id?: string
          created_at?: string
          date_naissance?: string
          deleted_at?: string | null
          id?: string
          nom?: string
          notes_privees?: string | null
          photo_path?: string | null
          prenom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_assmat_id_fkey"
            columns: ["assmat_id"]
            isOneToOne: false
            referencedRelation: "assmats"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          assmat_fournit_repas: boolean
          assmat_id: string
          child_id: string
          clause_delegation: boolean
          created_at: string
          date_debut: string
          date_fin: string | null
          deleted_at: string | null
          employeur_guardian_id: string | null
          heures_par_semaine: number
          id: string
          indemnite_entretien_jour: number
          indemnite_repas: number | null
          jours_accueil_par_semaine: number
          option_versement_cp: Database["public"]["Enums"]["cp_versement_option"]
          parent_peut_pointer: boolean
          semaines_programmees: number
          statut: Database["public"]["Enums"]["contract_status"]
          taux_horaire: number
          taux_majoration_pct: number
          type: Database["public"]["Enums"]["contract_type"]
          updated_at: string
        }
        Insert: {
          assmat_fournit_repas?: boolean
          assmat_id: string
          child_id: string
          clause_delegation?: boolean
          created_at?: string
          date_debut: string
          date_fin?: string | null
          deleted_at?: string | null
          employeur_guardian_id?: string | null
          heures_par_semaine: number
          id?: string
          indemnite_entretien_jour: number
          indemnite_repas?: number | null
          jours_accueil_par_semaine: number
          option_versement_cp?: Database["public"]["Enums"]["cp_versement_option"]
          parent_peut_pointer?: boolean
          semaines_programmees: number
          statut?: Database["public"]["Enums"]["contract_status"]
          taux_horaire: number
          taux_majoration_pct?: number
          type: Database["public"]["Enums"]["contract_type"]
          updated_at?: string
        }
        Update: {
          assmat_fournit_repas?: boolean
          assmat_id?: string
          child_id?: string
          clause_delegation?: boolean
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          deleted_at?: string | null
          employeur_guardian_id?: string | null
          heures_par_semaine?: number
          id?: string
          indemnite_entretien_jour?: number
          indemnite_repas?: number | null
          jours_accueil_par_semaine?: number
          option_versement_cp?: Database["public"]["Enums"]["cp_versement_option"]
          parent_peut_pointer?: boolean
          semaines_programmees?: number
          statut?: Database["public"]["Enums"]["contract_status"]
          taux_horaire?: number
          taux_majoration_pct?: number
          type?: Database["public"]["Enums"]["contract_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_assmat_id_fkey"
            columns: ["assmat_id"]
            isOneToOne: false
            referencedRelation: "assmats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_employeur_guardian_id_fkey"
            columns: ["employeur_guardian_id"]
            isOneToOne: false
            referencedRelation: "child_guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_log_entries: {
        Row: {
          assmat_id: string
          child_id: string
          created_at: string
          date: string
          deleted_at: string | null
          heure: string
          id: string
          payload: Json
          type: Database["public"]["Enums"]["log_entry_type"]
          updated_at: string
          visible_parents: boolean
        }
        Insert: {
          assmat_id: string
          child_id: string
          created_at?: string
          date?: string
          deleted_at?: string | null
          heure?: string
          id?: string
          payload?: Json
          type: Database["public"]["Enums"]["log_entry_type"]
          updated_at?: string
          visible_parents?: boolean
        }
        Update: {
          assmat_id?: string
          child_id?: string
          created_at?: string
          date?: string
          deleted_at?: string | null
          heure?: string
          id?: string
          payload?: Json
          type?: Database["public"]["Enums"]["log_entry_type"]
          updated_at?: string
          visible_parents?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_entries_assmat_id_fkey"
            columns: ["assmat_id"]
            isOneToOne: false
            referencedRelation: "assmats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_log_entries_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_summaries: {
        Row: {
          child_id: string
          contenu: Json
          created_at: string
          date: string
          envoye_le: string | null
          id: string
          statut: Database["public"]["Enums"]["summary_status"]
          updated_at: string
        }
        Insert: {
          child_id: string
          contenu?: Json
          created_at?: string
          date: string
          envoye_le?: string | null
          id?: string
          statut?: Database["public"]["Enums"]["summary_status"]
          updated_at?: string
        }
        Update: {
          child_id?: string
          contenu?: Json
          created_at?: string
          date?: string
          envoye_le?: string | null
          id?: string
          statut?: Database["public"]["Enums"]["summary_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_summaries_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_schedules: {
        Row: {
          contract_id: string
          created_at: string
          heure_debut: string
          heure_fin: string
          id: string
          jour_semaine: number
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          heure_debut: string
          heure_fin: string
          id?: string
          jour_semaine: number
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          heure_debut?: string
          heure_fin?: string
          id?: string
          jour_semaine?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_schedules_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          locale: string
          notif_prefs: Json
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          notif_prefs?: Json
          phone?: string | null
          role: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          notif_prefs?: Json
          phone?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Relationships: []
      }
      rule_definitions: {
        Row: {
          code: string
          created_at: string
          date_effet: string
          date_fin: string | null
          description: string
          id: string
          params: Json
          ref_juridique: string
          source_url: string | null
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          date_effet: string
          date_fin?: string | null
          description: string
          id?: string
          params?: Json
          ref_juridique: string
          source_url?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          date_effet?: string
          date_fin?: string | null
          description?: string
          id?: string
          params?: Json
          ref_juridique?: string
          source_url?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      schedule_exceptions: {
        Row: {
          contract_id: string
          created_at: string
          date: string
          heure_debut: string | null
          heure_fin: string | null
          id: string
          note: string | null
          type: Database["public"]["Enums"]["schedule_exception_type"]
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          date: string
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          note?: string | null
          type: Database["public"]["Enums"]["schedule_exception_type"]
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          date?: string
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          note?: string | null
          type?: Database["public"]["Enums"]["schedule_exception_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_exceptions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_assmat_id: { Args: never; Returns: string }
      is_guardian_of: { Args: { p_child_id: string }; Returns: boolean }
      uuid_v7: { Args: never; Returns: string }
    }
    Enums: {
      attendance_type: "in" | "out"
      authorization_type:
        | "sortie"
        | "transport"
        | "photo"
        | "medicament"
        | "autre"
      contract_status: "brouillon" | "actif" | "termine"
      contract_type: "annee_complete" | "annee_incomplete"
      cp_versement_option: "juin" | "prise_principale" | "au_fil"
      log_entry_type:
        | "repas"
        | "sieste"
        | "change"
        | "activite"
        | "humeur"
        | "note"
        | "arrivee_info"
      profile_role: "assmat" | "parent"
      schedule_exception_type:
        | "absence_programmee"
        | "horaire_modifie"
        | "ferie"
      summary_status: "genere" | "valide" | "envoye"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attendance_type: ["in", "out"],
      authorization_type: [
        "sortie",
        "transport",
        "photo",
        "medicament",
        "autre",
      ],
      contract_status: ["brouillon", "actif", "termine"],
      contract_type: ["annee_complete", "annee_incomplete"],
      cp_versement_option: ["juin", "prise_principale", "au_fil"],
      log_entry_type: [
        "repas",
        "sieste",
        "change",
        "activite",
        "humeur",
        "note",
        "arrivee_info",
      ],
      profile_role: ["assmat", "parent"],
      schedule_exception_type: [
        "absence_programmee",
        "horaire_modifie",
        "ferie",
      ],
      summary_status: ["genere", "valide", "envoye"],
    },
  },
} as const

