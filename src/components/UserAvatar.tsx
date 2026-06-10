import { useEffect, useState } from 'react';
import { User, UserRound } from 'lucide-react';
import { resolveAssetUrl } from '../api';

export type UserGender = 'male' | 'female' | null;

type Props = {
  avatarUrl?: string | null;
  gender?: UserGender;
  name?: string;
  className?: string;
};

function genderIcon(gender: UserGender) {
  if (gender === 'female') {
    return <UserRound className="h-[52%] w-[52%] stroke-[2.2]" aria-hidden />;
  }
  return <User className="h-[52%] w-[52%] stroke-[2.4]" aria-hidden />;
}

function genderClasses(gender: UserGender): string {
  if (gender === 'female') {
    return 'bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white';
  }
  if (gender === 'male') {
    return 'bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white';
  }
  return 'bg-gradient-to-br from-[#94A3B8] to-[#64748B] text-white';
}

export default function UserAvatar({ avatarUrl, gender = null, name, className = 'h-10 w-10' }: Props) {
  const resolvedUrl = resolveAssetUrl(avatarUrl);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedUrl]);

  if (resolvedUrl && !imageFailed) {
    return (
      <img
        src={resolvedUrl}
        alt={name?.trim() || ''}
        className={`rounded-full object-cover ${className}`}
        decoding="async"
        loading="eager"
        referrerPolicy="same-origin"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${genderClasses(gender)} ${className}`}
      aria-hidden={!name}
      title={name}
    >
      {genderIcon(gender)}
    </div>
  );
}
