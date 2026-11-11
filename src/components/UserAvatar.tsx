import React from 'react';
import { User } from '../types/index.ts';

interface UserAvatarProps {
  user: User | null;
  className?: string;
}

/** The user's name, or the part of the address before "@" (name is optional). */
export function displayName(user: User | null): string {
  return user?.name?.trim() || user?.email.split('@')[0] || '';
}

export function UserAvatar({ user, className = 'w-7 h-7 text-xs' }: UserAvatarProps) {
  const initial = (displayName(user) || '?').charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`rounded-full bg-zinc-900 text-white font-semibold flex items-center justify-center shrink-0 ${className}`}
    >
      {initial}
    </span>
  );
}
