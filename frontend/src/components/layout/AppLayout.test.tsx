import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppLayout } from './AppLayout';
import type { AuthUser } from '@/hooks/useAuth';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    onClick?: () => void;
  }) => (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}));

// Mock useDarkMode
vi.mock('@/hooks/useDarkMode', () => ({
  useDarkMode: () => ({ dark: false, toggleDark: vi.fn() }),
}));

// Mock SynarisWordmark
vi.mock('@/components/brand/SynarisLogo', () => ({
  SynarisWordmark: ({ size }: { size: string }) => (
    <div data-testid="synaris-wordmark" data-size={size}>
      SynarisWordmark
    </div>
  ),
}));

// Mock ThemeToggle
vi.mock('@/components/layout/ThemeToggle', () => ({
  ThemeToggle: ({ dark, onToggle }: { dark: boolean; onToggle: () => void }) => (
    <button data-testid="theme-toggle" data-dark={dark} onClick={onToggle}>
      ThemeToggle
    </button>
  ),
}));

const mockUser: AuthUser = {
  id: 'user-1',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  avatarUrl: null,
};
const mockUserWithAvatar: AuthUser = {
  id: 'user-2',
  name: 'Bob Smith',
  email: 'bob@example.com',
  avatarUrl: 'https://example.com/avatar.jpg',
};

describe('AppLayout', () => {
  const defaultProps = {
    activeNav: 'dashboard',
    user: null,
    isGuest: false,
    onSignOut: vi.fn(),
    children: <div data-testid="content">Page content</div>,
  };

  it('renders children content', () => {
    render(<AppLayout {...defaultProps} />);

    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders all 5 nav links', () => {
    render(<AppLayout {...defaultProps} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Learn')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
    expect(screen.getByText('Study Plan')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('highlights the active nav link', () => {
    render(<AppLayout {...defaultProps} activeNav="quiz" />);

    const quizLink = screen.getByText('Quiz').closest('a');
    expect(quizLink?.className).toContain('bg-blue-50');
    expect(quizLink?.className).toContain('text-blue-700');
  });

  it('does not highlight inactive nav links', () => {
    render(<AppLayout {...defaultProps} activeNav="dashboard" />);

    const learnLink = screen.getByText('Learn').closest('a');
    expect(learnLink?.className).toContain('text-gray-500');
    expect(learnLink?.className).not.toContain('bg-blue-50');
  });

  it('renders Synaris wordmark', () => {
    render(<AppLayout {...defaultProps} />);

    expect(screen.getByTestId('synaris-wordmark')).toBeInTheDocument();
  });

  it('renders theme toggle', () => {
    render(<AppLayout {...defaultProps} />);

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('renders footer', () => {
    render(<AppLayout {...defaultProps} />);

    expect(screen.getByText('Synaris by Azad · Aeris Labs')).toBeInTheDocument();
  });

  it('shows user name when user is provided', () => {
    render(<AppLayout {...defaultProps} user={mockUser} />);

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  it('shows user avatar when avatarUrl is provided', () => {
    render(<AppLayout {...defaultProps} user={mockUserWithAvatar} />);

    const avatarImg = screen.getByAltText('');
    expect(avatarImg).toBeInTheDocument();
    expect(avatarImg).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('shows user initial when no avatarUrl', () => {
    render(<AppLayout {...defaultProps} user={mockUser} />);

    expect(screen.getByText('A')).toBeInTheDocument(); // First letter of Alice
  });

  it('shows Sign Out button when not guest', () => {
    render(<AppLayout {...defaultProps} user={mockUser} isGuest={false} />);

    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('hides Sign Out button when guest', () => {
    render(<AppLayout {...defaultProps} user={mockUser} isGuest={true} />);

    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
  });

  it('calls onSignOut when Sign Out is clicked', () => {
    const onSignOut = vi.fn();
    render(<AppLayout {...defaultProps} user={mockUser} isGuest={false} onSignOut={onSignOut} />);

    fireEvent.click(screen.getByText('Sign Out'));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('hides user section when user is null', () => {
    render(<AppLayout {...defaultProps} user={null} isGuest={true} />);

    // When user is null and guest mode, no user info or sign out shown
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
  });

  it('applies custom maxWidth when provided', () => {
    render(<AppLayout {...defaultProps} maxWidth="max-w-7xl" />);

    // The maxWidth class is on the inner container div inside the header
    const wordmark = screen.getByTestId('synaris-wordmark');
    const innerContainer = wordmark.closest('[class*="max-w"]');
    expect(innerContainer?.className).toContain('max-w-7xl');
  });

  it('uses default max-w-5xl when no maxWidth provided', () => {
    render(<AppLayout {...defaultProps} />);

    // The maxWidth class should be applied to the header div
    const synarisWordmark = screen.getByTestId('synaris-wordmark');
    const headerContainer = synarisWordmark.closest('[class*="max-w-5xl"]');
    expect(headerContainer?.className).toContain('max-w-5xl');
  });

  it('renders all nav links with correct hrefs', () => {
    render(<AppLayout {...defaultProps} />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');

    const learnLink = screen.getByText('Learn').closest('a');
    expect(learnLink).toHaveAttribute('href', '/learn');

    const quizLink = screen.getByText('Quiz').closest('a');
    expect(quizLink).toHaveAttribute('href', '/quiz');
  });

  it('nav items get correct active styling based on activeNav prop', () => {
    const { rerender } = render(<AppLayout {...defaultProps} activeNav="learn" />);

    const learnLink = screen.getByText('Learn').closest('a');
    expect(learnLink?.className).toContain('bg-blue-50');

    // Rerender with different active nav
    rerender(<AppLayout {...defaultProps} activeNav="settings" />);
    const updatedLearnLink = screen.getByText('Learn').closest('a');
    expect(updatedLearnLink?.className).not.toContain('bg-blue-50');
  });

  it('nav is hidden on small screens (sm:flex)', () => {
    render(<AppLayout {...defaultProps} />);

    const nav = screen.getByText('Dashboard').closest('nav');
    expect(nav?.className).toContain('hidden');
    expect(nav?.className).toContain('sm:flex');
  });
});
