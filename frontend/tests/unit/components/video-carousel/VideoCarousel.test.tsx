import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoCarousel } from '@/components/video-carousel';
import type { VideoItem } from '@/components/video-carousel/VideoPlayer';

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false),
}));

describe('VideoCarousel', () => {
  const mockVideos: VideoItem[] = [
    { bvid: 'BV1', title: 'Video 1', cover: 'https://example.com/1.jpg' },
    { bvid: 'BV2', title: 'Video 2', cover: 'https://example.com/2.jpg' },
    { bvid: 'BV3', title: 'Video 3', cover: 'https://example.com/3.jpg' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders VideoPlayer with autoplay enabled', async () => {
    render(<VideoCarousel videos={mockVideos} />);

    await waitFor(() => {
      expect(document.querySelector('iframe')).toBeInTheDocument();
    });

    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.src).toContain('BV1');
    expect(iframe.src).toContain('autoplay=1');
  });

  it('shows thumbnails on PC (3 screens layout)', async () => {
    render(<VideoCarousel videos={mockVideos} />);

    await waitFor(() => {
      const thumbnails = screen.queryAllByTestId(/^thumbnail-/);
      expect(thumbnails.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('hides controls when video count is 1', () => {
    const oneVideo = mockVideos.slice(0, 1);
    render(<VideoCarousel videos={oneVideo} />);

    expect(screen.queryByTestId('prev-arrow')).toBeNull();
    expect(screen.queryByTestId('next-arrow')).toBeNull();
  });

  it('shows controls when video count is 2', () => {
    const twoVideos = mockVideos.slice(0, 2);
    render(<VideoCarousel videos={twoVideos} />);

    expect(screen.getByTestId('prev-arrow')).toBeInTheDocument();
    expect(screen.getByTestId('next-arrow')).toBeInTheDocument();
  });

  it('hides thumbnails when video count <= 2', () => {
    const twoVideos = mockVideos.slice(0, 2);
    render(<VideoCarousel videos={twoVideos} />);

    const thumbnails = screen.queryAllByTestId(/^thumbnail-/);
    expect(thumbnails.length).toBe(0);
  });

  it('navigates to next video when next arrow is clicked', async () => {
    render(<VideoCarousel videos={mockVideos} />);

    await waitFor(() => {
      expect(document.querySelector('iframe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('next-arrow'));

    await waitFor(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement;
      expect(iframe.src).toContain('BV2');
    });
  });

  it('navigates to prev video when prev arrow is clicked', async () => {
    render(<VideoCarousel videos={mockVideos} />);

    await waitFor(() => {
      expect(document.querySelector('iframe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('next-arrow'));
    fireEvent.click(screen.getByTestId('prev-arrow'));

    await waitFor(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement;
      expect(iframe.src).toContain('BV1');
    });
  });

  it('shows indicator', () => {
    render(<VideoCarousel videos={mockVideos} />);

    expect(screen.getByTestId('indicator')).toBeInTheDocument();
  });

  it('navigates when indicator is clicked', async () => {
    render(<VideoCarousel videos={mockVideos} />);

    await waitFor(() => {
      expect(document.querySelector('iframe')).toBeInTheDocument();
    });

    const indicators = screen.getAllByTestId('indicator-dot');
    fireEvent.click(indicators[2]);

    await waitFor(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement;
      expect(iframe.src).toContain('BV3');
    });
  });
});
