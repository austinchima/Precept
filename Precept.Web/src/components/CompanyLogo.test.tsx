import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompanyLogo, companyMark } from './CompanyLogo';

describe('companyMark', () => {
  it('uses the designed mark for a known fictional company, ignoring case and spacing', () => {
    expect(companyMark('Kestrel Pay').bg).toBe('#0e5e6f');
    expect(companyMark('  kestrel   PAY ').bg).toBe('#0e5e6f');
    expect(companyMark('Kestrel Pay').rotation).toBe(0);
  });

  it('gives the same generated mark to the same name every time', () => {
    const a = companyMark('Northwind');
    const b = companyMark('northwind');
    expect([a.bg, a.rotation, a.glyph]).toEqual([b.bg, b.rotation, b.glyph]);
  });

  it('spreads different names across colours and shapes', () => {
    const names = ['Acme Robotics', 'Northwind', 'Lumen Health', 'Pinecrest Labs', 'Fernbrook', 'Salt & Signal', 'Hollow Pine', 'Redmark',
      'Vantage Freight', 'Mosaic Bio', 'Calder Systems', 'Juniper Grid', 'Atlas Mutual', 'Byte Harbor', 'Copperleaf', 'Driftline'];
    const marks = names.map(companyMark);
    const distinct = new Set(marks.map((m) => `${m.bg}|${m.rotation}|${String(m.glyph && (m.glyph as { key?: unknown }).key)}|${JSON.stringify((m.glyph as { props?: unknown }).props)}`));
    expect(distinct.size).toBe(names.length);
    expect(new Set(marks.map((m) => m.bg)).size).toBeGreaterThanOrEqual(8);
  });

  it('handles an empty name without throwing', () => {
    expect(() => companyMark('')).not.toThrow();
  });
});

describe('CompanyLogo', () => {
  it('renders a decorative SVG with no letters in it', () => {
    const { container } = render(<CompanyLogo name="Quillstack" size={28} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '28');
    expect(svg.querySelector('text')).toBeNull();
  });
});
