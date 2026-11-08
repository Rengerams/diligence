import type { ReactNode } from "react";
import Link from "next/link";

export function PageHeader({
  title,
  intro,
  nextStep,
  actions,
}: {
  title: string;
  intro?: string;
  nextStep?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {intro ? <p>{intro}</p> : null}
        {actions ? <div className="actions">{actions}</div> : null}
      </div>
      {nextStep ? (
        <div className="next-step">
          <strong>Volgende stap</strong>
          <p>{nextStep}</p>
        </div>
      ) : null}
    </div>
  );
}

export function Alert({
  kind = "info",
  children,
}: {
  kind?: "success" | "error" | "warning" | "info";
  children: ReactNode;
}) {
  return <div className={`alert alert-${kind}`}>{children}</div>;
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "success" | "warning";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="btn btn-secondary">
      ← {children}
    </Link>
  );
}
