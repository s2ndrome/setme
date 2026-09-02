# setme

Vercel(정적 프론트엔드 + Serverless Functions) + Vercel Postgres 기반 개인홈 커스터마이징 플랫폼.

## 개발 환경 실행

```bash
npm install
npm run dev
```

`npm run dev`는 정적 프론트엔드만 띄웁니다. `/api` 아래 Serverless Functions까지 함께
실행하려면 [Vercel CLI](https://vercel.com/docs/cli)로 `vercel dev`를 사용하세요.

## 배포 (Vercel)

1. Vercel 프로젝트에 이 저장소를 연결 (GitHub 연동, `main` 브랜치에 push할 때마다 자동 배포)
2. Vercel 프로젝트 → **Storage** 탭 → **Create Database** → **Postgres** 생성 후 이 프로젝트에 연결
   (연결하면 `POSTGRES_URL` 등 필요한 환경변수가 자동으로 주입됩니다)
3. `schema.sql`을 한 번 실행해서 테이블 생성 (Vercel 대시보드의 쿼리 편집기 또는 `psql "$POSTGRES_URL" -f schema.sql`)
4. 프로젝트 → **Settings → Environment Variables**에 `JWT_SECRET` 추가 (로그인 세션 서명용, 임의의 긴 랜덤 문자열)
5. 재배포

## 진행 상태

- **Phase 1 (완료)**: 이메일/비밀번호 회원가입·로그인(자체 구축, Vercel Postgres), `/@username` 라우팅, 기본 프로필/홈 뷰
- Phase 2: 꾸미기 모드(자유 배치 캔버스), 배경/저장
- Phase 3: 페이지/메뉴, 게시판, 방명록, 위젯
- Phase 4: 테마, HTML/CSS 직접 편집 모드, 스티커, 음악
- Phase 5: Undo/Redo, 성능 최적화, 모바일 최적화
