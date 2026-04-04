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

export type MediaType = 'image' | 'pdf' | 'url' | 'video' | 'markdown' | 'document'

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'

export type FeedbackMode = 'guided' | 'open'

export type ActionItemStatus = 'open' | 'in_progress' | 'done'

export type ActionItemPriority = 'high' | 'medium' | 'low'

export type FeedbackMediaType = 'audio' | 'video' | 'text'

export type MarkerViewport = 'desktop' | 'mobile'

export interface WordTimestamp {
  word: string
  start: number
  end: number
}

export interface AnnotationPin {
  type: 'pin'
  id: string
  x: number
  y: number
  label: string
  timestamp_ms: number
  media_index: number
  page?: number
}

export interface AnnotationStroke {
  type: 'stroke'
  id: string
  points: { x: number; y: number }[]
  color: string
  width: number
  timestamp_ms: number
  media_index: number
  page?: number
}

export type Annotation = AnnotationPin | AnnotationStroke

export interface ActionItem {
  text: string
  done: boolean
  priority?: 'high' | 'medium' | 'low'
}

export interface FollowUpQuestion {
  question: string
  answered: boolean
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
          annotation_x: number | null
          annotation_y: number | null
          feedback_mode: FeedbackMode
          welcome_message: string | null
          ai_summary: string | null
          ai_action_items: Json | null
          ai_summary_updated_at: string | null
          context_url: string | null
          share_link_views: number
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
          annotation_x?: number | null
          annotation_y?: number | null
          feedback_mode?: FeedbackMode
          welcome_message?: string | null
          ai_summary?: string | null
          ai_action_items?: Json | null
          ai_summary_updated_at?: string | null
          context_url?: string | null
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
          annotation_x?: number | null
          annotation_y?: number | null
          feedback_mode?: FeedbackMode
          welcome_message?: string | null
          ai_summary?: string | null
          ai_action_items?: Json | null
          ai_summary_updated_at?: string | null
          context_url?: string | null
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
          audio_url: string | null
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
          feedback_point_id: string | null
          annotations: Json | null
          is_read: boolean
          priority_score: number
          follow_up_questions: Json | null
          parent_entry_id: string | null
          media_type: FeedbackMediaType
          video_url: string | null
          severity: number | null
          effort_estimate: string | null
          usability_category: string | null
          ui_element_references: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          loopical_id: string
          audio_url?: string | null
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
          feedback_point_id?: string | null
          annotations?: Json | null
          is_read?: boolean
          priority_score?: number
          follow_up_questions?: Json | null
          parent_entry_id?: string | null
          media_type?: FeedbackMediaType
          video_url?: string | null
          severity?: number | null
          effort_estimate?: string | null
          usability_category?: string | null
          ui_element_references?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          loopical_id?: string
          audio_url?: string | null
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
          feedback_point_id?: string | null
          annotations?: Json | null
          is_read?: boolean
          priority_score?: number
          follow_up_questions?: Json | null
          parent_entry_id?: string | null
          media_type?: FeedbackMediaType
          video_url?: string | null
          severity?: number | null
          effort_estimate?: string | null
          usability_category?: string | null
          ui_element_references?: string[] | null
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
          {
            foreignKeyName: 'feedback_entries_parent_entry_id_fkey'
            columns: ['parent_entry_id']
            isOneToOne: false
            referencedRelation: 'feedback_entries'
            referencedColumns: ['id']
          },
        ]
      }
      loopical_media: {
        Row: {
          id: string
          loopical_id: string
          media_url: string
          media_type: MediaType
          order_index: number
          metadata: Json | null
          thumbnail_url: string | null
          ocr_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          loopical_id: string
          media_url: string
          media_type: MediaType
          order_index?: number
          metadata?: Json | null
          thumbnail_url?: string | null
          ocr_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          loopical_id?: string
          media_url?: string
          media_type?: MediaType
          order_index?: number
          metadata?: Json | null
          thumbnail_url?: string | null
          ocr_text?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'loopical_media_loopical_id_fkey'
            columns: ['loopical_id']
            isOneToOne: false
            referencedRelation: 'loopicals'
            referencedColumns: ['id']
          },
        ]
      }
      feedback_points: {
        Row: {
          id: string
          loopical_id: string
          question_text: string | null
          question_audio_url: string | null
          question_transcript: string | null
          marker_x: number | null
          marker_y: number | null
          marker_media_index: number
          marker_page: number
          marker_timestamp_ms: number | null
          marker_viewport: MarkerViewport
          order_index: number
          context_url: string | null
          ai_summary: string | null
          ai_consensus_points: Json | null
          ai_sentiment_breakdown: Json | null
          ai_summary_updated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          loopical_id: string
          question_text?: string | null
          question_audio_url?: string | null
          question_transcript?: string | null
          marker_x?: number | null
          marker_y?: number | null
          marker_media_index?: number
          marker_page?: number
          marker_timestamp_ms?: number | null
          marker_viewport?: MarkerViewport
          order_index?: number
          context_url?: string | null
          ai_summary?: string | null
          ai_consensus_points?: Json | null
          ai_sentiment_breakdown?: Json | null
          ai_summary_updated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          loopical_id?: string
          question_text?: string | null
          question_audio_url?: string | null
          question_transcript?: string | null
          marker_x?: number | null
          marker_y?: number | null
          marker_media_index?: number
          marker_page?: number
          marker_timestamp_ms?: number | null
          marker_viewport?: MarkerViewport
          order_index?: number
          context_url?: string | null
          ai_summary?: string | null
          ai_consensus_points?: Json | null
          ai_sentiment_breakdown?: Json | null
          ai_summary_updated_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feedback_points_loopical_id_fkey'
            columns: ['loopical_id']
            isOneToOne: false
            referencedRelation: 'loopicals'
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
      action_items: {
        Row: {
          id: string
          feedback_entry_id: string
          text: string
          priority: ActionItemPriority
          status: ActionItemStatus
          assignee_id: string | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          feedback_entry_id: string
          text: string
          priority?: ActionItemPriority
          status?: ActionItemStatus
          assignee_id?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          feedback_entry_id?: string
          text?: string
          priority?: ActionItemPriority
          status?: ActionItemStatus
          assignee_id?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'action_items_feedback_entry_id_fkey'
            columns: ['feedback_entry_id']
            isOneToOne: false
            referencedRelation: 'feedback_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'action_items_assignee_id_fkey'
            columns: ['assignee_id']
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
          annotation_x: number | null
          annotation_y: number | null
          feedback_mode: string
          welcome_message: string | null
          context_url: string | null
        }[]
      }
      get_feedback_points_by_share_token: {
        Args: { token: string; p_loopical_id: string }
        Returns: {
          id: string
          question_text: string | null
          question_audio_url: string | null
          question_transcript: string | null
          marker_x: number | null
          marker_y: number | null
          marker_media_index: number
          marker_page: number
          marker_timestamp_ms: number | null
          marker_viewport: string
          order_index: number
          context_url: string | null
        }[]
      }
      get_loopical_media_by_share_token: {
        Args: { token: string; p_loopical_id: string }
        Returns: {
          id: string
          media_url: string
          media_type: string
          order_index: number
          metadata: Json | null
          thumbnail_url: string | null
          ocr_text: string | null
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
