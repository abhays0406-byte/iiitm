import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Nav } from '@/features/shell/Nav';
import { MemoryRouter } from 'react-router-dom';

describe('P8 role-based access', () => {
  it('Doctor sees only doctor pages', () => {
    const { container } = render(
      <MemoryRouter>
        <Nav role="Doctor" />
      </MemoryRouter>,
    );
    const text = container.textContent || '';
    expect(text).toContain('Today');
    expect(text).toContain('Queue');
    expect(text).not.toContain('Audit');
    expect(text).not.toContain('Config');
  });

  it('Admin sees audit and admin pages', () => {
    const { container } = render(
      <MemoryRouter>
        <Nav role="Admin" />
      </MemoryRouter>,
    );
    const text = container.textContent || '';
    expect(text).toContain('Audit');
    expect(text).toContain('Admin');
    expect(text).toContain('Config');
  });

  it('ASHA sees only unreachable page', () => {
    const { container } = render(
      <MemoryRouter>
        <Nav role="ASHA" />
      </MemoryRouter>,
    );
    const text = container.textContent || '';
    expect(text).toContain('Unreachable');
    expect(text).not.toContain('Audit');
  });
});
