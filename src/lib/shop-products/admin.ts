import { z } from "zod";
import { SHOP_PRODUCT_STATUSES, normalizeShopProduct, type ShopProduct } from "./types";

export const shopProductSchema = z.object({
  title: z.string().trim().min(1, "title_required").max(140, "title_too_long"),
  description: z
    .string()
    .trim()
    .max(4000, "description_too_long")
    .optional()
    .nullable()
    .transform((value) => value || null),
  price: z.coerce.number().finite("price_invalid").min(0, "price_invalid").max(99999999.99, "price_invalid"),
  image_url: z
    .string()
    .trim()
    .max(2048, "image_url_too_long")
    .optional()
    .nullable()
    .transform((value) => value || null)
    .refine((value) => !value || value.startsWith("/") || /^https?:\/\//i.test(value), "image_url_invalid"),
  category: z.string().trim().min(1, "category_required").max(80, "category_too_long"),
  is_active: z.boolean().default(true),
  status: z.enum(SHOP_PRODUCT_STATUSES).default("in_stock"),
  stock: z
    .union([z.coerce.number().int().min(0), z.null()])
    .optional()
    .transform((value) => value ?? null),
});

export const shopProductUpdateSchema = shopProductSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "empty_update",
);

export const SHOP_PRODUCT_COLUMNS =
  "id,title,description,price,image_url,category,is_active,status,stock,created_by,created_at,updated_at";

export type ShopProductCreate = z.infer<typeof shopProductSchema>;
export type ShopProductUpdate = z.infer<typeof shopProductUpdateSchema>;

export function normalizeShopProductRows(rows: unknown[] | null | undefined): ShopProduct[] {
  return (rows ?? []).map((row) => normalizeShopProduct(row as Parameters<typeof normalizeShopProduct>[0]));
}
