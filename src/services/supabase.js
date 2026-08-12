import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getCurrentAuthUser = async ({ allowDemo = false } = {}) => {
  try {
    if (allowDemo) {
      console.warn('Demo mode is disabled in production.');
      return null;
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (user) return user;
  } catch (error) {
    console.warn('No active Supabase auth session:', error.message);
  }

  return null;
};
