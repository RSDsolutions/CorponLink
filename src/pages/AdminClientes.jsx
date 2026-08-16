import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Download, Search, Globe, Users, CheckCircle, MapPin, Trash2, Cpu, CreditCard, AlertTriangle, X, Save } from 'lucide-react';
import * as XLSX from 'xlsx';

const PAYMENT_METHODS = {
  CREDIT_CARD: 'Tarjeta de Crédito',
  WINDOW_PAYMENT: 'Pago en ventanilla'
};

const isWindowPayment = (client) =>
  client.bank_name === PAYMENT_METHODS.WINDOW_PAYMENT ||
  client.bank_account_type === PAYMENT_METHODS.WINDOW_PAYMENT ||
  client.bank_account_number === PAYMENT_METHODS.WINDOW_PAYMENT;

const isCreditCardPayment = (client) => client.bank_account_number === PAYMENT_METHODS.CREDIT_CARD;

const getPaymentSummary = (client) => {
  if (isWindowPayment(client)) return PAYMENT_METHODS.WINDOW_PAYMENT;
  if (isCreditCardPayment(client)) {
    return [PAYMENT_METHODS.CREDIT_CARD, client.bank_account_type, client.bank_name].filter(Boolean).join(' - ');
  }
  if (!client.bank_name && !client.bank_account_type && !client.bank_account_number) return '';

  return `${client.bank_name || ''}${client.bank_account_type || client.bank_account_number ? ` (${client.bank_account_type || ''}): ${client.bank_account_number || ''}` : ''}`;
};

