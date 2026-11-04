import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AlertCircle, CalendarClock, CalendarPlus, CheckCircle2, Clock3, Loader2, Pencil, RefreshCw, Search, Users, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { fetchTables, type LiveTable } from '../api/tables';
import {
  cancelReservation, createReservation, fetchAvailableReservationTables,
  fetchReservations, updateReservation, type AvailableTable,
  type LiveReservation, type ReservationInput,
} from '../api/reservations';

type Filter = 'all' | 'upcoming' | 'confirmed' | 'cancelled';
type ReservationEditorProps = {
  token: string;
  restaurantId: string;
  existing: LiveReservation | null;
  onClose: () => void;
  onSaved: (id: number, edited: boolean) => void;
};

function localDatetimeValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function errorText(message: string, t: TFunction): string {
  if (message.startsWith('reservations.errorHttp:')) {
    return t('reservations.errorHttp', { status: message.split(':')[1] });
  }
  return message.startsWith('reservations.') || message.startsWith('tables.') ? t(message) : message;
}

function ReservationEditor({ token, restaurantId, existing, onClose, onSaved }: ReservationEditorProps) {
  const { t } = useTranslation();
  const editing = existing !== null;
  const [startTime, setStartTime] = useState(existing ? localDatetimeValue(existing.startTime) : '');
  const [guestCount, setGuestCount] = useState(existing ? String(existing.guestCount) : '2');
  const [durationMinutes, setDurationMinutes] = useState(existing ? String(existing.durationMinutes) : '120');
  const [note, setNote] = useState(existing?.note ?? '');
  const [guestName, setGuestName] = useState(existing?.guestName ?? '');
  const [guestPhone, setGuestPhone] = useState(existing?.guestPhone ?? '');
  const [tableId, setTableId] = useState(existing ? String(existing.tableId) : '');
  const [tables, setTables] = useState<AvailableTable[]>([]);
  const [checked, setChecked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEditTables, setLoadingEditTables] = useState(editing);
  const [error, setError] = useState<string | null>(null);

  // Editing uses the server's final PUT collision check. The availability endpoint
  // includes the existing reservation, so it could incorrectly hide its own table.
  useEffect(() => {
    if (!editing) return;
    const controller = new AbortController();
    fetchTables(token, restaurantId, controller.signal)
      .then((result: LiveTable[]) => {
        if (!controller.signal.aborted) {
          setTables(result.map(table => ({ id: table.id, tableNumber: table.tableNumber, capacity: table.capacity })));
        }
      })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : String(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoadingEditTables(false); });
    return () => controller.abort();
  }, [editing, token, restaurantId]);

  const invalidateAvailability = () => {
    if (!editing) {
      setChecked(false);
      setTables([]);
      setTableId('');
    }
    setError(null);
  };

  const inputsValid = () => {
    const guests = Number(guestCount);
    const minutes = Number(durationMinutes);
    const date = new Date(startTime);
    if (!startTime || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) return false;
    if (!Number.isInteger(guests) || guests < 1 || guests > 50) return false;
    if (!Number.isInteger(minutes) || minutes < 30 || minutes > 360) return false;
    const digits = (guestPhone.match(/\d/g) ?? []).length;
    return note.length <= 500 && guestName.trim().length >= 2 && guestName.trim().length <= 100 &&
      guestPhone.trim().length >= 7 && guestPhone.trim().length <= 25 && digits >= 7 &&
      /^[+0-9()\s-]+$/.test(guestPhone.trim());
  };

  const checkAvailable = async () => {
    if (!inputsValid()) { setError('reservations.invalidForm'); return; }
    setError(null);
    setChecking(true);
    setChecked(false);
    setTables([]);
    setTableId('');
    try {
      const result = await fetchAvailableReservationTables(token, restaurantId, new Date(startTime).toISOString(), Number(guestCount), Number(durationMinutes));
      setTables(result);
      setChecked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'reservations.errorNetwork');
    } finally {
      setChecking(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (!inputsValid()) { setError('reservations.invalidForm'); return; }
    const id = Number(tableId);
    const selected = tables.find(table => table.id === id);
    if (!selected || selected.capacity < Number(guestCount) || (!editing && !checked)) {
      setError('reservations.selectTable');
      return;
    }
    const input: ReservationInput = {
      tableId: id,
      startTime: new Date(startTime).toISOString(),
      guestCount: Number(guestCount),
      durationMinutes: Number(durationMinutes),
      note: note.trim() || null,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
    };
    setSaving(true);
    setError(null);
    try {
      const saved = existing
        ? await updateReservation(token, restaurantId, existing.id, input)
        : await createReservation(token, restaurantId, input);
      onSaved(saved.id, editing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'reservations.errorNetwork');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
  const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600';

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 sm:p-6" role="presentation">
    <div role="dialog" aria-modal="true" aria-labelledby="reservation-editor-title" className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2 id="reservation-editor-title" className="text-lg font-bold text-slate-900">{t(editing ? 'reservations.editReservation' : 'reservations.newReservation')}</h2>
          <p className="mt-1 text-xs text-slate-500">{t('reservations.editorSubtitle')}</p>
        </div>
        <button type="button" onClick={onClose} disabled={saving} aria-label={t('reservations.close')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X size={20}/></button>
      </div>

      <form onSubmit={event => { void submit(event); }} className="space-y-4 p-5 sm:p-6">
        <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">{t('reservations.guestNotice')}</p>
        {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle size={18} className="shrink-0"/>{errorText(error, t)}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reservation-guest-name" className={labelClass}>{t('reservations.guestName')}</label>
            <input id="reservation-guest-name" type="text" required minLength={2} maxLength={100} autoComplete="name"
              value={guestName} onChange={e => { setGuestName(e.target.value); setError(null); }}
              placeholder={t('reservations.guestNamePlaceholder')} className={inputClass} />
          </div>
          <div>
            <label htmlFor="reservation-guest-phone" className={labelClass}>{t('reservations.guestPhone')}</label>
            <input id="reservation-guest-phone" type="tel" required minLength={7} maxLength={25} autoComplete="tel"
              value={guestPhone} onChange={e => { setGuestPhone(e.target.value); setError(null); }}
              placeholder={t('reservations.guestPhonePlaceholder')} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="reservation-start" className={labelClass}>{t('reservations.startTime')}</label>
            <input id="reservation-start" type="datetime-local" required value={startTime} onChange={e => { setStartTime(e.target.value); invalidateAvailability(); }} className={inputClass} />
          </div>
          <div>
            <label htmlFor="reservation-guests" className={labelClass}>{t('reservations.partySize')}</label>
            <input id="reservation-guests" type="number" required min={1} max={50} step={1} value={guestCount} onChange={e => { setGuestCount(e.target.value); invalidateAvailability(); }} className={inputClass}/>
          </div>
          <div>
            <label htmlFor="reservation-duration" className={labelClass}>{t('reservations.duration')}</label>
            <input id="reservation-duration" type="number" required min={30} max={360} step={15} value={durationMinutes} onChange={e => { setDurationMinutes(e.target.value); invalidateAvailability(); }} className={inputClass}/>
          </div>
        </div>

        {!editing && <button type="button" onClick={() => { void checkAvailable(); }} disabled={checking || saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">
          {checking ? <Loader2 size={17} className="animate-spin"/> : <Search size={17}/>}{t('reservations.checkAvailability')}
        </button>}

        <div>
          <label htmlFor="reservation-table" className={labelClass}>{t('reservations.chooseTable')}</label>
          <select id="reservation-table" className={inputClass} value={tableId} disabled={saving || checking || loadingEditTables || (!editing && !checked)} onChange={e => { setTableId(e.target.value); setError(null); }} required>
            <option value="">{t(loadingEditTables ? 'reservations.loadingTables' : 'reservations.selectTablePlaceholder')}</option>
            {tables.filter(table => table.capacity >= Number(guestCount)).map(table => <option key={table.id} value={table.id}>{t('reservations.tableOption', { table: table.tableNumber, capacity: table.capacity })}</option>)}
          </select>
          {!editing && checked && tables.length === 0 && <p className="mt-2 text-xs font-semibold text-amber-700">{t('reservations.noAvailableTables')}</p>}
          {editing && <p className="mt-2 text-xs text-slate-500">{t('reservations.editAvailabilityNote')}</p>}
        </div>
        <div>
          <label htmlFor="reservation-note" className={labelClass}>{t('reservations.note')}</label>
          <textarea id="reservation-note" className={inputClass} rows={3} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder={t('reservations.notePlaceholder')}/>
          <p className="mt-1 text-right text-xs text-slate-400">{note.length}/500</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{t('reservations.close')}</button>
          <button type="submit" disabled={saving || checking || loadingEditTables || !inputsValid() || !tableId || (!editing && !checked)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
            {saving && <Loader2 size={16} className="animate-spin"/>}{t(saving ? 'reservations.saving' : editing ? 'reservations.saveChanges' : 'reservations.createReservation')}
          </button>
        </div>
      </form>
    </div>
  </div>;
}

export default function Reservations({ token, restaurantId }: { token: string; restaurantId: string }) {
  const { t, i18n } = useTranslation();
  const [reservations, setReservations] = useState<LiveReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState<{ existing: LiveReservation | null } | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setReservations([]);
    setEditor(null);
    fetchReservations(token, restaurantId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setReservations(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'reservations.errorNetwork'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, restaurantId, reload]);

  const refresh = useCallback(() => {
    if (cancellingId !== null) return;
    setNotice(null);
    setReload(value => value + 1);
  }, [cancellingId]);

  const now = Date.now();
  const counts = {
    all: reservations.length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    upcoming: reservations.filter(r => r.status === 'confirmed' && Date.parse(r.startTime) > now).length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
  };

  const filtered = useMemo(() => reservations.filter(row => {
    const matches = filter === 'all' ||
      (filter === 'upcoming' ? row.status === 'confirmed' && Date.parse(row.startTime) > Date.now() : row.status === filter);
    const q = search.trim().toLowerCase();
    return matches && `${row.id} ${row.customerName} ${row.guestPhone ?? ''} ${row.customerEmail ?? ''} ${row.tableNumber} ${row.note ?? ''}`.toLowerCase().includes(q);
  }).sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)), [reservations, filter, search]);

  const dateText = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    const lang = i18n.resolvedLanguage === 'ka' ? 'ka-GE' : i18n.resolvedLanguage === 'ru' ? 'ru-RU' : 'en-GB';
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const cancel = async (reservation: LiveReservation) => {
    if (cancellingId !== null || reservation.status !== 'confirmed') return;
    if (!window.confirm(t('reservations.confirmCancel', { id: reservation.id }))) return;
    setCancellingId(reservation.id);
    setError(null);
    setNotice(null);
    try {
      await cancelReservation(token, restaurantId, reservation.id);
      setNotice(t('reservations.cancelSuccess', { id: reservation.id }));
      setReload(n => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'reservations.errorNetwork');
    } finally {
      setCancellingId(null);
    }
  };

  return <div>
    <PageHeader title={t('reservations.title')} subtitle={t('reservations.liveSubtitle')}
      action={<div className="flex flex-wrap gap-2">
        <button type="button" onClick={refresh} disabled={loading || cancellingId !== null} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''}/>{t('reservations.refresh')}
        </button>
        <button type="button" onClick={() => setEditor({ existing: null })} disabled={cancellingId !== null} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
          <CalendarPlus size={17}/>{t('reservations.newReservation')}
        </button>
      </div>}/>

    <div className="mb-4 flex flex-wrap items-center gap-3">
      <span className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{t('reservations.liveLabel')}</span>
      {!loading && !error && <span className="text-sm text-slate-600">{t('reservations.total', { count: reservations.length })}</span>}
    </div>

    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
      {([
        { label: 'allCount', count: counts.all, icon: CalendarClock },
        { label: 'upcomingCount', count: counts.upcoming, icon: Clock3 },
        { label: 'confirmedCount', count: counts.confirmed, icon: CheckCircle2 },
        { label: 'cancelledCount', count: counts.cancelled, icon: X },
      ] as const).map(item => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500"><span>{t(`reservations.${item.label}`)}</span><item.icon size={17} className="text-blue-600"/></div>
        <div className="mt-2 text-2xl font-bold text-slate-900">{loading ? '—' : item.count}</div>
      </div>)}
    </div>

    {notice && <p role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={18} className="shrink-0"/>{notice}</p>}
    {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><p className="flex items-start gap-2"><AlertCircle size={18} className="shrink-0"/>{errorText(error, t)}</p><button type="button" onClick={refresh} className="mt-2 font-semibold underline">{t('reservations.retry')}</button></div>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 sm:p-5">
        <label className="relative min-w-[220px] flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('reservations.searchPlaceholder')} aria-label={t('reservations.searchPlaceholder')} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
        </label>
        <select aria-label={t('reservations.filter')} value={filter} onChange={e => setFilter(e.target.value as Filter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400">
          <option value="all">{t('reservations.all')}</option>
          <option value="upcoming">{t('reservations.upcoming')}</option>
          <option value="confirmed">{t('reservations.confirmed')}</option>
          <option value="cancelled">{t('reservations.cancelled')}</option>
        </select>
      </div>

      {loading ? <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500"><Loader2 size={21} className="animate-spin"/>{t('reservations.loading')}</div>
        : !error && filtered.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">{reservations.length === 0 ? t('reservations.noReservations') : t('reservations.noResults')}</div>
        : !error ? <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500"><tr>
            {['reservationId','customer','partySize','startTime','duration','table','status','actions'].map(key => <th key={key} className="px-5 py-3">{t(`reservations.${key}`)}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">{filtered.map(row => <tr key={row.id} className="hover:bg-slate-50">
            <td className="px-5 py-4 font-bold text-slate-900">R-{row.id}</td>
            <td className="px-5 py-4 text-slate-700"><div className="max-w-44 truncate font-medium">{row.customerName || row.customerEmail || t('reservations.unknownCustomer')}</div>
              {row.guestPhone ? <a className="text-xs text-blue-600 hover:underline" href={`tel:${row.guestPhone.replace(/[^\d+]/g, '')}`}>{row.guestPhone}</a>
                : row.customerEmail ? <div className="max-w-44 truncate text-xs text-slate-400">{row.customerEmail}</div>
                : <div className="text-xs text-amber-700">{t('reservations.legacyContact')}</div>}</td>
            <td className="px-5 py-4 text-slate-600"><span className="inline-flex items-center gap-1"><Users size={14}/>{row.guestCount}</span></td>
            <td className="whitespace-nowrap px-5 py-4 text-slate-600">{dateText(row.startTime)}</td>
            <td className="px-5 py-4 text-slate-600">{t('reservations.minutes', { count: row.durationMinutes })}</td>
            <td className="px-5 py-4 text-slate-600">{t('reservations.tableNumber', { table: row.tableNumber })}</td>
            <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${row.status === 'confirmed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : row.status === 'cancelled' ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{t(`reservations.${row.status}`)}</span></td>
            <td className="px-5 py-4">{row.status === 'confirmed' ? <div className="flex items-center gap-2">
              <button type="button" onClick={() => setEditor({ existing: row })} disabled={cancellingId !== null || Date.parse(row.startTime) <= Date.now()} aria-label={t('reservations.editReservation')} className="rounded-lg border border-slate-200 px-2.5 py-2 text-blue-700 hover:bg-blue-50 disabled:opacity-40"><Pencil size={15}/></button>
              <button type="button" onClick={() => { void cancel(row); }} disabled={cancellingId !== null} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40">{cancellingId === row.id ? t('reservations.cancelling') : t('reservations.cancel')}</button>
            </div> : <span className="text-slate-300">—</span>}</td>
          </tr>)}</tbody>
        </table></div> : null}
    </section>
    <p className="mt-3 text-xs text-slate-500">{t('reservations.footerNote')}</p>

    {editor && <ReservationEditor token={token} restaurantId={restaurantId} existing={editor.existing} onClose={() => setEditor(null)} onSaved={(id, edited) => {
      setEditor(null);
      setNotice(t(edited ? 'reservations.updateSuccess' : 'reservations.createSuccess', { id }));
      setReload(n => n + 1);
    }}/>} 
  </div>;
}
