import { percent, progressByMember } from '../progress';

export default function MemberProgress({ items, members, myUid }) {
  const { people, unassigned } = progressByMember(items, members);
  if (people.length === 0 && !unassigned) return null;
  return (
    <section className="people" aria-label="사람별 준비 현황">
      {people.map((p) => {
        const allDone = p.total > 0 && p.done === p.total;
        return (
          <div key={p.key} className={`person ${allDone ? 'is-done' : ''} ${p.key === myUid ? 'is-me' : ''}`}>
            <div className="person-head">
              <b>{p.name}{p.key === myUid && <span className="muted"> (나)</span>}</b>
              <span className="count">{p.done}<span className="muted"> / {p.total}</span></span>
            </div>
            <span className="meter" aria-hidden="true"><i style={{ width: `${percent(p.done, p.total)}%` }} /></span>
            <p className="left">
              {p.total === 0 && <span className="muted">맡은 준비물 없음</span>}
              {allDone && <span className="done">모두 준비 완료</span>}
              {p.left.length > 0 && (
                <>남은 것: {p.left.slice(0, 3).join(', ')}{p.left.length > 3 && ` 외 ${p.left.length - 3}개`}</>
              )}
            </p>
          </div>
        );
      })}
      {unassigned && (
        <div className="person is-warn">
          <div className="person-head">
            <b>담당 미정</b>
            <span className="count">{unassigned.total}<span className="muted">개</span></span>
          </div>
          <p className="left">{unassigned.left.concat([]).slice(0, 3).join(', ') || '모두 준비 완료'}{unassigned.left.length > 3 && ` 외 ${unassigned.left.length - 3}개`}</p>
        </div>
      )}
    </section>
  );
}
