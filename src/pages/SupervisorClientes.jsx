import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Users, X, Save, Plus } from 'lucide-react';

export default function SupervisorClientes() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', document_id: '', phone: '', address: '', plan_name: 'Fibra 50MB', notes: '', route_name: '', route_rating: '5'
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`*, profiles:asesor_id(full_name)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('clients').insert([{ ...formData, asesor_id: user.id }]);
      if (error) throw error;
      setFormData({ first_name: '', last_name: '', document_id: '', phone: '', address: '', plan_name: 'Fibra 50MB', notes: '', route_name: '', route_rating: '5' });
      setShowModal(false);
      fetchClients();
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
      fetchClients();
    } catch (error) {
      alert('Error actualizando estado: ' + error.message);
    }
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setNewStatus(client.status);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Clientes</h2>
          <p className="text-muted">Registro y gestión de clientes del equipo.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Listado de Clientes</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Supervisor</th>
                <th>Cliente</th>
                <th>Ruta / Plan</th>
                <th>Estado Actual</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.profiles?.full_name}</td>
                  <td>
                    <div className="client-name">{c.first_name} {c.last_name}</div>
                    <div className="client-doc">Cel: {c.phone} | Dir: {c.address}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{c.plan_name}</div>
                    {c.route_name && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Ruta: {c.route_name} (Cal: {c.route_rating}⭐)
                      </div>
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
                <div className="form-group">
                  <label className="form-label">Plan de Internet</label>
                  <select name="plan_name" className="form-select" value={formData.plan_name} onChange={handleChange}>
                    <option value="Fibra 50MB">Fibra 50MB</option>
                    <option value="Fibra 100MB">Fibra 100MB</option>
                    <option value="Fibra 300MB">Fibra 300MB</option>
                    <option value="Fibra 500MB">Fibra 500MB</option>
                    <option value="Inalámbrico 20MB">Inalámbrico 20MB</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ruta de Venta</label>
                  <input type="text" name="route_name" className="form-input" placeholder="Ej: Zona Norte..." required value={formData.route_name} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Calificación de la Ruta (1-5)</label>
                  <select name="route_rating" className="form-select" value={formData.route_rating} onChange={handleChange}>
                    <option value="5">⭐⭐⭐⭐⭐ Excelente</option>
                    <option value="4">⭐⭐⭐⭐ Buena</option>
                    <option value="3">⭐⭐⭐ Regular</option>
                    <option value="2">⭐⭐ Mala</option>
                    <option value="1">⭐ Muy Mala</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                  <label className="form-label">Notas Adicionales</label>
                  <textarea name="notes" className="form-textarea" rows="2" value={formData.notes} onChange={handleChange}></textarea>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Save size={18} /> Guardar Cliente</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
