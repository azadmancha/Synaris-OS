import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DepthSelector, type Depth } from './DepthSelector';

const ALL_DEPTHS: Depth[] = ['quick', 'balanced', 'deep_dive', 'expert'];

describe('DepthSelector', () => {
  it('renders all 4 depth options', () => {
    const onChange = vi.fn();
    render(<DepthSelector depth="balanced" onChange={onChange} />);

    expect(screen.getByText('Quick')).toBeInTheDocument();
    expect(screen.getByText('Balanced')).toBeInTheDocument();
    expect(screen.getByText('Deep Dive')).toBeInTheDocument();
    expect(screen.getByText('Expert')).toBeInTheDocument();
  });

  it('highlights the active depth with gradient class', () => {
    const onChange = vi.fn();
    const { container } = render(<DepthSelector depth="deep_dive" onChange={onChange} />);

    const buttons = container.querySelectorAll('button');
    const deepDiveBtn = buttons[2]; // Deep Dive is index 2

    expect(deepDiveBtn?.className).toContain('from-synapse-neon-blue');
    expect(deepDiveBtn?.className).toContain('text-white');
  });

  it('does not highlight inactive depths', () => {
    const onChange = vi.fn();
    const { container } = render(<DepthSelector depth="deep_dive" onChange={onChange} />);

    const buttons = container.querySelectorAll('button');
    const quickBtn = buttons[0];
    expect(quickBtn?.className).toContain('text-gray-500');
    expect(quickBtn?.className).not.toContain('from-synapse-neon-blue');
  });

  it('calls onChange with the clicked depth value', () => {
    const onChange = vi.fn();
    render(<DepthSelector depth="balanced" onChange={onChange} />);

    fireEvent.click(screen.getByText('Expert'));
    expect(onChange).toHaveBeenCalledWith('expert');
  });

  it.each(ALL_DEPTHS)('handles click on %s depth', (depth) => {
    const onChange = vi.fn();
    render(<DepthSelector depth="balanced" onChange={onChange} />);

    fireEvent.click(screen.getByText(depth === 'deep_dive' ? 'Deep Dive' : depth.charAt(0).toUpperCase() + depth.slice(1)));
    expect(onChange).toHaveBeenCalledWith(depth);
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    render(<DepthSelector depth="balanced" onChange={onChange} disabled={true} />);

    fireEvent.click(screen.getByText('Expert'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables all buttons when disabled prop is true', () => {
    const onChange = vi.fn();
    const { container } = render(<DepthSelector depth="balanced" onChange={onChange} disabled={true} />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('sets correct title attribute from desc on each option', () => {
    const onChange = vi.fn();
    render(<DepthSelector depth="quick" onChange={onChange} />);

    expect(screen.getByTitle('Brief overview')).toBeInTheDocument();
    expect(screen.getByTitle('Standard depth')).toBeInTheDocument();
    expect(screen.getByTitle('Comprehensive')).toBeInTheDocument();
    expect(screen.getByTitle('Advanced level')).toBeInTheDocument();
  });

  it('applies large size classes when size is md', () => {
    const onChange = vi.fn();
    const { container } = render(<DepthSelector depth="balanced" onChange={onChange} size="md" />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn.className).toContain('text-sm');
      expect(btn.className).toContain('px-4');
    });
  });

  it('applies small size classes by default', () => {
    const onChange = vi.fn();
    const { container } = render(<DepthSelector depth="balanced" onChange={onChange} />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn.className).toContain('text-xs');
    });
  });
});
