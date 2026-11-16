# Plan-Gathering (모임 준비물)

모임(예: 캠핑)을 만들고, 멤버마다 맡은 준비물을 각자 채우면 모두가 엑셀표처럼 한 화면에서 확인하는 웹앱입니다.

## 역할

| 할 수 있는 일 | 모임장 | 쓰기 멤버 | 읽기 멤버 |
| --- | --- | --- | --- |
| 표 보기 | O | O | O |
| 내 담당 줄의 수량·준비 완료·메모 쓰기 | O | O | X |
| 항목 추가·삭제, 담당자 지정, 남의 줄 수정 | O | X | X |
| 초대 링크 만들기, 멤버 권한 바꾸기·내보내기, 모임 삭제 | O | X | X |

초대 링크로 들어온 사람은 읽기 멤버로 합류하고, 모임장이 쓰기 멤버로 올려 줍니다. 권한은 화면뿐 아니라 `firestore.rules`(Firebase 보안 규칙)로 서버에서도 막습니다.

## 구성

- 화면: React + Vite (`src/`)
- 로그인: Firebase Authentication (Google)
- 데이터: Cloud Firestore (`groups/{모임}`, `groups/{모임}/members/{사용자}`, `groups/{모임}/items/{항목}`, `invites/{코드}`)
- 배포: Firebase Hosting (`firebase.json`)

## 명령어

```bash
npm install          # 처음 한 번
npm run dev          # 내 컴퓨터에서 실행 (http://localhost:5173)
npm run build        # 배포용 파일 만들기 (dist/)
npm run test:rules   # 보안 규칙 테스트 (Java 필요, Firestore 에뮬레이터 사용)
npx firebase login   # 배포 전에 한 번
npm run deploy       # 빌드 후 Hosting, 보안 규칙, 인덱스를 함께 배포
```
