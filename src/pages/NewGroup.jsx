import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useAuth } from '../auth';
import { DEFAULT_COLUMNS, createGroup } from '../api';

export default function NewGroup() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', date: '', place: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('모임 이름을 적어 주세요.'); return; }
    setBusy(true); setErr('');
    try {
      const gid = await createGroup(user, form);
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
        <div className="field"><label htmlFor="g-date">날짜</label>
          <input id="g-date" maxLength={40} placeholder="예: 2026-11-28 ~ 29" value={form.date} onChange={set('date')} /></div>
        <div className="field"><label htmlFor="g-place">장소</label>
          <input id="g-place" maxLength={60} placeholder="예: 가평" value={form.place} onChange={set('place')} /></div>
        <div className="field"><span className="label">준비물 표의 칸 (양식)</span>
          <div className="cols">{DEFAULT_COLUMNS.map((c) => <span key={c.key} className="chip">{c.label}</span>)}</div>
          <span className="muted">지금은 기본 칸으로 시작해요. 칸 추가는 다음 버전에서 열 예정이에요.</span></div>
        <p className="note">모임을 만든 사람이 모임장이 돼요.</p>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? '만드는 중…' : '모임 만들기'}</button>
      </form>
    </>
  );
}
