/** Modelos del dominio "posts". Sólo tipos, sin lógica. */
export type Post = {
  id: number;
  userId: number;
  title: string;
  body: string;
};
