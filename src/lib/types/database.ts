export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProcessingStatus =
  | 'pending'
  | 'transcribing'
  | 'analyzing'
  | 'complete'
  | 'error'

export type LoopicalStatus = 'open' | 'in_progress' | 'done'

export type Sentiment = 'positive' | 'neutral' | 'critical'

export type MediaType = 'image' | 'pdf' | 'url'

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface WordTimestamp {
  word: string
  start: number
  end: number
}

export interface ActionItem {
  text: string
  done: boolean
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          color: string
          share_token: string
          created_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          color?: string
          share_token?: string
          created_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          color?: string
          share_token?: string
          created_at?: string
          archived_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'projects_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: MemberRole
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: MemberRole
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: MemberRole
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      loopicals: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          media_url: string | null
          media_type: MediaType | null
          status: LoopicalStatus
          created_by: string
          created_at: string
          order_index: number
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          media_url?: string | null
          media_type?: MediaType | null
          status?: LoopicalStatus
          created_by: string
          created_at?: string
          order_index?: number
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          media_url?: string | null
          media_type?: MediaType | null
          status?: LoopicalStatus
          created_by?: string
          created_at?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: 'loopicals_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'loopicals_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      feedback_entries: {
        Row: {
          id: string
          loopical_id: string
          audio_url: string
          audio_duration_seconds: number | null
          transcript: string | null
          summary: string | null
          action_items: Json | null
          sentiment: string | null
          tags: string[] | null
          language: string | null
          word_timestamps: Json | null
          processing_status: string
          author_id: string | null
          guest_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          loopical_id: string
          audio_url: string
          audio_duration_seconds?: number | null
          transcript?: string | null
          summary?: string | null
          action_items?: Json | null
          sentiment?: string | null
          tags?: string[] | null
          language?: string | null
          word_timestamps?: Json | null
          processing_status?: string
          author_id?: string | null
          guest_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          loopical_id?: string
          audio_url?: string
          audio_duration_seconds?: number | null
          transcript?: string | null
          summary?: string | null
          action_items?: Json | null
          sentiment?: string | null
          tags?: string[] | null
          language?: string | null
          word_timestamps?: Json | null
          processing_status?: string
          author_id?: string | null
          guest_name?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feedback_entries_loopical_id_fkey'
            columns: ['loopical_id']
            isOneToOne: false
            referencedRelation: 'loopicals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'feedback_entries_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      comments: {
        Row: {
          id: string
          feedback_entry_id: string
          author_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          feedback_entry_id: string
          author_id: string
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          feedback_entry_id?: string
          author_id?: string
          text?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_feedback_entry_id_fkey'
            columns: ['feedback_entry_id']
            isOneToOne: false
            referencedRelation: 'feedback_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_project_by_share_token: {
        Args: { token: string }
        Returns: {
          id: string
          name: string
          description: string | null
          color: string
          share_token: string
        }[]
      }
      get_loopicals_by_share_token: {
        Args: { token: string }
        Returns: {
          id: string
          title: string
          description: string | null
          media_url: string | null
          media_type: string | null
          status: string
          order_index: number
          feedback_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
