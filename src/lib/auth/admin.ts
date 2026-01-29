// Admin Auth exports - separate from tenant auth
import NextAuth from "next-auth";
import { adminAuthConfig } from "./admin-config";

export const {
  handlers: { GET, POST },
  auth: adminAuth,
  signIn: adminSignIn,
  signOut: adminSignOut,
} = NextAuth(adminAuthConfig);
