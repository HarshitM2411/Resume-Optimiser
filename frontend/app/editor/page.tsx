import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { EditorView } from "@/components/EditorView/EditorView";

export default function EditorPage() {
  return (
    <ErrorBoundary>
      <EditorView />
    </ErrorBoundary>
  );
}
