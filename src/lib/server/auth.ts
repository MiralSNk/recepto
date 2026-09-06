import 'server-only';

import { NextAuthOptions, Session } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDB } from '@/db';
import { createRateLimiter } from '@/lib/server/rate-limit';
import { compareOrDummy } from '@/lib/server/constant-time-compare';
import type { User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

// Бэкофф по email: 5 попыток входа за 5 минут — не спасает от распределённого
// перебора по многим IP, но останавливает простой brute-force одного аккаунта.
const checkLoginRateLimit = createRateLimiter(5, 5 * 60_000);

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
    };
  }
  interface User {
    id: string;
    email: string;
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Неверный email или пароль');
        }

        if (!checkLoginRateLimit(credentials.email.toLowerCase())) {
          throw new Error('Слишком много попыток входа. Попробуйте позже.');
        }

        const db = getDB();
        const user = await db.users.findByEmail(credentials.email);

        // Единое сообщение независимо от того, не найден пользователь или
        // неверен пароль — иначе ошибка сама по себе раскрывает, существует
        // ли такой email в системе (user enumeration). compareOrDummy всегда
        // платит стоимость bcrypt.compare, даже когда user не найден — иначе
        // "такого email нет" отвечает заметно быстрее "email есть, пароль
        // неверный", и время ответа раскрывает то же самое enumeration.
        const passwordValid = await compareOrDummy(credentials.password, user?.password_hash);
        if (!user || !passwordValid) {
          throw new Error('Неверный email или пароль');
        }

        // role || 'admin' — осознанный fail-open дефолт, пока в системе есть
        // только одна роль. Нигде в приложении role сейчас не проверяется для
        // авторизации (все проверки — просто "есть ли сессия"), так что это
        // безвредно сегодня. Как только появится вторая, менее привилегированная
        // роль, это нужно будет заменить на явную обработку отсутствующего role.
        return {
          id: String(user.id),
          email: user.email,
          role: user.role || 'admin',
        } as User;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email || '',
          role: token.role || 'admin',
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};