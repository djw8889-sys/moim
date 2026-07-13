import Link from "next/link";

const features = [
  {
    emoji: "🗳️",
    title: "일정 투표",
    desc: "가고 싶은 곳을 후보로 올리고 투표로 결정",
  },
  {
    emoji: "📍",
    title: "중간지점 찾기",
    desc: "각자 출발지의 딱 중간, 주변 맛집·카페 추천",
  },
  {
    emoji: "💸",
    title: "정산",
    desc: "누가 누구에게 얼마 보내면 되는지 자동 계산",
  },
  {
    emoji: "📸",
    title: "사진 공유",
    desc: "모임별 앨범에 추억을 모아요",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col justify-between px-6 py-12">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">
          moim <span aria-hidden>🎉</span>
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          지인 모임의 계획부터 정산까지, 하나로.
        </p>

        <ul className="mt-10 space-y-4">
          {features.map((f) => (
            <li key={f.title} className="card flex items-start gap-4">
              <span className="text-3xl" aria-hidden>
                {f.emoji}
              </span>
              <div>
                <h2 className="font-bold">{f.title}</h2>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12 space-y-3">
        <Link href="/new" className="btn-primary">
          모임 만들기
        </Link>
        <p className="text-center text-sm text-gray-400">
          초대 링크를 받았다면 그 링크로 바로 들어가면 돼요.
        </p>
      </div>
    </main>
  );
}
