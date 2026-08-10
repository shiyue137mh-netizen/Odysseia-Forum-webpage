import type { ReactNode } from 'react';

type SettingsPageSectionProps = {
  title: string;
  children: ReactNode;
  showTopBorder?: boolean;
};

export function SettingsPageSection({
  title,
  children,
  showTopBorder = true,
}: SettingsPageSectionProps) {
  return (
    <section className={`od-setting-section pt-8 lg:pt-10 ${showTopBorder ? 'border-t border-(--od-shell-line)' : ''}`}>
      <h2 className="od-section-title mb-6 lg:mb-8">{title}</h2>
      {children}
    </section>
  );
}
