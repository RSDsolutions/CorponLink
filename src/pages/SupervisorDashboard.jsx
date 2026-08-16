import { useState, useEffect } from 'react';
import { supabase, getCurrentAuthUser } from '../services/supabase';
import { Users, BarChart, CheckCircle, MapPin, User, Save, X } from 'lucide-react';

const CITY_OPTIONS = [
  { name: 'Quito', prefix: 'UIO' },
  { name: 'Guayaquil', prefix: 'GYE' },
  { name: 'Cuenca', prefix: 'CUE' },
  { name: 'Manta', prefix: 'MTA' },
  { name: 'Machala', prefix: 'MCH' },
  { name: 'Loja', prefix: 'LOJ' },
  { name: 'Ambato', prefix: 'AMB' },
  { name: 'Santo Domingo', prefix: 'SDO' },
  { name: 'Duran', prefix: 'DUR' },
  { name: 'Milagro', prefix: 'MIL' },
  { name: 'Portoviejo', prefix: 'PVO' },
  { name: 'Esmeraldas', prefix: 'ESM' },
  { name: 'Ibarra', prefix: 'IBA' },
  { name: 'Riobamba', prefix: 'RIO' }
];

const normalizeCity = (city) => (city || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toUpperCase();

const CITY_PREFIX_BY_NAME = Object.fromEntries(
  CITY_OPTIONS.map(({ name, prefix }) => [normalizeCity(name), prefix])
);

const getCityPrefix = (city) => {
  const normalized = normalizeCity(city);
  if (!normalized) return '';

  return CITY_PREFIX_BY_NAME[normalized] || normalized.replace(/[^A-Z0-9]/g, '').slice(0, 3).padEnd(3, 'X');
};

const getSupervisorCode = (city) => {
  const prefix = getCityPrefix(city);
  return prefix ? `SUP-${prefix}-001` : '';
};

export default function SupervisorDashboard() {
  const [stats, setStats] = useState({ totalClients: 0, pendientes: 0, activos: 0, totalRoutes: 0 });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    second_name: '',
    first_surname: '',
    second_surname: '',
    full_name: '',
    document_id: '',
    city: '',
    code: '',
    email: '',
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
          first_name: data.first_name || '',
          second_name: data.second_name || '',
          first_surname: data.first_surname || '',
          second_surname: data.second_surname || '',
          full_name: data.full_name || '',
          document_id: data.document_id || '',
          city: data.city || '',
          code: data.code || '',
          email: data.email || '',
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
          pendientes: clients?.filter(c => ['Ingresado'].includes(c.status)).length || 0,
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
    setProfileForm(prev => ({
      ...prev,
      [name]: value,
      code: name === 'city' ? getSupervisorCode(value) : prev.code
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    try {
      const user = await getCurrentAuthUser({ allowDemo: false });
      if (!user?.id) {
        alert('No hay una sesión activa para guardar tu perfil.');
        return;
      }

      const firstName = profileForm.first_name.trim();
      const secondName = profileForm.second_name.trim();
      const firstSurname = profileForm.first_surname.trim();
      const secondSurname = profileForm.second_surname.trim();
      const city = profileForm.city.trim();
      const resolvedCode = city ? getSupervisorCode(city) : profileForm.code || '';
      const fullName = [firstName, secondName, firstSurname, secondSurname].filter(Boolean).join(' ');

      if (!firstName || !firstSurname || !city) {
        alert('Los campos Nombre, Primer Apellido y Ciudad son obligatorios.');
        return;
      }

      const payload = {
        id: user.id,
        first_name: firstName,
        second_name: secondName,
        first_surname: firstSurname,
        second_surname: secondSurname,
        full_name: fullName,
        document_id: profileForm.document_id.trim(),
        city,
        code: resolvedCode,
        email: profileForm.email.trim(),
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

        <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="info-box">
            <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem' }}>📇</span> Cédula
            </strong>
            <span>{profile?.document_id || 'No definida'}</span>
          </div>
          <div className="info-box">
            <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem' }}>📧</span> Correo
            </strong>
            <span>{profile?.email || 'No definido'}</span>
          </div>
          <div className="info-box">
            <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem' }}>📱</span> Teléfono
            </strong>
            <span>{profile?.phone || 'No definido'}</span>
          </div>
          <div className="info-box">
            <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem' }}>🏙️</span> Ciudad
            </strong>
            <span>{profile?.city || 'No definida'}</span>
          </div>
          <div className="info-box">
            <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem' }}>🔖</span> Código
            </strong>
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{profile?.code || 'SUP-XXX-001'}</span>
          </div>
          <div className="info-box">
            <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem' }}>📍</span> Dirección
            </strong>
            <span>{profile?.address || 'No definida'}</span>
          </div>
        </div>
      </div>

      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Perfil de usuario</h3>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Completa tu información personal</p>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveProfile}>
                {/* Información Personal */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>Información Personal</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Primer Nombre *</label>
                      <input type="text" name="first_name" className="form-input" required value={profileForm.first_name} onChange={handleProfileChange} placeholder="Juan" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Segundo Nombre</label>
                      <input type="text" name="second_name" className="form-input" value={profileForm.second_name} onChange={handleProfileChange} placeholder="Carlos" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Primer Apellido *</label>
                      <input type="text" name="first_surname" className="form-input" required value={profileForm.first_surname} onChange={handleProfileChange} placeholder="García" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Segundo Apellido</label>
                      <input type="text" name="second_surname" className="form-input" value={profileForm.second_surname} onChange={handleProfileChange} placeholder="López" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                      <label className="form-label">Cédula</label>
                      <input type="text" name="document_id" className="form-input" value={profileForm.document_id} onChange={handleProfileChange} placeholder="1234567890" />
                    </div>
                  </div>
                </div>

                {/* Ubicación y Código */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>Ubicación</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Ciudad *</label>
                      <select name="city" className="form-select" required value={profileForm.city} onChange={handleProfileChange}>
                        <option value="">Seleccione la ciudad...</option>
                        {CITY_OPTIONS.map(city => (
                          <option key={city.name} value={city.name}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Código (Auto)</label>
                      <input type="text" className="form-input" value={profileForm.code || getSupervisorCode(profileForm.city)} readOnly style={{ backgroundColor: 'var(--surface-hover)', cursor: 'not-allowed', fontWeight: 500 }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                      <label className="form-label">Dirección</label>
                      <textarea name="address" className="form-textarea" rows="2" value={profileForm.address} onChange={handleProfileChange} placeholder="Calle 123, Edificio A, Apt 4"></textarea>
                    </div>
                  </div>
                </div>

                {/* Contacto */}
                <div>
                  <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>Información de Contacto</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Correo Electrónico</label>
                      <input type="email" name="email" className="form-input" value={profileForm.email} onChange={handleProfileChange} placeholder="usuario@ejemplo.com" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Teléfono</label>
                      <input type="text" name="phone" className="form-input" value={profileForm.phone} onChange={handleProfileChange} placeholder="+593 9 XXXX XXXX" />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
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
