import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { KitView } from "./KitView";

export default function KitPage() {
  return (
    <Suspense fallback={<div className="grid flex-1 place-items-center"><Loader2 className="size-6 animate-spin text-muted" /></div>}>
      <KitView />
    </Suspense>
  );
}
