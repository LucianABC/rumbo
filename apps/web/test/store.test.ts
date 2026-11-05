import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from '../src/lib/store';

const { decide } = useAppStore.getState();
const decisions = () => useAppStore.getState().decisions;

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState(), true);
});

describe('app store', () => {
  it('keeps each kind of decision apart, so ids can never collide', () => {
    decide('evidence', 'same-id', 'approved');

    expect(decisions().evidence).toEqual({ 'same-id': 'approved' });
    expect(decisions().drafts).toEqual({});
  });

  it('replaces a decision and takes it back', () => {
    decide('drafts', 'a', 'approved');
    decide('drafts', 'b', 'rejected');
    decide('drafts', 'a', 'rejected');
    expect(decisions().drafts).toEqual({ a: 'rejected', b: 'rejected' });

    decide('drafts', 'a', null);
    expect(decisions().drafts).toEqual({ b: 'rejected' });
  });

  it('starts empty, so the server never renders anyone else’s decisions', () => {
    expect(useAppStore.getInitialState().decisions).toEqual({ drafts: {}, evidence: {} });
  });
});
