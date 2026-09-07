import { NextResponse } from "next/server";
import { alternar } from "@/lib/ha";
import { todasEntidades } from "@/lib/rooms";

// Só permite alternar entidades que estão no manifesto do V1 — evita que a
// rota vire um proxy genérico pra qualquer serviço do HA.
export async function POST(req: Request) {
  const { entityId } = (await req.json()) as { entityId?: string };
  if (!entityId || !todasEntidades.includes(entityId)) {
    return NextResponse.json({ erro: "entityId inválido ou fora do V1" }, { status: 400 });
  }
  try {
    await alternar(entityId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
