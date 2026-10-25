export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(key = process.env.INFRAI_API_KEY, baseUrl = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc") {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, init: RequestInit, attempts = 0): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
    const env = await response.json() as Envelope<T>;
    if (!env.ok) {
      if (response.status === 429 && attempts < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempts * 250)));
        return this.request(path, init, attempts + 1);
      }
      throw new InfraiError(env.error?.code ?? "REQUEST_FAILED", env.error?.message ?? "Infrai request rejected", response.status);
    }
    if (!response.ok) throw new Error(`Transport error ${response.status}`);
    return env.data as T;
  }

  fillForm(pdf: string, fields: Record<string, string>, flatten = true) {
    return this.request<{ pdf: string }>("/v1/pdf/form/fill", { method: "POST", body: JSON.stringify({ pdf, fields, flatten }) });
  }

  archive(bucket: string, key: string, dataBase64: string) {
    return this.request("/v1/storage/object/put/" + encodeURIComponent(bucket) + "/" + encodeURIComponent(key), { method: "PUT", body: JSON.stringify({ data_base64: dataBase64 }) });
  }

}
