export type UnionToIntersection<U> = (
  U extends infer T ? (_: T) => void : never
) extends (_: infer T) => void
  ? T
  : never;
