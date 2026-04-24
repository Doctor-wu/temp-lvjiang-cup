import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { ZIndexLayers } from '../../constants/zIndex';
import { Footer } from './Footer';
import { adminPath } from '../../constants/routes';

// 隐藏滚动条的样式 + 全屏滚动吸附
const styles = `
  /* 隐藏垂直滚动条 */
  body::-webkit-scrollbar {
    display: none;
  }
  body {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  /* 全屏滚动吸附样式 - 所有设备统一 */
  html {
    scroll-snap-type: y mandatory;
    overflow-y: scroll;
  }
  section[id] {
    scroll-snap-align: start;
    scroll-snap-stop: always;
    /* 为PC端固定导航栏预留空间，防止内容被遮挡 */
    scroll-margin-top: 96px;
  }
`;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [activeSection, setActiveSection] = useState('hero');

  // 导航栏高度（与 h-24 = 6rem = 96px 对应）
  const NAVBAR_HEIGHT = 96;

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // 计算元素位置并减去导航栏高度，确保内容不被遮挡
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const isMobile = window.innerWidth < 768;
      // 移动端无需偏移，桌面端和平板端减去导航栏高度
      const offsetPosition = isMobile ? elementPosition : elementPosition - NAVBAR_HEIGHT;

      window.scrollTo({
        top: offsetPosition,
        // 所有设备都使用 instant，配合 CSS scroll snap 实现直接定位
        behavior: 'instant',
      });
      setActiveSection(id);
    }
  };

  // 注入隐藏滚动条的样式
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // 添加键盘快捷键监听，Ctrl+Shift+A 打开管理后台
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        window.location.href = adminPath('login');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 添加键盘事件监听器，实现上下键切换模块
  useEffect(() => {
    // 按页面实际渲染顺序：总览 → 视频 → 主播 → 战队 → 赛程 → 鸣谢
    const sections = ['hero', 'videos', 'streamers', 'teams', 'schedule', 'thanks'];
    let currentIndex = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        if (event.key === 'ArrowUp') {
          currentIndex = (currentIndex - 1 + sections.length) % sections.length;
        } else {
          currentIndex = (currentIndex + 1) % sections.length;
        }
        scrollToSection(sections[currentIndex]);
      }
    };

    // 添加键盘事件监听器
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 监听滚动，更新当前激活的section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'streamers', 'teams', 'schedule', 'videos', 'thanks'];
      // 使用导航栏高度作为偏移量，确保判断更准确
      const scrollPosition = window.scrollY + NAVBAR_HEIGHT + 20;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 导航项配置
  const navItems = [
    { id: 'hero', label: '总览' },
    { id: 'videos', label: '视频' },
    { id: 'streamers', label: '主播' },
    { id: 'teams', label: '战队' },
    { id: 'schedule', label: '赛程' },
    { id: 'thanks', label: '鸣谢' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* PC端顶部导航栏 - 仅在md及以上屏幕显示 */}
      <header
        className="hidden md:block fixed top-0 left-0 right-0 bg-gradient-to-r from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a] border-b-2 border-secondary/50 shadow-lg shadow-secondary/10"
        style={{ zIndex: ZIndexLayers.STICKY }}
      >
        <div className="container mx-auto px-8 h-24 flex items-center justify-between">
          {/* Logo区域 */}
          <div
            className="flex items-center space-x-4 cursor-pointer group"
            onClick={() => scrollToSection('hero')}
          >
            <div className="relative">
              <Trophy className="h-12 w-12 text-secondary group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 bg-secondary/20 blur-xl rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-black text-white tracking-wider bg-gradient-to-r from-white via-secondary to-white bg-clip-text">
                驴酱杯
              </span>
              <span className="text-sm text-secondary font-bold tracking-[0.3em] uppercase">
                2026 Championship
              </span>
            </div>
          </div>

          {/* 中间导航菜单 */}
          <nav className="flex items-center bg-black/30 rounded-lg p-1.5 border border-white/10">
            {navItems.map(item => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`
                    relative px-10 py-4 mx-1 text-lg font-bold transition-all duration-300 rounded-md
                    ${
                      isActive
                        ? 'bg-gradient-to-b from-primary to-primary/80 text-white shadow-lg shadow-primary/30 border border-primary/50'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <span className="relative z-10">{item.label}</span>
                  {/* 选中状态的发光效果 */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary/20 to-transparent rounded-md" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* 右侧区域 - 已移除管理入口，使用快捷键 Ctrl+Shift+A 访问 */}
          <div className="w-[120px]" />
        </div>
      </header>

      {/* PC端为固定导航栏预留空间 */}
      <div className="hidden md:block h-24" />

      <main className="flex-grow pb-16 md:pb-0">{children}</main>

      {/* 移动端底部导航栏 */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a1a]/95 backdrop-blur-lg border-t border-white/10"
        style={{ zIndex: ZIndexLayers.STICKY }}
      >
        <div className="flex items-center justify-between px-2 py-1">
          {navItems.map(item => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`
                  flex flex-col items-center justify-center flex-1 py-2 px-1 text-xs font-medium transition-all duration-200 rounded-lg mx-0.5
                  ${isActive ? 'text-secondary bg-secondary/10' : 'text-gray-400 hover:text-white'}
                `}
              >
                <span
                  className={`text-base mb-0.5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                >
                  {item.label === '总览' && '🏠'}
                  {item.label === '视频' && '📺'}
                  {item.label === '主播' && '🎙️'}
                  {item.label === '战队' && '⚔️'}
                  {item.label === '赛程' && '📅'}
                  {item.label === '鸣谢' && '🙏'}
                </span>
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* PC端页脚 */}
      <Footer />
    </div>
  );
};

export default Layout;
