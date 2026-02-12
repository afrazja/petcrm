export type HealthMapMarker = {
  id: string;
  x: number;
  y: number;
  note: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          business_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          business_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          business_name?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          profile_id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      pets: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          breed: string | null;
          date_of_birth: string | null;
          vaccine_expiry_date: string | null;
          notes: string | null;
          health_map: HealthMapMarker[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          breed?: string | null;
          date_of_birth?: string | null;
          vaccine_expiry_date?: string | null;
          notes?: string | null;
          health_map?: HealthMapMarker[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          breed?: string | null;
          date_of_birth?: string | null;
          vaccine_expiry_date?: string | null;
          notes?: string | null;
          health_map?: HealthMapMarker[] | null;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          pet_id: string;
          client_id: string;
          profile_id: string;
          service: string;
          price: number;
          notes: string | null;
          duration: number | null;
          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          client_id: string;
          profile_id: string;
          service?: string;
          price?: number;
          notes?: string | null;
          duration?: number | null;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          service?: string;
          price?: number;
          notes?: string | null;
          duration?: number | null;
          completed_at?: string;
        };
      };
    };
  };
};
