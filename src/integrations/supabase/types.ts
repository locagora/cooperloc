export type UserRole = 'admin' | 'matriz' | 'franqueado'
export type UserStatus = 'pending' | 'active' | 'blocked' | 'inactive'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          status: UserStatus
          franchise_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: UserRole
          status?: UserStatus
          franchise_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          status?: UserStatus
          franchise_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      franchises: {
        Row: {
          id: string
          name: string
          cnpj: string | null
          address: string | null
          city: string | null
          state: string | null
          phone: string | null
          email: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          cnpj?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          phone?: string | null
          email?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          cnpj?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          phone?: string | null
          email?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      trackers: {
        Row: {
          id: string
          serial_number: string
          model: string | null
          status: 'estoque' | 'enviado' | 'instalado' | 'defeito'
          franchise_id: string | null
          sent_at: string | null
          installed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
          // Campos de instalação
          client_cnpj: string | null
          client_name: string | null
          client_contact: string | null
          vehicle_chassis: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_year: string | null
          installation_month: string | null
        }
        Insert: {
          id?: string
          serial_number: string
          model?: string | null
          status?: 'estoque' | 'enviado' | 'instalado' | 'defeito'
          franchise_id?: string | null
          sent_at?: string | null
          installed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          // Campos de instalação
          client_cnpj?: string | null
          client_name?: string | null
          client_contact?: string | null
          vehicle_chassis?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_year?: string | null
          installation_month?: string | null
        }
        Update: {
          id?: string
          serial_number?: string
          model?: string | null
          status?: 'estoque' | 'enviado' | 'instalado' | 'defeito'
          franchise_id?: string | null
          sent_at?: string | null
          installed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          // Campos de instalação
          client_cnpj?: string | null
          client_name?: string | null
          client_contact?: string | null
          vehicle_chassis?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_year?: string | null
          installation_month?: string | null
        }
      }
      tracker_movements: {
        Row: {
          id: string
          tracker_id: string
          from_status: string
          to_status: string
          from_franchise_id: string | null
          to_franchise_id: string | null
          quantity: number
          notes: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          tracker_id: string
          from_status: string
          to_status: string
          from_franchise_id?: string | null
          to_franchise_id?: string | null
          quantity?: number
          notes?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          tracker_id?: string
          from_status?: string
          to_status?: string
          from_franchise_id?: string | null
          to_franchise_id?: string | null
          quantity?: number
          notes?: string | null
          created_by?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      user_status: UserStatus
      tracker_status: 'estoque' | 'enviado' | 'instalado' | 'defeito'
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Franchise = Database['public']['Tables']['franchises']['Row']
export type Tracker = Database['public']['Tables']['trackers']['Row']
export type TrackerMovement = Database['public']['Tables']['tracker_movements']['Row']

// Re-export UserStatus para uso em outros arquivos
export type { UserStatus }
