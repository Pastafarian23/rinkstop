/**
 * Minimal in-memory stand-in for the Supabase query builder. It applies the
 * filters, ordering and range/limit the app uses, and returns exact counts when
 * select(..., { count: 'exact' }) is requested. Used to test real query code
 * paths without a database.
 */
export type Row = Record<string, any>;
type Filter = (r: Row) => boolean;
interface Order { col: string; asc: boolean }

class FakeQuery {
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private from = 0;
  private to = Number.POSITIVE_INFINITY;
  private wantCount = false;

  constructor(private rows: Row[]) {}

  select(_cols: string, opts?: { count?: string }) {
    if (opts?.count) this.wantCount = true;
    return this;
  }
  eq(col: string, v: unknown) {
    this.filters.push((r) => r[col] === v);
    return this;
  }
  ilike(col: string, pat: string) {
    const n = pat.replace(/%/g, '').toLowerCase();
    this.filters.push((r) => String(r[col] ?? '').toLowerCase().includes(n));
    return this;
  }
  or(expr: string) {
    const alts = expr.split(',').map((a) => {
      const m = a.match(/^(\w+)\.ilike\.%(.*)%$/);
      if (!m) throw new Error(`unsupported or() clause: ${a}`);
      return { col: m[1], n: m[2].toLowerCase() };
    });
    this.filters.push((r) => alts.some((a) => String(r[a.col] ?? '').toLowerCase().includes(a.n)));
    return this;
  }
  in(col: string, vals: unknown[]) {
    const s = new Set(vals);
    this.filters.push((r) => s.has(r[col]));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  range(from: number, to: number) {
    this.from = from;
    this.to = to;
    return this;
  }
  limit(n: number) {
    this.to = n - 1;
    return this;
  }
  private exec() {
    const matched = this.rows.filter((r) => this.filters.every((f) => f(r)));
    const sorted = [...matched].sort((a, b) => {
      for (const o of this.orders) {
        const av = a[o.col] ?? '';
        const bv = b[o.col] ?? '';
        const c = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
        if (c !== 0) return o.asc ? c : -c;
      }
      return 0;
    });
    const end = this.to === Number.POSITIVE_INFINITY ? sorted.length : this.to + 1;
    return { data: sorted.slice(this.from, end), error: null, count: this.wantCount ? matched.length : null };
  }
  then<R1 = unknown, R2 = never>(
    res?: ((v: unknown) => R1 | PromiseLike<R1>) | null,
    rej?: ((e: unknown) => R2 | PromiseLike<R2>) | null,
  ) {
    return Promise.resolve(this.exec()).then(res as any, rej as any);
  }
}

export function makeFakeClient(getTables: () => Record<string, Row[]>) {
  return { from: (table: string) => new FakeQuery(getTables()[table] ?? []) };
}
