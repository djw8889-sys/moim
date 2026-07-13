"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addPhotoRecord } from "@/lib/actions";

export default function PhotoUploader({
  meetingId,
  inviteCode,
}: {
  meetingId: string;
  inviteCode: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setError("");
    const supabase = createClient();

    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`${i + 1}/${files.length} 업로드 중...`);
        const file = files[i];
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${meetingId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(path, file, { contentType: file.type || "image/jpeg" });
        if (uploadError) throw new Error(uploadError.message);

        await addPhotoRecord(meetingId, inviteCode, path);
      }
    } catch (err) {
      setError(
        `업로드 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
      );
    } finally {
      setUploading(false);
      setProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleFiles}
      />
      <button
        className="btn-primary"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? progress || "업로드 중..." : "📸 사진 올리기"}
      </button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
