import { NextResponse } from "next/server";
import { getEstados } from "@/lib/ha";
import { todasEntidades } from "@/lib/rooms";

// Proxy fino: o client pede /api/state, essa rota busca no HA usando o
// token guardado só no servidor e devolve já filtrado pelas entidades do V1
// (16 pontos de light/switch — ver DECISOES-V1.md).
export async function GET() {
  try {
    const estados = await getEstados(todasEntidades);
    return NextResponse.json({ estados, atualizado_em: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
