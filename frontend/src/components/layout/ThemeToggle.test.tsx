import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('renders sun icon in light mode', () => {
    const onToggle = vi.fn();
    render(<ThemeToggle dark={false} onToggle={onToggle} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Switch to Dark Mode');
    expect(button).toHaveAttribute('title', 'Switch to Dark Mode');
  });

  it('renders moon icon in dark mode', () => {
    const onToggle = vi.fn();
    render(<ThemeToggle dark={true} onToggle={onToggle} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Switch to Light Mode');
    expect(button).toHaveAttribute('title', 'Switch to Light Mode');
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<ThemeToggle dark={false} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('applies correct track gradient for dark mode', () => {
    const onToggle = vi.fn();
    const { container } = render(<ThemeToggle dark={true} onToggle={onToggle} />);

    // The inner track div should have indigo/slate gradient for dark mode
    const innerDivs = container.querySelectorAll('div.absolute.inset-0');
    const trackDiv = innerDivs[0]; // First absolute inset-0 div is the track
    expect(trackDiv?.className).toContain('indigo');
    expect(trackDiv?.className).toContain('slate');
  });

  it('applies correct track gradient for light mode', () => {
    const onToggle = vi.fn();
    const { container } = render(<ThemeToggle dark={false} onToggle={onToggle} />);

    const innerDivs = container.querySelectorAll('div.absolute.inset-0');
    const trackDiv = innerDivs[0];
    expect(trackDiv?.className).toContain('sky');
    expect(trackDiv?.className).toContain('amber');
  });

  it('positions knob at start in light mode, end in dark mode', () => {
    const onToggle = vi.fn();

    // Light mode — knob at start (translate-x-0)
    const { container: lightContainer, rerender } = render(
      <ThemeToggle dark={false} onToggle={onToggle} />
    );
    const lightKnob = lightContainer.querySelector('.translate-x-0');
    expect(lightKnob).toBeTruthy();

    // Dark mode — knob at end (translate-x-7)
    rerender(<ThemeToggle dark={true} onToggle={onToggle} />);
    const darkKnob = lightContainer.querySelector('.translate-x-7');
    expect(darkKnob).toBeTruthy();
  });

  it('shows moon icon when dark, sun icon when light', () => {
    const onToggle = vi.fn();

    // Light mode — sun should be visible (scale-100 opacity-100)
    const { container: lightContainer, rerender } = render(
      <ThemeToggle dark={false} onToggle={onToggle} />
    );
    const lightIcons = lightContainer.querySelectorAll('.scale-100');
    // The sun icon div should have scale-100 + opacity-100
    const sunDiv = Array.from(lightIcons).find(
      (el) => el.className.includes('opacity-100')
    );
    expect(sunDiv).toBeTruthy();

    // Dark mode — moon should be visible
    rerender(<ThemeToggle dark={true} onToggle={onToggle} />);
    const darkIcons = lightContainer.querySelectorAll('.scale-100');
    const moonDiv = Array.from(darkIcons).find(
      (el) => el.className.includes('opacity-100')
    );
    expect(moonDiv).toBeTruthy();
  });
});
