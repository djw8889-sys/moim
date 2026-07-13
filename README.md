# moim 🎉

지인들과의 소규모 모임/여행을 위한 웹앱 (모바일 PWA 우선).
하나의 모임 안에서 **일정 투표 · 정산 · 중간지점 찾기 · 사진 공유** 4개 기능이 이어집니다.

## 기술 스택

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (DB + Auth 매직링크 + Storage)
- 카카오맵 JavaScript API (지도/장소검색)
- 배포: Vercel

## 화면 구조

- `/` : 랜딩 + 모임 만들기
- `/login` : 이메일 매직링크 로그인 (비밀번호 없음)
- `/meeting/[초대코드]` : 모임 홈. 하단 탭 4개 (장소 · 정산 · 일정 · 사진)
- 초대는 링크 공유 방식: `/meeting/[초대코드]` 링크를 받은 사람이 로그인 → 닉네임 입력 → 즉시 참여

## 환경변수

`.env.local` 파일 (로컬) 과 Vercel 프로젝트 환경변수 (배포) 에 아래 3개를 등록합니다.

```
NEXT_PUBLIC_SUPABASE_URL=      # Supabase 대시보드 > Settings > API > Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase 대시보드 > Settings > API > anon public 키
NEXT_PUBLIC_KAKAO_MAP_KEY=     # 카카오 개발자 콘솔 > 앱 키 > JavaScript 키
```

## 처음 설정 (한 번만)

### 1. Supabase 데이터베이스

`supabase/migrations/0001_init.sql` 이 테이블 8개 + RLS(모임 멤버만 읽기/쓰기) +
사진용 Storage 버킷을 만듭니다. (이미 적용되어 있다면 건너뜀)

### 2. Supabase 매직링크 리디렉션 URL 등록

매직링크 이메일의 링크가 우리 사이트로 돌아오게 하려면 URL 등록이 필요합니다.

1. [Supabase 대시보드](https://supabase.com/dashboard) → 프로젝트 선택
2. 왼쪽 메뉴 **Authentication → URL Configuration**
3. **Site URL** 에 배포 주소 입력: `https://moim-jinwoos-projects-a80cfa27.vercel.app`
4. **Redirect URLs** 에 아래 두 줄 추가:
   - `http://localhost:3000/**`
   - `https://moim-jinwoos-projects-a80cfa27.vercel.app/**`

### 3. 카카오맵 JavaScript 키

1. https://developers.kakao.com → 내 애플리케이션 → 애플리케이션 추가
2. **앱 키 → JavaScript 키** 복사 → `NEXT_PUBLIC_KAKAO_MAP_KEY` 에 입력
3. **플랫폼 → Web → 사이트 도메인** 에 `http://localhost:3000` 과 배포 주소 등록

카카오 키가 없어도 나머지 기능(투표/정산/사진)은 모두 동작합니다.
장소 탭에만 안내 문구가 표시됩니다.

## 로컬 실행

```bash
npm install
npm run dev
# http://localhost:3000
```

## 정산 계산 규칙

- 분담은 기본 1/N (특정 멤버 제외 가능), 금액 직접 지정도 지원
- 원 단위 계산, 1/N 잔돈은 결제자에게 귀속
- 각자 순잔액을 구해 (+)와 (−)를 매칭 → **최소 송금 횟수** 목록 출력 (서버에서 계산)

## 중간지점 규칙 (v1)

- 출발지 좌표들의 산술평균을 중간지점으로 표시
- 중간지점 반경 2km의 카페(CE7)/음식점(FD6)을 카카오 장소검색으로 추천
- 실제 소요시간 기반 중간지점은 v2 과제
