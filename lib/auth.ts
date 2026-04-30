import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "email,public_profile"
        }
      }
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "john@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }
        
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        if (!user) {
          throw new Error("Invalid credentials");
        }

        if (!user.passwordHash) {
          throw new Error("SOCIAL_LOGIN_ONLY");
        }

        if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
          throw new Error(`BANNED|${user.banReason || "Vi phạm tiêu chuẩn cộng đồng"}|${user.bannedUntil.getTime()}`);
        }

        if (!user.emailVerified) {
          throw new Error("UNVERIFIED");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "facebook") {
        // Fallback cho trường hợp Facebook dùng SĐT (không có email)
        if (!user.email && account.provider === "facebook") {
          const fbId = (profile as any)?.id || (user as any)?.id;
          if (fbId) {
            user.email = `fb_${fbId}@facebook.com`;
            console.log(`[Auth] Generated fallback email for FB user: ${user.email}`);
          }
        }

        if (!user.email) {
          console.error(`[Auth] Error: Social provider ${account.provider} did not return an email address.`);
          return false;
        }
        
        // Phase 26: Chỉnh chu - Chặn đăng nhập bằng Google/FB nếu Email này đã bị Admin xóa vĩnh viễn trước đó
        const userEmail = user?.email?.toLowerCase();
        if (userEmail) {
          const deletedRecord = await prisma.deletedAccountRecord.findUnique({
            where: { email: userEmail }
          });

          if (deletedRecord) {
            return `/login?error=DeletedAccount&reason=${encodeURIComponent(deletedRecord.reason)}`;
          }
        }

        const existingUser = await prisma.user.findUnique({ where: { email: user.email }});
        
        if (existingUser && existingUser.bannedUntil && new Date(existingUser.bannedUntil) > new Date()) {
          return `/login?error=Banned&reason=${encodeURIComponent(existingUser.banReason || "Vi phạm tiêu chuẩn cộng đồng")}&until=${existingUser.bannedUntil.getTime()}`;
        }

        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
            image: user.image,
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            passwordHash: "", 
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        });
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Chỉ sync DB khi user vừa đăng nhập lần đầu (user object có mặt)
      // Không query DB mỗi lần kiểm tra session → tránh race condition khi restart
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;

        // Phase 26: Sync ID thật và Role từ DB ngay khi login
        if (token.email) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: token.email as string },
              select: { id: true, role: true, name: true, image: true }
            });
            if (dbUser) {
              token.id = dbUser.id;
              token.role = dbUser.role;
              token.name = dbUser.name;
              token.picture = dbUser.image;
            }
          } catch (err) {
            console.warn("[Auth] JWT first-login DB sync failed, using provider data.", err);
          }
        }
      }

      // Sync session updates (name, image, role) — triggered by useSession({ update })
      if (trigger === "update" && session) {
        if (session.user?.name) token.name = session.user.name;
        if (session.user?.image) token.picture = session.user.image;
        if (session.user?.role) token.role = session.user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
        };
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
