import { useState, useEffect } from 'react';
import { supabase, mergeProfilesWithDemo } from '../services/supabase';

export default function AdminUsers() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          supervisor:supervisor_id(full_name)
        `)
        .order('role', { ascending: false });

      if (error) throw error;
      setProfiles(mergeProfilesWithDemo(data || []));
    } catch (error) {
      console.error('Error fetching profiles:', error.message);
      setProfiles(mergeProfilesWithDemo([]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Gestión de Personal</h2>
          <p className="text-muted">Visualiza los usuarios registrados y sus roles.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Directorio de Empleados</h3>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.75rem' }}>Nota: La creación de nuevos usuarios se gestiona desde el panel principal de Supabase Auth por motivos de seguridad.</p>
        </div>
        
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre del Empleado</th>
                <th>Rol</th>
                <th>Reporta a (Supervisor)</th>
                <th>Fecha de Creación</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.full_name || 'Usuario sin nombre'}</td>
                  <td>
                    <span className="badge badge-registrado" style={{ textTransform: 'capitalize', backgroundColor: p.role === 'admin' ? 'var(--status-danger-bg)' : p.role === 'supervisor' ? 'var(--status-info-bg)' : 'var(--status-success-bg)', color: p.role === 'admin' ? 'var(--status-danger-text)' : p.role === 'supervisor' ? 'var(--status-info-text)' : 'var(--status-success-text)' }}>
                      {p.role}
                    </span>
                  </td>
                  <td>{p.supervisor?.full_name || '-'}</td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
