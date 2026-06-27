export default function PlayManagerLoading() {
  return (
    <main className="pm-hq-home min-h-screen overflow-x-hidden bg-[#020604] pb-24 text-white xl:pb-0 xl:pl-[82px]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1160px] flex-col px-4 py-4 sm:px-6 lg:px-8 xl:mx-0 xl:max-w-[min(1360px,calc(100vw-110px))]">
        <div className="rounded-xl bg-white/[0.055] p-3 shadow-[0_18px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-white/10" />
            <div className="min-w-0 flex-1">
              <div className="h-7 w-40 animate-pulse rounded-full bg-white/10" />
              <div className="mt-2 h-4 w-28 animate-pulse rounded-full bg-white/10" />
            </div>
            <div className="hidden h-11 w-32 animate-pulse rounded-xl bg-white/10 sm:block" />
          </div>
        </div>

        <section className="mt-4 rounded-xl bg-[linear-gradient(145deg,rgba(8,24,17,0.86),rgba(2,7,5,0.94))] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
          <div className="mx-auto h-6 w-40 animate-pulse rounded-full bg-white/10" />
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
            <div>
              <div className="h-6 w-28 animate-pulse rounded-full bg-white/10" />
              <div className="mt-2 h-3 w-20 animate-pulse rounded-full bg-white/10" />
            </div>
            <div className="px-1 pt-1 text-center">
              <div className="h-9 w-12 animate-pulse rounded-full bg-white/10" />
              <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-white/10" />
            </div>
            <div className="justify-self-end text-right">
              <div className="ml-auto h-6 w-28 animate-pulse rounded-full bg-white/10" />
              <div className="mt-2 ml-auto h-3 w-20 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="h-11 animate-pulse rounded-xl bg-white/10" />
            <div className="h-11 animate-pulse rounded-xl bg-white/10" />
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-xl bg-white/[0.052] p-3">
              <div className="mx-auto h-16 w-16 animate-pulse rounded-xl bg-white/10" />
              <div className="mx-auto mt-4 h-5 w-20 animate-pulse rounded-full bg-white/10" />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
