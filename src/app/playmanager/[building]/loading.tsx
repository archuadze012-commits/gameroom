// Bare background fallback for the force-dynamic building pages. Matches the
// page's own root background (bg-[#020806]) so the transition is a single, fast,
// animation-free hold instead of a blank flash while BuildingData fetches — this
// is the loading.tsx that [building]/page.tsx's comment refers to.
export default function BuildingLoading() {
  return <div className="min-h-screen w-full bg-background" />;
}
