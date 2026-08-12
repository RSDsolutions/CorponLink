import { useState, useEffect } from 'react';
import { supabase, getCurrentAuthUser } from '../services/supabase';
import { Users, BarChart, CheckCircle, MapPin, User, Save, X } from 'lucide-react';

export default function SupervisorDashboard() {
  const [stats, setStats] = useState({ totalClients: 0, pendientes: 0, activos: 0, totalRoutes: 0 });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    document_id: '',
    phone: '',
    address: ''
  });

  const fetchProfile = async () => {
    try {
      const user = await getCurrentAuthUser({ allowDemo: false });
      if (!user?.id) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);

      if (data) {
        setProfileForm({
          full_name: data.full_name || '',
          document_id: data.document_id || '',
          phone: data.phone || '',
          address: data.address || ''
        });
      }
    } catch (error) {
      console.error('Error fetching supervisor profile:', error.message);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const user = await getCurrentAuthUser({ allowDemo: false });
        if (!user?.id) {
          setStats({ totalClients: 0, pendientes: 0, activos: 0, totalRoutes: 0 });
          return;
        }

        const [{ data: clients }, { data: routes }] = await Promise.all([
          supabase.from('clients').select('status'),
          supabase.from('routes').select('id').eq('supervisor_id', user.id)
        ]);

        setStats({
          totalClients: clients?.length || 0,
          pendientes: clients?.filter(c => ['Registrado', 'Contactado', 'Programado'].includes(c.status)).length || 0,
          activos: clients?.filter(c => c.status === 'Activo').length || 0,
          totalRoutes: routes?.length || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    fetchProfile();
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    try {
      const user = await getCurrentAuthUser({ allowDemo: false });
      if (!user?.id) {
        alert('No hay una sesión activa para guardar tu perfil.');
        return;
      }

      const payload = {
        id: user.id,
        full_name: profileForm.full_name.trim(),
        document_id: profileForm.document_id.trim(),
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim(),
        role: 'supervisor'
      };

      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) throw error;

      setProfile(payload);
      setShowProfileModal(false);
      alert('Perfil de usuario guardado correctamente.');
    } catch (error) {
      alert('Error guardando el perfil: ' + error.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Panel de Supervisor</h2>
          <p className="text-muted">Resumen general de clientes, rutas y actividad del equipo.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><Users size={24} /></div>
          <div className="kpi-value">{stats.totalClients}</div>
          <div className="kpi-label">Clientes Totales</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon yellow"><BarChart size={24} /></div>
          <div className="kpi-value">{stats.pendientes}</div>
          <div className="kpi-label">En Proceso / Programados</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><CheckCircle size={24} /></div>
          <div className="kpi-value">{stats.activos}</div>
          <div className="kpi-label">Instalaciones Activas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon blue" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <MapPin size={24} />
          </div>
          <div className="kpi-value">{stats.totalRoutes}</div>
          <div className="kpi-label">Rutas Registradas</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: '0.35rem' }}>Mi perfil de usuario</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {profile?.full_name || 'Sin información guardada'}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowProfileModal(true)}>
            <User size={18} /> {profile ? 'Actualizar perfil' : 'Completar perfil'}
          </button>
        </div>

        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div className="info-box">
            <strong>Cédula</strong>
            <span>{profile?.document_id || 'No definida'}</span>
          </div>
          <div className="info-box">
            <strong>Teléfono</strong>
            <span>{profile?.phone || 'No definido'}</span>
          </div>
          <div className="info-box">
            <strong>Dirección</strong>
            <span>{profile?.address || 'No definida'}</span>
          </div>
        </div>
      </div>

      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Perfil de usuario</h3>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveProfile}>
                <div className="form-group">
                  <label className="form-label">Nombre completo *</label>
                  <input type="text" name="full_name" className="form-input" required value={profileForm.full_name} onChange={handleProfileChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">Cédula</label>
                  <input type="text" name="document_id" className="form-input" value={profileForm.document_id} onChange={handleProfileChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input type="text" name="phone" className="form-input" value={profileForm.phone} onChange={handleProfileChange} />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Dirección</label>
                  <textarea name="address" className="form-textarea" rows="3" value={profileForm.address} onChange={handleProfileChange}></textarea>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Save size={18} /> Guardar perfil</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
