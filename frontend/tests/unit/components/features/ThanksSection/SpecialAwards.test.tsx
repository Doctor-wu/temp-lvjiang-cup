import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpecialAwards } from '@/components/features/ThanksSection/SpecialAwards';
import type { SponsorConfig } from '@/data/types';

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

describe('SpecialAwards', () => {
  const mockAwards: SponsorConfig[] = [
    { id: 1, sponsorName: '为何如此衰', sponsorContent: '8K', specialAward: '8强每个队伍1K' },
    {
      id: 2,
      sponsorName: '董B登',
      sponsorContent: '1K',
      specialAward: '冠军每人750g蓝莓果干+250g参片',
    },
    { id: 3, sponsorName: 'MT', sponsorContent: '2K', specialAward: '4强每人一份贡菜千层肚' },
  ];

  const mockNoAwards: SponsorConfig[] = [
    { id: 1, sponsorName: '斗鱼官方', sponsorContent: '7W' },
    { id: 2, sponsorName: '秀木老板', sponsorContent: '2W' },
  ];

  describe('空数据状态', () => {
    it('没有特殊奖项时不应该渲染', () => {
      const { container } = render(<SpecialAwards sponsors={mockNoAwards} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('正常渲染', () => {
    it('应该渲染特殊奖项容器', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      expect(screen.getByTestId('special-awards-container')).toBeInTheDocument();
    });

    it('应该渲染标题', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      expect(screen.getByTestId('special-awards-title')).toBeInTheDocument();
    });

    it('应该渲染所有奖项', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      mockAwards.forEach(award => {
        expect(screen.getByText(award.sponsorName)).toBeInTheDocument();
        expect(screen.getByText(award.specialAward!)).toBeInTheDocument();
      });
    });

    it('应该使用SVG图标替代emoji', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      const container = screen.getByTestId('special-awards-container');
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(1);
    });

    it('应该使用奖杯图标作为奖项标识', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      const container = screen.getByTestId('special-awards-container');
      const trophyIcons = container.querySelectorAll('svg[stroke="currentColor"]');
      expect(trophyIcons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('样式验证', () => {
    it('应该应用正确的卡片样式', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      const container = screen.getByTestId('special-awards-container');
      expect(container.className).toContain('rounded-2xl');
      expect(container.className).toContain('border');
      expect(container.className).toContain('border-pink-500/20');
    });

    it('应该应用正确的背景样式', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      const container = screen.getByTestId('special-awards-container');
      expect(container.className).toContain('bg-gradient-to-br');
      expect(container.className).toContain('backdrop-blur-md');
    });

    it('奖项卡片应该有最小高度', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      const items = screen.getAllByText(mockAwards[0].sponsorName);
      const item = items[0].closest('li');
      expect(item?.className).toContain('min-h-[72px]');
    });

    it('应该使用正确的文字对比度', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      const description = screen.getByText(mockAwards[0].specialAward!);
      expect(description.className).toContain('text-gray-200');
    });

    it('容器应该使用 flex 布局以支持高度拉伸', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      const container = screen.getByTestId('special-awards-container');
      expect(container.className).toContain('flex');
      expect(container.className).toContain('flex-col');
      expect(container.className).toContain('w-full');
    });

    it('滚动区域应该使用 flex-1 填充剩余空间', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      const container = screen.getByTestId('special-awards-container');
      const scrollContainer = container.querySelector('div[style*="min-height: 200px"]');
      expect(scrollContainer).not.toBeNull();
      expect(scrollContainer?.className).toContain('flex-1');
    });
  });

  describe('滚动动画', () => {
    it('应该有滚动容器', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      const container = screen.getByTestId('special-awards-container');
      const scrollContainer = container.querySelector('div[style*="max-height"]');
      expect(scrollContainer).not.toBeNull();
    });

    it('滚动容器应该限制最大高度', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      const container = screen.getByTestId('special-awards-container');
      const scrollContainer = container.querySelector('div[style*="max-height: 280px"]');
      expect(scrollContainer).not.toBeNull();
    });

    it('滚动内容区域应该应用CSS动画样式', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      const container = screen.getByTestId('special-awards-container');
      const scrollContent = container.querySelector('div[class="space-y-3"]');
      expect(scrollContent).not.toBeNull();
    });
  });

  describe('移动端适配', () => {
    it('应该有正确的内边距', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      const container = screen.getByTestId('special-awards-container');
      expect(container.className).toContain('p-5');
      expect(container.className).toContain('md:p-6');
    });

    it('标题应该有响应式大小', () => {
      render(<SpecialAwards sponsors={mockAwards} />);

      const title = screen.getByTestId('special-awards-title');
      expect(title.className).toContain('text-lg');
      expect(title.className).toContain('md:text-xl');
    });
  });
});
