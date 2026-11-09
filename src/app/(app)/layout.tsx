import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can, canAny } from "@/lib/permissions";
import { FeedbackLink } from "@/components/feedback-link";

const NAV: {
  href: string;
  label: string;
  permission?: string;
  any?: string[];
}[] = [
  { href: "/", label: "Start" },
  { href: "/deelnemers", label: "Deelnemers", permission: "participants.view" },
  { href: "/groepjes", label: "Groepjes", permission: "groups.manage" },
  { href: "/uitjes", label: "Evenementen", any: ["program.view", "own.outings"] },
  { href: "/locaties", label: "Locaties", permission: "program.manage" },
  { href: "/opgave", label: "Opgave", permission: "signups.manage" },
  { href: "/indeling", label: "Indeling", permission: "allocation.manage" },
  { href: "/voertuigen", label: "Voertuigen", any: ["vehicles.view", "vehicles.manage"] },
  { href: "/meldingen", label: "Meldingen", permission: "program.manage" },
  { href: "/bellen", label: "Bellijst", permission: "calls.manage" },
  { href: "/berichten", label: "E-mail", permission: "messages.manage" },
  { href: "/wijzigingen", label: "Wijzigingen", permission: "audit.view" },
  { href: "/gebruikers", label: "Gebruikers", permission: "users.manage" },
  { href: "/rollen", label: "Rollen", permission: "roles.manage" },
  { href: "/hulp", label: "Hulp" },
];

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.mfaVerified) redirect("/login/2fa");

  const nav = NAV.filter((item) => {
    if (item.permission) return can(user, item.permission);
    if (item.any) return canAny(user, item.any);
    return true;
  }).map((item) =>
    item.href === "/uitjes" && can(user, "own.outings") && !can(user, "program.view")
      ? { ...item, label: "Mijn evenementen" }
      : item,
  );

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-trim.png" alt="Logo Stichting Diligence Almere" width={162} height={101} />
            <span className="brand-text">
              <strong>Diligence Beheer</strong>
              <span>Evenementen voor 55-plussers in Almere</span>
            </span>
          </Link>

          <div className="user-box">
            <div className="who">
              <strong>{user.name}</strong>
              <span>{user.roleName}</span>
            </div>
            <FeedbackLink />
            <Link className="btn btn-secondary" href="/account/beveiliging">
              Beveiliging
            </Link>
            <form action="/api/logout" method="post">
              <button className="btn btn-secondary" type="submit">
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="nav" aria-label="Hoofdmenu">
        <div className="nav-inner">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="container">{children}</main>
    </>
  );
}
