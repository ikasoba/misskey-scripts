export type DIContext<
  Deps extends Record<string | symbol, any> = Record<string | symbol, any>
> = Deps;

export interface InjectMessage<Id extends Ident<string, any>> {
  type: "inject";
  name: Id;
}

export type IdNames<Id extends Ident<string, any>> = Id extends Ident<
  infer K extends string,
  any
>
  ? K
  : never;

export type ExtractId<
  Id extends Ident<string, any>,
  K extends string
> = Id extends Ident<K, infer V> ? V : never;

export type ContextToIdents<Context extends DIContext> =
  keyof Context extends infer K extends string ? Ident<K, Context[K]> : never;

export type IdentsToContext<Id extends Ident<string, any>> = {
  [K in IdNames<Id>]: ExtractId<Id, K>;
};

export type Dependent<Id extends Ident<string, any>, A extends any[], T> = (
  ...args: A
) => AsyncGenerator<Id, T> | Generator<Id, T>;

export type DependentReturnType<D extends Dependent<any, any, any>> =
  D extends (...args: any) => infer T
    ? T extends AsyncGenerator<any, infer R, any>
      ? Promise<R>
      : T extends Generator<any, infer R, any>
      ? R
      : never
    : never;

export type ExtractIdFromDependent<D extends Dependent<any, any, any>> =
  D extends Dependent<infer Id, any, any> ? Id : never;

declare const special: unique symbol;

export type Ident<K extends string, T> = K & {
  [special]: T;
};

export const ident = <K extends string, T>(name: K) => name as Ident<K, T>;

export const TypeOf = <T>() => void 0 as T;

export function* inject<K extends string, V>(
  name: K,
  _: () => V
): Generator<Ident<K, V>, V> {
  return (yield name as Ident<K, V>) as V;
}

export function bindContext<
  F extends Dependent<any, any, any>,
  Context extends IdentsToContext<ExtractIdFromDependent<F>> = IdentsToContext<
    ExtractIdFromDependent<F>
  >,
  A extends Parameters<F> = Parameters<F>,
  R extends DependentReturnType<F> = DependentReturnType<F>
>(fn: F, ctx: Context): (...args: A) => R {
  return (...args: A) => {
    const g = fn(...(args as any[]));
    if (Symbol.asyncIterator in g) {
      return (async () => {
        let value: Context[keyof Context] | undefined;
        while (true) {
          const res = value ? await g.next(value) : await g.next();

          if (res.done) return res.value;

          value = (ctx as any)[res.value];
        }
      })() as R;
    } else {
      let value: Context[keyof Context] | undefined;
      while (true) {
        const res = value ? g.next(value) : g.next();

        if (res.done) return res.value as R;

        value = (ctx as any)[res.value];
      }
    }
  };
}
