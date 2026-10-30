import { FloorAssistantPanel } from "@/components/floor-assistant-panel";
import { getCurrentUser } from "@/lib/auth";
import type { FloorStock } from "@/lib/floor-assistant";
import { loadStock } from "@/lib/stock";
import { stockStatus } from "@/lib/stock-status";

export async function FloorAssistant() {
  const profile = await getCurrentUser();
  let stock: FloorStock[] = [];
  try {
    const loaded = await loadStock();
    if (!loaded.missing) {
      stock = loaded.lines.map((line) => ({
        name: line.name,
        sku: line.sku,
        onHand: line.onHand,
        status: stockStatus(line),
      }));
    }
  } catch {
    stock = [];
  }

  return <FloorAssistantPanel role={profile.role} stock={stock} />;
}
