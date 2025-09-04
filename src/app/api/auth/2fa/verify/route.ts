import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/session-security';
import { withCSRFProtection } from '@/lib/api-csrf';
import { withValidation } from '@/lib/api-validation';
import { z } from 'zod';
import { prisma } from '@/db';
import * as speakeasy from 'speakeasy';
import { randomBytes } from 'crypto';

const verifySchema = z.object({
  token: z.string().length(6, '2FA token must be 6 digits').regex(/^\d{6}$/, 'Invalid token format')
});

async function verify2FAHandler(request: NextRequest, validatedData: { token: string }) {
  try {
    const session = await getSecureSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        twoFactorEnabled: true, 
        twoFactorSecret: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json({ error: '2FA setup not initiated' }, { status: 400 });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: validatedData.token,
      window: 2 // Allow 2 time steps tolerance
    });

    if (!verified) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'USER_ENABLE_2FA',
          details: { 
            step: 'verification_failed',
            token: validatedData.token.replace(/./g, '*') // Mask token in logs
          },
          success: false
        }
      });

      return NextResponse.json({ error: 'Invalid 2FA token' }, { status: 400 });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      randomBytes(4).toString('hex').toUpperCase()
    );

    // Enable 2FA
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorEnabled: true,
        backupCodes: backupCodes
      }
    });

    // Log successful enablement
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_ENABLE_2FA',
        details: { step: 'enabled_successfully' },
        success: true
      }
    });

    return NextResponse.json({
      success: true,
      backupCodes: backupCodes,
      message: '2FA has been successfully enabled'
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json({ error: 'Failed to verify 2FA' }, { status: 500 });
  }
}

export const POST = withCSRFProtection(
  withValidation(verifySchema, verify2FAHandler)
);