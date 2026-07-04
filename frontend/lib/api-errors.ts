import { APIError } from "@/types/resume";

export function getErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    const body = error.body;
    if (typeof body === "object" && body !== null && "detail" in body) {
      const detail = (body as { detail: unknown }).detail;
      if (typeof detail === "string") {
        return detail;
      }
    }
    if (error.status === 413) return "File exceeds 5MB limit.";
    if (error.status === 415) return "Unsupported file type.";
    if (error.status === 502) return "Parsing failed. Please try again or re-upload.";
    if (error.status === 500) return "Something went wrong. Please try again.";
    return `Request failed (${error.status}).`;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request timed out. Please try again.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}
