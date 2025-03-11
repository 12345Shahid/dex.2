
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: number;
          username: string;
          password: string;
          credits: number;
          referral_code: string;
          referred_by: number | null;
        };
        Insert: {
          username: string;
          password: string;
          credits?: number;
          referral_code: string;
          referred_by?: number | null;
        };
      };
      chat_history: {
        Row: {
          id: number;
          user_id: number;
          prompt: string;
          response: string;
          is_favorite: boolean;
          created_at: string;
        };
        Insert: {
          user_id: number;
          prompt: string;
          response: string;
          is_favorite?: boolean;
        };
      };
      folders: {
        Row: {
          id: number;
          user_id: number;
          name: string;
          created_at: string;
        };
        Insert: {
          user_id: number;
          name: string;
        };
      };
      files: {
        Row: {
          id: number;
          user_id: number;
          name: string;
          content: string | null;
          folder_id: number | null;
          created_at: string;
        };
        Insert: {
          user_id: number;
          name: string;
          content?: string | null;
          folder_id?: number | null;
        };
      };
      notifications: {
        Row: {
          id: number;
          user_id: number;
          message: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          user_id: number;
          message: string;
          read?: boolean;
        };
      };
      contacts: {
        Row: {
          id: number;
          name: string;
          email: string;
          message: string;
          created_at: string;
        };
        Insert: {
          name: string;
          email: string;
          message: string;
        };
      };
    };
  };
};
