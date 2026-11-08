"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FeedbackLink() {
  const pathname = usePathname();
  return (
    <Link
      className="btn btn-secondary"
      href={`/feedback?from=${encodeURIComponent(pathname)}`}
    >
      Feedback
    </Link>
  );
}
