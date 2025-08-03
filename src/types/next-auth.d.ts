import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      isBetaUser: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: string;
    isBetaUser: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    isBetaUser: boolean;
  }
}
