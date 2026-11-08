import { History } from "lucide-react";
import { ApplicationList } from "@/components/application-list";

export const dynamic = "force-dynamic";

export default function ApplicationsPage() {
  return (
    <div className="space-y-4">
      <div className="animate-rise">
        <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-white">
          <span className="grid size-8 place-items-center rounded-[4px] border border-[#26405c] bg-[#152a3d]">
            <History className="size-4 text-[#8ec5ff]" />
          </span>
          Application history
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-[#9898a2]">
          Every job, including weak fits — nothing is skipped automatically. Use the pencil to edit
          the subject and body in rich text (bold, links, lists), then send.
        </p>
      </div>

      <ApplicationList />
    </div>
  );
}
