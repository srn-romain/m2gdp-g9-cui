import { describe, expect, it } from 'vitest';

describe('conventions API', () => {
  it('titre derive jamais stocke', () => {
    const title = (dish: string, first: string) => `${dish} chez ${first}`;
    expect(title('Gratin dauphinois', 'Leonie')).toBe('Gratin dauphinois chez Leonie');
  });
});
