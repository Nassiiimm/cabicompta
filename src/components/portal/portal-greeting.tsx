"use client";

import { useEffect, useState } from "react";

export function PortalGreeting({ firstName, companyName }: { firstName: string; companyName: string }) {
  const [greeting, setGreeting] = useState("Bonjour");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Bonjour");
    else if (h < 18) setGreeting("Bon après-midi");
    else setGreeting("Bonsoir");
  }, []);

  return (
    <div>
      <h1 className="text-lg font-semibold">
        {greeting}{firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="text-sm text-muted-foreground">{companyName}</p>
    </div>
  );
}
