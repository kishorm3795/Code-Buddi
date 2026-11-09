import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProjectShortcuts } from './useProjectShortcuts';

describe('useProjectShortcuts Hook', () => {
  let handlers;

  beforeEach(() => {
    handlers = {
      onSearchFile: vi.fn(),
      onSaveFile: vi.fn(),
      onToggleSidebar: vi.fn(),
      onCloseTab: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers onSearchFile when metaKey/ctrlKey + P is pressed', () => {
    renderHook(() => useProjectShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 'p',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onSearchFile).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('triggers onSaveFile when metaKey/ctrlKey + S is pressed', () => {
    renderHook(() => useProjectShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onSaveFile).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('triggers onToggleSidebar when metaKey/ctrlKey + B is pressed', () => {
    renderHook(() => useProjectShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 'b',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it('triggers onCloseTab when altKey + W is pressed', () => {
    renderHook(() => useProjectShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 'w',
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onCloseTab).toHaveBeenCalledTimes(1);
  });

  it('does not trigger callbacks when enabled is false', () => {
    renderHook(() => useProjectShortcuts({ ...handlers, enabled: false }));

    const event = new KeyboardEvent('keydown', {
      key: 'p',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onSearchFile).not.toHaveBeenCalled();
  });

  it('removes listener on unmount', () => {
    const { unmount } = renderHook(() => useProjectShortcuts(handlers));
    unmount();

    const event = new KeyboardEvent('keydown', {
      key: 'p',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handlers.onSearchFile).not.toHaveBeenCalled();
  });
});
