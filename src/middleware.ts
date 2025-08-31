import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { validateCSRFMiddleware } from '@/lib/csrf';
import { checkRateLimit, RateLimitConfig } from '@/lib/rate-limit-redis';
import { 
  recordRateLimitExceeded, 
  recordSuspiciousActivity, 
  checkIPReputation, 
  isIPBlocked 
} from '@/lib/security-monitor';

// Enhanced rate limiting configuration with Upstash Redis
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/auth': { 
    requests: parseInt(process.env.RATE_LIMIT_AUTH_REQUESTS || '3'), 
    window: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '900000'), // 15 minutes
    keyPrefix: 'auth'
  },
  '/api/register': { 
    requests: 2, 
    window: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'register'
  },
  '/api/subscription': { 
    requests: 10, 
    window: 60 * 1000, // 1 minute
    keyPrefix: 'subscription'
  },
  '/api/webhooks': {
    requests: 100,
    window: 60 * 1000, // 1 minute for webhooks
    keyPrefix: 'webhook'
  },
  '/api': { 
    requests: parseInt(process.env.RATE_LIMIT_API_REQUESTS || '50'), 
    window: parseInt(process.env.RATE_LIMIT_API_WINDOW || '900000'), // 15 minutes
    keyPrefix: 'api'
  },
};

// Production-hardened security headers configuration
const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'off',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': process.env.STRICT_TRANSPORT_SECURITY || 'max-age=31536000; includeSubDomains; preload',
  'Expect-CT': 'max-age=86400, enforce',
  'Content-Security-Policy': process.env.CONTENT_SECURITY_POLICY_ENABLED === 'true' ? [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'", // Only WASM for Next.js, removed unsafe-eval/inline
    "style-src 'self' 'unsafe-inline'", // Required for Tailwind CSS
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.stripe.com https://api.pwnedpasswords.com https://*.upstash.io",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ') : [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Development fallback
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.stripe.com https://api.pwnedpasswords.com https://*.upstash.io",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
};

function getClientIP(request: NextRequest): string {
  // Enhanced IP detection with additional headers
  return request.headers.get('cf-connecting-ip') || // Cloudflare
         request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         request.headers.get('x-real-ip') || 
         request.headers.get('x-client-ip') ||
         'unknown';
}

/**
 * Get rate limiting configuration for a specific path
 */
function getRateLimitConfig(path: string): RateLimitConfig {
  // Find the most specific matching rule
  const sortedPaths = Object.keys(RATE_LIMITS).sort((a, b) => b.length - a.length);
  
  for (const pattern of sortedPaths) {
    if (path.startsWith(pattern)) {
      return RATE_LIMITS[pattern];
    }
  }
  
  // Default fallback
  return RATE_LIMITS['/api'];
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Check if IP is blocked due to suspicious activity
  try {
    const blocked = await isIPBlocked(clientIP);
    if (blocked) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Access denied due to suspicious activity',
          code: 'IP_BLOCKED',
          contact: 'security@vault3.com'
        }),
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(Object.entries(SECURITY_HEADERS))
          }
        }
      );
    }
  } catch (error) {
    console.error('IP block check failed:', error);
    // Continue processing on error (fail-open for availability)
  }
  
  // Check IP reputation for suspicious patterns
  try {
    const reputation = await checkIPReputation(clientIP);
    if (reputation > 0.8) { // Very high threat score
      await recordSuspiciousActivity(clientIP, 'High reputation score detected', userAgent);
    }
  } catch (error) {
    console.error('IP reputation check failed:', error);
  }
  
  let response = NextResponse.next();
  
  // Add security headers to all responses
  response = addSecurityHeaders(response);
  
  // Enhanced rate limiting for API routes using Redis
  if (pathname.startsWith('/api') && process.env.RATE_LIMIT_ENABLED === 'true') {
    const config = getRateLimitConfig(pathname);
    
    try {
      const rateLimitResult = await checkRateLimit(clientIP, config);
      
      if (!rateLimitResult.success) {
        // Record rate limit exceeded event for security monitoring
        await recordRateLimitExceeded(clientIP, pathname, userAgent);
        
        return new NextResponse(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            resetTime: rateLimitResult.resetTime,
            remaining: rateLimitResult.remaining
          }),
          { 
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': rateLimitResult.total.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
              ...Object.fromEntries(Object.entries(SECURITY_HEADERS))
            }
          }
        );
      }
      
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', rateLimitResult.total.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue without rate limiting if Redis fails (fail-open)
    }
  }
  
  // Enhanced CORS handling for API routes
  if (pathname.startsWith('/api')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      process.env.NEXTAUTH_URL || 'http://localhost:3000',
      ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
    ].filter(Boolean);
    
    if (method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') ? origin! : allowedOrigins[0],
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400', // 24 hours
          'Vary': 'Origin',
          ...Object.fromEntries(Object.entries(SECURITY_HEADERS))
        },
      });
    }
    
    // Only set CORS headers for allowed origins
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Vary', 'Origin');
    }
  }
  
  // Authentication protection for protected routes
  const protectedRoutes = ['/dashboard', '/vault', '/team', '/settings', '/shared', '/security'];
  
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      const loginUrl = new URL('/auth/signin', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // Enhanced request size limiting for API routes
  if (pathname.startsWith('/api') && ['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentLength = request.headers.get('content-length');
    const maxSize = parseInt(process.env.MAX_REQUEST_SIZE || '5242880'); // 5MB default
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Request too large',
          code: 'REQUEST_TOO_LARGE',
          maxSize: `${Math.round(maxSize / 1024 / 1024)}MB`,
          received: `${Math.round(parseInt(contentLength) / 1024 / 1024)}MB`
        }),
        { 
          status: 413,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(Object.entries(SECURITY_HEADERS))
          }
        }
      );
    }
  }
  
  // Enhanced CSRF protection for API routes (except auth, webhooks, and csrf-token)
  if (pathname.startsWith('/api') && 
      !pathname.startsWith('/api/auth') && 
      !pathname.startsWith('/api/csrf-token') &&
      !pathname.startsWith('/api/webhooks') &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    
    const csrfResult = await validateCSRFMiddleware(request);
    
    if (!csrfResult.valid) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'CSRF validation failed',
          code: 'CSRF_INVALID',
          message: csrfResult.error
        }),
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(Object.entries(SECURITY_HEADERS))
          }
        }
      );
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};