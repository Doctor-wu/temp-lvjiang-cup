import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlayerStatsHeader from '@/components/features/match-data/PlayerStatsHeader';

describe('PlayerStatsHeader', () => {
  it('应该正确渲染表头', () => {
    render(<PlayerStatsHeader />);

    // 检查所有列标题（使用getAllByText因为有重复的列标题如"选手"、"英雄"等）
    expect(screen.getAllByText('选手').length).toBe(2); // 左右各一个
    expect(screen.getAllByText('英雄').length).toBe(2); // 左右各一个
    expect(screen.getAllByText('KDA').length).toBe(2); // 左右各一个
    expect(screen.getAllByText('金币').length).toBe(2); // 左右各一个
    expect(screen.getAllByText('补刀').length).toBe(2); // 左右各一个
    expect(screen.getByText('位置')).toBeInTheDocument(); // 中间只有一个
  });

  it('应该有正确的背景色', () => {
    const { container } = render(<PlayerStatsHeader />);

    const header = container.firstChild as HTMLElement;
    expect(header.className).toContain('bg-[#3c3c3c]');
  });

  it('应该有底部边框', () => {
    const { container } = render(<PlayerStatsHeader />);

    const header = container.firstChild as HTMLElement;
    expect(header.className).toContain('border-b');
  });

  it('列标题应该使用灰色文字', () => {
    const { container } = render(<PlayerStatsHeader />);

    const labels = container.querySelectorAll('.text-gray-300');
    expect(labels.length).toBeGreaterThan(0);
  });
});
