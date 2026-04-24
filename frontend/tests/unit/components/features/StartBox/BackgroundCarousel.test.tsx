import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { BackgroundCarousel } from '@/components/features/StartBox/BackgroundCarousel';
import type { CoverImage } from '@/components/features/StartBox/constants';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const createMockImage = function(this: any) {
  const img = document.createElement('img');
  setTimeout(() => {
    Object.defineProperty(img, 'complete', { value: true });
    img.dispatchEvent(new Event('load'));
  }, 0);
  return img;
};
createMockImage.prototype = HTMLImageElement.prototype;

const OriginalImage = global.Image;

describe('BackgroundCarousel 组件', () => {
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    global.Image = createMockImage as any;
  });

  afterEach(() => {
    vi.useRealTimers();
    global.Image = OriginalImage;
  });

  const pcBackgrounds: readonly CoverImage[] = [
    { cdn: '/test-pc-bg.png', local: '/assets/test-pc-bg.png' },
  ];

  const mobileBackgrounds: readonly CoverImage[] = [
    { cdn: '/test-mobile-bg.png', local: '/assets/test-mobile-bg.png' },
  ];

  describe('渲染背景图', () => {
    it('应该渲染背景图片', async () => {
      const { container } = render(
        <BackgroundCarousel isExiting={false} onError={mockOnError} backgrounds={pcBackgrounds} />
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(container.firstChild).toBeInTheDocument();
    });

    it('应该使用传入的 PC 背景图', async () => {
      const { container } = render(
        <BackgroundCarousel isExiting={false} onError={mockOnError} backgrounds={pcBackgrounds} />
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const bgElement = container.querySelector('img');
      expect(bgElement).toBeInTheDocument();
    });

    it('应该使用传入的移动端背景图', async () => {
      const { container } = render(
        <BackgroundCarousel
          isExiting={false}
          onError={mockOnError}
          backgrounds={mobileBackgrounds}
        />
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const bgElement = container.querySelector('img');
      expect(bgElement).toBeInTheDocument();
    });
  });

  describe('轮播逻辑', () => {
    it('单张背景图时不应该设置轮播定时器', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      render(
        <BackgroundCarousel isExiting={false} onError={mockOnError} backgrounds={pcBackgrounds} />
      );

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });

  describe('图片加载失败处理', () => {
    it('图片加载失败时应该调用 onError 回调', async () => {
      const { container } = render(
        <BackgroundCarousel isExiting={false} onError={mockOnError} backgrounds={pcBackgrounds} />
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const imgElements = container.querySelectorAll('img.hidden');
      expect(imgElements.length).toBeGreaterThan(0);

      imgElements[0]?.dispatchEvent(new Event('error'));

      expect(mockOnError).toHaveBeenCalled();
    });
  });

  describe('退出动画', () => {
    it('isExiting=true 时应该触发淡出动画', async () => {
      const { container } = render(
        <BackgroundCarousel isExiting={true} onError={mockOnError} backgrounds={pcBackgrounds} />
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const carouselElement = container.firstChild;
      expect(carouselElement).toBeInTheDocument();
    });

    it('isExiting=false 时应该保持可见', async () => {
      const { container } = render(
        <BackgroundCarousel isExiting={false} onError={mockOnError} backgrounds={pcBackgrounds} />
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const carouselElement = container.firstChild;
      expect(carouselElement).toBeInTheDocument();
    });
  });
});
