import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { executeSingleQuery } from "./utils/db-helpers";
import * as userQueries from "./queries/users";
import type { User } from "./db-types";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Get user by email
          const sql = userQueries.getUserByEmail(credentials.email);
          const result = await executeSingleQuery<User>(sql, [
            credentials.email,
          ]);

          if (!result.data || result.error) {
            return null;
          }

          const user = result.data[0];

          // Check if user has a password (for OAuth users, this might be null)
          if (!user.hashed_password) {
            return null;
          }

          // Verify password
          const isPasswordValid = await compare(
            credentials.password,
            user.hashed_password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            isBetaUser: user.is_beta_user,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.isBetaUser = user.isBetaUser;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.isBetaUser = token.isBetaUser as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
