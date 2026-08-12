import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Users, X, Save, Plus, AlertTriangle, ShieldCheck, Trash2, Cpu, CreditCard, MapPin, User, Phone, Mail, FileText } from 'lucide-react';

export default function SupervisorClientes() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [advisorsList, setAdvisorsList] = useState([]);

  // Modal Nuevo Cliente
  const [showModal, setShowModal] = useState(false);
  const emptyForm = {
    document_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    reference_phone: '',
    address: '',
    housing_reference: '',
    bank_account_number: '',
    bank_account_type: 'Ahorros',
    bank_name: '',
    plan_family: 'Fibra Óptica',
    bandwidth: '100 Mbps',
    promotion: 'Ninguna',
    plan_price_no_iva: '',
    advisor_id: '',
    notes: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  // Modal Estado / Borrado Lógico
  const [editingClient, setEditingClient] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [deletionReason, setDeletionReason] = useState('Eliminado por mala digitación');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  // Modal CA, BA, NPC
  const [techClient, setTechClient] = useState(null);
  const [techData, setTechData] = useState({ ca: '', ba: '', npc: '' });

  // Modal Confirmar Eliminar CA, BA, NPC
  const [techClientToDelete, setTechClientToDelete] = useState(null);

  // Modal Ver Cliente Completo
  const [viewClient, setViewClient] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      const { data: advisorsData } = await supabase
        .from('advisors')
        .select('*')
        .eq('supervisor_id', user.id);
      setAdvisorsList(advisorsData || []);
    } catch (error) {
      console.error('Error fetching clients:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Guardar nuevo cliente
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const planNameFull = `${formData.plan_family} - ${formData.bandwidth}`;

      const { error } = await supabase.from('clients').insert([{
        ...formData,
        plan_name: planNameFull,
        plan_price_no_iva: formData.plan_price_no_iva ? parseFloat(formData.plan_price_no_iva) : 0,
        status: 'Registrado',
        asesor_id: user.id, // Legacy compatibility
        supervisor_id: user.id,
        advisor_id: formData.advisor_id || null
      }]);

      if (error) throw error;
      setFormData(emptyForm);
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert('Error guardando cliente: ' + error.message);
    }
  };

  // Actualizar estado general
  const handleStatusChange = async (e) => {
    e.preventDefault();
    if (newStatus === 'Eliminado') {
      // Iniciar proceso de borrado lógico
      setClientToDelete(editingClient);
      setDeletionReason('Eliminado por mala digitación');
      setShowDeleteConfirmModal(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: newStatus })
        .eq('id', editingClient.id);

      if (error) throw error;
      setEditingClient(null);
      fetchData();
    } catch (error) {
      alert('Error actualizando estado: ' + error.message);
    }
  };

  // Confirmar Borrado Lógico de Cliente
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
      fetchData();
    } catch (error) {
      alert('Error al realizar borrado lógico: ' + error.message);
    }
  };

  // Guardar datos técnicos (CA, BA, NPC)
  const handleSaveTechData = async (e) => {
    e.preventDefault();
    if (!techData.ca || !techData.ba || !techData.npc) {
      alert('Por favor completa todos los campos técnicos (CA, BA, NPC).');
      return;
    }
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          ca: techData.ca.trim(),
          ba: techData.ba.trim(),
          npc: techData.npc.trim()
        })
        .eq('id', techClient.id);

      if (error) throw error;
      setTechClient(null);
      setTechData({ ca: '', ba: '', npc: '' });
      fetchData();
    } catch (error) {
      alert('Error guardando datos técnicos: ' + error.message);
    }
  };

  // Eliminar datos técnicos (CA, BA, NPC) para permitir su reingreso
  const confirmDeleteTechData = async () => {
    if (!techClientToDelete) return;
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          ca: null,
          ba: null,
          npc: null
        })
        .eq('id', techClientToDelete.id);

      if (error) throw error;
      setTechClientToDelete(null);
      fetchData();
    } catch (error) {
      alert('Error eliminando datos técnicos: ' + error.message);
    }
  };

  const activeClients = clients.filter(c => c.status !== 'Eliminado');
  const totalActivos = activeClients.filter(c => c.status === 'Activo').length;
  const totalPendientes = activeClients.filter(c => ['Registrado', 'Contactado', 'Programado'].includes(c.status)).length;
  const totalEliminados = clients.filter(c => c.status === 'Eliminado').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Gestión de Clientes</h2>
          <p className="text-muted">Registro completo de clientes, datos bancarios, planes y datos técnicos (CA, BA, NPC).</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><Users size={24} /></div>
          <div className="kpi-value">{activeClients.length}</div>
          <div className="kpi-label">Clientes Activos / En Proceso</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><ShieldCheck size={24} /></div>
          <div className="kpi-value">{totalActivos}</div>
          <div className="kpi-label">Instalados Activos</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon yellow"><Users size={24} /></div>
          <div className="kpi-value">{totalPendientes}</div>
          <div className="kpi-label">Pendientes / Programados</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon red"><Trash2 size={24} /></div>
          <div className="kpi-value">{totalEliminados}</div>
          <div className="kpi-label">Borrado Lógico (Eliminados)</div>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Listado de Clientes</h3>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente y Documento</th>
                <th>Contacto y Ubicación</th>
                <th>Plan y Banco</th>
                <th>Datos Técnicos (CA, BA, NPC)</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => {
                const hasTechData = Boolean(c.ca && c.ba && c.npc);
                const isEliminado = c.status === 'Eliminado';

                return (
                  <tr key={c.id} style={{ opacity: isEliminado ? 0.7 : 1, backgroundColor: isEliminado ? 'rgba(239, 68, 68, 0.03)' : 'transparent', cursor: 'pointer' }} onClick={() => setViewClient(c)}>
                    <td>
                      <div className="client-name">{c.first_name} {c.last_name}</div>
                      <div className="client-doc">Cédula: <strong>{c.document_id}</strong></div>
                      {c.email && <div className="client-doc"><Mail size={11} style={{ display: 'inline', marginRight: 3 }} />{c.email}</div>}
                    </td>
                    <td>
                      <div><strong>Tel:</strong> {c.phone}</div>
                      {c.reference_phone && <div className="client-doc">Ref: {c.reference_phone}</div>}
                      <div className="client-doc" style={{ marginTop: '0.2rem' }}>
                        <MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />
                        {c.address}
                      </div>
                      {c.housing_reference && <div className="client-doc" style={{ fontStyle: 'italic' }}>Ref: {c.housing_reference}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{c.plan_name || `${c.plan_family || ''} ${c.bandwidth || ''}`}</div>
                      {c.plan_price_no_iva !== null && c.plan_price_no_iva !== undefined && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Sin IVA: <strong>${Number(c.plan_price_no_iva).toLocaleString('es-CO')}</strong>
                        </div>
                      )}
                      {c.promotion && c.promotion !== 'Ninguna' && (
                        <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                          Promo: {c.promotion}
                        </span>
                      )}
                      {c.bank_name && (
                        <div className="client-doc" style={{ marginTop: '0.25rem' }}>
                          <CreditCard size={11} style={{ display: 'inline', marginRight: 3 }} />
                          {c.bank_name} ({c.bank_account_type}): {c.bank_account_number}
                        </div>
                      )}
                    </td>
                    <td>
                      {hasTechData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div style={{
                            padding: '0.35rem 0.6rem',
                            backgroundColor: 'rgba(79, 70, 229, 0.08)',
                            border: '1px solid rgba(79, 70, 229, 0.2)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 600,
                            color: 'var(--primary)'
                          }}>
                            <Cpu size={14} />
                            <span>CA: {c.ca} | BA: {c.ba} | NPC: {c.npc}</span>
                            <span style={{ fontSize: '0.65rem', background: '#e0e7ff', padding: '0.1rem 0.3rem', borderRadius: '4px', marginLeft: 'auto' }}>
                              🔒 Bloqueado
                            </span>
                          </div>
                          <div>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: 'var(--status-danger-text)', background: 'var(--status-danger-bg)', border: 'none' }}
                              onClick={() => setTechClientToDelete(c)}
                            >
                              <Trash2 size={12} /> Eliminar CA, BA, NPC
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {!isEliminado ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => {
                                setTechClient(c);
                                setTechData({ ca: '', ba: '', npc: '' });
                              }}
                            >
                              <Plus size={14} /> Agregar CA, BA, NPC
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin datos técnicos</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                      {isEliminado && c.deletion_reason && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--status-danger-text)', marginTop: '0.3rem', fontWeight: 500 }}>
                          Motivo: {c.deletion_reason}
                        </div>
                      )}
                    </td>
                    <td>
                      {!isEliminado ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-sm btn-secondary" onClick={() => { setEditingClient(c); setNewStatus(c.status); }}>
                            Estado
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger-text)', border: 'none' }}
                            onClick={() => {
                              setClientToDelete(c);
                              setDeletionReason('Eliminado por mala digitación');
                              setShowDeleteConfirmModal(true);
                            }}
                          >
                            <Trash2 size={13} /> Eliminar
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin acciones</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {clients.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No hay clientes registrados aún. ¡Registra tu primer cliente!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Cliente (Plantilla Completa) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Registrar Nuevo Cliente</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>Formulario oficial de inscripción</p>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                {/* Asesor Informativo */}
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--primary-light)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.875rem',
                  color: 'var(--primary)'
                }}>
                  <User size={16} />
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong>Asesor (Vendedor) *</strong>
                    <select 
                      name="advisor_id" 
                      className="form-select" 
                      style={{ padding: '0.25rem 0.5rem', minWidth: '200px', backgroundColor: 'white' }}
                      required
                      value={formData.advisor_id} 
                      onChange={handleChange}
                    >
                      <option value="">Selecciona un asesor...</option>
                      {advisorsList.map(a => (
                        <option key={a.id} value={a.id}>{a.code} - {a.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Seccion 1: Datos Personales */}
                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <User size={15} /> 1. Datos Personales y de Contacto
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Número de Cédula *</label>
                    <input type="text" name="document_id" className="form-input" required pattern="^[0-9]+$" title="Solo números" placeholder="Ej: 1098765432" value={formData.document_id} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Correo Electrónico *</label>
                    <input type="email" name="email" className="form-input" required placeholder="ejemplo@correo.com" value={formData.email} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nombres *</label>
                    <input type="text" name="first_name" className="form-input" required pattern="^[A-Za-zÀ-ÿ\s]+$" title="Solo letras y espacios" placeholder="Nombres del cliente" value={formData.first_name} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Apellidos *</label>
                    <input type="text" name="last_name" className="form-input" required pattern="^[A-Za-zÀ-ÿ\s]+$" title="Solo letras y espacios" placeholder="Apellidos del cliente" value={formData.last_name} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Número Telefónico del Cliente *</label>
                    <input type="text" name="phone" className="form-input" required pattern="^[0-9]+$" title="Solo números" placeholder="Teléfono principal" value={formData.phone} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Número Telefónico de Referencia *</label>
                    <input type="text" name="reference_phone" className="form-input" required pattern="^[0-9]+$" title="Solo números" placeholder="Teléfono de familiar/referencia" value={formData.reference_phone} onChange={handleChange} />
                  </div>
                </div>

                {/* Seccion 2: Ubicacion */}
                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={15} /> 2. Ubicación de la Vivienda
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                    <label className="form-label">Nombre de Calle Principal y Secundaria *</label>
                    <input type="text" name="address" className="form-input" required placeholder="Ej: Calle 45 con Carrera 12, Esquina #45-12" value={formData.address} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                    <label className="form-label">Referencia de Vivienda *</label>
                    <input type="text" name="housing_reference" className="form-input" required placeholder="Ej: Casa blanca de dos pisos frente al parque" value={formData.housing_reference} onChange={handleChange} />
                  </div>
                </div>

                {/* Seccion 3: Cuenta Bancaria */}
                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CreditCard size={15} /> 3. Cuenta Bancaria
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Número de Cuenta *</label>
                    <input type="text" name="bank_account_number" className="form-input" required pattern="^[0-9]+$" title="Solo números" placeholder="N° de cuenta bancaria" value={formData.bank_account_number} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tipo de Cuenta *</label>
                    <select name="bank_account_type" className="form-select" required value={formData.bank_account_type} onChange={handleChange}>
                      <option value="Ahorros">Ahorros</option>
                      <option value="Corriente">Corriente</option>
                      <option value="Básica">Básica</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Banco *</label>
                    <select name="bank_name" className="form-select" required value={formData.bank_name} onChange={handleChange}>
                      <option value="">Seleccione el Banco...</option>
                      <option value="Pichincha">Banco Pichincha</option>
                      <option value="Guayaquil">Banco de Guayaquil</option>
                      <option value="Pacífico">Banco del Pacífico</option>
                      <option value="Produbanco">Produbanco</option>
                      <option value="Bolivariano">Banco Bolivariano</option>
                      <option value="Internacional">Banco Internacional</option>
                      <option value="Machala">Banco de Machala</option>
                      <option value="Austro">Banco del Austro</option>
                      <option value="Cooperativa JEP">Cooperativa JEP</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                {/* Seccion 4: Plan a Contratar */}
                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={15} /> 4. Plan a Contratar
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Familia de Plan *</label>
                    <input list="plan-families" name="plan_family" className="form-input" required placeholder="Ej: Fibra Óptica, Especial..." value={formData.plan_family} onChange={handleChange} />
                    <datalist id="plan-families">
                      <option value="Fibra Óptica" />
                      <option value="Inalámbrico" />
                      <option value="Empresarial / Pyme" />
                    </datalist>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Ancho de Banda *</label>
                    <input list="bandwidths" name="bandwidth" className="form-input" required placeholder="Ej: 100 Mbps, 2 Gbps..." value={formData.bandwidth} onChange={handleChange} />
                    <datalist id="bandwidths">
                      <option value="50 Mbps" />
                      <option value="100 Mbps" />
                      <option value="200 Mbps" />
                      <option value="300 Mbps" />
                      <option value="500 Mbps" />
                      <option value="1 Gbps" />
                    </datalist>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Promoción *</label>
                    <input type="text" name="promotion" className="form-input" required placeholder="Ej: Ninguna, 50% DCTO 1er mes" value={formData.promotion} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Valor del Plan sin IVA ($) *</label>
                    <input type="number" step="0.01" name="plan_price_no_iva" className="form-input" required placeholder="Ej: 45000" value={formData.plan_price_no_iva} onChange={handleChange} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Notas Adicionales *</label>
                  <textarea name="notes" className="form-textarea" required rows="2" placeholder="Observaciones o notas del contrato" value={formData.notes} onChange={handleChange}></textarea>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Save size={18} /> Guardar Cliente</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Actualizar Estado */}
      {editingClient && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
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
                    <option value="Eliminado">❌ Eliminar (Borrado Lógico)</option>
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

      {/* Modal Confirmación Borrado Lógico de Cliente */}
      {showDeleteConfirmModal && clientToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
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
                El cliente <strong>{clientToDelete.first_name} {clientToDelete.last_name}</strong> (Cédula: {clientToDelete.document_id}) será cambiado al estado de borrado lógico (<strong>Eliminado</strong>).
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                  Por defecto se asignará: <em>Eliminado por mala digitación</em>.
                </span>
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

      {/* Modal Agregar CA, BA, NPC */}
      {techClient && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Datos Técnicos (CA, BA, NPC)</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                  Cliente: {techClient.first_name} {techClient.last_name}
                </p>
              </div>
              <button onClick={() => setTechClient(null)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveTechData}>
                <div className="form-group">
                  <label className="form-label">CA (Caja de Amplificación / Nap) *</label>
                  <input
                    type="text" className="form-input" required
                    placeholder="Ej: NAP-05" value={techData.ca}
                    onChange={(e) => setTechData({ ...techData, ca: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">BA (Bandeja / Banderola) *</label>
                  <input
                    type="text" className="form-input" required
                    placeholder="Ej: B-02" value={techData.ba}
                    onChange={(e) => setTechData({ ...techData, ba: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">NPC (Número de Puerto / Caja) *</label>
                  <input
                    type="text" className="form-input" required
                    placeholder="Ej: P-12" value={techData.npc}
                    onChange={(e) => setTechData({ ...techData, npc: e.target.value })}
                  />
                </div>

                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--primary-light)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                  fontSize: '0.78rem',
                  color: 'var(--primary)'
                }}>
                  🔒 Una vez guardados estos datos técnicos quedarán bloqueados (no se podrán modificar a menos que se presione eliminar).
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setTechClient(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Save size={18} /> Guardar Datos Técnicos</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminar CA, BA, NPC */}
      {techClientToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: 'var(--status-danger-text)' }}>¿Eliminar datos técnicos?</h3>
              <button onClick={() => setTechClientToDelete(null)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                ¿Está seguro de eliminar los datos técnicos (CA, BA, NPC) asignados a <strong>{techClientToDelete.first_name} {techClientToDelete.last_name}</strong>?
                <br /><br />
                Al eliminarlos, los campos se desbloquearán y se podrán registrar nuevamente.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setTechClientToDelete(null)}>Cancelar</button>
                <button type="button" className="btn" style={{ backgroundColor: 'var(--status-danger-text)', color: 'white' }} onClick={confirmDeleteTechData}>
                  <Trash2 size={16} /> Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Cliente Completo */}
      {viewClient && (
        <div className="modal-overlay" onClick={() => setViewClient(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Detalles del Cliente</h3>
                <span className={`badge badge-${viewClient.status.toLowerCase()}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>{viewClient.status}</span>
              </div>
              <button onClick={() => setViewClient(null)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><User size={14} /> Información Personal</h4>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>Nombre:</strong> {viewClient.first_name} {viewClient.last_name}</p>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>Cédula:</strong> {viewClient.document_id}</p>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>Email:</strong> {viewClient.email}</p>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>Teléfono:</strong> {viewClient.phone}</p>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>Tel Ref:</strong> {viewClient.reference_phone}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} /> Ubicación</h4>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>Dirección:</strong> {viewClient.address}</p>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>Referencia:</strong> {viewClient.housing_reference}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CreditCard size={14} /> Banco y Plan</h4>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>Banco:</strong> {viewClient.bank_name}</p>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>Cuenta ({viewClient.bank_account_type}):</strong> {viewClient.bank_account_number}</p>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>Plan:</strong> {viewClient.plan_family} - {viewClient.bandwidth}</p>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>Promoción:</strong> {viewClient.promotion}</p>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>Precio (Sin IVA):</strong> ${Number(viewClient.plan_price_no_iva).toLocaleString('es-CO')}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Cpu size={14} /> Datos Técnicos</h4>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>CA:</strong> {viewClient.ca || 'N/A'}</p>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>BA:</strong> {viewClient.ba || 'N/A'}</p>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}><strong>NPC:</strong> {viewClient.npc || 'N/A'}</p>
                </div>
              </div>
              {viewClient.notes && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <strong>Notas Adicionales:</strong>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{viewClient.notes}</p>
                </div>
              )}
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setViewClient(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
