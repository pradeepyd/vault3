// app/api/(vault)/save/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/db";
import { CacheManager } from "@/lib/cache-manager";
import { withPerformanceMonitoring, measurePerformance } from "@/lib/performance-monitor";
import { dbPerformance } from "@/lib/db-performance";
import { createHash } from "crypto";

async function saveVaultHandler(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, checksum: providedChecksum } = await req.json();
    if (!data || typeof data !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid encrypted vault data" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const dataSize = Buffer.byteLength(data, 'utf8');
    
    // Check data size limits (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (dataSize > maxSize) {
      return NextResponse.json(
        { 
          error: "Vault data too large", 
          maxSize: `${maxSize / 1024 / 1024}MB`,
          currentSize: `${Math.round(dataSize / 1024 / 1024 * 100) / 100}MB`
        },
        { status: 413 }
      );
    }

    // Generate checksum for integrity verification
    const calculatedChecksum = createHash('sha256').update(data).digest('hex');
    
    // Verify checksum if provided
    if (providedChecksum && providedChecksum !== calculatedChecksum) {
      return NextResponse.json(
        { error: "Data integrity check failed" },
        { status: 400 }
      );
    }

    const cacheManager = CacheManager.getInstance();

    // Use transaction for atomic operations
    const { result: savedVault, duration } = await measurePerformance(
      'vault-save-transaction',
      () => prisma.$transaction(async (tx) => {
        const existing = await tx.vault.findFirst({
          where: { userId },
          select: { id: true, version: true }
        });

        if (existing) {
          return await tx.vault.update({
            where: { id: existing.id },
            data: { 
              data,
              checksum: calculatedChecksum,
              version: existing.version + 1,
              updatedAt: new Date()
            },
            select: {
              id: true,
              version: true,
              updatedAt: true,
              checksum: true
            }
          });
        } else {
          return await tx.vault.create({
            data: {
              userId,
              data,
              checksum: calculatedChecksum,
              version: 1
            },
            select: {
              id: true,
              version: true,
              updatedAt: true,
              checksum: true
            }
          });
        }
      })
    );

    // Invalidate caches in parallel (background operation)
    Promise.all([
      cacheManager.invalidateUser(userId),
      dbPerformance.invalidateUserCaches(userId)
    ]).catch(error => {
      console.error('Cache invalidation failed:', error);
    });

    // Log performance for large vaults
    if (dataSize > 1024 * 1024) { // 1MB
      console.log(`💾 Saved large vault (${Math.round(dataSize / 1024)}KB) for user ${userId} in ${duration}ms`);
    }

    return NextResponse.json({ 
      message: "Vault saved",
      metadata: {
        version: savedVault.version,
        checksum: savedVault.checksum,
        size: dataSize,
        saveTime: duration,
        lastModified: savedVault.updatedAt
      }
    }, { 
      status: 200,
      headers: {
        'X-Save-Time': `${duration}ms`,
        'X-Data-Size': dataSize.toString(),
        'X-Version': savedVault.version.toString()
      }
    });
  } catch (error) {
    console.error("Vault save error:", error);
    
    // Provide more specific error messages
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON data" },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export const POST = withPerformanceMonitoring(saveVaultHandler);
