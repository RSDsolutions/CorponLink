import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Users, X, Save, Plus, MapPin, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SupervisorClientes() {
  const [clients, setClients] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const emptyForm = {
    first_name: '', last_name: '', document_id: '',
    phone: '', address: '', plan_name: 'Fibra 50MB',
    notes: '', route_id: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const [{ data: clientsData, error: clientsError }, { data: routesData, error: routesError }] = await Promise.all([
        supabase
          .from('clients')
          .select('*, route:route_id(id, sector_name, fecha, sector_rating, municipio, barrio)')
          .order('created_at', { ascending: false }),
        supabase
          .from('routes')
          .select('*')
          .eq('supervisor_id', user.id)
          .order('fecha', { ascending: false })
      ]);

      if (clientsError) throw clientsError;
      if (routesError) throw routesError;

      setClients(clientsData);
      setRoutes(routesData);
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.route_id) {
      alert('Debes seleccionar una ruta antes de registrar un cliente.');
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('clients').insert([{
        ...formData,
        asesor_id: user.id,
        route_id: formData.route_id || null
      }]);
      if (error) throw error;
      setFormData(emptyForm);
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert('Error guardando cliente: ' + error.message);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleStatusChange = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('clients').update({ status: newStatus }).eq('id', editingClient.id);
      if (error) throw error;
      setEditingClient(null);
      fetchData();
    } catch (error) {
      alert('Error actualizando estado: ' + error.message);
    }
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setNewStatus(client.status);
  };

  // Formato legible para las rutas en el selector
  const formatRouteLabel = (route) => {
    const date = new Date(route.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    const location = [route.municipio, route.barrio].filter(Boolean).join(', ');
    return `${date} — ${route.sector_name}${location ? ` (${location})` : ''} · ${route.sector_rating}/10`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Clientes</h2>
          <p className="text-muted">Registro y gestión de clientes vinculados a tus rutas.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* Aviso si no hay rutas */}
      {routes.length === 0 && !loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '1rem 1.5rem', marginBottom: '1.5rem',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-lg)', color: '#92400e'
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0, color: '#f59e0b' }} />
          <span>
            Debes <strong>registrar una ruta del día</strong> antes de agregar clientes.{' '}
            <button
              onClick={() => navigate('/rutas')}
              style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', padding: 0 }}
            >
              Ir a Rutas →
            </button>
          </span>
        </div>
      )}

      {/* Tabla de clientes */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Listado de Clientes</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Plan</th>
                <th>Ruta Asociada</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="client-name">{c.first_name} {c.last_name}</div>
                    <div className="client-doc">Doc: {c.document_id} | Cel: {c.phone}</div>
                  </td>
                  <td>{c.plan_name}</td>
                  <td>
                    {c.route ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                          <MapPin size={13} style={{ color: 'var(--primary)' }} />
                          {c.route.sector_name}
                        </div>
                        <div className="client-doc">
                          {new Date(c.route.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' · '}
                          <span style={{ fontWeight: 600, color: c.route.sector_rating >= 7 ? 'var(--status-success-text)' : c.route.sector_rating >= 5 ? '#3b82f6' : '#f59e0b' }}>
                            {c.route.sector_rating}/10
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Sin ruta</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(c)}>
                      Actualizar Estado
                    </button>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && !loading && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No hay clientes registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Actualizar Estado */}
      {editingClient && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Actualizar Estado</h3>
              <button onClick={() => setEditingClient(null)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                Cliente: <strong style={{ color: 'var(--primary)' }}>{editingClient.first_name} {editingClient.last_name}</strong>
              </p>
              <form onSubmit={handleStatusChange}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Nuevo Estado</label>
                  <select className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="Registrado">Registrado</option>
                    <option value="Contactado">Contactado</option>
                    <option value="Programado">Instalación Programada</option>
                    <option value="Activo">Activo (Instalado)</option>
                    <option value="Cancelado">Cancelado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingClient(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Save size={18} /> Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Cliente */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Registrar Nuevo Cliente</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Ruta — va primero para que el supervisor la seleccione antes */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={15} /> Ruta del Día <span style={{ color: 'var(--status-danger-text)' }}>*</span>
                  </label>
                  {routes.length === 0 ? (
                    <div style={{
                      padding: '0.875rem', borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '0.875rem', color: '#92400e'
                    }}>
                      No tienes rutas registradas hoy.{' '}
                      <button
                        type="button"
                        onClick={() => { setShowModal(false); navigate('/rutas'); }}
                        style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', padding: 0 }}
                      >
                        Registrar ruta →
                      </button>
                    </div>
                  ) : (
                    <select name="route_id" className="form-select" required value={formData.route_id} onChange={handleChange}>
                      <option value="">— Selecciona la ruta del día —</option>
                      {routes.map(route => (
                        <option key={route.id} value={route.id}>
                          {formatRouteLabel(route)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Nombres</label>
                  <input type="text" name="first_name" className="form-input" required value={formData.first_name} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellidos</label>
                  <input type="text" name="last_name" className="form-input" required value={formData.last_name} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Doc. Identidad</label>
                  <input type="text" name="document_id" className="form-input" required value={formData.document_id} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input type="text" name="phone" className="form-input" required value={formData.phone} onChange={handleChange} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Dirección Completa</label>
                  <input type="text" name="address" className="form-input" required value={formData.address} onChange={handleChange} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Plan de Internet</label>
                  <select name="plan_name" className="form-select" value={formData.plan_name} onChange={handleChange}>
                    <option value="Fibra 50MB">Fibra 50MB</option>
                    <option value="Fibra 100MB">Fibra 100MB</option>
                    <option value="Fibra 300MB">Fibra 300MB</option>
                    <option value="Fibra 500MB">Fibra 500MB</option>
                    <option value="Inalámbrico 20MB">Inalámbrico 20MB</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                  <label className="form-label">Notas Adicionales</label>
                  <textarea name="notes" className="form-textarea" rows="2" value={formData.notes} onChange={handleChange}></textarea>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={routes.length === 0}>
                    <Save size={18} /> Guardar Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
