'use client';

// Contextual staff grid — the staff for a building (coaches in training, medics
// in the medical centre, finance/scout in the office) shown as photo tiles that
// open the shared /staff/[roleKey] detail page, where hire/upgrade lives. This
// mirrors the residence "პერსონალი" tile pattern so the two stay visually
// consistent without residence importing anything new.

import { useRouter } from 'next/navigation';
import { PmPhotoCard } from '@/components/playmanager/pm-cards';
import { getStaffPhoto } from '@/lib/playmanager/staff-photos';

export type StaffContextMember = {
  roleKey: string;
  name: string;
  isHired: boolean;
};

export function StaffContextGrid({ members }: { members: StaffContextMember[] }) {
  const router = useRouter();
  if (members.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {members.map((member) => (
        <PmPhotoCard
          key={member.roleKey}
          title={member.name}
          photo={getStaffPhoto(member.roleKey)}
          tone={member.isHired ? 'green' : 'red'}
          onClick={() => router.push(`/playmanager/staff/${member.roleKey}`)}
        />
      ))}
    </div>
  );
}
