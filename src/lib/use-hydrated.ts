import { useSyncExternalStore } from "react";

// Returns false during SSR and the first client render, then true once hydrated.
// The setState-free replacement for the classic
//   const [mounted, setMounted] = useState(false);
//   useEffect(() => setMounted(true), []);
// pattern used to defer client-only rendering (portals, window measurements) —
// avoids the synchronous setState-in-effect that triggers a cascading re-render.
const subscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
