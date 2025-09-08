import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import * as userQueries from "./queries/users";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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
          const user = await userQueries.getUserByEmail(credentials.email);

          if (!user) {
            return null;
          }

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
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const existingUser = await userQueries.getUserByEmail(user.email!);

          if (!existingUser) {
            // Create new user for Google OAuth
            const newUser = await userQueries.createUser({
              email: user.email!,
              name: user.name || "",
              image: user.image || undefined,
              hashed_password: undefined, // OAuth users don't have passwords
              email_verified: new Date().toISOString(),
            });

            // Update the user object with the new user data
            user.id = newUser.id;
            user.role = newUser.role;
            user.isBetaUser = newUser.is_beta_user;

            // Store flag to redirect to onboarding for new Google users
            user.needsOnboarding = true;
          } else {
            // Update existing user with OAuth data if needed
            user.id = existingUser.id;
            user.role = existingUser.role;
            user.isBetaUser = existingUser.is_beta_user;
          }

          return true;
        } catch (error) {
          console.error("OAuth sign-in error:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.isBetaUser = user.isBetaUser;
        token.needsOnboarding = user.needsOnboarding;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub || "";
        session.user.role = token.role;
        session.user.isBetaUser = token.isBetaUser;
        session.user.needsOnboarding = token.needsOnboarding;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
