export const roles = ["admin", "employee"] as const;

export type Role = (typeof roles)[number];

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
};

export type WorkspaceStats = {
  people: number;
  employees: number;
};

export type ActionState = {
  error?: string;
  message?: string;
} | null;

export type Category = {
  id: number;
  name: string;
  pictureUrl: string;
  orderSequence: number;
  shownInList: boolean;
  createdAt: string;
  productCount: number;
};

export type Product = {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  sku: string;
  description: string;
  imageUrl: string;
  sellingPrice: number;
  cost: number;
  loyaltyPoints: number;
  barcode: string;
  weightKg: number;
  dimensionWCm: number;
  dimensionHCm: number;
  commission: number;
  vatExempted: boolean;
  netPrice: number;
  visibleToCustomer: boolean;
  trackQuantity: boolean;
  sellWithoutStock: boolean;
  isRental: boolean;
  isAddon: boolean;
  totalQtySold: number;
  supplier: string;
  createdAt: string;
};
