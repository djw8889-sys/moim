import { getMeetingContext } from "@/lib/meeting";
import PhotoUploader from "@/components/PhotoUploader";
import PhotoGrid from "@/components/PhotoGrid";
import type { Photo } from "@/lib/types";

export default async function PhotosPage({
  params,
}: {
  params: { inviteCode: string };
}) {
  const { inviteCode } = params;
  const { supabase, meeting, members, myMember } =
    await getMeetingContext(inviteCode);

  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("meeting_id", meeting.id)
    .order("created_at", { ascending: false });

  const nicknameOf = new Map(members.map((m) => [m.id, m.nickname]));

  const items = ((photos ?? []) as Photo[]).map((p) => ({
    id: p.id,
    storagePath: p.storage_path,
    url: supabase.storage.from("photos").getPublicUrl(p.storage_path).data
      .publicUrl,
    uploader: nicknameOf.get(p.member_id) ?? "?",
    mine: p.member_id === myMember.id,
  }));

  return (
    <div className="space-y-6">
      <PhotoUploader meetingId={meeting.id} inviteCode={inviteCode} />
      {items.length === 0 ? (
        <p className="card text-center text-sm text-gray-500">
          아직 사진이 없어요. 첫 사진을 올려보세요! 📸
        </p>
      ) : (
        <PhotoGrid
          meetingId={meeting.id}
          inviteCode={inviteCode}
          items={items}
        />
      )}
    </div>
  );
}
