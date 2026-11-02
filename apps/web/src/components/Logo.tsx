import Link from "next/link";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <svg width={small ? 26 : 34} height={small ? 17 : 22} viewBox="0 0 34 22" aria-hidden>
        <path d="M2 18 H8 V4 L26 18 V4 H32" fill="none" stroke="var(--violet)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`${small ? "text-lg" : "text-2xl"} font-bold tracking-tight`}>nemi</span>
    </Link>
  );
}
