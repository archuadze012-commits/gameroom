// ── PlayManager status vocabularies ──────────────────────────────────────────
// Single source of truth for the status strings that live in Postgres CHECK
// constraints. Import these constants instead of hand-typing the literals so a
// typo becomes a compile error — exactly the class of bug where a query filtered
// pm_transfer_listings by the non-existent 'listed' instead of 'active' and
// silently returned nothing.
//
// Each object mirrors a DB constraint; keep them in sync when a migration changes
// the allowed values.

// pm_transfer_listings.status — check (status in ('active','sold','cancelled'))
export const LISTING_STATUS = {
  active: 'active',
  sold: 'sold',
  cancelled: 'cancelled',
} as const;
export type ListingStatus = (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS];

// pm_transfer_offers.status — pending → accepted | rejected | cancelled
export const OFFER_STATUS = {
  pending: 'pending',
  accepted: 'accepted',
  rejected: 'rejected',
  cancelled: 'cancelled',
} as const;
export type OfferStatus = (typeof OFFER_STATUS)[keyof typeof OFFER_STATUS];

// pm_cup_matches.status / pm_league_fixtures.status —
// check (status in ('pending','ready','processing','completed'))
// 'ready' is claimed to 'processing' by the lazy simulators, then 'completed'.
export const MATCH_STATUS = {
  pending: 'pending',
  ready: 'ready',
  processing: 'processing',
  completed: 'completed',
} as const;
export type MatchStatus = (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS];

// pm_cup_instances.status / pm_league_instances.status —
// check (status in ('registration','in_progress','completed'))
export const COMPETITION_STATUS = {
  registration: 'registration',
  in_progress: 'in_progress',
  completed: 'completed',
} as const;
export type CompetitionStatus = (typeof COMPETITION_STATUS)[keyof typeof COMPETITION_STATUS];

// pm_players.status — check (status in ('active','injured','retired'))
export const PLAYER_STATUS = {
  active: 'active',
  injured: 'injured',
  retired: 'retired',
} as const;
export type PlayerStatus = (typeof PLAYER_STATUS)[keyof typeof PLAYER_STATUS];
