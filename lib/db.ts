import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    _sql = neon(process.env.DATABASE_URL, {
      fetchOptions: { cache: 'no-store' },
    });
  }
  return _sql;
}

export const sql: NeonQueryFunction<false, false> = new Proxy(
  function () {} as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, thisArg, args) {
      return Reflect.apply(getSql(), thisArg, args);
    },
    get(_target, prop) {
      return Reflect.get(getSql(), prop);
    },
  }
);
