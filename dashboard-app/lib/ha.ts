// Cliente HA server-side. Nunca importar isto em um componente "use client" —
// o token de longa duração não pode chegar ao navegador. As rotas em
// app/api/*/route.ts são o único ponto de contato entre o front e o HA.

export type EstadoHA = {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
};

function config() {
  const url = process.env.HA_URL;
  const token = process.env.HA_TOKEN;
  if (!url || !token) {
    throw new Error(
      "HA_URL/HA_TOKEN ausentes. Copie dashboard-app/.env.local.example para " +
        ".env.local e preencha (mesmos valores de config/secrets.yaml)."
    );
  }
  return { url: url.replace(/\/$/, ""), token };
}

/** GET /api/states — todos os estados. Usar getEstados(entityIds) quando só
 * precisar de um subconjunto (evita puxar as ~250 entidades da casa toda vez). */
export async function getTodosEstados(): Promise<EstadoHA[]> {
  const { url, token } = config();
  const res = await fetch(`${url}/api/states`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`HA respondeu ${res.status} em /api/states`);
  }
  return res.json();
}

/** Estado de uma lista específica de entidades (usa GET /api/states/<id> em
 * paralelo — mais barato que puxar a casa toda quando o V1 só cobre 16 pontos). */
export async function getEstados(entityIds: string[]): Promise<Record<string, EstadoHA | null>> {
  const { url, token } = config();
  const entries = await Promise.all(
    entityIds.map(async (id) => {
      const res = await fetch(`${url}/api/states/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 404) return [id, null] as const;
      if (!res.ok) throw new Error(`HA respondeu ${res.status} em /api/states/${id}`);
      return [id, (await res.json()) as EstadoHA] as const;
    })
  );
  return Object.fromEntries(entries);
}

/** Alterna um light/switch (POST /api/services/<domain>/toggle). */
export async function alternar(entityId: string): Promise<void> {
  const { url, token } = config();
  const dominio = entityId.split(".")[0];
  const res = await fetch(`${url}/api/services/${dominio}/toggle`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entity_id: entityId }),
  });
  if (!res.ok) {
    throw new Error(`HA respondeu ${res.status} ao alternar ${entityId}`);
  }
}
