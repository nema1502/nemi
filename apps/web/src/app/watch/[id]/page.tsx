import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { Watch } from "./Watch";

export default function WatchPage() {
  return (
    <Suspense fallback={<div className="grid flex-1 place-items-center"><Loader2 className="size-6 animate-spin text-muted" /></div>}>
      <Watch />
    </Suspense>
  );
}
