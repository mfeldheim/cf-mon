import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlash } from '../web/hooks/useFlash';
import { useStats } from '../web/hooks/useStats';
import type { AccountStats } from '../src/types';

// ---- useFlash ----

describe('useFlash', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts as false', () => {
    const { result } = renderHook(() => useFlash(0));
    expect(result.current).toBe(false);
  });

  it('becomes true when value changes', () => {
    const { result, rerender } = renderHook(({ v }) => useFlash(v), {
      initialProps: { v: 0 },
    });
    expect(result.current).toBe(false);
    rerender({ v: 1 });
    expect(result.current).toBe(true);
  });

  it('returns to false after 500ms', () => {
    const { result, rerender } = renderHook(({ v }) => useFlash(v), {
      initialProps: { v: 0 },
    });
    rerender({ v: 1 });
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(501));
    expect(result.current).toBe(false);
  });
});

// ---- useStats ----

const mockStats: AccountStats = {
  totalRps: 10, humanRps: 8, botRps: 2, unknownRps: 0,
  cacheHitRatio: 0.5, zoneCount: 1, zones: [], history: [], lastUpdated: 1000,
};

describe('useStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fetches stats on mount and sets state', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    } as Response);

    const { result } = renderHook(() => useStats());
    await act(async () => { /* let effects run */ });

    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.error).toBeNull();
  });

  it('preserves previous stats on fetch error', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats } as Response)
      .mockRejectedValueOnce(new Error('Network down'));

    const { result } = renderHook(() => useStats());
    await act(async () => {});

    // trigger second fetch
    await act(async () => { vi.advanceTimersByTime(60_000); });

    expect(result.current.stats).toEqual(mockStats); // preserved
    expect(result.current.error).toBe('Network down');
  });

  it('sets error on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as unknown as Response);

    const { result } = renderHook(() => useStats());
    await act(async () => {});

    expect(result.current.error).toContain('503');
  });
});
