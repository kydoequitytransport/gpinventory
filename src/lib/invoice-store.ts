import { invoices as seedInvoices, normalizeInvoice, type Invoice } from "@/lib/invoices";

const storageKey = "gp-invoices-v1";
const listeners = new Set<() => void>();
let storedInvoices = seedInvoices;
let storageLoaded = false;

export function readStoredInvoices() {
  if (storageLoaded || typeof window === "undefined") return storedInvoices;
  storageLoaded = true;
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return storedInvoices;
  try {
    const parsed = JSON.parse(stored) as Invoice[];
    if (Array.isArray(parsed) && parsed.every((item) => Array.isArray(item?.lines))) {
      storedInvoices = parsed.map((item) => normalizeInvoice(item));
    }
  } catch {
    // Keep the sample drafts when stored data is unreadable.
  }
  return storedInvoices;
}

export function getSeedInvoices() {
  return seedInvoices;
}

export function subscribeInvoices(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishInvoices(next: Invoice[]) {
  storedInvoices = next;
  storageLoaded = true;
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  for (const listener of listeners) listener();
}
