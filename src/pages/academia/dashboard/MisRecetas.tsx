import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { Download, FileText, Leaf, ShoppingCart, Upload, Info, CheckCircle, Lock } from 'lucide-react';
import { useToast } from '../../../lib/toast';

interface Recipe {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  pdf_url: string;
  price: number;
}

export default function MisRecetas() {
  const { profile } = useAuth();
  const toast = useToast();
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [purchased, setPurchased] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Carrito de compras
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profile?.id]);

  async function fetchData() {
    try {
      setLoading(true);
      // Obtener todas las recetas activas
      const { data: recipesData, error: recipesError } = await supabase
        .from('academy_recipes')
        .select('id, title, description, cover_image_url, pdf_url, price')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
        
      if (recipesError) throw recipesError;
      setRecipes(recipesData || []);

      if (profile?.id) {
        // Obtener estado de compras del usuario
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('academy_recipe_purchases')
          .select('status, items:academy_recipe_purchase_items(recipe_id)')
          .eq('user_id', profile.id);
          
        if (purchasesError) throw purchasesError;

        const purchasedMap: Record<string, string> = {};
        purchasesData?.forEach(p => {
          if (p.status !== 'rejected') {
            (p.items as any[])?.forEach(item => {
              purchasedMap[item.recipe_id] = p.status;
            });
          }
        });
        setPurchased(purchasedMap);
      }
    } catch (error) {
      console.error('Error fetching recipes data:', error);
      toast.error('Error al cargar las recetas');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(id: string) {
    if (purchased[id]) return;
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  const selectedRecipes = recipes.filter(r => selectedIds.has(r.id));
  const totalAmount = selectedRecipes.reduce((sum, r) => sum + r.price, 0);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    if (!receiptFile) {
      toast.error('Debe adjuntar el comprobante de pago');
      return;
    }
    if (!profile?.id) {
      toast.error('Sesión no encontrada');
      return;
    }

    try {
      setIsSubmitting(true);
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `recibo_${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('academy-receipts')
        .upload(filePath, receiptFile);
      if (uploadError) throw uploadError;

      const { data: purchaseData, error: purchaseError } = await supabase
        .from('academy_recipe_purchases')
        .insert([{
          user_id: profile.id,
          total_amount: totalAmount,
          payment_method: 'transferencia',
          payment_receipt_url: filePath,
          status: 'pending'
        }])
        .select('id')
        .single();
      if (purchaseError) throw purchaseError;

      const itemsToInsert = Array.from(selectedIds).map(recipeId => ({
        purchase_id: purchaseData.id,
        recipe_id: recipeId,
        price_at_purchase: recipes.find(r => r.id === recipeId)?.price || 5.00
      }));

      const { error: itemsError } = await supabase
        .from('academy_recipe_purchase_items')
        .insert(itemsToInsert);
      if (itemsError) throw itemsError;

      toast.success('¡Solicitud enviada! Verificaremos tu pago pronto 🌿');
      setIsCheckoutOpen(false);
      setSelectedIds(new Set());
      setReceiptFile(null);
      fetchData(); // Recargar datos
    } catch (error: any) {
      console.error('Error in checkout:', error);
      toast.error('Error al procesar la compra: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDownload(pdf_url: string) {
    try {
      toast.info('Generando enlace seguro...');
      const { data, error } = await supabase.storage
        .from('academy-recipes')
        .createSignedUrl(pdf_url, 60 * 5); // 5 minutos validez

      if (error) throw error;
      toast.success('¡Descarga iniciada!');
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('Error downloading recipe:', error);
      toast.error('No se pudo descargar la receta.');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-10 h-10 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Mis Recetas</h1>
        <p className="text-gray-500 mt-1">Catálogo de recetas de biomedicina ancestral. Compra y desbloquea contenido exclusivo del Dr. Luis Paredes.</p>
      </div>

      {recipes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#C8D8CB] p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-[#EBF4ED] rounded-full flex items-center justify-center mx-auto mb-6">
            <Leaf size={40} className="text-[#1A4E26]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Próximamente nuevas recetas</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Aún no hay recetas publicadas en el catálogo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recipes.map(recipe => {
            const status = purchased[recipe.id];
            const isSelected = selectedIds.has(recipe.id);
            const isApproved = status === 'approved';
            const isPending = status === 'pending' || status === 'processing';

            return (
              <div 
                key={recipe.id} 
                className={`bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ${
                  isSelected
                    ? 'ring-2 ring-[#1A4E26] shadow-xl shadow-[#1A4E26]/10 scale-[1.02]'
                    : 'border border-[#C8D8CB] shadow-sm hover:shadow-md'
                }`}
              >
                {/* Imagen y Estado */}
                <div className="aspect-[4/3] bg-gradient-to-br from-[#1A4E26] to-[#2E7D32] relative overflow-hidden">
                  {recipe.cover_image_url ? (
                    <img src={recipe.cover_image_url} alt={recipe.title} className={`w-full h-full object-cover ${!isApproved ? 'opacity-70 blur-[2px]' : ''}`} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/60">
                      <FileText size={48} className="mb-2 opacity-50" />
                    </div>
                  )}

                  {/* Badge de Precio o Estado */}
                  {!isApproved && !isPending && (
                    <div className="absolute top-3 right-3 bg-[#D4AF37] text-[#0B2913] px-2.5 py-1 rounded-lg text-sm font-black shadow">
                      ${recipe.price.toFixed(2)}
                    </div>
                  )}

                  {/* Overlay visual */}
                  {isApproved ? (
                    <div className="absolute inset-0 bg-[#1A4E26]/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <CheckCircle size={48} className="text-white drop-shadow-lg" />
                    </div>
                  ) : isPending ? (
                    <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                      <div className="bg-white/90 backdrop-blur text-amber-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                        En revisión
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Lock size={32} className="text-white/80 drop-shadow-md" />
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A4E26] bg-[#1A4E26]/10 px-2 py-0.5 rounded">
                      Dr. Luis Paredes
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 line-clamp-2 mt-2 mb-2">{recipe.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 flex-1">{recipe.description}</p>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {isApproved ? (
                      <button
                        onClick={() => handleDownload(recipe.pdf_url)}
                        className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] text-[#0B2913] py-2.5 rounded-xl font-bold hover:bg-[#C19B2E] transition-colors shadow-sm"
                      >
                        <Download size={18} /> Descargar PDF
                      </button>
                    ) : isPending ? (
                      <div className="w-full flex items-center justify-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 py-2.5 rounded-xl font-medium text-sm">
                        <CheckCircle size={16} /> Verificando...
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleSelection(recipe.id)}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all duration-200 ${
                          isSelected
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                            : 'bg-[#1A4E26] text-white hover:bg-[#163F1E]'
                        }`}
                      >
                        {isSelected ? 'Quitar' : 'Registrar Pago'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── BARRA FLOTANTE DE CARRITO ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="bg-[#1A4E26] p-3 rounded-full text-white">
                <ShoppingCart size={22} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{selectedIds.size} receta{selectedIds.size !== 1 ? 's' : ''} seleccionada{selectedIds.size !== 1 ? 's' : ''}</p>
                <p className="text-2xl font-black text-gray-900">Total: ${totalAmount.toFixed(2)}</p>
              </div>
            </div>
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full sm:w-auto px-10 py-3 bg-[#D4AF37] text-[#0B2913] font-black rounded-xl hover:bg-[#C19B2E] transition-colors shadow-lg text-lg"
            >
              Completar Pago
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL DE CHECKOUT ── */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-8 flex flex-col">
            <div className="bg-gradient-to-r from-[#1A4E26] to-[#2E7D32] px-6 py-5 rounded-t-2xl">
              <h2 className="text-xl font-black text-white">Confirmar Pago</h2>
              <p className="text-white/70 text-sm mt-1">Sube tu comprobante para desbloquear</p>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-[#F4F7F5] border border-[#C8D8CB] p-4 rounded-xl space-y-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Leaf size={16} className="text-[#1A4E26]" />
                  Resumen de Recetas
                </h3>
                <ul className="space-y-2">
                  {selectedRecipes.map(r => (
                    <li key={r.id} className="flex justify-between text-sm">
                      <span className="text-gray-600 truncate mr-4">{r.title}</span>
                      <span className="font-bold text-gray-900">${r.price.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-3 border-t border-[#C8D8CB] flex justify-between font-black text-lg">
                  <span className="text-gray-900">Total</span>
                  <span className="text-[#1A4E26]">${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-bold mb-1">Instrucciones</p>
                  <p>Realiza una transferencia a la cuenta de <strong>SUMAK VIDA ECUADOR</strong> y sube el comprobante aquí.</p>
                  <p className="mt-2 text-xs text-blue-600">📞 0989413008 / 0986046654</p>
                </div>
              </div>

              <form onSubmit={handleCheckout} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Subir Comprobante <span className="text-red-500">*</span>
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors hover:border-[#1A4E26] hover:bg-[#F4F7F5] border-gray-300 bg-gray-50">
                    <div className="flex flex-col items-center justify-center">
                      <Upload size={24} className="text-gray-400 mb-2" />
                      {receiptFile ? (
                        <p className="text-sm font-semibold text-[#1A4E26]">{receiptFile.name}</p>
                      ) : (
                        <p className="text-sm text-gray-500">Foto o PDF del comprobante</p>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      required
                    />
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="flex-1 py-3 text-gray-700 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !receiptFile}
                    className="flex-1 py-3 bg-[#1A4E26] text-white font-black rounded-xl hover:bg-[#163F1E] transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Enviando...' : 'Confirmar Pago'}
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
