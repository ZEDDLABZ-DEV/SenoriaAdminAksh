"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/ui";
import { fullName } from "@/lib/format";
import { SCHEDULE_TEXT } from "@/lib/schedule";

const links = [
  { href: "/home", label: "Home" },
  { href: "/clients", label: "Clients" },
  { href: "/schedule", label: SCHEDULE_TEXT.nav },
  { href: "/appointments", label: "Appointments" },
  { href: "/doctor-appointments", label: "Doctor appointments" },
  { href: "/caregivers", label: "Caregivers" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const name = fullName(user?.firstName, user?.lastName, user?.email || "Admin");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="bg-ink text-paper lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-5 py-6">
          <p className="font-display text-3xl leading-none text-white">Senoria</p>
          <p className="mt-1 text-xs tracking-[0.18em] text-paper/70 uppercase">Admin portal</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:block lg:space-y-1 lg:px-3">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
                  active ? "bg-white/15 text-white" : "text-paper/75 hover:bg-white/10 hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-paper/90 px-6 backdrop-blur">
          <p className="text-sm text-muted">Senoria Seniors</p>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{name}</span>
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-pine hover:bg-moss"
              onClick={() => setConfirming(true)}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="px-6 py-6">{children}</main>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Sign out?"
        body="This revokes the refresh token for this sign-in."
        confirmLabel="Sign out"
        pending={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setPending(true);
          void logout().finally(() => setPending(false));
        }}
      />
    </div>
  );
}
