import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VideoPlayer } from '@/components/video-carousel/VideoPlayer';
import type { VideoItem } from '@/components/video-carousel/VideoPlayer';

describe('VideoPlayer', () => {
  const mockVideo: VideoItem = {
    bvid: 'BV1xx411c7XZ',
    title: 'Test Video',
    cover: 'https://example.com/cover.jpg',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders iframe with autoplay when autoplay is true', async () => {
    render(<VideoPlayer video={mockVideo} autoplay muted />);

    await waitFor(() => {
      expect(screen.queryByTitle('bilibili-player')).toBeInTheDocument();
    });

    const iframe = screen.getByTitle('bilibili-player') as HTMLIFrameElement;
    expect(iframe.src).toContain('BV1xx411c7XZ');
    expect(iframe.src).toContain('autoplay=1');
    expect(iframe.src).toContain('muted=1');
  });

  it('renders iframe without autoplay when autoplay is false', async () => {
    render(<VideoPlayer video={mockVideo} autoplay={false} />);

    await waitFor(() => {
      expect(screen.queryByTitle('bilibili-player')).toBeInTheDocument();
    });

    const iframe = screen.getByTitle('bilibili-player') as HTMLIFrameElement;
    expect(iframe.src).toContain('BV1xx411c7XZ');
    expect(iframe.src).toContain('autoplay=0');
  });

  it('renders iframe by default', async () => {
    render(<VideoPlayer video={mockVideo} />);

    await waitFor(() => {
      expect(screen.queryByTitle('bilibili-player')).toBeInTheDocument();
    });

    const iframe = screen.getByTitle('bilibili-player') as HTMLIFrameElement;
    expect(iframe.src).toContain('BV1xx411c7XZ');
  });
});
