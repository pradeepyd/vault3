// app/api/(vault)/load/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/db";
import { CacheManager } from "@/lib/cache-manager";
import { withPerformanceMonitoring, measurePerformance } from "@/lib/performance-monitor";
import { dbPerformance } from "@/lib/db-performance";

async function loadVaultHandler(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const cacheManager = CacheManager.getInstance();

  try {
    // Use optimized database performance utility
    const { result: vault, duration } = await measurePerformance(
      'vault-load-query',
      () => dbPerformance.cachedQuery(
        `vault_${userId}`,
        async () => {
          return await prisma.vault.findFirst({
            where: { userId },
            select: {
              id: true,
              data: true,
              updatedAt: true,
              createdAt: true,
              checksum: true,
              version: true
            }
          });
        },
        300 // Cache for 5 minutes
      )
    );

    if (!vault) {
      return NextResponse.json({ error: "No vault found" }, { status: 404 });
    }

    // For very large vaults, consider streaming
    const dataSize = Buffer.byteLength(vault.data, 'utf8');
    const isLargeVault = dataSize > 1024 * 1024; // 1MB

    if (isLargeVault) {
      console.log(`📊 Loading large vault (${Math.round(dataSize / 1024)}KB) for user ${userId}`);
    }

    const response = NextResponse.json({ 
      data: vault.data,
      lastModified: vault.updatedAt,
      checksum: vault.checksum,
      version: vault.version,
      metadata: {
        size: dataSize,
        queryTime: duration
      }
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minutes browser cache
        'X-Cache': 'HIT',
        'X-Query-Time': `${duration}ms`,
        'X-Data-Size': dataSize.toString(),
        // Add ETag for better caching
        'ETag': `"${vault.checksum || vault.updatedAt.getTime()}"`
      }
    });

    // Handle conditional requests (304 Not Modified)
    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === `"${vault.checksum || vault.updatedAt.getTime()}"`) {
      return new NextResponse(null, { status: 304 });
    }

    return response;
  } catch (error) {
    console.error("Vault load error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export const GET = withPerformanceMonitoring(loadVaultHandler);
