import { Suspense, type ReactNode } from "react";
import { ContentFallback } from "@/components/content-fallback";
import { FloorAssistant } from "@/components/floor-assistant";
import { Sidebar, SidebarFallback } from "@/components/sidebar";

export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper md:grid md:h-screen md:grid-cols-[272px_minmax(0,1fr)] md:overflow-hidden">
      <Suspense fallback={<SidebarFallback />}>
        <Sidebar />
      </Suspense>
      <div className="min-w-0 px-5 py-6 md:overflow-y-auto md:px-10 md:py-10">
        <Suspense fallback={<ContentFallback />}>{children}</Suspense>
        <Suspense fallback={null}>
          <FloorAssistant />
        </Suspense>
      </div>
    </div>
  );
}
