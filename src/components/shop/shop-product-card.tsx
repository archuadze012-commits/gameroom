import Link from "next/link";
import { ArrowRight, Boxes, PackageCheck, PackageX, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatGel, STATUS_LABELS, type ShopProduct } from "@/lib/shop-products/types";

const statusStyles = {
  in_stock: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]",
  out_of_stock: "border-pink-500/30 bg-pink-500/10 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.2)]",
  preorder: "border-violet-500/30 bg-violet-500/10 text-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.2)]",
};

const statusIcons = {
  in_stock: PackageCheck,
  out_of_stock: PackageX,
  preorder: Sparkles,
};

export function ShopProductCard({ product }: { product: ShopProduct }) {
  const StatusIcon = statusIcons[product.status];

  return (
    <article className="group relative block rounded-[20px] p-[1.5px] bg-gradient-to-br from-[#00d0ff] via-[#6366f1] to-[#f43f5e] transition-all duration-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-1">
      <div className="relative h-full w-full overflow-hidden rounded-[18.5px] bg-[#0a0714] flex flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)] shrink-0">
          <div aria-hidden className="absolute inset-x-5 bottom-6 h-[1px] bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.5),rgba(236,72,153,0.5),transparent)]" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.06)_46%,transparent_52%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.title}
              className="relative z-[2] h-full w-full object-contain p-5 drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center">
              <Boxes className="h-14 w-14 text-violet-500/40 drop-shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
            </div>
          )}
          <div className="absolute left-3 top-3 z-10">
            <Badge className="border border-violet-500/30 bg-violet-500/20 text-white backdrop-blur shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <ShieldCheck className="mr-1.5 h-3 w-3 text-cyan-400" />
              {product.category}
            </Badge>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between p-5">
          <div className="space-y-2 mb-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-2 font-display text-lg font-black uppercase leading-tight text-white drop-shadow-sm group-hover:text-pink-400 transition-colors">
                {product.title}
              </h3>
              <p className="shrink-0 text-right font-display text-xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
                {formatGel(product.price)}
              </p>
            </div>
            <p className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-relaxed text-white/50">
              {product.description || "Gameroom marketplace item."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusStyles[product.status]}`}>
              <StatusIcon className="h-3 w-3" />
              {STATUS_LABELS[product.status]}
            </span>

            <Button asChild size="sm" className="h-9 rounded-full border border-pink-500/40 bg-[linear-gradient(90deg,#ec4899,#8b5cf6)] text-white shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:scale-105 hover:shadow-[0_0_20px_rgba(236,72,153,0.5)] transition-all uppercase font-black text-[10px] tracking-wider px-4">
              <Link href={`/shop/products/${product.id}`}>
                View
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
