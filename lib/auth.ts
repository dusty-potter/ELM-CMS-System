import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email
      if (!email) return false

      const dbUser = await prisma.user.findUnique({ where: { email } })

      // Only allow users who exist in the DB and are active
      if (!dbUser || !dbUser.active) return false

      // Update last sign in and profile info
      await prisma.user.update({
        where: { email },
        data: {
          name: user.name ?? dbUser.name,
          image: user.image ?? dbUser.image,
          lastSignIn: new Date(),
        },
      })

      return true
    },

    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, role: true, active: true },
        })
        if (dbUser) {
          session.user.id = dbUser.id
          session.user.role = dbUser.role
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
}
