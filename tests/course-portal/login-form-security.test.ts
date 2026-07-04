import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

describe('tenant login form credential handling', () => {
  it('does not expose seeded demo credentials in the client-facing form', () => {
    const source = readFileSync('components/tenant-portal/login-form.tsx', 'utf-8');

    expect(source).not.toContain('openmaic-demo');
    expect(source).not.toContain('admin@esilv.local');
  });
});
