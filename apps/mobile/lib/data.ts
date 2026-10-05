import { supabase } from './supabase';

export type Profile = { display_name: string; avatar_url: string | null; bio?: string | null };
export type Member = { id: string; user_id: string; current_chapter: number; progress_note: string | null; membership_status: string; profiles: Profile | null };
export type Reaction = { id: string; user_id: string; emoji: string; profiles: Pick<Profile, 'display_name'> | null };
export type Comment = { id: string; user_id: string; content: string; chapter_reference: number | null; created_at: string; profiles: Profile | null; reactions: Reaction[] };
export type Circle = { id: string; book_title: string; author: string; total_chapters: number; description: string | null; cover_image_url: string | null; status: string; creator_id: string; profiles?: Profile | null; session_members?: Member[] };

export const commentSelect = 'id,user_id,content,chapter_reference,created_at,profiles(display_name,avatar_url),reactions(id,user_id,emoji,profiles(display_name))';

export async function loadCircles(userId?: string | null) {
  if (!supabase) return { data: [] as Circle[], error: 'Supabase is not configured. Add apps/mobile/.env to connect.' };
  // Membership data is deliberately omitted for guests; anonymous reads are denied by RLS.
  const selection = userId
    ? 'id,book_title,author,total_chapters,description,cover_image_url,status,creator_id,session_members(current_chapter,membership_status)'
    : 'id,book_title,author,total_chapters,description,cover_image_url,status,creator_id';
  const { data, error } = await supabase.from('reading_sessions').select(selection).eq('status', 'active').order('created_at', { ascending: false }).limit(50);
  return { data: (data ?? []) as unknown as Circle[], error: error?.message ?? '' };
}

export async function loadComments(sessionId: string) {
  if (!supabase) return [] as Comment[];
  const { data } = await supabase.from('comments').select(commentSelect).eq('session_id', sessionId).is('deleted_at', null).order('created_at', { ascending: true });
  return (data ?? []) as unknown as Comment[];
}
