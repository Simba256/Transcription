import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  const isAuthPage = request.nextUrl.pathname.startsWith('/signin') || 
                     request.nextUrl.pathname.startsWith('/signup');
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/admin') || 
                           request.nextUrl.pathname.startsWith('/dashboard');

  // Redirect to signin if accessing protected route without token
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // Redirect to dashboard if accessing auth pages with token
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/signin', '/signup'],
};