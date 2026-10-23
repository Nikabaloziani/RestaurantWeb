import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Armchair, CheckCircle2, Edit3, Loader2, Plus, RefreshCw, Search, Table2, Trash2, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import {
  createTable, deleteTable, fetchTables, updateTable, updateTableOccupancy,
  type LiveTable, type TableInput, type TableState, type TableZone,
} from '../api/tables';

const FILTERS: Array<'all' | TableState> = ['all', 'available', 'occupied', 'reserved', 'unknown'];
const ZONES: TableZone[] = [1, 2, 3, 4];
const EMPTY_FORM: TableInput = { tableNumber: 1, capacity: 4, zone: 1 };

function TableEditor({ initial, busy, onCancel, onSave, numbers, errorMessage }: {
  initial?: LiveTable;
  busy: boolean;
  onCancel: () => void;
  onSave: (data: TableInput) => Promise<void>;
  numbers: number[];
  errorMessage?: string | null;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState<TableInput>(initial ? {
    tableNumber: initial.tableNumber,
    capacity: initial.capacity,
    zone: initial.zone ?? 1,
  } : { ...EMPTY_FORM });
  const [validation, setValidation] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidation('');
    if (!Number.isInteger(value.tableNumber) || value.tableNumber < 1 || value.tableNumber > 1000 ||
        !Number.isInteger(value.capacity) || value.capacity < 1 || value.capacity > 50) {
      setValidation(t('tables.validation')); return;
    }
    if (numbers.includes(value.tableNumber) && value.tableNumber !== initial?.tableNumber) {
      setValidation(t('tables.duplicate')); return;
    }
    await onSave(value);
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation"
    onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="table-editor-heading">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="table-editor-heading" className="text-xl font-bold text-slate-900">{t(initial ? 'tables.editTable' : 'tables.newTable')}</h2>
        <button type="button" onClick={onCancel} disabled={busy} aria-label={t('tables.close')}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X size={20}/></button>
      </div>
      <form onSubmit={event => { void submit(event); }} className="space-y-4">
        <div>
          <label htmlFor="table-number" className="mb-1.5 block text-sm font-semibold text-slate-700">{t('tables.tableNumber')}</label>
          <input id="table-number" type="number" min={1} max={1000} step={1} required value={value.tableNumber}
            onChange={e => setValue(v => ({ ...v, tableNumber: Number(e.target.value) }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="table-capacity" className="mb-1.5 block text-sm font-semibold text-slate-700">{t('tables.capacity')}</label>
          <input id="table-capacity" type="number" min={1} max={50} step={1} required value={value.capacity}
            onChange={e => setValue(v => ({ ...v, capacity: Number(e.target.value) }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="table-zone" className="mb-1.5 block text-sm font-semibold text-slate-700">{t('tables.zone')}</label>
          <select id="table-zone" value={value.zone} onChange={e => setValue(v => ({ ...v, zone: Number(e.target.value) as TableZone }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500">
            {ZONES.map(z => <option key={z} value={z}>{t(`tables.zone${z}`)}</option>)}
          </select>
        </div>
        {!initial && <p className="text-xs leading-5 text-amber-700">{t('tables.legacyZoneNote')}</p>}
        {validation && <p role="alert" className="text-sm text-rose-700">{validation}</p>}
        {errorMessage && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">{t('tables.cancel')}</button>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {busy && <Loader2 size={16} className="animate-spin"/>}{t('tables.save')}
          </button>
        </div>
      </form>
    </div>
  </div>;
}

export default function Tables({ token }: { token: string }) {
  const { t } = useTranslation();
  const [tables, setTables] = useState<LiveTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | TableState>('all');
  const [editor, setEditor] = useState<LiveTable | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setTables([]);
    setError(null);
    void fetchTables(token, controller.signal)
      .then(rows => { if (!controller.signal.aborted) setTables(rows); })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'tables.errorNetwork'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, reload]);

  const errorText = (message: string) => {
    if (message.startsWith('tables.errorHttp:')) return t('tables.errorHttp', { status: message.split(':')[1] });
    return message.startsWith('tables.') ? t(message) : message;
  };

  const isLegacy = tables.some(row => row.isOccupied === null);
  const filtered = useMemo(() => tables.filter(row =>
    (filter === 'all' || row.status === filter) &&
    (`${row.tableNumber} ${row.id}`).toLowerCase().includes(search.trim().toLowerCase())
  ), [tables, filter, search]);

  const refresh = () => { if (!saving && busyId === null) { setNotice(null); setReload(n => n + 1); } };

  const save = async (value: TableInput) => {
    if (!editor) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      if (editor === 'new') {
        await createTable(token, value);
        setNotice(t('tables.created'));
      } else {
        await updateTable(token, editor.id, value);
        setNotice(t('tables.saved'));
      }
      setEditor(null);
      setReload(n => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'tables.errorNetwork');
      // Keep the form open so the user can retry/cancel.
    } finally { setSaving(false); }
  };

  const occupancy = async (row: LiveTable) => {
    if (row.isOccupied === null || row.status === 'reserved') return;
    const next = !row.isOccupied;
    if (!window.confirm(t('tables.confirmOccupancy', { number: row.tableNumber, status: t(`statuses.${next ? 'occupied' : 'available'}`) }))) return;
    setBusyId(row.id); setError(null); setNotice(null);
    try {
      await updateTableOccupancy(token, row.id, next);
      setNotice(t('tables.statusSaved', { number: row.tableNumber }));
      setReload(n => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'tables.errorNetwork');
    } finally { setBusyId(null); }
  };

  const remove = async (row: LiveTable) => {
    if (!window.confirm(t('tables.confirmDelete', { number: row.tableNumber }))) return;
    setBusyId(row.id); setError(null); setNotice(null);
    try {
      await deleteTable(token, row.id);
      setNotice(t('tables.deleted', { number: row.tableNumber }));
      setReload(n => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'tables.errorNetwork');
    } finally { setBusyId(null); }
  };

  return <div>
    <PageHeader title={t('tables.title')} subtitle={t('tables.subtitle')} action={<div className="flex flex-wrap gap-2">
      <button type="button" onClick={refresh} disabled={loading || busyId !== null || saving}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
        <RefreshCw size={17} className={loading ? 'animate-spin' : ''}/>{t('tables.refresh')}
      </button>
      <button type="button" onClick={() => { setError(null); setEditor('new'); }} disabled={loading || busyId !== null || saving}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
        <Plus size={17}/>{t('tables.addTable')}
      </button>
    </div>}/>

    <div className="mb-4 flex flex-wrap items-center gap-3">
      <span className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{t('tables.liveLabel')}</span>
      {!loading && !error && <span className="text-sm text-slate-600">{t('tables.results', { count: tables.length })}</span>}
    </div>

    {isLegacy && !loading && <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <AlertCircle size={18} className="mt-0.5 shrink-0"/><p>{t('tables.legacyWarning')}</p>
    </div>}
    {notice && <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
      <CheckCircle2 size={18}/>{notice}
    </div>}
    {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <div className="flex items-center gap-2"><AlertCircle size={18}/>{errorText(error)}</div>
      <button type="button" onClick={refresh} className="mt-2 text-sm font-semibold underline">{t('tables.retry')}</button>
    </div>}

    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
      <label className="relative flex-1">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          placeholder={t('tables.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)}/>
      </label>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(state => <button key={state} type="button" onClick={() => setFilter(state)}
          className={`rounded-xl border px-3 py-2 text-sm font-semibold ${filter === state ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}>
          {state === 'all' ? t('tables.allTables') : t(`statuses.${state}`)} <span className="ml-1 opacity-70">{state === 'all' ? tables.length : tables.filter(x => x.status === state).length}</span>
        </button>)}
      </div>
    </div>

    {loading ? <div className="flex items-center justify-center gap-2 rounded-xl bg-white p-12 text-sm text-slate-500"><Loader2 size={21} className="animate-spin"/>{t('tables.loading')}</div>
      : !error && filtered.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">{tables.length === 0 ? t('tables.empty') : t('common.noResults')}</div>
      : !error ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filtered.map(row => {
        const working = busyId === row.id;
        const extended = row.isOccupied !== null;
        return <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${row.status === 'occupied' ? 'bg-rose-50 text-rose-600' : row.status === 'available' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Table2 size={24}/>
            </div>
            <StatusBadge status={row.status}/>
          </div>
          <h2 className="text-lg font-bold text-slate-900">{t('tables.tableNumber')} {row.tableNumber}</h2>
          <p className="mt-2 flex items-center gap-1 text-sm text-slate-500"><Armchair size={16}/>{row.capacity} {t('common.seats')}
            <span className="px-1">·</span>{row.zone ? t(`tables.zone${row.zone}`) : t('tables.zoneUnknown')}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button type="button" disabled={working || saving || !extended} title={!extended ? t('tables.needsBackend') : undefined}
              onClick={() => setEditor(row)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
              <Edit3 size={14}/>{t('tables.editTable')}
            </button>
            <button type="button" disabled={working || saving || row.isOccupied === null || row.status === 'reserved'}
              title={row.isOccupied === null ? t('tables.needsBackend') : undefined}
              onClick={() => { void occupancy(row); }} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-2.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40">
              {working ? <Loader2 size={14} className="animate-spin"/> : null}{t(row.isOccupied ? 'tables.markFree' : 'tables.markOccupied')}
            </button>
            <button type="button" disabled={working || saving} onClick={() => { void remove(row); }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40">
              <Trash2 size={14}/>{t('tables.delete')}
            </button>
          </div>
        </article>;
      })}</div> : null}

    {editor !== null && <TableEditor key={editor === 'new' ? 'new' : editor.id}
      initial={editor === 'new' ? undefined : editor}
      busy={saving} onCancel={() => { if (!saving) setEditor(null); }}
      numbers={tables.map(row => row.tableNumber)} errorMessage={error ? errorText(error) : null} onSave={save}/>}
  </div>;
}
