/** Session fields used by the axios client interceptor (avoids importing the route module). */
export interface DataSession {
  accessToken?: string;
  expires?: string;
  user?: {
    name?: string | null;
    email?: string | null;
  };
}
