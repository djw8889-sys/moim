"use client";

import { useEffect, useRef, useState } from "react";
import { saveOrigin, deleteOrigin } from "@/lib/actions";
import type { Origin } from "@/lib/types";

declare global {
  interface Window {
    kakao: any;
  }
}

type MemberOption = { id: string; nickname: string };
type SearchResult = {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // lng
  y: string; // lat
};
type Recommended = SearchResult & {
  category_group_code: string;
  place_url: string;
  distance: string;
};

function loadKakaoSdk(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps?.services) {
      resolve();
      return;
    }
    const existing = document.getElementById("kakao-sdk");
    if (existing) {
      existing.addEventListener("load", () =>
        window.kakao.maps.load(() => resolve())
      );
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-sdk";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = () => reject(new Error("카카오맵 로드 실패"));
    document.head.appendChild(script);
  });
}

export default function PlaceTab({
  meetingId,
  inviteCode,
  myMemberId,
  members,
  origins,
  kakaoKey,
}: {
  meetingId: string;
  inviteCode: string;
  myMemberId: string;
  members: MemberOption[];
  origins: Origin[];
  kakaoKey: string;
}) {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recommended, setRecommended] = useState<Recommended[]>([]);
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const nicknameOf = new Map(members.map((m) => [m.id, m.nickname]));
  const myOrigin = origins.find((o) => o.member_id === myMemberId);

  // 중간지점 = 출발지 좌표들의 산술평균
  const midpoint =
    origins.length >= 2
      ? {
          lat: origins.reduce((a, o) => a + o.lat, 0) / origins.length,
          lng: origins.reduce((a, o) => a + o.lng, 0) / origins.length,
        }
      : null;

  useEffect(() => {
    if (!kakaoKey) return;
    loadKakaoSdk(kakaoKey)
      .then(() => setSdkReady(true))
      .catch(() => setSdkError(true));
  }, [kakaoKey]);

  // 지도 그리기
  useEffect(() => {
    if (!sdkReady || !mapRef.current || origins.length === 0) return;
    const kakao = window.kakao;
    const center = midpoint ?? { lat: origins[0].lat, lng: origins[0].lng };
    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(center.lat, center.lng),
      level: 7,
    });

    const bounds = new kakao.maps.LatLngBounds();
    origins.forEach((o) => {
      const pos = new kakao.maps.LatLng(o.lat, o.lng);
      const marker = new kakao.maps.Marker({ map, position: pos });
      new kakao.maps.InfoWindow({
        content: `<div style="padding:2px 8px;font-size:12px;">${
          nicknameOf.get(o.member_id) ?? "?"
        }</div>`,
      }).open(map, marker);
      bounds.extend(pos);
    });

    if (midpoint) {
      const pos = new kakao.maps.LatLng(midpoint.lat, midpoint.lng);
      const marker = new kakao.maps.Marker({ map, position: pos });
      new kakao.maps.InfoWindow({
        content: `<div style="padding:2px 8px;font-size:12px;font-weight:bold;color:#ea580c;">⭐ 중간지점</div>`,
      }).open(map, marker);
      bounds.extend(pos);
      map.setBounds(bounds, 40);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, JSON.stringify(origins)]);

  // 중간지점 주변 추천 장소 (카페 CE7 + 음식점 FD6)
  useEffect(() => {
    if (!sdkReady || !midpoint) return;
    const kakao = window.kakao;
    const places = new kakao.maps.services.Places();
    const loc = new kakao.maps.LatLng(midpoint.lat, midpoint.lng);
    const collected: Recommended[] = [];
    let done = 0;

    const finish = () => {
      done += 1;
      if (done === 2) {
        collected.sort((a, b) => Number(a.distance) - Number(b.distance));
        setRecommended(collected.slice(0, 12));
      }
    };

    (["CE7", "FD6"] as const).forEach((code) => {
      places.categorySearch(
        code,
        (data: Recommended[], status: string) => {
          if (status === kakao.maps.services.Status.OK) {
            collected.push(...data.slice(0, 8));
          }
          finish();
        },
        { location: loc, radius: 2000, sort: kakao.maps.services.SortBy.DISTANCE }
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, midpoint?.lat, midpoint?.lng]);

  function search() {
    if (!sdkReady || !query.trim()) return;
    const kakao = window.kakao;
    const places = new kakao.maps.services.Places();
    places.keywordSearch(query, (data: SearchResult[], status: string) => {
      if (status === kakao.maps.services.Status.OK) {
        setResults(data.slice(0, 5));
      } else {
        setResults([]);
      }
    });
  }

  async function pickOrigin(r: SearchResult) {
    setSaving(true);
    const formData = new FormData();
    formData.set("meetingId", meetingId);
    formData.set("inviteCode", inviteCode);
    formData.set("address", r.place_name || r.road_address_name || r.address_name);
    formData.set("lat", r.y);
    formData.set("lng", r.x);
    try {
      await saveOrigin(formData);
      setResults([]);
      setQuery("");
    } finally {
      setSaving(false);
    }
  }

  if (!kakaoKey) {
    return (
      <div className="card text-sm leading-relaxed text-gray-600">
        <p className="font-bold">🗺️ 카카오맵 키가 아직 없어요</p>
        <p className="mt-2">
          중간지점 기능을 쓰려면{" "}
          <a
            href="https://developers.kakao.com"
            className="text-brand-600 underline"
            target="_blank"
          >
            카카오 개발자 콘솔
          </a>
          에서 JavaScript 키를 발급받아{" "}
          <code className="rounded bg-gray-100 px-1">
            NEXT_PUBLIC_KAKAO_MAP_KEY
          </code>{" "}
          환경변수에 넣고, 콘솔의 <b>플랫폼 &gt; Web 사이트 도메인</b>에 이
          사이트 주소를 등록해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="font-bold">
          내 출발지 {myOrigin && <span className="text-sm font-normal text-gray-500">— {myOrigin.address}</span>}
        </h2>
        <div className="mt-3 flex gap-2">
          <input
            className="input"
            placeholder="예: 강남역, 우리집 주소..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button
            onClick={search}
            disabled={!sdkReady}
            className="shrink-0 rounded-xl bg-brand-500 px-4 font-bold text-white disabled:opacity-50"
          >
            검색
          </button>
        </div>
        {sdkError && (
          <p className="mt-2 text-sm text-red-500">
            카카오맵을 불러오지 못했어요. 카카오 콘솔에 이 사이트 도메인이
            등록됐는지 확인해주세요.
          </p>
        )}
        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  disabled={saving}
                  onClick={() => pickOrigin(r)}
                  className="block w-full px-3 py-2.5 text-left text-sm active:bg-brand-50"
                >
                  <span className="font-semibold">{r.place_name}</span>
                  <span className="block text-xs text-gray-400">
                    {r.road_address_name || r.address_name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {myOrigin && (
          <button
            onClick={() => deleteOrigin(meetingId, inviteCode)}
            className="mt-2 text-xs text-gray-400 underline"
          >
            내 출발지 삭제
          </button>
        )}
      </section>

      <section>
        <h2 className="mb-2 px-1 font-bold">
          출발지 등록 현황{" "}
          <span className="text-gray-400">
            {origins.length}/{members.length}명
          </span>
        </h2>
        <ul className="card space-y-1 text-sm">
          {members.map((m) => {
            const o = origins.find((x) => x.member_id === m.id);
            return (
              <li key={m.id} className="flex justify-between gap-2">
                <span className="font-semibold">{m.nickname}</span>
                <span className="truncate text-gray-500">
                  {o ? o.address : "아직 미등록"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {origins.length >= 2 ? (
        <>
          <section>
            <h2 className="mb-2 px-1 font-bold">⭐ 중간지점</h2>
            <div
              ref={mapRef}
              className="h-64 w-full overflow-hidden rounded-2xl border border-gray-200"
            />
          </section>

          <section>
            <h2 className="mb-2 px-1 font-bold">주변 추천 장소 ☕🍚</h2>
            {recommended.length === 0 ? (
              <p className="card text-center text-sm text-gray-500">
                중간지점 근처 장소를 찾는 중이거나, 2km 안에 결과가 없어요.
              </p>
            ) : (
              <ul className="space-y-2">
                {recommended.map((p, i) => (
                  <li key={i} className="card py-3">
                    <a href={p.place_url} target="_blank" className="block">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {p.category_group_code === "CE7" ? "☕" : "🍚"}{" "}
                          {p.place_name}
                        </span>
                        <span className="shrink-0 text-xs text-gray-400">
                          {Number(p.distance).toLocaleString()}m
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {p.road_address_name || p.address_name}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <p className="card text-center text-sm text-gray-500">
          2명 이상 출발지를 등록하면 중간지점이 표시돼요.
        </p>
      )}
    </div>
  );
}
