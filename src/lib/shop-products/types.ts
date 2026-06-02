export const SHOP_PRODUCT_STATUSES = ["in_stock", "out_of_stock", "preorder"] as const;

export type ShopProductStatus = (typeof SHOP_PRODUCT_STATUSES)[number];

export type ShopProduct = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  is_active: boolean;
  status: ShopProductStatus;
  stock: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const STATUS_LABELS: Record<ShopProductStatus, string> = {
  in_stock: "ხელმისაწვდომია",
  out_of_stock: "ამოწურულია",
  preorder: "Pre-order",
};

type ShopProductRow = Omit<ShopProduct, "price" | "status"> & {
  price: number | string;
  status: string;
};

export function normalizeShopProduct(row: ShopProductRow): ShopProduct {
  return {
    ...row,
    price: typeof row.price === "number" ? row.price : Number(row.price),
    status: SHOP_PRODUCT_STATUSES.includes(row.status as ShopProductStatus)
      ? (row.status as ShopProductStatus)
      : "in_stock",
  };
}

export function formatGel(price: number) {
  return new Intl.NumberFormat("ka-GE", {
    style: "currency",
    currency: "GEL",
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);
}
