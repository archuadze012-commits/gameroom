"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ImageIcon, Loader2, PackagePlus, Pencil, Power, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatGel, STATUS_LABELS, type ShopProduct, type ShopProductStatus } from "@/lib/shop-products/types";

type ProductForm = {
  title: string;
  description: string;
  price: string;
  image_url: string;
  category: string;
  is_active: boolean;
  status: ShopProductStatus;
  stock: string;
};

const BLANK_FORM: ProductForm = {
  title: "",
  description: "",
  price: "",
  image_url: "",
  category: "general",
  is_active: true,
  status: "in_stock",
  stock: "",
};

const STATUS_OPTIONS: ShopProductStatus[] = ["in_stock", "out_of_stock", "preorder"];
const CATEGORY_OPTIONS = ["general", "gear", "accounts", "services", "gift-cards", "collectibles"];

function toPayload(form: ProductForm) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    price: Number(form.price),
    image_url: form.image_url.trim() || null,
    category: form.category.trim() || "general",
    is_active: form.is_active,
    status: form.status,
    stock: form.stock.trim() ? Number(form.stock) : null,
  };
}

export default function AdminShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(BLANK_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;

    async function loadProducts() {
      try {
        const res = await fetch("/api/admin/shop", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = await res.json();
        if (alive && Array.isArray(rows)) setProducts(rows);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "პროდუქტები ვერ ჩაიტვირთა");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      alive = false;
    };
  }, []);

  function set<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEdit(product: ShopProduct) {
    setForm({
      title: product.title,
      description: product.description ?? "",
      price: String(product.price),
      image_url: product.image_url ?? "",
      category: product.category,
      is_active: product.is_active,
      status: product.status,
      stock: product.stock === null ? "" : String(product.stock),
    });
    setEditingId(product.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setForm(BLANK_FORM);
    setEditingId(null);
  }

  async function saveProduct() {
    const payload = toPayload(form);
    if (!payload.title) {
      toast.error("სახელი სავალდებულოა");
      return;
    }
    if (!Number.isFinite(payload.price) || payload.price < 0) {
      toast.error("ფასი არასწორია");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(editingId ? `/api/admin/shop/${editingId}` : "/api/admin/shop", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);

      const saved = body as ShopProduct;
      setProducts((current) => {
        const withoutSaved = current.filter((product) => product.id !== saved.id);
        return [saved, ...withoutSaved].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      });
      toast.success(editingId ? "პროდუქტი განახლდა" : "პროდუქტი დაემატა");
      cancelEdit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "შენახვა ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("სურათი მაქსიმუმ 8MB უნდა იყოს");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/shop/upload", { method: "POST", body });
      const parsed = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parsed?.error || `HTTP ${res.status}`);
      set("image_url", parsed.url);
      toast.success("სურათი ატვირთულია");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ატვირთვა ვერ მოხერხდა");
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  }

  async function toggleActive(product: ShopProduct) {
    setBusyId(product.id);
    try {
      const res = await fetch(`/api/admin/shop/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !product.is_active }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setProducts((current) => current.map((row) => (row.id === product.id ? (body as ShopProduct) : row)));
      toast.success(product.is_active ? "პროდუქტი გაითიშა" : "პროდუქტი გააქტიურდა");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "სტატუსი ვერ შეიცვალა");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProduct(product: ShopProduct) {
    if (!window.confirm(`წავშალო "${product.title}"?`)) return;
    setBusyId(product.id);
    try {
      const res = await fetch(`/api/admin/shop/${product.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setProducts((current) => current.filter((row) => row.id !== product.id));
      toast.success("პროდუქტი წაიშალა");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "წაშლა ვერ მოხერხდა");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className={editingId ? "border-amber-500/40" : "border-primary/30"}>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                {editingId ? <Pencil className="h-4 w-4 text-amber-400" /> : <PackagePlus className="h-4 w-4 text-primary" />}
                {editingId ? "პროდუქტის რედაქტირება" : "ახალი პროდუქტი"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">მხოლოდ manage_shop permission-ის მქონე როლებისთვის.</p>
            </div>
            {editingId && (
              <Button type="button" variant="ghost" size="icon-sm" onClick={cancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Title *</label>
              <Input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Pro crate / merch / service" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Price GEL / ₾ *</label>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={(event) => set("price", event.target.value)} placeholder="25.00" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Description</label>
            <Textarea
              className="min-h-24 resize-none"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="რა შედის პროდუქტში, როგორ ხდება მიღება, რა წესებია..."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Category</label>
              <Input list="shop-product-categories" value={form.category} onChange={(event) => set("category", event.target.value)} />
              <datalist id="shop-product-categories">
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Availability</label>
              <select
                value={form.status}
                onChange={(event) => set("status", event.target.value as ShopProductStatus)}
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Stock</label>
              <Input type="number" min="0" step="1" value={form.stock} onChange={(event) => set("stock", event.target.value)} placeholder="optional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Image URL or upload</label>
            <div className="flex gap-2">
              <Input
                value={form.image_url}
                onChange={(event) => set("image_url", event.target.value)}
                placeholder="https://... ან /local-image.webp"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" disabled={uploading} onClick={() => uploadInputRef.current?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadImage(file);
                }}
              />
            </div>
            {form.image_url && (
              <div className="mt-2 h-36 overflow-hidden rounded-lg border border-border/60 bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image_url} alt="product preview" className="h-full w-full object-cover" />
              </div>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => set("is_active", event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Publicly active
          </label>

          <div className="flex flex-wrap gap-3">
            {editingId && (
              <Button type="button" variant="outline" onClick={cancelEdit}>
                გაუქმება
              </Button>
            )}
            <Button type="button" disabled={saving || !form.title.trim()} onClick={saveProduct}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Check className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
              {editingId ? "შენახვა" : "დამატება"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Shop products ({products.length})
          </h2>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {!loading && products.length === 0 && (
          <Card className="border-dashed border-border/70">
            <CardContent className="grid place-items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              No products available yet.
            </CardContent>
          </Card>
        )}

        {products.map((product) => (
          <Card key={product.id} className="border-border/60">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{product.title}</p>
                    <Badge variant={product.is_active ? "default" : "outline"} className="text-[10px]">
                      {product.is_active ? "active" : "inactive"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {product.category}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{product.description || "No description"}</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    {formatGel(product.price)} · {STATUS_LABELS[product.status]}
                    {product.stock !== null ? ` · stock ${product.stock}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={busyId === product.id}
                  onClick={() => toggleActive(product)}
                  title={product.is_active ? "Deactivate" : "Activate"}
                >
                  {busyId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => startEdit(product)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  disabled={busyId === product.id}
                  onClick={() => deleteProduct(product)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
