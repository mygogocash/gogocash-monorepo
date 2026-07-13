/** Session fields used by the admin UI (avoids importing the route module). */
export interface DataSession {
  expires?: string;
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}
