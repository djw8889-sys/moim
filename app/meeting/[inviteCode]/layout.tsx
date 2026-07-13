import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomTabs from "@/components/BottomTabs";
import InviteShare from "@/components/InviteShare";

export default async function MeetingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { inviteCode: string };
}) {
  const { inviteCode } = params;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/meeting/${inviteCode}`)}`);
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, title")
    .eq("invite_code", inviteCode)
    .maybeSingle();
  if (!meeting) notFound();

  const { data: myMember } = await supabase
    .from("members")
    .select("id")
    .eq("meeting_id", meeting.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!myMember) redirect(`/join/${inviteCode}`);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate text-lg font-extrabold">{meeting.title}</h1>
          <InviteShare inviteCode={inviteCode} />
        </div>
      </header>
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      <BottomTabs inviteCode={inviteCode} />
    </div>
  );
}
