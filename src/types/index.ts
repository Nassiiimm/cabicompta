export type UserRole = "ADMIN" | "STAFF" | "INTERN" | "CLIENT";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export type AppUser = {
  id: string;
  authId: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
};

export type ExtractedInvoiceData = {
  vendor: string | null;
  invoiceNumber: string | null;
  date: string | null;
  amountHt: number | null;
  tps: number | null;
  tvq: number | null;
  total: number | null;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
};
