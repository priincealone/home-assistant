"use client";

import { useEffect, useState, useCallback } from "react";
import { comodos } from "@/lib/rooms";
import type { EstadoHA } from "@/lib/ha";

type RespostaEstado = {
  estados?: Record<string, EstadoHA | null>;
  atualizado_em?: string;
  erro?: string;
};

// Página de validação do V1: sem planta ainda, só provar que o pipeline
// HA -> Next (API route -> fetch -> toggle) funciona de ponta a ponta pros
// 16 pontos do manifesto, antes de partir pro floorplan visual.
export default function Home() {
  const [dados, setDados] = useState<RespostaEstado>({});
  const [carregando, setCarregando] = useState(true);

  const buscar = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      setDados(await res.json());
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscar();
    const id = setInterval(buscar, 5000);
    return () => clearInterval(id);
  }, [buscar]);

  async function alternar(entityId: string) {
    await fetch("/api/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityId }),
    });
    buscar();
  }

  return (
    <main>
      <h1>Casa — validação V1</h1>
      <p className="legenda">
        {dados.erro
          ? `Erro ao falar com o HA: ${dados.erro}`
          : carregando
          ? "Carregando estados…"
          : `${comodos.filter((c) => !c.vazio).length} cômodos, ${
              comodos.flatMap((c) => c.pontos).length
            } pontos — atualizado ${dados.atualizado_em ? new Date(dados.atualizado_em).toLocaleTimeString("pt-BR") : "—"}`}
      </p>

      <div className="grid">
        {comodos.map((c) => (
          <div key={c.id} className={`comodo${c.vazio ? " vazio" : ""}`}>
            <h2>{c.nome}</h2>
            {c.vazio && <p style={{ fontSize: 12, margin: 0 }}>Sem ponto integrado ainda</p>}
            {c.pontos.map((p) => {
              const estado = dados.estados?.[p.entityId];
              const ligado = estado?.state === "on";
              return (
                <div key={p.id} className="ponto">
                  <span>{p.nome}</span>
                  <button data-on={ligado} onClick={() => alternar(p.entityId)}>
                    {estado ? (ligado ? "Ligado" : "Apagado") : "…"}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="rodape">
        V1 de validação — 16 pontos light/switch, sem planta ainda. Ver DECISOES-V1.md.
      </p>
    </main>
  );
}
