import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl" aria-hidden>
        🧐
      </p>
      <h1 className="mt-4 text-xl font-extrabold">
        페이지를 찾을 수 없어요
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        초대 링크가 정확한지 다시 확인해주세요.
      </p>
      <Link href="/" className="btn-primary mt-8 w-auto px-8">
        홈으로
      </Link>
    </main>
  );
}
