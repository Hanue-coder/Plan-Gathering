// 모임을 만들 때 고를 수 있는 준비물 템플릿.
// shared: 한 명이 챙기는 공용 준비물 / personal: 모두가 각자 챙기는 개인 준비물
export const TEMPLATES = {
  camp: {
    id: 'camp',
    name: '1박 2일 캠핑',
    shared: ['텐트 (4인용)', '타프', '버너 + 가스', '코펠 세트', '아이스박스', '랜턴', '캠핑 의자', '고기 · 식재료', '쓰레기봉투'],
    personal: ['침낭', '세면도구', '갈아입을 옷', '개인 약', '보조배터리', '우비'],
  },
  hike: {
    id: 'hike',
    name: '당일 등산',
    shared: ['구급상자', '간식 나눔', '돗자리'],
    personal: ['등산화', '물 1L', '모자', '장갑'],
  },
  blank: { id: 'blank', name: '빈 목록으로 시작', shared: [], personal: [] },
};

/** 템플릿의 이름 목록을 Firestore 항목 문서 목록으로 바꾸기 (순서 포함) */
export function itemsFromTemplate(tpl) {
  let order = 1;
  return [
    ...tpl.shared.map((s) => {
      const it = typeof s === 'string' ? { name: s, qty: 1 } : s;
      return { kind: 'shared', name: it.name, qty: it.qty || 1, order: order++ };
    }),
    ...tpl.personal.map((name) => ({ kind: 'personal', name, order: order++ })),
  ];
}
