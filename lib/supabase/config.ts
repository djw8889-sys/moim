// Supabase 접속 정보.
// anon key는 브라우저에 노출되는 "공개용" 키라서 코드에 기본값으로 둬도 안전합니다
// (실제 데이터 보호는 DB의 RLS 정책이 담당). 환경변수가 있으면 그 값이 우선합니다.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://idwjdjamabkmputrtenl.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2pkamFtYWJrbXB1dHJ0ZW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5Njk3MzEsImV4cCI6MjA5NTU0NTczMX0.bS6zqHao-NKk4dJJRdPqtVAk6ckeyrcaAFV3wrf7DxE";

export const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "";
