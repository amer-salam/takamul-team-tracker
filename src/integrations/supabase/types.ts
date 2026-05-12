export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      deliveries: {
        Row: {
          company: string
          created_at: string
          delivery_date: string
          employee_id: string
          id: string
          notes: string | null
          orders_count: number
          price_per_order: number
          returned_count: number
          total: number
        }
        Insert: {
          company: string
          created_at?: string
          delivery_date?: string
          employee_id: string
          id?: string
          notes?: string | null
          orders_count?: number
          price_per_order?: number
          returned_count?: number
          total?: number
        }
        Update: {
          company?: string
          created_at?: string
          delivery_date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          orders_count?: number
          price_per_order?: number
          returned_count?: number
          total?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string | null
          assigned_activator: string | null
          assigned_auditor: string | null
          assigned_delivery: string | null
          assigned_support: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string
          device_code: string | null
          device_name: string | null
          id: string
          image_url: string | null
          is_image_order: boolean
          notes: string | null
          order_number: number | null
          price: number | null
          product: string
          source: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_activator?: string | null
          assigned_auditor?: string | null
          assigned_delivery?: string | null
          assigned_support?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          customer_phone: string
          device_code?: string | null
          device_name?: string | null
          id?: string
          image_url?: string | null
          is_image_order?: boolean
          notes?: string | null
          order_number?: number | null
          price?: number | null
          product?: string
          source?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_activator?: string | null
          assigned_auditor?: string | null
          assigned_delivery?: string | null
          assigned_support?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          customer_phone?: string
          device_code?: string | null
          device_name?: string | null
          id?: string
          image_url?: string | null
          is_image_order?: boolean
          notes?: string | null
          order_number?: number | null
          price?: number | null
          product?: string
          source?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          employee_id: string
          id: string
          order_id: string | null
          task_type: Database["public"]["Enums"]["task_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          employee_id: string
          id?: string
          order_id?: string | null
          task_type: Database["public"]["Enums"]["task_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          employee_id?: string
          id?: string
          order_id?: string | null
          task_type?: Database["public"]["Enums"]["task_type"]
        }
        Relationships: [
          {
            foreignKeyName: "tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "manager"
        | "receptionist"
        | "support"
        | "activator"
        | "auditor"
        | "delivery"
      order_status:
        | "new"
        | "processing"
        | "activated"
        | "completed"
        | "cancelled"
        | "pending_audit"
        | "audited_printed"
        | "in_delivery"
        | "delivered"
        | "returned"
      task_type:
        | "order_received"
        | "problem_resolved"
        | "code_activated"
        | "note"
        | "audit_done"
        | "delivery_done"
        | "issue_received"
        | "issue_resolved"
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
      app_role: [
        "manager",
        "receptionist",
        "support",
        "activator",
        "auditor",
        "delivery",
      ],
      order_status: [
        "new",
        "processing",
        "activated",
        "completed",
        "cancelled",
        "pending_audit",
        "audited_printed",
        "in_delivery",
        "delivered",
        "returned",
      ],
      task_type: [
        "order_received",
        "problem_resolved",
        "code_activated",
        "note",
        "audit_done",
        "delivery_done",
        "issue_received",
        "issue_resolved",
      ],
    },
  },
} as const
