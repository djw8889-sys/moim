import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="px-6 py-12">
      <h1 className="text-2xl font-extrabold">로그인</h1>
      <p className="mt-2 text-gray-600">
        이메일을 입력하면 <b>로그인 링크</b>를 보내드려요.
        <br />
        비밀번호는 필요 없어요.
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
