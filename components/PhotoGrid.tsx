"use client";

import { useState } from "react";
import { deletePhoto } from "@/lib/actions";

type Item = {
  id: string;
  storagePath: string;
  url: string;
  uploader: string;
  mine: boolean;
};

export default function PhotoGrid({
  meetingId,
  inviteCode,
  items,
}: {
  meetingId: string;
  inviteCode: string;
  items: Item[];
}) {
  const [viewing, setViewing] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(item: Item) {
    if (!confirm("이 사진을 삭제할까요?")) return;
    setDeleting(true);
    try {
      await deletePhoto(meetingId, inviteCode, item.id, item.storagePath);
      setViewing(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setViewing(item)}
            className="aspect-square overflow-hidden rounded-lg bg-gray-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={`${item.uploader}의 사진`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => setViewing(null)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm">{viewing.uploader}</span>
            <button className="text-2xl leading-none">✕</button>
          </div>
          <div className="flex flex-1 items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewing.url}
              alt={`${viewing.uploader}의 사진`}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          {viewing.mine && (
            <div className="p-4 text-center">
              <button
                disabled={deleting}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(viewing);
                }}
                className="text-sm text-red-400 underline"
              >
                {deleting ? "삭제 중..." : "이 사진 삭제"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
