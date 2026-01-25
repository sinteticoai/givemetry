# Authentication Reference Architecture

> A production-grade authentication system for multi-tenant Next.js SaaS applications.
>
> **Stack:** Next.js 14+ | NextAuth v5 | Prisma | PostgreSQL | Resend

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Database Models](#database-models)
4. [Authentication Flows](#authentication-flows)
5. [Security Design Decisions](#security-design-decisions)
6. [Key Code Patterns](#key-code-patterns)
7. [Multi-Tenant Considerations](#multi-tenant-considerations)
8. [Admin Authentication](#admin-authentication)
9. [Environment Setup](#environment-setup)
10. [File Structure](#file-structure)

---

## Overview

This architecture supports:

- **Email/password authentication** with secure password hashing
- **Email verification** with time-limited tokens
- **Password reset** via secure email links
- **Multi-tenant isolation** - users belong to specific tenants (customers)
- **Admin panel separation** - separate admin users with role-based access
- **JWT sessions** - stateless, httpOnly cookies

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  Login Page    │  Signup Wizard  │  Reset Password  │  Verify   │
└───────┬────────┴────────┬────────┴────────┬─────────┴─────┬─────┘
        │                 │                 │               │
        ▼                 ▼                 ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Routes (/api/auth/*)                    │
├─────────────────────────────────────────────────────────────────┤
│  NextAuth      │  signup/    │  forgot-     │  verify-    │     │
│  [...nextauth] │  route.ts   │  password/   │  email/     │     │
└───────┬────────┴──────┬──────┴──────┬───────┴──────┬──────┴─────┘
        │               │             │              │
        ▼               ▼             ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Prisma (Database Layer)                       │
├─────────────────────────────────────────────────────────────────┤
│  User  │  AppUser  │  Customer  │  VerificationToken  │  ...    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Auth Framework | NextAuth v5 (Auth.js) | First-class Next.js integration, JWT support, extensible callbacks |
| Password Hashing | bcryptjs | Industry standard, configurable cost factor |
| Email Service | Resend | Simple API, React email templates, good deliverability |
| Session Strategy | JWT | Stateless, no session table queries, works with edge runtime |
| Database ORM | Prisma | Type-safe, migrations, multi-database support |

### Dependencies

```json
{
  "next-auth": "^5.0.0-beta.30",
  "bcryptjs": "^3.0.3",
  "resend": "^4.0.0",
  "@prisma/client": "^6.0.0"
}
```

---

## Database Models

### User (NextAuth Auth Record)

The primary authentication record. Stores credentials and email verification status.

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  password      String?   // bcrypt hashed, nullable for OAuth users
  name          String?
  image         String?

  accounts      Account[]
  sessions      Session[]

  @@map("user")
}
```

**Design Notes:**
- `password` is nullable to support OAuth-only users in the future
- `emailVerified` timestamp indicates when verification completed
- cuid() provides URL-safe, collision-resistant IDs

### AppUser (Tenant User)

Links auth users to their tenant (customer). Contains business-specific user data.

```prisma
model AppUser {
  id         String   @id @default(cuid())
  customerId String   // Foreign key to Customer (tenant)
  email      String   @unique
  name       String
  phone      String?
  title      String?
  role       String   @default("owner")  // owner, admin, staff
  authUserId String?  @unique            // Links to User.id

  customer   Customer @relation(fields: [customerId], references: [id])

  @@map("User")  // Historical table name
}
```

**Design Notes:**
- Separate from `User` to keep auth concerns isolated from business data
- `authUserId` links to NextAuth User for session resolution
- `role` enables tenant-level permissions

### VerificationToken

Time-limited tokens for email verification.

```prisma
model VerificationToken {
  identifier String   // User's email
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_token")
}
```

**Design Notes:**
- `identifier` is the email, allowing lookup by email
- Composite unique constraint prevents duplicate tokens per user
- No foreign key to User - tokens can exist before user creation

### PasswordResetToken

Time-limited tokens for password reset.

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  expires   DateTime
  createdAt DateTime @default(now())

  @@index([email])
  @@map("password_reset_token")
}
```

**Design Notes:**
- Index on email for efficient lookup when deleting old tokens
- `createdAt` useful for auditing/debugging
- Separate from VerificationToken for clearer domain modeling

### Customer (Tenant)

The multi-tenant anchor. All business data belongs to a Customer.

```prisma
model Customer {
  id             String    @id @default(cuid())
  businessName   String
  // ... other business fields

  users          AppUser[]
  // ... other relations
}
```

---

## Authentication Flows

### 1. Signup Flow

```
User visits /onboarding/step-1
         │
         ▼
┌────────────────────────┐
│ Enter: name, email,    │
│ password, accept ToS   │
└──────────┬─────────────┘
           │
           ▼
    POST /api/auth/check-email
    (verify email unique)
           │
           ▼
    Store in localStorage
    (multi-step wizard)
           │
           ▼
    ... Steps 2-5 ...
    (business details)
           │
           ▼
    POST /api/auth/signup
           │
           ▼
┌────────────────────────────────────────────┐
│  Transaction:                              │
│  1. Hash password (bcrypt, 10 rounds)      │
│  2. Create User (auth record)              │
│  3. Create Customer (tenant)               │
│  4. Create AppUser (link user to tenant)   │
│  5. Create VerificationToken (24h expiry)  │
│  6. Send verification email                │
└────────────────────────────────────────────┘
           │
           ▼
    Redirect to /check-email
```

**Key Implementation Details:**

```typescript
// Generate secure token
const verificationToken = crypto.randomBytes(32).toString('hex')
const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

// Create all records atomically
await prisma.$transaction([
  prisma.user.create({ data: { email, password: hashedPassword } }),
  prisma.customer.create({ data: { businessName, ... } }),
  prisma.appUser.create({ data: { email, customerId, authUserId } }),
  prisma.verificationToken.create({ data: { identifier: email, token, expires } })
])
```

### 2. Email Verification Flow

```
User receives email
         │
         ▼
Clicks: /verify-email?token=xxx
         │
         ▼
   GET /api/auth/verify-email
         │
         ├─── Token not found ──► Error: "Invalid link"
         │
         ├─── Token expired ────► Error: "Link expired"
         │
         ▼
┌────────────────────────────┐
│  1. Set User.emailVerified │
│  2. Delete token           │
└────────────────────────────┘
         │
         ▼
   Success: "Email verified!"
         │
         ▼
   Redirect to /login
```

### 3. Login Flow

```
User visits /login
         │
         ▼
┌────────────────────────┐
│ Enter: email, password │
└──────────┬─────────────┘
           │
           ▼
    POST /api/auth/signin
    (NextAuth credentials)
           │
           ▼
┌─────────────────────────────────────┐
│  Credentials Provider:              │
│  1. Find user by email              │
│  2. bcrypt.compare(password, hash)  │
│  3. Return user object or null      │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  JWT Callback:                      │
│  1. Check if admin (ConverzaAdmin) │
│  2. If admin: set adminId, role     │
│  3. If tenant: lookup AppUser       │
│  4. Set customerId in token         │
└─────────────────────────────────────┘
           │
           ▼
    JWT stored in httpOnly cookie
           │
           ▼
    Redirect: admin → /admin
              tenant → /dashboard
```

### 4. Password Reset Flow

```
User visits /forgot-password
         │
         ▼
┌───────────────────┐
│ Enter: email      │
└─────────┬─────────┘
          │
          ▼
   POST /api/auth/forgot-password
          │
          ├─── Email not found ──► Return success anyway
          │                        (don't reveal existence)
          ▼
┌────────────────────────────────────┐
│  1. Delete existing tokens (email) │
│  2. Generate token (32 bytes hex)  │
│  3. Store with 1-hour expiry       │
│  4. Send reset email               │
└────────────────────────────────────┘
          │
          ▼
   Show: "Check your email"
          │
          ▼
User clicks: /reset-password?token=xxx
          │
          ▼
┌────────────────────────────────┐
│ Enter: new password (2x)       │
│ Client validates: 8+ chars,    │
│ passwords match                │
└─────────────┬──────────────────┘
              │
              ▼
   POST /api/auth/reset-password
              │
              ▼
┌────────────────────────────────────────┐
│  Transaction:                          │
│  1. Validate token exists & not expired│
│  2. Hash new password (bcrypt)         │
│  3. Update User.password               │
│  4. Delete token                       │
└────────────────────────────────────────┘
              │
              ▼
   Redirect to /login with success message
```

---

## Security Design Decisions

### 1. Password Storage

**Decision:** bcrypt with cost factor 10

**Rationale:**
- bcrypt is memory-hard, resistant to GPU attacks
- Cost factor 10 balances security vs. login latency (~100ms)
- Automatic salt generation prevents rainbow table attacks

```typescript
const hashedPassword = await bcrypt.hash(password, 10)
const isValid = await bcrypt.compare(input, hashedPassword)
```

### 2. Token Generation

**Decision:** 32-byte cryptographically random hex strings

**Rationale:**
- 256 bits of entropy - computationally infeasible to brute force
- Hex encoding is URL-safe and easy to handle
- `crypto.randomBytes()` uses OS entropy source

```typescript
const token = crypto.randomBytes(32).toString('hex')
// Result: 64-character hex string
```

### 3. Token Expiry

| Token Type | Expiry | Rationale |
|------------|--------|-----------|
| Email Verification | 24 hours | Users may not check email immediately |
| Password Reset | 1 hour | Security-sensitive, shorter window |

### 4. Session Strategy

**Decision:** JWT stored in httpOnly cookies

**Rationale:**
- httpOnly prevents XSS token theft
- Stateless - no session table queries on each request
- 7-day expiry with 24-hour refresh window

```typescript
session: {
  strategy: 'jwt',
  maxAge: 7 * 24 * 60 * 60, // 7 days
  updateAge: 24 * 60 * 60,  // Refresh daily
}
```

### 5. Email Enumeration Prevention

**Decision:** Always return success on forgot-password, even if email doesn't exist

**Rationale:**
- Prevents attackers from discovering valid email addresses
- Generic "check your email" message regardless of outcome

```typescript
// Always return success - don't reveal if email exists
return NextResponse.json({
  message: 'If an account exists, you will receive an email'
})
```

### 6. One-Time Token Use

**Decision:** Delete tokens immediately after use

**Rationale:**
- Prevents token reuse if intercepted
- Transaction ensures atomicity

```typescript
await prisma.$transaction([
  prisma.user.update({ where: { email }, data: { password: hashed } }),
  prisma.passwordResetToken.delete({ where: { token } })
])
```

---

## Key Code Patterns

### NextAuth Configuration

```typescript
// lib/auth/config.ts
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' }
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user?.password) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // On sign-in, enrich token with tenant info
        const appUser = await prisma.appUser.findUnique({
          where: { authUserId: user.id }
        })
        token.customerId = appUser?.customerId
        token.userType = 'tenant'
      }
      return token
    },

    async session({ session, token }) {
      // Transfer token data to session
      session.user.id = token.sub
      session.user.customerId = token.customerId
      session.user.userType = token.userType
      return session
    }
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: { strategy: 'jwt' }
}
```

### Session Helper Functions

```typescript
// lib/auth/session.ts
export async function getSession() {
  return await auth()
}

export async function requireAuth() {
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function getCustomerId() {
  const session = await requireAuth()
  return session.user.customerId
}

// Multi-tenant access control
export function canAccessResource(
  session: Session,
  resourceCustomerId: string
): boolean {
  return session.user.customerId === resourceCustomerId
}
```

### Route Protection Middleware

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const isSecure = request.url.startsWith('https')
  const cookieName = isSecure
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: isSecure,
    salt: cookieName
  })

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isAuthPage = ['/login', '/signup'].includes(request.nextUrl.pathname)

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup']
}
```

### Email Sending Pattern

```typescript
// lib/notifications/email.ts
const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
    to: email,
    subject: 'Verify your email',
    html: `
      <h1>Welcome!</h1>
      <p>Click below to verify your email:</p>
      <a href="${verifyUrl}">Verify Email</a>
      <p>Link expires in 24 hours.</p>
    `
  })
}
```

---

## Multi-Tenant Considerations

### Tenant Isolation

Every database query must be scoped to the current tenant:

```typescript
// WRONG - exposes all data
const appointments = await prisma.appointment.findMany()

// CORRECT - scoped to tenant
const customerId = await getCustomerId()
const appointments = await prisma.appointment.findMany({
  where: { customerId }
})
```

### Tenant-Aware Prisma Client

Consider a helper that automatically scopes queries:

```typescript
// lib/db/tenant.ts
export function getTenantPrisma(customerId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, customerId }
          return query(args)
        },
        // ... other operations
      }
    }
  })
}
```

### Session Token Contents

Include tenant ID in JWT to avoid database lookups on every request:

```typescript
// JWT token contains:
{
  sub: "user_id",
  email: "user@example.com",
  customerId: "tenant_id",      // Multi-tenant key
  userType: "tenant" | "admin",
  adminRole?: "admin" | "superadmin"
}
```

---

## Admin Authentication

### Separate Admin Users

Admins have their own model, linked to the same `User` table:

```prisma
model ConverzaAdmin {
  id          String   @id @default(cuid())
  authUserId  String   @unique  // Links to User
  role        String   @default("admin")  // admin | superadmin
  isActive    Boolean  @default(true)
  lastLoginAt DateTime?
}
```

### Admin Session Helpers

```typescript
// lib/auth/admin-session.ts
export function isAdminSession(session: Session): boolean {
  return session?.user?.userType === 'admin'
}

export function isSuperAdminSession(session: Session): boolean {
  return session?.user?.adminRole === 'superadmin'
}

export async function requireAdmin() {
  const session = await getSession()
  if (!isAdminSession(session)) {
    throw new Error('Admin access required')
  }
  return session
}
```

### Middleware for Admin Routes

```typescript
if (request.nextUrl.pathname.startsWith('/admin')) {
  const token = await getToken({ req: request, ... })

  if (token?.userType !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

---

## Environment Setup

### Required Environment Variables

```bash
# NextAuth
NEXTAUTH_SECRET=<random-64-char-string>
NEXTAUTH_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@your-domain.com
```

### Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 48
```

---

## File Structure

```
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── verify-email/page.tsx
│   │   └── check-email/page.tsx
│   ├── api/auth/
│   │   ├── [...nextauth]/route.ts
│   │   ├── signup/route.ts
│   │   ├── check-email/route.ts
│   │   ├── verify-email/route.ts
│   │   ├── resend-verification/route.ts
│   │   ├── forgot-password/route.ts
│   │   └── reset-password/route.ts
│   └── onboarding/
│       ├── step-1/page.tsx
│       └── ...
├── lib/
│   ├── auth/
│   │   ├── config.ts          # NextAuth configuration
│   │   ├── session.ts         # Session helpers
│   │   ├── admin-session.ts   # Admin-specific helpers
│   │   └── client.ts          # Client-side auth utilities
│   └── notifications/
│       └── email.ts           # Email sending functions
├── middleware.ts              # Route protection
└── prisma/
    └── schema.prisma          # Database models
```

---

## Checklist for New Projects

- [ ] Install dependencies: `next-auth`, `bcryptjs`, `resend`
- [ ] Create Prisma models: User, VerificationToken, PasswordResetToken
- [ ] Set up environment variables
- [ ] Configure NextAuth with credentials provider
- [ ] Implement JWT and session callbacks with tenant data
- [ ] Create auth API routes (signup, verify, reset)
- [ ] Create auth UI pages
- [ ] Set up middleware for route protection
- [ ] Configure email templates
- [ ] Test all flows end-to-end

---

## References

- [NextAuth v5 Documentation](https://authjs.dev)
- [bcrypt.js](https://github.com/dcodeIO/bcrypt.js)
- [Resend](https://resend.com/docs)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
