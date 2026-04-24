import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaffThanks } from '@/components/features/ThanksSection/StaffThanks';
import type { StaffConfig } from '@/data/types';

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

describe('StaffThanks', () => {
  const mockStaff: StaffConfig[] = [
    { id: 1, role: '赛事策划', name: '张三' },
    { id: 2, role: '技术支持', name: '李四' },
    { id: 3, role: '运营推广', name: '王五' },
  ];

  const mockEmptyStaff: StaffConfig[] = [
    { id: 1, role: '赛事策划', name: '（待补充）' },
    { id: 2, role: '技术支持', name: '（待补充）' },
    { id: 3, role: '运营推广', name: '（待补充）' },
  ];

  const mockMixedStaff: StaffConfig[] = [
    { id: 1, role: '赛事策划', name: '（待补充）' },
    { id: 2, role: '技术支持', name: '李四' },
    { id: 3, role: '运营推广', name: '（待补充）' },
  ];

  describe('空数据状态', () => {
    it('工作人员数组为空时不应该渲染', () => {
      const { container } = render(<StaffThanks staff={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('正常渲染', () => {
    it('应该渲染幕后工作人员容器', () => {
      render(<StaffThanks staff={mockStaff} />);

      expect(screen.getByTestId('staff-thanks-container')).toBeInTheDocument();
    });

    it('应该渲染标题', () => {
      render(<StaffThanks staff={mockStaff} />);

      expect(screen.getByTestId('staff-thanks-title')).toBeInTheDocument();
    });

    it('应该渲染所有工作人员', () => {
      render(<StaffThanks staff={mockStaff} />);

      mockStaff.forEach(staff => {
        expect(screen.getByText(staff.role)).toBeInTheDocument();
        expect(screen.getByText(staff.name)).toBeInTheDocument();
      });
    });

    it('应该使用SVG图标替代emoji', () => {
      render(<StaffThanks staff={mockStaff} />);

      const container = screen.getByTestId('staff-thanks-container');
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('空状态处理', () => {
    it('所有人员都是占位符时应该显示"即将公布"', () => {
      render(<StaffThanks staff={mockEmptyStaff} />);

      expect(screen.getByText('幕后工作人员名单即将公布')).toBeInTheDocument();
      expect(screen.getByText('敬请期待')).toBeInTheDocument();
    });

    it('部分人员为占位符时应该正常显示', () => {
      render(<StaffThanks staff={mockMixedStaff} />);

      expect(screen.getByText('李四')).toBeInTheDocument();
      expect(screen.getByText('赛事策划')).toBeInTheDocument();
    });

    it('空状态应该渲染SVG图标', () => {
      render(<StaffThanks staff={mockEmptyStaff} />);

      const container = screen.getByTestId('staff-thanks-container');
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('样式验证', () => {
    it('应该应用正确的卡片样式', () => {
      render(<StaffThanks staff={mockStaff} />);

      const container = screen.getByTestId('staff-thanks-container');
      expect(container.className).toContain('rounded-2xl');
      expect(container.className).toContain('border');
      expect(container.className).toContain('border-amber-500/20');
    });

    it('应该应用正确的背景样式', () => {
      render(<StaffThanks staff={mockStaff} />);

      const container = screen.getByTestId('staff-thanks-container');
      expect(container.className).toContain('bg-gradient-to-br');
      expect(container.className).toContain('backdrop-blur-md');
    });

    it('角色标签应该有正确的样式', () => {
      render(<StaffThanks staff={mockStaff} />);

      const roleBadge = screen.getByText('赛事策划');
      expect(roleBadge.className).toContain('rounded-full');
      expect(roleBadge.className).toContain('bg-gradient-to-r');
      expect(roleBadge.className).toContain('text-amber-400');
    });
  });

  describe('移动端适配', () => {
    it('应该有正确的内边距', () => {
      render(<StaffThanks staff={mockStaff} />);

      const container = screen.getByTestId('staff-thanks-container');
      expect(container.className).toContain('p-5');
      expect(container.className).toContain('md:p-6');
    });

    it('标题应该有响应式大小', () => {
      render(<StaffThanks staff={mockStaff} />);

      const title = screen.getByTestId('staff-thanks-title');
      expect(title.className).toContain('text-lg');
      expect(title.className).toContain('md:text-xl');
    });
  });
});
