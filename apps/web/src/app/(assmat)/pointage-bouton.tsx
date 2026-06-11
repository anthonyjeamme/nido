"use client";

import { useEffect, useState, useTransition } from "react";
import { pointer } from "./journee-actions";

interface PointageEnAttente {
  contractId: string;
  childId: string;
  type: "in" | "out";
  horodatageDevice: string;
}

const CLE_FILE = "nido.pointages.attente";

function lireFile(): PointageEnAttente[] {
  try {
    return JSON.parse(localStorage.getItem(CLE_FILE) ?? "[]");
  } catch {
    return [];
  }
}

function ecrireFile(file: PointageEnAttente[]) {
  localStorage.setItem(CLE_FILE, JSON.stringify(file));
}

async function envoyer(p: PointageEnAttente) {
  const fd = new FormData();
  fd.set("contract_id", p.contractId);
  fd.set("child_id", p.childId);
  fd.set("type", p.type);
  fd.set("horodatage_device", p.horodatageDevice);
  await pointer(fd);
}

/** Vide la file d'attente hors ligne (appelé au retour du réseau). */
async function viderFile() {
  let file = lireFile();
  while (file.length > 0) {
    const premier = file[0]!;
    try {
      await envoyer(premier);
      file = file.slice(1);
      ecrireFile(file);
    } catch {
      return; // toujours hors ligne, on réessaiera
    }
  }
}

/**
 * Pointage 1 tap, tolérant au réseau (US-3.2, specs §7.2) :
 * en cas d'échec réseau, le pointage est mis en file locale et
 * resynchronisé dès le retour en ligne (l'horodatage device est
 * conservé en métadonnée, l'horodatage serveur fait foi).
 */
export function PointageBouton({
  contractId,
  childId,
  type,
  label,
}: {
  contractId: string;
  childId: string;
  type: "in" | "out";
  label: string;
}) {
  const [enAttente, setEnAttente] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const flush = () => void viderFile();
    window.addEventListener("online", flush);
    flush();
    return () => window.removeEventListener("online", flush);
  }, []);

  const onClick = () => {
    startTransition(async () => {
      const p: PointageEnAttente = {
        contractId,
        childId,
        type,
        horodatageDevice: new Date().toISOString(),
      };
      try {
        await envoyer(p);
        setEnAttente(false);
      } catch {
        ecrireFile([...lireFile(), p]);
        setEnAttente(true);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`h-12 flex-1 rounded-xl font-medium text-white transition active:scale-[0.98] disabled:opacity-60 ${
        type === "in" ? "bg-emerald-600" : "bg-zinc-700"
      }`}
    >
      {pending ? "…" : enAttente ? "En attente de réseau ⏳" : label}
    </button>
  );
}
