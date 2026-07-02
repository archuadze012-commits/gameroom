import type { StaffRoleKey } from './staff';

// Role → portrait photo. Two roles (midfield_coach, set_piece_coach) have no
// dedicated asset yet and fall back to a related coach photo.
export const STAFF_PHOTO: Record<StaffRoleKey, string> = {
  head_coach: '/playmanager/module-cards/staff/head-coach.webp',
  gk_coach: '/playmanager/module-cards/staff/gk-coach.webp',
  defence_coach: '/playmanager/module-cards/staff/defence-coach.webp',
  midfield_coach: '/playmanager/module-cards/staff/head-coach.webp',
  attack_coach: '/playmanager/module-cards/staff/attack-coach.webp',
  set_piece_coach: '/playmanager/module-cards/staff/attack-coach.webp',
  scout: '/playmanager/module-cards/staff/scout.webp',
  youth_scout: '/playmanager/module-cards/staff/youth-scout.webp',
  doctor: '/playmanager/module-cards/staff/doctor.webp',
  physiotherapist: '/playmanager/module-cards/staff/physiotherapist.webp',
  psychologist: '/playmanager/module-cards/staff/psychologist.webp',
  finance_manager: '/playmanager/module-cards/staff/finance-manager.webp',
};

export function getStaffPhoto(roleKey: string): string {
  return STAFF_PHOTO[roleKey as StaffRoleKey] ?? '/playmanager/module-cards/staff/head-coach.webp';
}
