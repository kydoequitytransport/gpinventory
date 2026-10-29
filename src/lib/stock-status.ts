export type StockLine = {
  productId: number;
  categoryId: number;
  name: string;
  sku: string;
  uom: string;
  onHand: number;
  minOnHand: number | null;
};

export function stockStatus(line: Pick<StockLine, "onHand" | "minOnHand">) {
  if (line.minOnHand === null) return "No Min Threshold";
  if (line.onHand <= line.minOnHand) return "For Re-stock";
  return "Normal";
}
