import type { ReactNode } from 'react';

export function BannerFadeMedia({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`absolute inset-0 [mask-image:linear-gradient(to_bottom,black_0%,black_68%,transparent_96%,transparent_100%)] ${className}`}
    >
      {children}
    </div>
  );
}
