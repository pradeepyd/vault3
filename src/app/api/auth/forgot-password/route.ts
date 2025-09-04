import { NextRequest, NextResponse } from 'next/server';
import { withCSRFProtection } from '@/lib/api-csrf';
import { withValidation } from '@/lib/api-validation';
import { z } from 'zod';
import { prisma } from '@/db';
import { EmailService } from '@/lib/email-service';
import { randomBytes } from 'crypto';
import { AuditLogger } from '@/lib/audit-logger';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format').max(254, 'Email too long'),
});

async function forgotPasswordHandler(request: NextRequest, validatedData: { email: string }) {
  const emailService = new EmailService();
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';

  try {
    const { email } = validatedData;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        password: true 
      }
    });

    // Always return success to prevent email enumeration attacks
    // but only send email if user exists and has a password (not OAuth-only)
    if (user && user.password) {
      // Clean up old reset tokens for this user (older than 1 hour)
      await prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          createdAt: {
            lt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
          }
        }
      });

      // Check for recent reset requests (rate limiting)
      const recentToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
          }
        }
      });

      if (recentToken) {
        // Log suspicious activity - too many reset requests
        await AuditLogger.log({
          userId: user.id,
          action: 'PASSWORD_RESET_REQUEST',
          details: { 
            email: user.email,
            reason: 'rate_limit_hit',
            clientIP 
          },
          success: false,
          ipAddress: clientIP
        });

        return NextResponse.json(
          { error: 'Please wait before requesting another password reset' }, 
          { status: 429 }
        );
      }

      // Generate secure reset token
      const resetToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store reset token in database
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt,
          used: false
        }
      });

      // Send reset email
      const emailSent = await emailService.sendPasswordReset({
        email: user.email,
        userName: user.name || 'User',
        resetToken,
        expiresAt
      });

      if (emailSent) {
        // Log successful password reset request
        await AuditLogger.log({
          userId: user.id,
          action: 'PASSWORD_RESET_REQUEST',
          details: { 
            email: user.email,
            tokenExpiry: expiresAt,
            clientIP 
          },
          success: true,
          ipAddress: clientIP
        });
      } else {
        // Log email sending failure
        await AuditLogger.log({
          userId: user.id,
          action: 'PASSWORD_RESET_REQUEST',
          details: { 
            email: user.email,
            reason: 'email_send_failed',
            clientIP 
          },
          success: false,
          ipAddress: clientIP
        });

        return NextResponse.json(
          { error: 'Failed to send reset email. Please try again later.' }, 
          { status: 500 }
        );
      }
    } else {
      // User doesn't exist or is OAuth-only, but still log the attempt
      await AuditLogger.log({
        userId: 'anonymous',
        action: 'PASSWORD_RESET_REQUEST',
        details: { 
          email,
          reason: user ? 'oauth_only_user' : 'user_not_found',
          clientIP 
        },
        success: false,
        ipAddress: clientIP
      });
    }

    // Always return success response to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);

    // Log system error
    await AuditLogger.log({
      userId: 'system',
      action: 'PASSWORD_RESET_REQUEST',
      details: { 
        email: validatedData.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        clientIP 
      },
      success: false,
      ipAddress: clientIP
    }).catch(() => {}); // Don't let audit logging failure break the response

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' }, 
      { status: 500 }
    );
  }
}

export const POST = withCSRFProtection(
  withValidation(forgotPasswordSchema, forgotPasswordHandler)
);