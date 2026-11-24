import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServerStatus } from './serverStatus';

/** A ping that answers (or fails) after `ms` milliseconds of fake time. */
const answerAfter = (ms) => () => new Promise((resolve) => setTimeout(resolve, ms));
const failAfter = (ms) => () =>
  new Promise((_resolve, reject) => setTimeout(() => reject(new Error('502')), ms));

/** Creates a status tracker and records every status it moves through. */
function setup(ping) {
  const server = createServerStatus({ ping: vi.fn(ping) });
  const history = [];
  server.subscribe(() => history.push(server.getStatus()));
  return { server, history };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createServerStatus', () => {
  it('goes online without ever showing "waking" when the API answers quickly', async () => {
    const { server, history } = setup(answerAfter(500));
    server.check();
    await vi.advanceTimersByTimeAsync(500);

    expect(server.getStatus()).toBe('online');
    expect(history).toEqual(['online']);
  });

  it('says "waking" after 3 s, then "online" once the sleeping API answers', async () => {
    const { server } = setup(answerAfter(40_000));
    server.check();

    await vi.advanceTimersByTimeAsync(2999);
    expect(server.getStatus()).toBe('checking');
    await vi.advanceTimersByTimeAsync(1);
    expect(server.getStatus()).toBe('waking');
    await vi.advanceTimersByTimeAsync(37_000);
    expect(server.getStatus()).toBe('online');
  });

  it('retries a failed ping every 5 s until it gets through', async () => {
    const ping = vi
      .fn()
      .mockRejectedValueOnce(new Error('502'))
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValue({ status: 200 });
    const server = createServerStatus({ ping });
    server.check();

    await vi.advanceTimersByTimeAsync(0);
    expect(server.getStatus()).toBe('waking');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(ping).toHaveBeenCalledTimes(3);
    expect(server.getStatus()).toBe('online');
  });

  it('gives up after 2 minutes of failures, and "Try again" checks once more', async () => {
    const ping = vi.fn(failAfter(100));
    const server = createServerStatus({ ping });
    server.check();

    await vi.advanceTimersByTimeAsync(110_000);
    expect(server.getStatus()).toBe('waking');
    // It stops as soon as the next retry would land past the 2-minute mark
    await vi.advanceTimersByTimeAsync(10_000);
    expect(server.getStatus()).toBe('offline');

    ping.mockResolvedValue({ status: 200 });
    server.check();
    await vi.advanceTimersByTimeAsync(0);
    expect(server.getStatus()).toBe('online');
  });

  it('never runs two checks at once, and skips checking right after the API answered', async () => {
    const ping = vi.fn(answerAfter(1000));
    const server = createServerStatus({ ping });
    server.check();
    server.check();
    await vi.advanceTimersByTimeAsync(1000);
    expect(ping).toHaveBeenCalledTimes(1);

    server.check(); // e.g. switching back to the tab a minute later
    expect(ping).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(14 * 60_000); // long enough for Render to fall asleep
    server.check();
    expect(ping).toHaveBeenCalledTimes(2);
  });

  it('treats any other API response as proof that the API is awake', async () => {
    const ping = vi.fn(answerAfter(60_000));
    const server = createServerStatus({ ping });
    server.check();
    await vi.advanceTimersByTimeAsync(5000);
    expect(server.getStatus()).toBe('waking');

    server.markContact(); // e.g. the course list arrived first
    expect(server.getStatus()).toBe('online');
  });
});
