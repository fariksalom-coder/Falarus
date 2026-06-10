export type DbQueryResult<T = any> = {
  data: T | null;
  error: { message: string; code?: string; details?: string; hint?: string } | null;
  count?: number | null;
  status?: number;
  statusText?: string;
};

export type DbQueryBuilder<T = any> = PromiseLike<DbQueryResult<T[]>> & {
  select(...args: any[]): DbQueryBuilder<T>;
  insert(...args: any[]): DbQueryBuilder<T>;
  update(...args: any[]): DbQueryBuilder<T>;
  upsert(...args: any[]): DbQueryBuilder<T>;
  delete(...args: any[]): DbQueryBuilder<T>;
  eq(...args: any[]): DbQueryBuilder<T>;
  neq(...args: any[]): DbQueryBuilder<T>;
  gt(...args: any[]): DbQueryBuilder<T>;
  gte(...args: any[]): DbQueryBuilder<T>;
  lt(...args: any[]): DbQueryBuilder<T>;
  lte(...args: any[]): DbQueryBuilder<T>;
  in(...args: any[]): DbQueryBuilder<T>;
  is(...args: any[]): DbQueryBuilder<T>;
  like(...args: any[]): DbQueryBuilder<T>;
  ilike(...args: any[]): DbQueryBuilder<T>;
  not(...args: any[]): DbQueryBuilder<T>;
  filter(...args: any[]): DbQueryBuilder<T>;
  or(...args: any[]): DbQueryBuilder<T>;
  order(...args: any[]): DbQueryBuilder<T>;
  limit(...args: any[]): DbQueryBuilder<T>;
  range(...args: any[]): DbQueryBuilder<T>;
  single(): Promise<DbQueryResult<T>>;
  maybeSingle(): Promise<DbQueryResult<T | null>>;
};

export type DbClient = {
  from<T = any>(table: string): DbQueryBuilder<T>;
  rpc<T = any>(name: string, args?: Record<string, unknown>): Promise<DbQueryResult<T>>;
  storage: any;
};
