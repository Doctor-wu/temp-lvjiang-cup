import React from 'react';

interface Props {
  /** Mono eyebrow text shown above the title (e.g. "— 02 / VIDEOS"). */
  eyebrow: string;
  /** Section heading text. */
  title: string;
  /** Optional sub line shown below the title on desktop. */
  subtitle?: React.ReactNode;
  /** Slot rendered on the right (links, segmented controls, etc.). */
  right?: React.ReactNode;
}

const SectionHeader: React.FC<Props> = ({ eyebrow, title, subtitle, right }) => (
  <div className="relative flex items-baseline justify-between gap-4 mb-4 md:mb-5">
    <div>
      <div className="v4-eyebrow">{eyebrow}</div>
      <h2 className="text-[19px] md:text-[26px] font-medium tracking-[-0.02em] m-0">
        {title}
      </h2>
      {subtitle ? (
        <p className="m-0 mt-2 text-[11px] md:text-[13px] text-[rgba(245,245,247,0.55)] leading-[1.5]">
          {subtitle}
        </p>
      ) : null}
    </div>
    {right ? <div className="shrink-0">{right}</div> : null}
  </div>
);

export default SectionHeader;
