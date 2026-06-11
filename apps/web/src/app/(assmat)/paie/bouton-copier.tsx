"use client";

import { useState } from "react";

/** Bouton « copier » d'un champ de la déclaration Pajemploi (US-9.3). */
export function BoutonCopier({ valeur }: { valeur: string | number }) {
  const [copie, setCopie] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(String(valeur));
        setCopie(true);
        setTimeout(() => setCopie(false), 1500);
      }}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        copie ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-700 active:bg-zinc-200"
      }`}
    >
      {copie ? "Copié ✓" : "Copier"}
    </button>
  );
}
