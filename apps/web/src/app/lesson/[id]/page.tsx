import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { Studio } from "./Studio";

export default function LessonPage() {
  return (
    <Suspense fallback={<div className="grid flex-1 place-items-center"><Loader2 className="size-6 animate-spin text-muted" /></div>}>
      <Studio />
    </Suspense>
  );
}
