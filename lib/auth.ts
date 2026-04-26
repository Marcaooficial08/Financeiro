import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET é obrigatória. Defina a variável de ambiente antes de iniciar o app.",
  );
}

class RateLimitedLoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitedLoginError";
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "credentials",
      name: "Credentials",
      type: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        // Rate limit no endpoint real do NextAuth credentials.
        const headers = req?.headers ?? {};
        const ip = getClientIp({
          get: (name: string) => {
            const value = (headers as Record<string, string | string[] | undefined>)[name];
            if (Array.isArray(value)) return value[0] ?? null;
            return value ?? null;
          },
        });
        const limit = checkRateLimit(ip, "/api/auth/callback/credentials");
        if (!limit.ok) {
          throw new RateLimitedLoginError(limit.message ?? "Muitas tentativas de login.");
        }

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordsMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    },
  ],
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.image = user.image ?? null;
      }
      // Chamado por useSession().update({ image }) após upload de avatar
      if (trigger === "update" && session?.image !== undefined) {
        token.image = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.image = (token.image as string | null | undefined) ?? null;
      }
      return session;
    },
  },
};
