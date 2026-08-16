import { useState, useEffect } from 'react';
import { supabase, getCurrentAuthUser } from '../services/supabase';
import { Users, Info } from 'lucide-react';

export default function SupervisorAsesores() {
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supervisorProfile, setSupervisorProfile] = useState(null);

  const fetchAdvisors = async () => {
    setLoading(true);
    try {
      const user = await getCurrentAuthUser({ allowDemo: false });
      if (!user?.id) {
        console.warn('⚠️ No user authenticated');
        setAdvisors([]);
        setSupervisorProfile(null);
        return;
      }

      console.log('📌 Supervisor ID:', user.id);

      // Get supervisor profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
        throw profileError;
      }
      setSupervisorProfile(profileData);
      console.log('📌 Supervisor Profile:', profileData?.full_name);

      // Get all supervisor_advisors assignments for this supervisor
      const { data: assignments, error: assignmentError } = await supabase
        .from('supervisor_advisors')
        .select('advisor_id')
        .eq('supervisor_id', user.id);

      if (assignmentError) {
        console.error('❌ Error fetching assignments:', assignmentError);
        throw assignmentError;
      }

      console.log('📌 Assignments found:', assignments?.length || 0);

      if (!assignments || assignments.length === 0) {
        console.warn('⚠️ No advisors assigned to this supervisor');
        setAdvisors([]);
        return;
      }

      // Fetch full advisor details for each assignment
      const advisorIds = assignments.map(a => a.advisor_id);
      const { data: advisorsData, error: advisorsError } = await supabase
        .from('advisors')
        .select('*')
        .in('id', advisorIds);

      if (advisorsError) {
        console.error('❌ Error fetching advisors:', advisorsError);
        throw advisorsError;
      }

      // Sort client-side by code
      const sorted = (advisorsData || []).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
      console.log('📌 Advisors found:', sorted.length);
      setAdvisors(sorted);
    } catch (error) {
      console.error('❌ Error fetching advisors:', error.message);
      console.error('Error details:', error);
      setAdvisors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisors();
  }, []);


  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Mis Asesores</h2>
          <p className="text-muted">Visualiza los asesores asignados a tu supervisión. Para agregar o modificar asesores, contacta al administrador.</p>
        </div>
      </div>

      {/* Info alert */}
      <div style={{
        padding: '1rem',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '6px',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <Info size={20} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '0.2rem' }} />
        <div>
          <p style={{ margin: 0, color: '#1e40af', fontWeight: 500, fontSize: '0.95rem' }}>
            Nota: Los asesores son gestionados de forma centralizada por el administrador. Estos asesores aparecerán automáticamente en tus formularios de cliente.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Directorio de Asesores Asignados</h3>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Cargando asesores...
          </div>
        ) : advisors.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No tienes asesores asignados. El administrador te asignará asesores cuando sea necesario.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre Completo</th>
                  <th>Cédula</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Ciudad</th>
                </tr>
              </thead>
              <tbody>
                {advisors.map(advisor => (
                  <tr key={advisor.id}>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}>
                        {advisor.code}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {advisor.first_name} {advisor.second_name} {advisor.first_surname} {advisor.second_surname}
                    </td>
                    <td>{advisor.document_id || '—'}</td>
                    <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{advisor.email || '—'}</td>
                    <td>{advisor.phone || '—'}</td>
                    <td>{advisor.city || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Card showing supervisor info for self-assignment */}
      {supervisorProfile && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header" style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Tu Perfil (Disponible como Asesor)</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            También puedes asignarte a ti mismo como asesor encargado en los formularios de cliente.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="info-box">
              <strong>Nombre</strong>
              <span>{supervisorProfile.full_name}</span>
            </div>
            <div className="info-box">
              <strong>Email</strong>
              <span>{supervisorProfile.email || '—'}</span>
            </div>
            <div className="info-box">
              <strong>Teléfono</strong>
              <span>{supervisorProfile.phone || '—'}</span>
            </div>
            <div className="info-box">
              <strong>Ciudad</strong>
              <span>{supervisorProfile.address || '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
