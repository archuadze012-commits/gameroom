-- Harden loot-box RPC surface + pin a trigger function's search_path.
--
-- Context: opening boxes goes through the server actions in
-- src/lib/events/actions.ts, which call the SECURITY DEFINER *_as variants
-- (open_box_as / open_box_bundle_as) via the service_role admin client and
-- pass a trusted, server-derived bundle ratio.
--
-- The self-service variants below (open_box / open_box_bundle, which read
-- auth.uid() directly) are NOT referenced by any app code and NOT used in any
-- RLS policy, yet they are EXECUTE-able by the `authenticated` role and thus
-- reachable via /rest/v1/rpc/. open_box_bundle in particular charges
-- cost_amount * p_paid_opens but dispenses p_total_opens items, so a direct
-- caller could pay for 1 open and receive up to 50 items. Revoke client-role
-- access to remove that attack surface; service_role/postgres keep access.
revoke execute on function public.open_box_bundle(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.open_box(uuid) from public, anon, authenticated;

-- Lint 0011 (function_search_path_mutable): pin the search_path on the
-- shop_products updated_at trigger. It only assigns now() (resolved from
-- pg_catalog, always on the path), so an empty search_path is safe.
alter function public.set_shop_products_updated_at() set search_path = '';
