import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { LogOut, User } from 'lucide-react';

export default function Navbar({ role }) {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        CorponNet
        <span className="badge badge-active" style={{ marginLeft: '1rem', textTransform: 'capitalize' }}>
          {role}
        </span>
      </div>
      <div>
        <button onClick={handleLogout} className="btn btn-secondary">
          <LogOut size={16} /> Salir
        </button>
      </div>
    </nav>
  );
}
