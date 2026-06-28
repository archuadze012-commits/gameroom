export const PLAYMANAGER_REAL_PLAYER_RESET_AGE = 18;

// Academy youth enter at a fixed young age and keep it (they are not reset to the
// senior entry age), then age up via time-advance until they graduate at 18.
export const PLAYMANAGER_ACADEMY_ENTRY_AGE = 15;

export function getTalentDecayFromAgeTransition(previousAge: number, nextAge: number) {
  let decay = 0;
  if (previousAge < 32 && nextAge >= 32) decay += 1;
  if (previousAge < 36 && nextAge >= 36) decay += 1;
  return decay;
}

export function getEffectiveRealPlayerTalent(input: {
  isReal: boolean;
  storedAge: number;
  realAge?: number | null;
  baseOvr: number;
  talent: number;
}) {
  const eligibilityAge = input.isReal ? input.realAge : input.storedAge;
  if (eligibilityAge === null || eligibilityAge === undefined) return input.talent;
  if (input.isReal && eligibilityAge < 20 && input.baseOvr >= 80) {
    return 11;
  }
  return input.talent;
}

export function getPlayManagerDisplayAge(input: {
  storedAge: number;
  isReal: boolean;
  ageStartedTotalDays: number | null;
  currentTotalDays: number | null;
}) {
  if (!input.isReal) return input.storedAge;
  return PLAYMANAGER_REAL_PLAYER_RESET_AGE;
}
