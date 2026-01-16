import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const session = request.cookies.get('auth_session');
    const path = request.nextUrl.pathname;
    const isPublicPage = path === '/login' || path === '/register' || path === '/claim';
    const isPublicAsset = path.startsWith('/_next') ||
        path.startsWith('/api') ||
        path.includes('.'); // files like favicon.ico

    // Si no hay sesión y no es página pública (y no es asset), redirigir a login
    if (!session && !isPublicPage && !isPublicAsset) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Si hay sesión y está en página pública (login/register/claim), redirigir al dashboard
    if (session && isPublicPage) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
