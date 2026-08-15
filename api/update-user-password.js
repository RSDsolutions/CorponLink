import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Minimal JWT payload decode (no signature verification) to extract sub claim
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const json = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing access token' });

  const payload = decodeJwtPayload(token);
  if (!payload || !payload.sub) return res.status(401).json({ error: 'Invalid token' });

  const adminId = payload.sub;

  const { userId, newPassword } = req.body || {};
  if (!userId || !newPassword) return res.status(400).json({ error: 'Missing userId or newPassword' });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return res.status(500).json({ error: 'Server misconfigured: missing Supabase keys' });
  }

  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // Verify requestor is admin by checking profiles table
    const { data: profile, error: profError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .maybeSingle();

    if (profError) throw profError;
    if (!profile || profile.role !== 'admin') return res.status(403).json({ error: 'Only admins can change passwords' });

    // Use admin API to update user password
    // supabase-js v2 admin method: auth.admin.updateUserById
    const { data, error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in update-user-password:', error.message || error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
}