export default function AdminClientes() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [supervisorFilter, setSupervisorFilter] = useState('');
  const [supervisors, setSupervisors] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal Estado / Soft Delete
  const [editingClient, setEditingClient] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [activationDate, setActivationDate] = useState('');
  const [deletionReason, setDeletionReason] = useState('Eliminado por mala digitación');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  // Status messages
  const STATUS_MESSAGES = {
    'Ingresado': 'Cliente nuevo en el sistema, requiere contacto inicial.',
    'Activo': 'Servicio instalado y activado. El cliente será bloqueado para cambios.',
    'Cancelado': 'Cliente rechazó el servicio. Razones: No se pudo contactar o cliente no desea continuar.',
    'Rechazado': 'Cliente rechazó Términos y Condiciones en el link de firma.'
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          profiles:asesor_id(full_name),
          advisors:advisor_id(code, full_name, province),
          route:route_id(id, sector_name, fecha, sector_rating, municipio, barrio)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClients(data || []);
      // fetch supervisors for filter
      try {
        const { data: sups } = await supabase.from('profiles').select('id, full_name').eq('role', 'supervisor');
        setSupervisors(sups || []);
      } catch (e) {
        setSupervisors([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const filteredClients = clients.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (c.first_name || '').toLowerCase().includes(searchLower) ||
      (c.last_name || '').toLowerCase().includes(searchLower) ||
      (c.document_id || '').includes(searchTerm) ||
      (c.phone || '').includes(searchTerm) ||
      (c.email || '').toLowerCase().includes(searchLower);

    let matchesStatus = true;
    if (statusFilter !== '') {
      matchesStatus = c.status === statusFilter;
    } else {
      // Por defecto no ocultamos, pero el filtro permite elegir
      matchesStatus = true;
    }
    
    // Date range filter: if dateFrom/dateTo provided, filter by created_at between
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const clientDate = new Date(c.created_at);
      if (dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00');
        if (clientDate < from) matchesDate = false;
      }
      if (dateTo) {
        const to = new Date(dateTo + 'T23:59:59');
        if (clientDate > to) matchesDate = false;
      }
    }

    // Supervisor filter
    let matchesSupervisor = true;
    if (supervisorFilter) {
      matchesSupervisor = c.supervisor_id === supervisorFilter;
    }
    
    return matchesSearch && matchesStatus && matchesDate && matchesSupervisor;
  });

  const activeClients = filteredClients.filter(c => c.status !== 'Eliminado');
  const total = activeClients.length;
  const activos = activeClients.filter(c => c.status === 'Activo').length;
  const pendientes = activeClients.filter(c => ['Ingresado'].includes(c.status)).length;
  const eliminados = filteredClients.filter(c => c.status === 'Eliminado').length;

  const handleStatusChange = async (e) => {
    e.preventDefault();
    if (!editingClient || !newStatus) return;

    // When setting to Activo, require an activation date
    if (newStatus === 'Activo' && !activationDate) {
      alert('Por favor selecciona una fecha de activación.');
      return;
    }

    try {
      const updateData = {
        status: newStatus,
        status_blocked: newStatus === 'Activo' ? true : false
      };

      // Set activation_date only for Activo status
      if (newStatus === 'Activo') {
        updateData.activation_date = activationDate;
      } else {
        updateData.activation_date = null;
      }

      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', editingClient.id);

      if (error) throw error;
      setEditingClient(null);
      setNewStatus('');
      setActivationDate('');
      fetchClients();
      alert(`Estado actualizado a "${newStatus}" correctamente.`);
    } catch (error) {
      alert('Error actualizando estado: ' + error.message);
    }
  };

  const confirmSoftDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          status: 'Eliminado',
          deletion_reason: deletionReason || 'Eliminado por mala digitación'
        })
        .eq('id', clientToDelete.id);

      if (error) throw error;
      setShowDeleteConfirmModal(false);
      setClientToDelete(null);
      setEditingClient(null);
      fetchClients();
    } catch (error) {
      alert('Error al eliminar cliente: ' + error.message);
    }
  };

  const exportToExcel = () => {
    if (filteredClients.length === 0) return;
    const exportData = filteredClients.map(c => ({
      'Fecha de Registro': new Date(c.created_at).toLocaleDateString(),
      'Asesor': c.profiles?.full_name || 'N/A',
      'Cédula': c.document_id,
      'Nombres': c.first_name,
      'Apellidos': c.last_name,
      'Correo Electrónico': c.email || '',
      'Teléfono Cliente': c.phone,
      'Teléfono Referencia': c.reference_phone || '',
      'Calle Principal y Secundaria': c.address,
      'Referencia Vivienda': c.housing_reference || '',
      'Banco': c.bank_name || '',
      'Tipo de Cuenta': c.bank_account_type || '',
      'Número de Cuenta': c.bank_account_number || '',
      'Familia Plan': c.plan_family || '',
      'Plan': c.plan || c.plan_name || '',
      'Ancho de Banda': c.bandwidth || '',
      'Promoción': c.promotion || '',
      'Valor sin IVA ($)': c.plan_price_no_iva || '',
      'CA': c.ca || '',
      'BA': c.ba || '',
      'NPC': c.npc || '',
      'Estado Actual': c.status,
      'Fecha de Activación': c.activation_date ? new Date(c.activation_date).toLocaleDateString() : '',
      'Motivo Eliminación': c.deletion_reason || '',
      'Notas': c.notes || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
      { wch: 25 }, { wch: 16 }, { wch: 16 }, { wch: 35 }, { wch: 30 },
      { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 18 }, { wch: 30 }, { wch: 30 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes CorponNet');
    XLSX.writeFile(workbook, `Reporte_Clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Administración de Clientes</h2>
          <p className="text-muted">Vista global de clientes, datos financieros, técnicos y borrado lógico.</p>
        </div>
        <button className="btn btn-primary" onClick={exportToExcel} style={{ backgroundColor: 'var(--status-success-text)' }}>
          <Download size={18} /> Descargar Excel (.xlsx)
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><Globe size={24} /></div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-label">Total Clientes Activos</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><CheckCircle size={24} /></div>
          <div className="kpi-value">{activos}</div>
          <div className="kpi-label">Instalaciones Activas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon yellow"><Users size={24} /></div>
          <div className="kpi-value">{pendientes}</div>
          <div className="kpi-label">En Proceso / Por Instalar</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon red"><Trash2 size={24} /></div>
          <div className="kpi-value">{eliminados}</div>
          <div className="kpi-label">Eliminados (Borrado Lógico)</div>
        </div>
      </div>

      {/* Tabla con filtros */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', overflowX: 'auto' }}>
          <div style={{ position: 'relative', flex: 2, minWidth: '240px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text" className="form-input" placeholder="Buscar cliente, cédula, teléfono o correo..."
              style={{ paddingLeft: '2.5rem' }} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
            <div style={{ flex: '1 1 180px', minWidth: '180px', minWidth: 0 }}>
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="Ingresado">Ingresado</option>
                <option value="Activo">Activo</option>
                <option value="Cancelado">Cancelado</option>
                <option value="Rechazado">Rechazado</option>
                <option value="Eliminado">Eliminado (Borrado Lógico)</option>
              </select>
            </div>

            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <select className="form-select" value={supervisorFilter} onChange={(e) => setSupervisorFilter(e.target.value)}>
                <option value="">Todos los supervisores</option>
                {supervisors.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ minWidth: 0 }} />
              <span style={{ color: 'var(--text-muted)' }}>—</span>
              <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ minWidth: 0 }} />
              <button className="btn btn-secondary" onClick={() => { setDateFrom(''); setDateTo(''); }}>Limpiar</button>
            </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha / Asesor</th>
                <th>Datos del Cliente</th>
                <th>Contacto y Ubicación</th>
                <th>Plan y Valor (sin IVA)</th>
                <th>Datos Bancarios</th>
                <th>Datos Técnicos</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(c => {
                const isEliminado = c.status === 'Eliminado';

                return (
                  <tr key={c.id} style={{ opacity: isEliminado ? 0.7 : 1, backgroundColor: isEliminado ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                    <td>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--primary)', marginTop: '0.25rem' }}>
                        {c.advisors ? `${c.advisors.code} - ${c.advisors.full_name}` : c.profiles?.full_name || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div className="client-name">{c.first_name} {c.last_name}</div>
                      <div className="client-doc">Cédula: <strong>{c.document_id}</strong></div>
                      {c.email && <div className="client-doc">{c.email}</div>}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}><strong>Tel:</strong> {c.phone}</div>
                      {c.reference_phone && <div className="client-doc">Ref: {c.reference_phone}</div>}
                      <div className="client-doc" style={{ marginTop: '0.2rem' }}>
                        <MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />
                        {c.address}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.plan_name || `${c.plan_family || ''} ${c.bandwidth || ''}`}</div>
                      {c.plan_price_no_iva !== null && c.plan_price_no_iva !== undefined && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Sin IVA: <strong>${Number(c.plan_price_no_iva).toLocaleString('es-CO')}</strong>
                        </div>
                      )}
                      {c.promotion && c.promotion !== 'Ninguna' && (
                        <div className="client-doc" style={{ color: '#0369a1' }}>Promo: {c.promotion}</div>
                      )}
                    </td>
                    <td>
                      {c.bank_name ? (
                        <div style={{ fontSize: '0.8rem' }}>
                          <CreditCard size={12} style={{ display: 'inline', marginRight: 4 }} />
                          <strong>{c.bank_name}</strong>
                          <div className="client-doc">{c.bank_account_type}: {c.bank_account_number}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin datos bancarios</span>
                      )}
                    </td>
                    <td>
                      {c.ca && c.ba && c.npc ? (
                        <div style={{
                          padding: '0.3rem 0.5rem',
                          backgroundColor: 'rgba(79, 70, 229, 0.08)',
                          border: '1px solid rgba(79, 70, 229, 0.2)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.75rem',
                          color: 'var(--primary)',
                          fontWeight: 600
                        }}>
                          <Cpu size={12} style={{ display: 'inline', marginRight: 4 }} />
                          CA: {c.ca} | BA: {c.ba} | NPC: {c.npc}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin CA/BA/NPC</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                      {c.activation_date && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Activado: {new Date(c.activation_date).toLocaleDateString()}
                        </div>
                      )}
                      {isEliminado && c.deletion_reason && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--status-danger-text)', marginTop: '0.2rem' }}>
                          Motivo: {c.deletion_reason}
                        </div>
                      )}
                    </td>
                    <td>
                      {!isEliminado ? (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => { setEditingClient(c); setNewStatus(c.status); setActivationDate(c.activation_date || ''); }}
                          disabled={c.status_blocked}
                          style={{ opacity: c.status_blocked ? 0.5 : 1, cursor: c.status_blocked ? 'not-allowed' : 'pointer' }}
                          title={c.status_blocked ? 'Cliente bloqueado (Activo)' : 'Editar estado'}
                        >
                          Estado
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin acciones</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredClients.length === 0 && !loading && (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No se encontraron resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Actualizar Estado */}
      {editingClient && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Actualizar Estado del Cliente</h3>
              <button onClick={() => setEditingClient(null)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                Cliente: <strong style={{ color: 'var(--primary)' }}>{editingClient.first_name} {editingClient.last_name}</strong>
              </p>

              {/* Current status info */}
              {editingClient.status_blocked && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  color: '#ef4444',
                  fontWeight: 600
                }}>
                  ⛔ Este cliente está bloqueado (Activo). El estado no puede ser modificado.
                </div>
              )}

              {!editingClient.status_blocked && (
                <form onSubmit={handleStatusChange}>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Nuevo Estado *</label>
                    <select 
                      className="form-select" 
                      value={newStatus} 
                      onChange={(e) => {
                        setNewStatus(e.target.value);
                        setActivationDate('');
                      }}
                      required
                    >
                      <option value="">Selecciona un estado</option>
                      <option value="Ingresado">Ingresado</option>
                      <option value="Activo">Activo</option>
                      <option value="Cancelado">Cancelado</option>
                      <option value="Rechazado">Rechazado</option>
                    </select>
                  </div>

                  {/* Status message */}
                  {newStatus && (
                    <div style={{
                      padding: '0.875rem',
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: '6px',
                      marginBottom: '1.5rem',
                      fontSize: '0.85rem',
                      color: '#1e40af',
                      lineHeight: '1.5'
                    }}>
                      <strong>ℹ️ {newStatus}:</strong><br />
                      {STATUS_MESSAGES[newStatus]}
                    </div>
                  )}

                  {/* Activation date picker for Activo status */}
                  {newStatus === 'Activo' && (
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label className="form-label">Fecha de Activación del Servicio *</label>
                      <input
                        type="date"
                        className="form-input"
                        value={activationDate}
                        onChange={(e) => setActivationDate(e.target.value)}
                        required
                        max={new Date().toISOString().split('T')[0]}
                      />
                      <small style={{ color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                        Fecha cuando se instaló y activó el servicio (correo: "Oportunidad Ganada")
                      </small>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingClient(null)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary"><Save size={18} /> Guardar Estado</button>
                  </div>
                </form>
              )}

              {editingClient.status_blocked && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingClient(null)}>Cerrar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Borrado Lógico */}
      {showDeleteConfirmModal && clientToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-danger-text)' }}>
                <AlertTriangle size={22} />
                <h3 style={{ margin: 0, color: 'var(--status-danger-text)' }}>¿Está seguro de eliminar?</h3>
              </div>
              <button onClick={() => setShowDeleteConfirmModal(false)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                El cliente <strong>{clientToDelete.first_name} {clientToDelete.last_name}</strong> será marcado con borrado lógico (<strong>Eliminado</strong>).
              </p>
              
              <div style={{
                padding: '0.875rem',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.85rem'
              }}>
                <label className="form-label" style={{ color: 'var(--status-danger-text)', fontWeight: 600 }}>
                  Motivo de Eliminación:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Motivo de eliminación..."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirmModal(false)}>Cancelar</button>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: 'var(--status-danger-text)', color: 'white' }}
                  onClick={confirmSoftDeleteClient}
                >
                  <Trash2 size={16} /> Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
