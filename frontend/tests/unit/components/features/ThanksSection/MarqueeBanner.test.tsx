import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./DecorativeIcons', () => ({
  StarBurst: ({ size, className, style }: any) => (
    <span data-testid="starburst" style={style} className={className}>
      ★
    </span>
  ),
}));

import { MarqueeBanner } from '@/components/features/ThanksSection/MarqueeBanner';
import type { SponsorConfig } from '@/data/types';

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  trigger(entries: IntersectionObserverEntry[]) {
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

describe('MarqueeBanner', () => {
  const mockSponsors: SponsorConfig[] = [
    { id: 1, sponsorName: '斗鱼官方', sponsorContent: '7W' },
    { id: 2, sponsorName: '秀木老板', sponsorContent: '2W' },
    { id: 3, sponsorName: '神秘老板', sponsorContent: '5K' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('空数据状态', () => {
    it('赞助信息为空数组时应该显示默认文案', () => {
      render(<MarqueeBanner sponsors={[]} />);

      expect(screen.getByText('感谢所有支持驴酱杯的朋友们')).toBeInTheDocument();
    });

    it('空状态应该渲染SVG图标替代emoji', () => {
      render(<MarqueeBanner sponsors={[]} />);

      const container = screen.getByTestId('marquee-empty');
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('正常渲染', () => {
    it('应该渲染弹幕容器', () => {
      render(<MarqueeBanner sponsors={mockSponsors} />);

      const container = screen.getByTestId('marquee-container');
      expect(container).toBeInTheDocument();
    });

    it('应该渲染所有赞助信息', () => {
      render(<MarqueeBanner sponsors={mockSponsors} />);

      mockSponsors.forEach(sponsor => {
        const nameElements = screen.getAllByText(sponsor.sponsorName);
        expect(nameElements.length).toBeGreaterThanOrEqual(1);
        const contentElements = screen.getAllByText(sponsor.sponsorContent);
        expect(contentElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('弹幕内容应该重复两次以实现无缝滚动', () => {
      render(<MarqueeBanner sponsors={mockSponsors} />);

      const firstSponsor = mockSponsors[0];
      const elements = screen.getAllByText(firstSponsor.sponsorName);
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });

    it('应该使用SVG图标替代emoji装饰', () => {
      render(<MarqueeBanner sponsors={mockSponsors} />);

      const container = screen.getByTestId('marquee-container');
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('悬停暂停功能', () => {
    it('PC端鼠标悬停时应该暂停动画', () => {
      render(<MarqueeBanner sponsors={mockSponsors} />);

      const container = screen.getByTestId('marquee-container');
      const content = screen.getByTestId('marquee-content');

      expect(content).toHaveStyle({ animationPlayState: 'paused' });

      fireEvent.mouseEnter(container);
      expect(content).toHaveStyle({ animationPlayState: 'paused' });

      fireEvent.mouseLeave(container);
      expect(content).toHaveStyle({ animationPlayState: 'paused' });
    });
  });

  describe('响应式样式', () => {
    it('应该应用正确的容器高度类', () => {
      render(<MarqueeBanner sponsors={mockSponsors} />);

      const container = screen.getByTestId('marquee-container');
      expect(container.className).toContain('h-[52px]');
      expect(container.className).toContain('md:h-[60px]');
    });

    it('应该应用正确的边框样式', () => {
      render(<MarqueeBanner sponsors={mockSponsors} />);

      const container = screen.getByTestId('marquee-container');
      expect(container.className).toContain('border');
      expect(container.className).toContain('border-amber-500/30');
      expect(container.className).toContain('rounded-xl');
    });

    it('应该应用正确的背景样式', () => {
      render(<MarqueeBanner sponsors={mockSponsors} />);

      const container = screen.getByTestId('marquee-container');
      expect(container.className).toContain('bg-gradient-to-r');
      expect(container.className).toContain('from-pink-900/30');
      expect(container.className).toContain('backdrop-blur-sm');
    });

    it('应该使用响应式文字大小', () => {
      render(<MarqueeBanner sponsors={mockSponsors} />);

      // 文字大小类应用在包含整个文本的外层span上
      const sponsorTexts = screen.getAllByText(mockSponsors[0].sponsorName);
      const sponsorElement = sponsorTexts[0].closest('span[class*="text-amber-400"]');
      expect(sponsorElement?.className).toContain('text-sm');
      expect(sponsorElement?.className).toContain('md:text-lg');
    });
  });

  describe('动画时长', () => {
    it('动画时长应该在合理范围内', () => {
      render(<MarqueeBanner sponsors={mockSponsors} />);

      const content = screen.getByTestId('marquee-content');
      const duration = content.style.animationDuration;
      const durationValue = parseFloat(duration);
      expect(durationValue).toBeGreaterThanOrEqual(10);
    });
  });

  describe('无障碍访问', () => {
    it('空状态应该有正确的ARIA标签', () => {
      render(<MarqueeBanner sponsors={[]} />);

      const container = screen.getByTestId('marquee-empty');
      expect(container).toHaveAttribute('role', 'status');
      expect(container).toHaveAttribute('aria-label', '鸣谢信息');
    });

    it('正常状态应该有正确的ARIA标签', () => {
      render(<MarqueeBanner sponsors={mockSponsors} />);

      const container = screen.getByTestId('marquee-container');
      expect(container).toHaveAttribute('role', 'marquee');
      expect(container).toHaveAttribute('aria-label', '赞助鸣谢滚动展示');
    });
  });
});
