import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search, CheckCircle, XCircle, Eye, Download } from 'lucide-react';
import { useToast } from '../../../lib/toast';

interface PurchaseItem {
  recipe: {
    title: string;
  };
  price_at_purchase: number;
}

interface Purchase {
  id: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  total_amount: number;
  payment_method: string;
  payment_receipt_url: string | null;
  created_at: string;
  user_id: string;
  user: {
    email: string;
    nombre_completo: string;
  };
  items: PurchaseItem[];
}

export default function AdminCobrosRecetas() {
  const toast = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal para ver recibo
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchases();
  }, []);

  async function fetchPurchases() {
    try {
      setLoading(true);

      const { data: purchasesData, error: purchasesError } = await supabase
        .from('academy_recipe_purchases')
        .select(`
          id,
          user_id,
          status,
          total_amount,
          payment_method,
          payment_receipt_url,
          created_at,
          items:academy_recipe_purchase_items(
            price_at_purchase,
            recipe:academy_recipes(title)
          )
        `)
        .order('created_at', { ascending: false });

      if (purchasesError) throw purchasesError;

      const userIds = [...new Set((purchasesData ?? []).map((purchase) => purchase.user_id).filter(Boolean))];
      const profilesMap = new Map<string, { email: string; nombre_completo: string }>();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, nombre_completo')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        (profilesData ?? []).forEach((profile) => {
          profilesMap.set(profile.id, {
            email: profile.email ?? '',
            nombre_completo: profile.nombre_completo ?? 'Sin Nombre',
          });
        });
      }

      const normalizedPurchases = (purchasesData ?? []).map((purchase) => ({
        ...purchase,
        user: profilesMap.get(purchase.user_id) ?? {
          email: 'Sin email',
          nombre_completo: 'Sin Nombre',
        },
      })) as Purchase[];

      setPurchases(normalizedPurchases);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Error al cargar los cobros');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(id: string, newStatus: 'approved' | 'rejected') {
    if (!confirm(`¿Estás seguro de ${newStatus === 'approved' ? 'aprobar' : 'rechazar'} este pago?`)) return;

    try {
      const { error } = await supabase
        .from('academy_recipe_purchases')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Pago ${newStatus === 'approved' ? 'aprobado' : 'rechazado'}`);
      fetchPurchases();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar el estado');
    }
  }

  async function getReceiptUrl(path: string) {
    try {
      const { data, error } = await supabase.storage
        .from('academy-receipts')
        .createSignedUrl(path, 60 * 60); // 1 hora de validez

      if (error) throw error;
      setSelectedReceipt(data.signedUrl);
    } catch (error) {
      console.error('Error getting receipt url:', error);
      toast.error('No se pudo cargar el recibo');
    }
  }

  const filteredPurchases = purchases.filter(p => 
    p.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.user?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cobros de Recetas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Verifica y aprueba los pagos para desbloquear las recetas a los usuarios.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por usuario o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A4E26] focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Recetas Compradas</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Comprobante</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Cargando cobros...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No hay solicitudes de cobro.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(purchase.created_at).toLocaleDateString()}
                      <br/>
                      <span className="text-xs text-gray-400">
                        {new Date(purchase.created_at).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{purchase.user?.nombre_completo || 'Sin Nombre'}</div>
                            <div className="text-sm text-gray-500">{purchase.user?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <ul className="list-disc list-inside text-xs text-gray-600">
                        {purchase.items?.map((item, idx) => (
                          <li key={idx} className="line-clamp-1">{item.recipe?.title}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      ${purchase.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {purchase.payment_receipt_url ? (
                        <button
                          onClick={() => getReceiptUrl(purchase.payment_receipt_url!)}
                          className="flex items-center gap-1 text-[#1A4E26] hover:text-[#163F1E] bg-[#1A4E26]/10 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-medium"
                        >
                          <Eye size={14} /> Ver Recibo
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No adjunto</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        purchase.status === 'approved' ? 'bg-green-100 text-green-800' :
                        purchase.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {purchase.status === 'approved' ? 'Aprobado' :
                         purchase.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {purchase.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(purchase.id, 'approved')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Aprobar Pago"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(purchase.id, 'rejected')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Rechazar Pago"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-4 rounded-xl max-w-3xl max-h-[90vh] flex flex-col items-center relative">
            <button 
              onClick={() => setSelectedReceipt(null)}
              className="absolute -top-4 -right-4 bg-white text-gray-900 rounded-full p-2 shadow-lg hover:bg-gray-100"
            >
              <XCircle size={24} />
            </button>
            <div className="overflow-auto flex-1 w-full flex justify-center bg-gray-50 rounded-lg">
              {selectedReceipt.toLowerCase().includes('.pdf') ? (
                <iframe src={selectedReceipt} className="w-full h-[70vh] rounded-lg" />
              ) : (
                <img src={selectedReceipt} alt="Comprobante" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
              )}
            </div>
            <div className="mt-4 flex gap-4 w-full">
               <a 
                 href={selectedReceipt} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="flex-1 flex justify-center items-center gap-2 bg-[#1A4E26] text-white py-2 rounded-lg hover:bg-[#163F1E]"
               >
                 <Download size={18} /> Descargar
               </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
