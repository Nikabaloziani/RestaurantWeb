import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle, CheckCircle2, ChefHat, FolderPlus, Leaf, Loader2, Pencil,
  Plus, RefreshCw, Search, Tag, Trash2, X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  fetchCatalog, createCategory, updateCategory, deleteCategory,
  createProduct, updateProduct, deleteProduct,
  type LiveCategory, type LiveProduct, type CategoryInput, type ProductInput,
} from '../api/catalog';

const EMPTY_CATEGORY: CategoryInput = { name: '', description: '' };
const EMPTY_PRODUCT: ProductInput = {
  name: '', price: 0, categoryId: 0, nuts: false, vegeterian: false, spiciness: 0,
};

type Editor =
  | { kind: 'category'; value?: LiveCategory }
  | { kind: 'product'; value?: LiveProduct }
  | null;

type Translate = (key: string, values?: Record<string, unknown>) => string;
function translateError(t: Translate, err: unknown): string {
  const msg = err instanceof Error ? err.message : 'catalog.errorNetwork';
  if (msg.startsWith('catalog.errorHttp:')) return t('catalog.errorHttp', { status: msg.split(':')[1] });
  if (msg.startsWith('catalog.')) return t(msg);
  return t('catalog.errorUnexpected');
}

const FIELD = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const LABEL = 'mb-1.5 block text-sm font-semibold text-slate-700';

