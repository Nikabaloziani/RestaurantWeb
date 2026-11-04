import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  changeStaffRole, getStaffInvitations,
  getStaffOverview, inviteStaff, removeStaff, revokeStaffInvitation,
  type StaffInvitation, type StaffOverview, type StaffRole,
} from '../api/staff';

type Props = { token: string; restaurantId: string };
const roles: StaffRole[] = [2, 3, 4];
const copy = {
  en: { title: 'Staff & Roles', invite: 'Invite employee', email: 'Employee email', role: 'Role',
    manager: 'Manager', waiter: 'Waiter', cashier: 'Cashier', employees: 'Employees',
    pending: 'Pending invitations', noStaff: 'No employees yet.',
    accept: 'Accept invitation', inviteToken: 'Invitation token',
    send: 'Generate invitation', revoke: 'Revoke', remove: 'Remove',
    secret: 'Copy and share the token privately. It is shown only once; email delivery is not connected.',
    updated: 'Saved.', refresh: 'Refresh', owner: 'Owner', confirm: 'Remove this employee?',
    used: 'Staff seats (unique across your organization)',
  },
  ka: { title: 'თანამშრომლები და როლები', invite: 'თანამშრომლის მოწვევა', email: 'ელფოსტა', role: 'როლი',
    manager: 'მენეჯერი', waiter: 'მიმტანი', cashier: 'მოლარე', employees: 'თანამშრომლები',
    pending: 'მოლოდინში მყოფი მოწვევები', noStaff: 'თანამშრომლები ჯერ არ არიან.',
    accept: 'მოწვევის მიღება', inviteToken: 'მოწვევის ტოკენი',
    send: 'მოწვევის შექმნა', revoke: 'გაუქმება', remove: 'წაშლა',
    secret: 'ტოკენი მხოლოდ ერთხელ გამოჩნდება. უსაფრთხოდ გაუზიარე თანამშრომელს; ელფოსტით გაგზავნა ჯერ არ არის დაკავშირებული.',
    updated: 'შენახულია.', refresh: 'განახლება', owner: 'მფლობელი', confirm: 'წაიშალოს თანამშრომელი?',
    used: 'თანამშრომლების ადგილები (უნიკალური მთელი ორგანიზაციისთვის)',
  },
  ru: { title: 'Сотрудники и роли', invite: 'Пригласить сотрудника', email: 'Эл. почта', role: 'Роль',
    manager: 'Менеджер', waiter: 'Официант', cashier: 'Кассир', employees: 'Сотрудники',
    pending: 'Ожидающие приглашения', noStaff: 'Сотрудников пока нет.',
    accept: 'Принять приглашение', inviteToken: 'Токен приглашения',
    send: 'Создать приглашение', revoke: 'Отменить', remove: 'Удалить',
    secret: 'Скопируйте токен и передайте лично. Он показывается один раз; отправка по email пока не подключена.',
    updated: 'Сохранено.', refresh: 'Обновить', owner: 'Владелец', confirm: 'Удалить сотрудника?',
    used: 'Места для персонала (уникальные для всей организации)',
  },
};

export default function Staff({ token, restaurantId }: Props) {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const t = copy[lang as keyof typeof copy] ?? copy.en;
  const [overview, setOverview] = useState<StaffOverview | null>(null);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>(3);
  const [newToken, setNewToken] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setOverview(null); setInvitations([]); setError('');
    if (!restaurantId) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    void Promise.all([
      getStaffOverview(token, restaurantId, controller.signal),
      getStaffInvitations(token, restaurantId, controller.signal),
    ]).then(([o, invites]) => {
      if (!controller.signal.aborted) { setOverview(o); setInvitations(invites); }
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, restaurantId, refreshKey]);

  // Raw invitation tokens are kept only in memory for the current restaurant.
  // Do not clear them on refresh: the invite action itself triggers a refresh.
  useEffect(() => {
    setNewToken('');
    setEmail('');
    setNotice('');
  }, [token, restaurantId]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(t.updated); refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  };
  const roleName = (r: number) => r === 1 ? t.owner : r === 2 ? t.manager : r === 3 ? t.waiter : t.cashier;
  const classInput = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500';
  const classButton = 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        <button className={classInput} onClick={refresh} type="button">{t.refresh}</button>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {notice && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {overview && <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">{t.used}</p>
        <p className="mt-1 text-xl font-bold">{overview.usedEmployees} / {overview.maxEmployees}</p>
      </div>}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">{t.invite}</h2>
        <form className="flex flex-wrap items-end gap-3" onSubmit={e => {
          e.preventDefault();
          void run(async () => {
            setNewToken('');
            const invite = await inviteStaff(token, restaurantId, email, role);
            setNewToken(invite.token); setEmail('');
          });
        }}>
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">{t.email}
            <input className={classInput} type="email" required value={email} onChange={e => setEmail(e.target.value)}/>
          </label>
          <label className="flex flex-col gap-1 text-sm">{t.role}
            <select className={classInput} value={role} onChange={e => setRole(Number(e.target.value) as StaffRole)}>
              {roles.map(r => <option key={r} value={r}>{roleName(r)}</option>)}
            </select>
          </label>
          <button className={classButton} disabled={busy || !restaurantId} type="submit">{t.send}</button>
        </form>
        {newToken && <div className="mt-4 break-all rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="mb-2 text-amber-900">{t.secret}</p>
          <code>{newToken}</code>
          <button className="ml-3 underline" type="button" onClick={() => void navigator.clipboard.writeText(newToken)}>Copy</button>
        </div>}
      </section>
      {overview && <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">{t.employees}</h2>
        {overview.members.length === 0 && <p className="text-sm text-slate-500">{t.noStaff}</p>}
        <div className="divide-y divide-slate-100">
          {overview.members.map(member => <div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{member.firstName} {member.lastName}</p>
              <p className="text-xs text-slate-500">{member.email}</p>
            </div>
            {member.role === 1 ? <span className="text-sm">{t.owner}</span> : <div className="flex items-center gap-2">
              <select className={classInput} value={member.role} disabled={busy} onChange={e => {
                const next = Number(e.target.value) as StaffRole;
                void run(() => changeStaffRole(token, restaurantId, member.userId, next));
              }}>
                {roles.map(r => <option key={r} value={r}>{roleName(r)}</option>)}
              </select>
              <button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
                disabled={busy} onClick={() => {
                  if (window.confirm(t.confirm)) void run(() => removeStaff(token, restaurantId, member.userId));
                }}>{t.remove}</button>
            </div>}
          </div>)}
        </div>
      </section>}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">{t.pending}</h2>
        {invitations.map(invite => <div className="flex items-center justify-between gap-3 border-b py-2 text-sm" key={invite.id}>
          <span>{invite.email} · {roleName(invite.role)}</span>
          <button type="button" className="text-red-600 disabled:opacity-50" disabled={busy}
            onClick={() => void run(() => revokeStaffInvitation(token, restaurantId, invite.id))}>{t.revoke}</button>
        </div>)}
        {invitations.length === 0 && <p className="text-sm text-slate-500">—</p>}
      </section>

    </div>
  );
}
