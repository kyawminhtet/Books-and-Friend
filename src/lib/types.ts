export type Session = {
  id: string; book_title: string; author: string; total_chapters: number;
  description: string | null; cover_image_url: string | null; status: 'active' | 'completed' | 'cancelled';
  start_date: string | null; target_end_date: string | null; created_at: string;
  profiles?: { display_name: string; avatar_url?: string | null } | null;
  session_members?: ReadingProgress[];
};

export type ReadingProgress = {
  user_id?: string;
  current_chapter: number;
  membership_status: string;
  profiles?: { display_name: string; avatar_url?: string | null } | null;
};

export const coverColors = ['cover-peach', 'cover-blue', 'cover-sage', 'cover-lilac', 'cover-rose', 'cover-gold'];
export const initials = (name = 'Reader') => name.split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