function CategoryDialog({ original, busy, onClose, onSave }: {
  original?: LiveCategory; busy: boolean; onClose: () => void;
  onSave: (value: CategoryInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState<CategoryInput>(original ? {
    name: original.name, description: original.description ?? '',
  } : { ...EMPTY_CATEGORY });
  const [validation, setValidation] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = value.name.trim();
    if (name.length === 0 || name.length > 100 || value.description.length > 250) {
      setValidation(t('catalog.errorCategoryValidation')); return;
    }
    setValidation('');
    void onSave({ name, description: value.description.trim() });
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
    onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="catalog-category-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="catalog-category-title" className="text-xl font-bold text-slate-900">{t(original ? 'catalog.editCategory' : 'catalog.addCategory')}</h2>
        <button type="button" onClick={onClose} disabled={busy} aria-label={t('catalog.close')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div><label className={LABEL} htmlFor="cat-name">{t('catalog.name')}</label>
          <input id="cat-name" autoFocus required maxLength={100} className={FIELD} value={value.name}
            onChange={e=>setValue(v=>({...v,name:e.target.value}))}/></div>
        <div><label className={LABEL} htmlFor="cat-description">{t('catalog.description')}</label>
          <textarea id="cat-description" rows={3} maxLength={250} className={FIELD} value={value.description}
            onChange={e=>setValue(v=>({...v,description:e.target.value}))}/></div>
        {validation && <p role="alert" className="text-sm text-rose-700">{validation}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">{t('catalog.cancel')}</button>
          <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {busy && <Loader2 size={16} className="animate-spin"/>}{t('catalog.save')}
          </button>
        </div>
      </form>
    </div>
  </div>;
}

function ProductDialog({ original, categories, busy, onClose, onSave }: {
  original?: LiveProduct; categories: LiveCategory[]; busy: boolean; onClose: () => void;
  onSave: (value: ProductInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState<ProductInput>(original ? {
    name: original.name, price: original.price, categoryId: original.categoryId,
    nuts: original.nuts, vegeterian: original.vegeterian, spiciness: original.spiciness,
  } : { ...EMPTY_PRODUCT, categoryId: categories[0]?.id ?? 0 });
  const [validation, setValidation] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.name.trim() || value.name.trim().length > 200 ||
        !Number.isFinite(value.price) || value.price < 0 || value.price > 999999 ||
        !categories.some(cat=>cat.id===value.categoryId) ||
        !Number.isInteger(value.spiciness) || value.spiciness < 0 || value.spiciness > 5) {
      setValidation(t('catalog.errorProductValidation')); return;
    }
    setValidation('');
    void onSave({ ...value, name: value.name.trim(), price: Number(value.price.toFixed(2)) });
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
    onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="catalog-product-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="catalog-product-title" className="text-xl font-bold text-slate-900">{t(original ? 'catalog.editProduct' : 'catalog.addProduct')}</h2>
        <button type="button" onClick={onClose} disabled={busy} aria-label={t('catalog.close')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div><label className={LABEL} htmlFor="product-name">{t('catalog.name')}</label>
          <input id="product-name" autoFocus required maxLength={200} className={FIELD} value={value.name}
            onChange={e=>setValue(v=>({...v,name:e.target.value}))}/></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label className={LABEL} htmlFor="product-price">{t('catalog.price')}</label>
            <input id="product-price" type="number" step="0.01" min="0" max="999999" required className={FIELD} value={value.price}
              onChange={e=>setValue(v=>({...v,price:Number(e.target.value)}))}/></div>
          <div><label className={LABEL} htmlFor="product-category">{t('catalog.category')}</label>
            <select id="product-category" required className={FIELD} value={value.categoryId}
              onChange={e=>setValue(v=>({...v,categoryId:Number(e.target.value)}))}>
              {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
        </div>
        <div><label className={LABEL} htmlFor="product-spiciness">{t('catalog.spiciness')} (0–5)</label>
          <select id="product-spiciness" className={FIELD} value={value.spiciness}
            onChange={e=>setValue(v=>({...v,spiciness:Number(e.target.value)}))}>
            {[0,1,2,3,4,5].map(level=><option key={level} value={level}>{level}</option>)}
          </select></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <input type="checkbox" checked={value.vegeterian} onChange={e=>setValue(v=>({...v,vegeterian:e.target.checked}))} className="h-4 w-4 accent-blue-600"/>
            {t('catalog.vegetarian')}</label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <input type="checkbox" checked={value.nuts} onChange={e=>setValue(v=>({...v,nuts:e.target.checked}))} className="h-4 w-4 accent-blue-600"/>
            {t('catalog.containsNuts')}</label>
        </div>
        {validation && <p role="alert" className="text-sm text-rose-700">{validation}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">{t('catalog.cancel')}</button>
          <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {busy && <Loader2 size={16} className="animate-spin"/>}{t('catalog.save')}
          </button>
        </div>
      </form>
    </div>
  </div>;
}

export default function Products({ token, restaurantId }: { token: string; restaurantId: string }) {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [tab, setTab] = useState<'products' | 'categories'>('products');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<Editor>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setProducts([]);
    setCategories([]);
    setCategoryFilter('all');
    setEditor(null);
    setNotice('');
    if (!restaurantId.trim()) {
      setError('Select a restaurant first.');
      setLoading(false);
      return () => controller.abort();
    }
    void fetchCatalog(token, restaurantId, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setCategories(data.categories); setProducts(data.products); } })
      .catch(err => { if (!controller.signal.aborted) setError(translateError(t, err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, restaurantId, reload, t]);

  const filteredProducts = useMemo(() => products.filter(p =>
    (categoryFilter === 'all' || String(p.categoryId) === categoryFilter) &&
    `${p.name} ${p.categoryName ?? ''} ${p.id}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ), [products, categoryFilter, search]);
  const filteredCategories = useMemo(() => categories.filter(c =>
    `${c.name} ${c.description ?? ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ), [categories, search]);
  const currency = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage === 'en' ? 'en-US' : i18n.resolvedLanguage === 'ru' ? 'ru-RU' : 'ka-GE', {
    style: 'currency', currency: 'GEL', minimumFractionDigits: 2,
  }).format(value);

  async function reloadCatalog() {
    const data = await fetchCatalog(token, restaurantId);
    setCategories(data.categories);
    setProducts(data.products);
  }

  async function saveProduct(data: ProductInput) {
    if (!editor || editor.kind !== 'product') return;
    setSaving(true); setError(''); setNotice('');
    try {
      if (editor.value) await updateProduct(token, restaurantId, editor.value.id, data);
      else await createProduct(token, restaurantId, data);
      await reloadCatalog();
      setNotice(t(editor.value ? 'catalog.productUpdated' : 'catalog.productCreated'));
      setEditor(null);
    } catch (err) { setError(translateError(t, err)); }
    finally { setSaving(false); }
  }

  async function saveCategory(data: CategoryInput) {
    if (!editor || editor.kind !== 'category') return;
    setSaving(true); setError(''); setNotice('');
    try {
      if (editor.value) await updateCategory(token, restaurantId, editor.value.id, data);
      else await createCategory(token, restaurantId, data);
      await reloadCatalog();
      setNotice(t(editor.value ? 'catalog.categoryUpdated' : 'catalog.categoryCreated'));
      setEditor(null);
    } catch (err) { setError(translateError(t, err)); }
    finally { setSaving(false); }
  }

  async function removeProduct(product: LiveProduct) {
    if (!window.confirm(t('catalog.confirmDeleteProduct', { name: product.name }))) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await deleteProduct(token, restaurantId, product.id);
      await reloadCatalog();
      setNotice(t('catalog.productDeleted'));
    } catch (err) { setError(translateError(t, err)); }
    finally { setSaving(false); }
  }

  async function removeCategory(category: LiveCategory) {
    if (products.some(p => p.categoryId === category.id)) {
      setError(t('catalog.categoryHasProducts')); return;
    }
    if (!window.confirm(t('catalog.confirmDeleteCategory', { name: category.name }))) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await deleteCategory(token, restaurantId, category.id);
      await reloadCatalog();
      setNotice(t('catalog.categoryDeleted'));
    } catch (err) { setError(translateError(t, err)); }
    finally { setSaving(false); }
  }

  return <div>
    <PageHeader title={t('products.title')} subtitle={t('catalog.subtitle')}
      action={<div className="flex flex-wrap gap-2">
        <button type="button" disabled={loading || saving} onClick={() => { setNotice(''); setReload(n=>n+1); }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={16}/>{t('catalog.refresh')}</button>
        <button type="button" disabled={loading || saving} onClick={() => setEditor({ kind: 'category' })}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">
          <FolderPlus size={17}/>{t('catalog.addCategory')}</button>
        <button type="button" disabled={loading || saving || categories.length===0} onClick={() => setEditor({ kind: 'product' })}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          <Plus size={17}/>{t('catalog.addProduct')}</button>
      </div>}/>

    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[
        { label:t('catalog.totalProducts'), value: products.length, icon:ChefHat },
        { label:t('catalog.totalCategories'), value:categories.length, icon:Tag },
        { label:t('catalog.vegetarianProducts'), value:products.filter(p=>p.vegeterian).length, icon:Leaf },
      ].map(({label,value,icon:Icon})=><div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between text-sm text-slate-500"><span>{label}</span><Icon size={19} className="text-blue-600"/></div>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
      </div>)}
    </div>

    {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={18} className="mt-0.5 shrink-0"/>{error}</div>}
    {notice && <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={18} className="mt-0.5 shrink-0"/>{notice}</div>}

    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {(['products','categories'] as const).map(key => <button key={key} type="button"
            onClick={() => { setTab(key); setSearch(''); }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab===key?'bg-white text-blue-700 shadow-sm':'text-slate-500 hover:text-slate-800'}`}>
            {t(`catalog.tab${key==='products'?'Products':'Categories'}`)}</button>)}
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <label className="relative min-w-[200px] flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input aria-label={t('catalog.search')} value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={t('catalog.search')} className={`${FIELD} pl-10`}/>
          </label>
          {tab==='products' && <select aria-label={t('catalog.filterCategory')} value={categoryFilter}
            onChange={e=>setCategoryFilter(e.target.value)} className={`${FIELD} max-w-[190px]`}>
            <option value="all">{t('products.allCategories')}</option>
            {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16 text-slate-500"><Loader2 size={26} className="animate-spin" aria-label={t('catalog.loading')}/></div>
        : tab==='products' ? (
        filteredProducts.length===0 ? <div className="py-16 text-center text-sm text-slate-500">{t(categories.length===0?'catalog.createCategoryFirst':'catalog.noProducts')}</div>
        : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map(p => <article key={p.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5 transition hover:border-blue-200 hover:bg-white hover:shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><ChefHat size={25}/></div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">#{p.id}</span>
            </div>
            <p className="text-xs font-semibold text-blue-600">{categories.find(c=>c.id===p.categoryId)?.name || p.categoryName || t('catalog.uncategorized')}</p>
            <h2 className="mt-1 break-words text-lg font-bold text-slate-900">{p.name}</h2>
            <p className="mt-2 text-xl font-bold text-slate-900">{currency(p.price)}</p>
            <div className="mt-4 flex min-h-7 flex-wrap gap-1.5">
              {p.vegeterian && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{t('catalog.vegetarian')}</span>}
              {p.nuts && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{t('catalog.containsNuts')}</span>}
              {p.spiciness > 0 && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">{t('catalog.spicyLevel', { level:p.spiciness })}</span>}
            </div>
            <div className="mt-4 flex gap-2 border-t border-slate-200 pt-4">
              <button type="button" disabled={saving} onClick={() => setEditor({kind:'product',value:p})} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"><Pencil size={15}/>{t('catalog.edit')}</button>
              <button type="button" disabled={saving} onClick={() => { void removeProduct(p); }} aria-label={`${t('catalog.delete')} ${p.name}`} className="rounded-xl border border-rose-100 bg-white p-2.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 size={16}/></button>
            </div>
          </article>)}
        </div>
      ) : filteredCategories.length===0 ? <div className="py-16 text-center text-sm text-slate-500">{t('catalog.noCategories')}</div>
        : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCategories.map(c => <article key={c.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
            <div className="mb-3 flex items-center justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Tag size={20}/></div><span className="text-xs text-slate-400">#{c.id}</span></div>
            <h2 className="text-lg font-bold text-slate-900">{c.name}</h2>
            <p className="mt-1 min-h-9 text-sm text-slate-500">{c.description || t('catalog.noDescription')}</p>
            <p className="mt-3 text-xs font-semibold text-blue-600">{t('catalog.productsCount', { count:products.filter(p=>p.categoryId===c.id).length })}</p>
            <div className="mt-4 flex gap-2 border-t border-slate-200 pt-4">
              <button type="button" disabled={saving} onClick={() => setEditor({kind:'category',value:c})} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"><Pencil size={15}/>{t('catalog.edit')}</button>
              <button type="button" disabled={saving} onClick={() => { void removeCategory(c); }} aria-label={`${t('catalog.delete')} ${c.name}`} className="rounded-xl border border-rose-100 bg-white p-2.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 size={16}/></button>
            </div>
          </article>)}
        </div>}
    </div>

    {editor?.kind==='category' && <CategoryDialog key={`category-${editor.value?.id ?? 'new'}`} original={editor.value} busy={saving}
      onClose={() => setEditor(null)} onSave={saveCategory}/>}
    {editor?.kind==='product' && <ProductDialog key={`product-${editor.value?.id ?? 'new'}`} original={editor.value} categories={categories}
      busy={saving} onClose={() => setEditor(null)} onSave={saveProduct}/>}
  </div>;
}
