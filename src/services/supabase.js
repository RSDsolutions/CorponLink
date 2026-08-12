import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const DEMO_USERS = {
  'gerencia.administrativa@corpon-net.com': {
    password: 'CorponAdmin2026!',
    role: 'admin',
    full_name: 'Gerencia Administrativa',
  },
  'gerencia.comercial@corpon-net.com': {
    password: 'JoseComercial2026!',
    role: 'supervisor',
    full_name: 'Supervisor José',
  },
  'supervisor1@corpon-net.com': {
    password: 'SamuelSupervisor1!',
    role: 'supervisor',
    full_name: 'Supervisor Samuel',
  },
  'supervisor2@corpon-net.com': {
    password: 'HerenSupervisor2!',
    role: 'supervisor',
    full_name: 'Supervisor Heren',
  },
};

export const DEMO_SESSION_KEY = 'corponnet-demo-session';

export const getDemoUserByEmail = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  const user = DEMO_USERS[normalized];

  if (!user) return null;

  return {
    id: `demo-${normalized.replace(/[^a-z0-9]+/g, '-')}`,
    email: normalized,
    role: user.role,
    full_name: user.full_name,
  };
};

export const getDemoUser = (email, password) => {
  const user = getDemoUserByEmail(email);
  if (!user) return null;

  const expectedPassword = DEMO_USERS[user.email]?.password;
  if (!expectedPassword || String(password) !== expectedPassword) {
    return null;
  }

  return user;
};

export const setDemoSession = (user) => {
  if (!user) return;

  const session = {
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
  };

  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
};

export const getDemoSession = () => {
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);
    if (!session?.id || !session?.email) return null;

    return session;
  } catch (error) {
    return null;
  }
};

export const clearDemoSession = () => {
  localStorage.removeItem(DEMO_SESSION_KEY);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
