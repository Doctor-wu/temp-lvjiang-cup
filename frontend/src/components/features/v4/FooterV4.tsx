import React from 'react';
import { FOOTER_CONFIG } from '../../../config/footer';
import { adminPath } from '../../../constants/routes';

const FooterV4: React.FC = () => {
  const { socialLinks, contact, icp } = FOOTER_CONFIG;
  const bili = socialLinks.find(s => s.platform === 'bilibili');

  return (
    <footer
      className="v4-root w-full px-5 md:px-9 py-5 md:py-[22px]"
      style={{ background: '#030305' }}
      role="contentinfo"
    >
      <div className="hidden md:flex items-center justify-between gap-3 flex-wrap text-[11px] text-[rgba(245,245,247,0.5)]">
        <div className="flex items-center gap-3.5">
          <span className="v4-mono tracking-[0.18em]">© 2026 LVJIANG.ICU</span>
          <a
            className="v4-link"
            href={contact.email ? `mailto:${contact.email}` : undefined}
          >
            合作邮箱 · {contact.email}
          </a>
          {bili ? (
            <a className="v4-link" href={bili.url} target="_blank" rel="noopener noreferrer">
              B 站 · {bili.name}
            </a>
          ) : null}
          <span className="v4-link">公众号 · 驴驴电竞</span>
        </div>
        <span className="v4-mono text-[10px] text-[rgba(245,245,247,0.3)]">{icp.number}</span>
      </div>
      <a
        href={adminPath('login')}
        className="sr-only"
        aria-label="管理后台"
      >
        管理后台
      </a>
      <div className="flex md:hidden flex-col gap-1.5 text-[10.5px] text-[rgba(245,245,247,0.5)]">
        <span className="v4-mono tracking-[0.18em] text-[rgba(245,245,247,0.4)]">
          © 2026 LVJIANG.ICU
        </span>
        <a
          className="v4-link"
          href={contact.email ? `mailto:${contact.email}` : undefined}
        >
          合作邮箱 · {contact.email}
        </a>
        <div className="flex gap-3.5">
          {bili ? (
            <a className="v4-link" href={bili.url} target="_blank" rel="noopener noreferrer">
              B 站 · {bili.name}
            </a>
          ) : null}
          <span className="v4-link">公众号 · 驴驴电竞</span>
        </div>
        <span className="v4-mono text-[9.5px] text-[rgba(245,245,247,0.3)] mt-1">
          {icp.number}
        </span>
      </div>
    </footer>
  );
};

export default FooterV4;
