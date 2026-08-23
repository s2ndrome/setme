# setme

Firebase 기반 개인홈 커스터마이징 플랫폼.

## 개발 환경 실행

```bash
npm install
npm run dev
```

## Firebase 배포

```bash
npm run build
npx firebase-tools deploy
```

## 진행 상태

- **Phase 1 (완료)**: Firebase 연동, 회원가입/로그인, `/@username` 라우팅, 기본 프로필/홈 뷰, Firestore 구조, Security Rules
- Phase 2: 꾸미기 모드(자유 배치 캔버스), 배경/저장
- Phase 3: 페이지/메뉴, 게시판, 방명록, 위젯
- Phase 4: 테마, HTML/CSS 직접 편집 모드, 스티커, 음악
- Phase 5: Undo/Redo, 성능 최적화, 모바일 최적화
