"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { slug: "place", label: "장소", emoji: "📍" },
  { slug: "money", label: "정산", emoji: "💸" },
  { slug: "schedule", label: "일정", emoji: "🗳️" },
  { slug: "photos", label: "사진", emoji: "📸" },
];

export default function BottomTabs({ inviteCode }: { inviteCode: string }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-lg border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => {
          const href = `/meeting/${inviteCode}/${tab.slug}`;
          const active = pathname === href;
          return (
            <li key={tab.slug}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${
                  active ? "text-brand-600" : "text-gray-400"
                }`}
              >
                <span className="text-xl" aria-hidden>
                  {tab.emoji}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
