import type { ReactNode } from 'react';

type SettingsPageSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsPageSection({
  title,
  children,
}: SettingsPageSectionProps) {
  return (
    <section className="od-setting-section border-t border-(--od-shell-line) pt-8 lg:pt-10">
      <h2 className="od-section-title mb-6 lg:mb-8">{title}</h2>
      {children}
    </section>
  );
}
