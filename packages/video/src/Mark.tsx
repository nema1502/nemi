import React, { useId } from "react";

/** Nemi's mark: an "n" holding a play button. Used by the web app and inside every video. */
export const NemiMark: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 32, style }) => {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={style} aria-hidden>
      <defs>
        <linearGradient id={`nemi-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B9A2FF" />
          <stop offset="1" stopColor="#7C5CFF" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#nemi-${id})`} />
      <path d="M8.5 24V14.5a7.5 7.5 0 0 1 15 0V24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M14 15.2v6.6a.8.8 0 0 0 1.2.7l5-3.3a.8.8 0 0 0 0-1.4l-5-3.3a.8.8 0 0 0-1.2.7z" fill="#FFC94D" />
    </svg>
  );
};
