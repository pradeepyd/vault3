import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/session-security';
import { performanceMonitor } from '@/lib/performance-monitor';
import { dbPerformance } from '@/lib/db-performance';
import { cacheManager } from '@/lib/cache-manager';

/**
 * Performance Monitoring API Endpoint
 * Provides system performance metrics, health checks, and optimization insights
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSecureSession(request);
    
    // Only allow admin users to access performance data
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const timeWindow = parseInt(searchParams.get('timeWindow') || '60'); // minutes
    const includeDetails = searchParams.get('details') === 'true';

    // Gather performance data in parallel
    const [
      performanceStats,
      performanceHealth,
      dbHealth,
      cacheStats,
      memoryInfo
    ] = await Promise.all([
      performanceMonitor.getStats(timeWindow),
      performanceMonitor.performHealthCheck(),
      dbPerformance.performanceHealthCheck(),
      Promise.resolve(cacheManager.getStats()),
      Promise.resolve(performanceMonitor.getMemoryInfo())
    ]);

    const responseData = {
      timestamp: new Date().toISOString(),
      timeWindowMinutes: timeWindow,
      system: {
        status: performanceHealth.status,
        memory: {
          used: memoryInfo.heapUsed,
          total: memoryInfo.heapTotal,
          percentUsed: memoryInfo.percentUsed,
          recommendation: memoryInfo.recommendation
        },
        uptime: process.uptime()
      },
      api: {
        totalRequests: performanceStats.totalRequests,
        averageResponseTime: performanceStats.averageResponseTime,
        p95ResponseTime: performanceStats.p95ResponseTime,
        p99ResponseTime: performanceStats.p99ResponseTime,
        errorRate: performanceStats.errorRate,
        slowestEndpoints: performanceStats.slowestEndpoints.slice(0, 5)
      },
      database: {
        status: dbHealth.status,
        queryTime: dbHealth.queryTime,
        recommendations: dbHealth.recommendations
      },
      cache: {
        hitRate: cacheStats.hitRate,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        ...(dbHealth.cacheStats && { details: dbHealth.cacheStats })
      },
      health: {
        overall: performanceHealth.status,
        issues: performanceHealth.issues,
        recommendations: [
          ...performanceHealth.recommendations,
          ...(dbHealth.recommendations || [])
        ]
      }
    };

    // Add detailed metrics if requested
    if (includeDetails) {
      (responseData as any).detailed = {
        memoryTrend: performanceStats.memoryTrend,
        allEndpoints: performanceStats.slowestEndpoints,
        systemMetrics: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid
        }
      };
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Refresh-Rate': '30000' // Suggest 30s refresh rate
      }
    });

  } catch (error) {
    console.error('Performance monitoring API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch performance data',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

/**
 * Performance actions endpoint (POST)
 * Allows admins to trigger performance optimizations
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSecureSession(request);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action, parameters } = await request.json();

    let result;

    switch (action) {
      case 'clear_cache':
        // Clear cache patterns based on parameters
        const pattern = parameters?.pattern || '*';
        const cleared = await cacheManager.invalidatePattern(pattern);
        result = { message: `Cleared ${cleared} cache entries`, cleared };
        break;

      case 'clear_old_metrics':
        const hours = parameters?.hours || 24;
        const removedMetrics = performanceMonitor.clearOldMetrics(hours);
        result = { message: `Removed ${removedMetrics} old metrics`, removed: removedMetrics };
        break;

      case 'reset_stats':
        performanceMonitor.resetStats();
        // Reset cache stats if method exists
        if ('resetStats' in cacheManager && typeof cacheManager.resetStats === 'function') {
          cacheManager.resetStats();
        }
        result = { message: 'Performance statistics reset' };
        break;

      case 'gc_collect':
        if (global.gc) {
          const beforeMemory = process.memoryUsage();
          global.gc();
          const afterMemory = process.memoryUsage();
          const freed = beforeMemory.heapUsed - afterMemory.heapUsed;
          result = { 
            message: 'Garbage collection completed', 
            freedMemory: freed,
            beforeMemory: beforeMemory.heapUsed,
            afterMemory: afterMemory.heapUsed
          };
        } else {
          result = { message: 'Garbage collection not available (run with --expose-gc)' };
        }
        break;

      case 'warmup_cache':
        const userId = parameters?.userId;
        if (userId) {
          await cacheManager.warmUp(userId);
          result = { message: `Cache warmed up for user ${userId}` };
        } else {
          result = { error: 'User ID required for cache warmup' };
        }
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Performance action error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute performance action',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}