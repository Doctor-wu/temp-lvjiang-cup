import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThanksSection } from '@/components/features/ThanksSection';

(globalThis as any).vi = vi;

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

describe('ThanksSection', () => {
  it('应该渲染鸣谢区块', () => {
    render(<ThanksSection />);

    expect(screen.getByTestId('thanks-section')).toBeInTheDocument();
  });

  it('应该渲染标题', () => {
    render(<ThanksSection />);

    expect(screen.getByTestId('thanks-section-title')).toBeInTheDocument();
  });

  it('应该使用SVG图标替代emoji装饰', () => {
    render(<ThanksSection />);

    const section = screen.getByTestId('thanks-section');
    const svgs = section.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('不应该包含emoji字符', () => {
    render(<ThanksSection />);

    const section = screen.getByTestId('thanks-section');
    const textContent = section.textContent || '';

    // 检查是否包含常见emoji字符
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = textContent.match(emojiRegex);
    expect(emojis).toBeNull();
  });

  it('不应该有固定的最小高度', () => {
    render(<ThanksSection />);

    const section = screen.getByTestId('thanks-section');
    expect(section.className).not.toContain('min-h-[500px]');
  });

  it('应该有正确的背景样式', () => {
    render(<ThanksSection />);

    const section = screen.getByTestId('thanks-section');
    expect(section.className).toContain('bg-gradient-to-b');
    expect(section.className).toContain('from-black');
    expect(section.className).toContain('via-gray-950');
    expect(section.className).toContain('to-black');
  });

  it('应该有正确的内边距', () => {
    render(<ThanksSection />);

    const section = screen.getByTestId('thanks-section');
    expect(section.className).toContain('py-16');
    expect(section.className).toContain('md:py-24');
  });

  it('应该有正确的模块间距', () => {
    render(<ThanksSection />);

    const section = screen.getByTestId('thanks-section');
    // 检查底部装饰区域的上边距
    const bottomDecorations = section.querySelectorAll('.mt-16, .md\\:mt-20');
    expect(bottomDecorations.length).toBeGreaterThanOrEqual(1);
  });

  it('应该有正确的ID属性', () => {
    render(<ThanksSection />);

    const section = screen.getByTestId('thanks-section');
    expect(section).toHaveAttribute('id', 'thanks');
  });

  it('应该使用framer-motion动画', () => {
    render(<ThanksSection />);

    const section = screen.getByTestId('thanks-section');
    // framer-motion 会添加 style 属性用于动画，初始状态 opacity 为 0
    expect(section).toHaveStyle({ opacity: '0' });
  });

  it('标题应该使用正确的字体', () => {
    render(<ThanksSection />);

    const title = screen.getByTestId('thanks-section-title');
    expect(title.style.fontFamily).toContain('Chakra Petch');
  });

  it('应该有正确的副标题', () => {
    render(<ThanksSection />);

    expect(screen.getByText('感谢每一位支持者的信任与陪伴')).toBeInTheDocument();
  });

  it('应该有SPONSORS & STAFF标签', () => {
    render(<ThanksSection />);

    expect(screen.getByText('SPONSORS & STAFF')).toBeInTheDocument();
  });

  it('底部应该有感谢文字', () => {
    render(<ThanksSection />);

    expect(screen.getByText('再次感谢所有支持')).toBeInTheDocument();
  });
});
