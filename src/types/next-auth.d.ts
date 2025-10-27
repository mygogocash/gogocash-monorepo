declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    expires: string;
    accessToken?: string;
  }

  interface JWT {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    expires: string;
    accessToken?: string;
  }
}
