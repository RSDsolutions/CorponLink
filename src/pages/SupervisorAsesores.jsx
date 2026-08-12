import { useState, useEffect } from 'react';
import { supabase, getCurrentAuthUser } from '../services/supabase';
import { Users, X, Save, Plus, Trash2, Shield, MapPin } from 'lucide-react';

export default function SupervisorAsesores() {
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    province: 'UIO',
    code: ''
  });

  const fetchAdvisors = async () => {
    setLoading(true);
    try {
      const user = await getCurrentAuthUser();
      if (!user?.id) {
        setAdvisors([]);
        return;
      }

      const { data, error } = await supabase
        .from('advisors')
        .select('*')
        .eq('supervisor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdvisors(data || []);
    } catch (error) {
      console.error('Error fetching advisors:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisors();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateCode = () => {
    const provinceAdvisors = advisors.filter(a => a.province === formData.province);
    let maxSequence = 0;
    
    provinceAdvisors.forEach(a => {
      if (a.code && a.code.startsWith(`${formData.province}-`)) {
        const parts = a.code.split('-');
        if (parts.length > 1) {
          const numPart = parseInt(parts[1], 10);
          if (!isNaN(numPart) && numPart > maxSequence) {
            maxSequence = numPart;
          }
        }
      }
    });

    const nextSequence = maxSequence + 1;
    const paddedSequence = nextSequence.toString().padStart(3, '0');
    
    setFormData({ ...formData, code: `${formData.province}-${paddedSequence}` });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code) {
      alert('Por favor genera o ingresa un código para el asesor.');
      return;
    }
    try {
      const user = await getCurrentAuthUser();
      if (!user?.id) {
        alert('No hay una sesión activa para guardar asesores.');
        return;
      }

      const { error } = await supabase.from('advisors').insert([{
        ...formData,
        supervisor_id: user.id
      }]);

      if (error) throw error;
      setFormData({ full_name: '', province: 'UIO', code: '' });
      setShowModal(false);
      fetchAdvisors();
    } catch (error) {
      alert('Error guardando asesor: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este asesor? No se borrarán los clientes asociados, pero quedarán sin asesor enlazado.')) return;
    try {
      const { error } = await supabase.from('advisors').delete().eq('id', id);
      if (error) throw error;
      fetchAdvisors();
    } catch (error) {
      alert('Error eliminando asesor: ' + error.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Mis Asesores</h2>
          <p className="text-muted">Gestiona el equipo de asesores asignado a tu supervisión.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Agregar Asesor
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Directorio de Asesores</h3>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre del Asesor</th>
                <th>Provincia (Región)</th>
                <th>Fecha de Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {advisors.map(a => (
                <tr key={a.id}>
                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      backgroundColor: 'var(--primary-light)', 
                      color: 'var(--primary)', 
                      borderRadius: '4px', 
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}>
                      {a.code}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{a.full_name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                      <MapPin size={14} />
                      {a.province}
                    </div>
                  </td>
                  <td>{new Date(a.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-sm"
                      style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger-text)', border: 'none' }}
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {advisors.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No tienes asesores registrados. ¡Agrega tu primer asesor!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Agregar Asesor</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Nombres Completos *</label>
                  <input
                    type="text" className="form-input" required
                    name="full_name"
                    placeholder="Ej: Juan Pérez" value={formData.full_name}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Provincia *</label>
                  <select name="province" className="form-select" value={formData.province} onChange={handleChange}>
                    <option value="UIO">Pichincha (UIO)</option>
                    <option value="GYE">Guayas (GYE)</option>
                    <option value="SD">Santo Domingo (SD)</option>
                    <option value="MA">Manabí (MA)</option>
                    <option value="LJA">Loja (LJA)</option>
                    <option value="AZU">Azuay (AZU)</option>
                    <option value="TUN">Tungurahua (TUN)</option>
                    <option value="OTR">Otra</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Código del Asesor *</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text" className="form-input" required
                      name="code"
                      placeholder="Ej: UIO-123" value={formData.code}
                      onChange={handleChange}
                    />
                    <button type="button" className="btn btn-secondary" onClick={generateCode} style={{ whiteSpace: 'nowrap' }}>
                      Generar
                    </button>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                    El código identificará al asesor en los registros de ventas y auditorías.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Save size={18} /> Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
