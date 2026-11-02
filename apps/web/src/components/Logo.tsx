"use client";

import { NemiMark } from "@nemi/video/mark";
import Link from "next/link";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <NemiMark size={small ? 26 : 32} />
      <span className={`${small ? "text-lg" : "text-2xl"} font-bold tracking-tight`}>nemi</span>
    </Link>
  );
}
