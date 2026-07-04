export function formatRelativeTime(iso: string, now = Date.now()): string {
  const elapsedMs = Math.max(0, now - new Date(iso).getTime());
  const seconds = Math.floor(elapsedMs / 1000);

  if (seconds < 60) {
    return `${Math.max(seconds, 1)}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
