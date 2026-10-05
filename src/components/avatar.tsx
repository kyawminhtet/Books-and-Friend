import { initials } from '@/lib/types';

type AvatarProps = {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
};

export function Avatar({ name, src, size = 36, className = '' }: AvatarProps) {
  return <span role="img" className={`user-avatar ${className}`} style={{ width: size, height: size }} aria-label={name ? `${name}'s avatar` : 'User avatar'}>
    {src ? <img src={src} alt="" width={size} height={size} /> : <span aria-hidden="true">{initials(name ?? 'Reader')}</span>}
  </span>;
}
