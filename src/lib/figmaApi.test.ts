import { describe, it, expect } from 'vitest';
import { resolveNavigationTarget, findClickTarget } from './figmaApi';

describe('resolveNavigationTarget', () => {
  const frames = [{ id: '1:994' }, { id: '1:1024' }, { id: '1:797' }];

  it('returns the target id when it matches an imported frame', () => {
    expect(resolveNavigationTarget('1:994', frames)).toBe('1:994');
  });

  it('returns null when the target does not match any frame (e.g. a mis-linked component)', () => {
    expect(resolveNavigationTarget('1:674', frames)).toBeNull();
  });

  it('returns null for an empty frame list', () => {
    expect(resolveNavigationTarget('1:994', [])).toBeNull();
  });
});

describe('findClickTarget', () => {
  it('uses the legacy transitionNodeID when interactions are absent', () => {
    const node = { transitionNodeID: '1:994' };
    expect(findClickTarget(node)).toBe('1:994');
  });

  it('uses the modern interactions array when transitionNodeID is absent', () => {
    const node = {
      interactions: [
        { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: '1:994' }] }
      ]
    };
    expect(findClickTarget(node)).toBe('1:994');
  });

  it('prefers interactions over a stale/mismatched transitionNodeID', () => {
    const node = {
      transitionNodeID: '1:674',
      interactions: [
        { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: '1:994' }] }
      ]
    };
    expect(findClickTarget(node)).toBe('1:994');
  });

  it('ignores non-click interactions and falls back to transitionNodeID', () => {
    const node = {
      transitionNodeID: '1:994',
      interactions: [
        { trigger: { type: 'ON_HOVER' }, actions: [{ type: 'NODE', destinationId: '1:674' }] }
      ]
    };
    expect(findClickTarget(node)).toBe('1:994');
  });

  it('returns undefined when neither is present', () => {
    expect(findClickTarget({})).toBeUndefined();
  });
});
