/**
 * Helper s3ir bach ma-t3awed-ch dak l-crash :
 *
 *   SyntaxError: Unexpected token 'I', "Internal S"... is not valid JSON
 *
 * 3LACH KAN KAY-WQE3 : mnin l-backend (Spring) ykoun m-blokiy wla m-7eyyed,
 * l'proxy /api dyal Next.js kay-rje3 "Internal Server Error" b7al TEXTE BRUT
 * (machi JSON). L-code kan kay-dir `await res.json()` direct bla ma y-chouf
 * `res.ok`, donc l-parsing kay-tfe9e3 w l-UI kat-b9a mcherda.
 *
 * Daba : kan-chekiw l-statut, w kan-rje3 Error b message m-fhoum.
 *
 * ⚠️ TOUJOURS khdem b URL relative ("/api/...") : hakka kat-douz mn l'proxy
 *    dyal Next.js. Ma-t-7ett-ch "http://10.10.10.25:8082" b l-yedd — l-port
 *    8082 ma-dem-ch maftou7 l-berra, w kat-tay7 les requetes merra merra.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function describe(status: number, body: string): string {
  const trimmed = body.trim();

  // L'proxy dyal Next.js kay-rje3 hada mnin l-backend ma-kay-jawbch
  if (status >= 500 && /^internal server error/i.test(trimmed)) {
    return "Le serveur backend ne répond pas (il redémarre ou il est saturé). Réessayez dans un instant.";
  }
  if (status === 429) {
    return trimmed || "Serveur occupé : un autre traitement lourd est en cours.";
  }
  if (status === 503) {
    return trimmed || "Service momentanément indisponible.";
  }

  // Ila kan JSON b champ "error", n-khrjou dak l-message
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.error) return String(parsed.error);
      if (parsed?.message) return String(parsed.message);
    } catch {
      /* ma-kan-ch JSON s7i7, kan-kemmlou */
    }
  }

  return `Erreur serveur ${status}${trimmed ? ` : ${trimmed.slice(0, 200)}` : ""}`;
}

/** fetch + verification dyal res.ok + parsing JSON b 7imaya. */
export async function apiJson<T = any>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body, describe(res.status, body));
  }

  const text = await res.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      res.status,
      text,
      "Réponse illisible du serveur (ce n'est pas du JSON). Le backend est probablement en train de redémarrer."
    );
  }
}

/** Nefs l-7aja, walakin kat-rje3 `fallback` 3iwed t-throw. Mzyana l les polls. */
export async function apiJsonOr<T>(input: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    return await apiJson<T>(input, init);
  } catch (e) {
    console.warn(`[api] ${input} :`, e instanceof Error ? e.message : e);
    return fallback;
  }
}
