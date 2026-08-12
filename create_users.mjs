import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://djquklieluhadwpxheji.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcXVrbGllbHVoYWR3cHhoZWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjQ5NDMsImV4cCI6MjEwMTY0MDk0M30.33mZVLzY-DjPZfa1rMqwJEfYm1JiKFIjuwRA9n7mMI0';
const supabase = createClient(supabaseUrl, supabaseKey);

const usersToCreate = [
  { email: 'gerencia.administrativa@corpon-net.com', password: 'CorponAdmin2026!', role: 'admin', full_name: 'Gerencia Administrativa' },
  { email: 'gerencia.comercial@corpon-net.com', password: 'JoseComercial2026!', role: 'supervisor', full_name: 'Supervisor José' },
  { email: 'supervisor1@corpon-net.com', password: 'SamuelSupervisor1!', role: 'supervisor', full_name: 'Supervisor Samuel' },
  { email: 'supervisor2@corpon-net.com', password: 'HerenSupervisor2!', role: 'supervisor', full_name: 'Supervisor Heren' }
];

async function run() {
  for (const user of usersToCreate) {
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
    });
    
    if (error) {
      console.error(`Error creating ${user.email}:`, error.message);
      continue;
    }
    
    const userId = data.user.id;
    console.log(`Created user ${user.email} with ID ${userId}`);
    
    // Update or insert profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: userId, full_name: user.full_name, role: user.role });
      
    if (profileError) {
      console.error(`Error updating profile for ${user.email}:`, profileError.message);
    } else {
      console.log(`Profile updated for ${user.email}`);
    }
  }
}

run();
