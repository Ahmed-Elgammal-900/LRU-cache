import { LRUCache } from './lru-cache';
import type { BenchmarkResult, CacheStats } from './types';

async function runHitRateBenchmark(): Promise<BenchmarkResult[]> {
    const cacheSizes = [10, 50, 100, 200, 500];
    const totalOps = 10_000;
    const keyRange = 500;
    const results: BenchmarkResult[] = [];

    console.log('\n📊 Benchmark A — Hit Rate vs Cache Size (cold start)');
    console.log('─'.repeat(60));
    console.log(
        `${'Cache Size'.padEnd(14)}${'Hit Rate'.padEnd(14)}${'Notes'.padEnd(20)}`
    );
    console.log('─'.repeat(60));

    for (const size of cacheSizes) {
        const cache = new LRUCache<number, number>({ maxSize: size });

        for (let i = 0; i < totalOps; i++) {
            const key = Math.floor(Math.pow(Math.random(), 2) * keyRange);
            const value = await cache.get(key);
            if (value === null) {
                await cache.put(key, key * 10);
            }
        }

        const stats = cache.getStats();
        results.push({
            cacheSize: size,
            hitRate: stats.hitRate,
            opsPerSecond: 0,
            totalOps,
        });

        const note = size >= keyRange ? 'cache ≥ key range' : '';
        console.log(
            `${String(size).padEnd(14)}${(stats.hitRate.toFixed(2) + '%').padEnd(14)}${note}`
        );
    }

    console.log('─'.repeat(60));
    console.log('Note: cold-start hit rates are lower than steady-state.\n');
    return results;
}

async function runThroughputBenchmark(): Promise<BenchmarkResult[]> {
    const cacheSizes = [10, 50, 100, 200, 500];
    const totalOps = 500_000;
    const keyRange = 500;
    const runs = 3;
    const results: BenchmarkResult[] = [];

    const jitCache = new LRUCache<number, number>({ maxSize: 100 });
    for (let i = 0; i < 50_000; i++) {
        const key = Math.floor(Math.pow(Math.random(), 2) * keyRange);
        if ((await jitCache.get(key)) === null) {
            await jitCache.put(key, key * 10);
        }
    }
    jitCache.destroyInterval();

    console.log('\n📊 Benchmark B — Raw Throughput (async, warmed up)');
    console.log('─'.repeat(60));
    console.log(
        `${'Cache Size'.padEnd(14)}${'Ops/sec'.padEnd(20)}${'Hit Rate'.padEnd(14)}`
    );
    console.log('─'.repeat(60));

    for (const size of cacheSizes) {
        const timings: number[] = [];
        let lastStats: CacheStats | null = null;

        for (let run = 0; run < runs; run++) {
            const cache = new LRUCache<number, number>({ maxSize: size });

            const warmupOps = Math.max(5_000, size * 20);
            for (let i = 0; i < warmupOps; i++) {
                const key = Math.floor(Math.pow(Math.random(), 2) * keyRange);
                if ((await cache.get(key)) === null) {
                    await cache.put(key, key * 10);
                }
            }
            cache.resetStats();

            const start = performance.now();
            for (let i = 0; i < totalOps; i++) {
                const key = Math.floor(Math.pow(Math.random(), 2) * keyRange);
                if ((await cache.get(key)) === null) {
                    await cache.put(key, key * 10);
                }
            }
            timings.push(performance.now() - start);
            lastStats = cache.getStats();
            cache.destroyInterval();
        }

        timings.sort((a, b) => a - b);
        const medianElapsed = timings[Math.floor(runs / 2)] / 1000;
        const opsPerSecond = Math.round(totalOps / medianElapsed);

        results.push({
            cacheSize: size,
            hitRate: lastStats!.hitRate,
            opsPerSecond,
            totalOps,
        });

        console.log(
            `${String(size).padEnd(14)}${opsPerSecond.toLocaleString().padEnd(20)}${(lastStats!.hitRate.toFixed(2) + '%').padEnd(14)}`
        );
    }

    console.log('─'.repeat(60));
    console.log('Note: median of 3 runs, 500k ops each.\n');
    return results;
}

async function runTTLDemo(): Promise<void> {
    console.log('\n⏱️  TTL Expiry Demo (500ms TTL)');
    console.log('─'.repeat(40));

    const cache = new LRUCache<string, string>({
        maxSize: 10,
        ttlMs: 500,
    });

    await cache.put('session:user1', 'alice');
    await cache.put('session:user2', 'bob');

    const before = await cache.get('session:user1');
    console.log(`Before expiry:  session:user1 = ${before}`);

    await new Promise((r) => setTimeout(r, 600));

    const after = await cache.get('session:user1');
    console.log(`After 600ms:    session:user1 = ${after}`);
    console.log(`Stats: ${JSON.stringify(cache.getStats())}`);
    cache.destroyInterval();
}

async function runConcurrencyDemo(): Promise<void> {
    console.log('\n🔒 Concurrency Demo — 50 simultaneous reads');
    console.log('─'.repeat(45));

    const cache = new LRUCache<string, number>({ maxSize: 20 });

    for (let i = 0; i < 10; i++) {
        await cache.put(`key:${i}`, i * 10);
    }
    cache.resetStats();

    await Promise.all(
        Array.from({ length: 50 }, (_, i) => cache.get(`key:${i % 10}`))
    );

    console.log(`Cache size after concurrent reads: ${cache.size}`);
    console.log(`Stats: ${JSON.stringify(cache.getStats())}`);
}

async function main(): Promise<void> {
    await runTTLDemo();
    await runConcurrencyDemo();
    await runHitRateBenchmark();
    await runThroughputBenchmark();
}

main().catch(console.error);
