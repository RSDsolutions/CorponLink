import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export default function AdminUsers() {
  const [profiles, setProfiles] = useState([]);
  const [advisorsMap, setAdvisorsMap] = useState({});
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
      const list = data || [];
      setProfiles(list);

      // Build map: supervisor_id -> [advisorProfiles]
      const map = {};
      list.forEach(p => {
        if (p.supervisor_id) {
          map[p.supervisor_id] = map[p.supervisor_id] || [];
          map[p.supervisor_id].push(p);
        }
      });
      setAdvisorsMap(map);
    } catch (error) {
      console.error('Error fetching profiles:', error.message);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const openPasswordModal = (user) => { setTargetUser(user); setNewPassword(''); setShowPasswordModal(true); };
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!targetUser) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch('/api/update-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: targetUser.id, newPassword })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error updating password');
      alert('Contraseña actualizada correctamente.');
      setShowPasswordModal(false);
    } catch (error) {
      alert('Error actualizando contraseña: ' + (error.message || error));
    }
  };

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
                <th>Cédula</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Reporta a (Supervisor)</th>
                <th>Asesores</th>
                <th>Fecha de Creación</th>
                <th>Acciones</th>
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
                  <td>{p.document_id || '-'}</td>
                  <td>{p.phone || '-'}</td>
                  <td>{p.address || '-'}</td>
                  <td>{p.supervisor?.full_name || '-'}</td>
                  <td style={{ maxWidth: 240 }}>
                    {p.role === 'supervisor' ? (
                      advisorsMap[p.id] && advisorsMap[p.id].length > 0 ? (
                        <div style={{ fontSize: '0.875rem' }}>
                          {advisorsMap[p.id].map(a => a.full_name || a.email).slice(0,5).join(', ')}{advisorsMap[p.id].length > 5 ? ` (+${advisorsMap[p.id].length - 5})` : ''}
                        </div>
                      ) : (
                        <span className="text-muted">0</span>
                      )
                    ) : '-'}
                  </td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn" onClick={() => openPasswordModal(p)}>Cambiar contraseña</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showPasswordModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal" style={{ background: '#fff', padding: '1.25rem', borderRadius: 8, width: 420 }}>
            <h4 style={{ marginTop: 0 }}>Cambiar contraseña</h4>
            <p className="text-muted">Usuario: {targetUser?.full_name || targetUser?.email}</p>
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '0.75rem' }}>
                <input autoFocus type="password" placeholder="Nueva contraseña" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
