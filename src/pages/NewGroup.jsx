import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useAuth } from '../auth';
import { copyItemsFrom, createGroup, watchMyGroups } from '../api';
import { TEMPLATES, itemsFromTemplate } from '../templates';
import { NIGHT_OPTIONS, formatTrip, nightsLabel } from '../dates';

export default function NewGroup() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', startDate: '', nights: 1, place: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pick, setPick] = useState('camp'); // 템플릿 id 또는 'copy:<모임 id>'
  const [past, setPast] = useState([]);
  useEffect(() => watchMyGroups(user.uid, (rows) => setPast(rows.slice(0, 3)), () => setPast([])), [user.uid]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('모임 이름을 적어 주세요.'); return; }
    setBusy(true); setErr('');
    try {
      const tpl = pick.startsWith('copy:') ? await copyItemsFrom(pick.slice(5)) : TEMPLATES[pick];
      const gid = await createGroup(user, form, itemsFromTemplate(tpl));
      nav(`/g/${gid}`, { replace: true });
    } catch (e2) {
      setErr(`모임을 만들지 못했어요. ${e2.message}`);
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar title="새 모임 만들기" back="/" />
      <form className="screen" onSubmit={submit}>
        <div className="field"><label htmlFor="g-name">모임 이름</label>
          <input id="g-name" maxLength={60} placeholder="예: 가을 캠핑" value={form.name} onChange={set('name')} /></div>
        <div className="daterow">
          <div className="field"><label htmlFor="g-date">출발일</label>
            <input id="g-date" type="date" value={form.startDate} onChange={set('startDate')} /></div>
          <div className="field"><label htmlFor="g-nights">일정</label>
            <select id="g-nights" value={form.nights} onChange={(e) => setForm({ ...form, nights: Number(e.target.value) })}>
              {NIGHT_OPTIONS.map((n) => <option key={n} value={n}>{nightsLabel(n)}</option>)}
            </select></div>
        </div>
        {form.startDate && <p className="muted trip">{formatTrip(form.startDate, form.nights)}</p>}
        <div className="field"><label htmlFor="g-place">장소</label>
          <input id="g-place" maxLength={60} placeholder="예: 가평" value={form.place} onChange={set('place')} /></div>
        <div className="field"><span className="label">준비물 목록으로 시작하기</span>
          <div className="tpls" role="radiogroup" aria-label="준비물 템플릿">
            {Object.values(TEMPLATES).map((t) => (
              <TplCard key={t.id} on={pick === t.id} onPick={() => setPick(t.id)} title={t.name}
                sub={t.id === 'blank' ? '항목 없이 시작' : `공용 ${t.shared.length} · 개인 ${t.personal.length}`} />
            ))}
            {past.map((g) => (
              <TplCard key={g.id} on={pick === `copy:${g.id}`} onPick={() => setPick(`copy:${g.id}`)}
                title={`지난 모임 복사: ${g.name}`} sub="담당자·체크는 비우고 품목만 가져와요" />
            ))}
          </div>
          <span className="muted">만든 뒤에도 모임장이 자유롭게 고치고 지울 수 있어요.</span></div>
        <p className="note">모임을 만든 사람이 모임장이 돼요.</p>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? '만드는 중…' : '모임 만들기'}</button>
      </form>
    </>
  );
}

function TplCard({ on, onPick, title, sub }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={`tpl${on ? ' on' : ''}`} onClick={onPick}>
      <b>{title}</b><span>{sub}</span>
    </button>
  );
}
