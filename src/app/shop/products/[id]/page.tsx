import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Crown, MessageCircle, Package, ShieldCheck, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DisplayHeading } from "@/components/ui/display-heading";
import { getActiveShopProductById } from "@/lib/shop-products/queries";
import { formatGel, STATUS_LABELS } from "@/lib/shop-products/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getActiveShopProductById(id);
  return { title: product ? `${product.title} · შოპი` : "პროდუქტი" };
}

export default async function ShopProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getActiveShopProductById(id);
  if (!product) notFound();

  const createdAt = new Intl.DateTimeFormat("ka-GE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(product.created_at));

  const canContact = product.status !== "out_of_stock";

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      {/* Cinematic Ambient Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_70%)]" />

      <main className="container relative mx-auto max-w-6xl px-4 py-8 lg:py-10">
        <Link
          href="/shop"
          className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/50 transition-colors hover:border-pink-500/30 hover:bg-pink-500/10 hover:text-pink-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          უკან შოპში
        </Link>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          {/* Left Column: Image Showcase */}
          <div className="group neon-frame rounded-[24px]">
            <div className="relative aspect-[16/10] min-h-[320px] overflow-hidden rounded-[22.5px] bg-[#0a0714] backdrop-blur-md">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1),transparent_60%)]" />
              
              <div aria-hidden className="absolute inset-x-10 bottom-16 h-px bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.5),rgba(236,72,153,0.5),transparent)]" />
              
              <div aria-hidden className="absolute left-6 top-6 rounded-full border border-pink-500/40 bg-pink-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)] backdrop-blur-md">
                Showcase
              </div>
              
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="relative z-[2] h-full w-full object-contain p-8 drop-shadow-[0_25px_35px_rgba(0,0,0,0.8)] transition-transform duration-700 group-hover:scale-[1.05]"
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <Package className="h-24 w-24 text-white/20 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]" />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="relative rounded-[24px] border border-white/5 bg-black/40 p-6 sm:p-8 backdrop-blur-md shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-400">
                <Tag className="mr-1.5 h-3 w-3" />
                {product.category}
              </Badge>
              <Badge className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-400">
                <ShieldCheck className="mr-1.5 h-3 w-3" />
                {STATUS_LABELS[product.status]}
              </Badge>
            </div>

            <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              Premium item
            </p>
            <DisplayHeading as="h1" size="lg" className="drop-shadow-md">
              {product.title}
            </DisplayHeading>

            <p className="mt-5 whitespace-pre-line text-[14px] font-medium leading-relaxed text-white/60">
              {product.description || "აღწერა ჯერ დამატებული არ არის."}
            </p>

            <div className="my-8 h-px bg-[linear-gradient(90deg,rgba(99,102,241,0.5),rgba(236,72,153,0.5),transparent)]" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[16px] border border-white/5 bg-white/5 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Price</p>
                <p className="mt-2 font-display text-3xl font-black text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                  {formatGel(product.price)}
                </p>
              </div>
              <div className="rounded-[16px] border border-white/5 bg-white/5 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Stock</p>
                <p className="mt-2 text-sm font-bold text-white drop-shadow-sm">
                  {product.stock === null ? STATUS_LABELS[product.status] : `${product.stock} available`}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-[12px] font-bold text-white/40">
              <CalendarDays className="h-4 w-4" />
              დამატებულია: {createdAt}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              {canContact ? (
                <Button asChild className="h-12 rounded-full border border-pink-500/50 bg-[linear-gradient(90deg,#ec4899,#8b5cf6)] px-8 text-[12px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]">
                  <Link href="/messages">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Contact seller
                  </Link>
                </Button>
              ) : (
                <Button disabled className="h-12 rounded-full border border-white/10 bg-white/5 px-8 text-[12px] font-black uppercase tracking-[0.18em] text-white/40">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact seller
                </Button>
              )}
              <Button asChild variant="outline" className="h-12 rounded-full border-white/10 bg-transparent px-8 text-[12px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/5 hover:text-white transition-colors">
                <Link href="/shop">სხვა პროდუქტები</Link>
              </Button>
            </div>

            <p className="mt-6 text-[12px] font-medium leading-relaxed text-white/40">
              Real payments ჯერ არ არის ჩართული. შეკვეთისთვის მიწერე ადმინისტრაციას messages-ში.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
