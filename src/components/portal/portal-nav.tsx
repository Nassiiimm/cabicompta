"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderOpen, Receipt, User } from "lucide-react";

const NAV = [
  { href: "/portal", label: "Accueil", icon: Home },
  { href: "/portal/documents", label: "Documents", icon: FolderOpen },
  { href: "/portal/invoices", label: "Factures", icon: Receipt },
  { href: "/portal/profile", label: "Profil", icon: User },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-xl">
      <div className="max-w-2xl mx-auto px-0 flex items-stretch h-16">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`size-5 ${active ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
