import type {
  EditRequest,
  ParseResponse,
  PdfRequest,
  PendingEditResponse,
  TailorRequest,
} from "@/types/resume";
import { APIError } from "@/types/resume";

export { APIError } from "@/types/resume";

const API_BASE = "";

async function readErrorBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new APIError(res.status, await readErrorBody(res));
  }
  return res.json() as Promise<T>;
}

export async function parseResume(
  file: File,
  signal?: AbortSignal,
): Promise<ParseResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/v1/parse`, {
    method: "POST",
    body: formData,
    signal,
  });

  return handleResponse<ParseResponse>(res);
}

export async function tailorResume(
  body: TailorRequest,
  signal?: AbortSignal,
): Promise<PendingEditResponse> {
  const res = await fetch(`${API_BASE}/api/v1/tailor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  return handleResponse<PendingEditResponse>(res);
}

export async function editResume(
  body: EditRequest,
  signal?: AbortSignal,
): Promise<PendingEditResponse> {
  const res = await fetch(`${API_BASE}/api/v1/edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  return handleResponse<PendingEditResponse>(res);
}

export async function downloadPdf(
  body: PdfRequest,
  signal?: AbortSignal,
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/v1/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    throw new APIError(res.status, await readErrorBody(res));
  }

  return res.blob();
}
