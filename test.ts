import { LRUCache } from './lru-cache';
import type { BenchmarkResult } from './types';

export async function runBenchmarks(): Promise<BenchmarkResult[]> {
    const cacheSizes = [10, 50, 100, 200, 500];
    const totalOps = 10_000;
    const keyRange = 500;
    const results: BenchmarkResult[] = [];

    console.log('\n📊 LRU Cache Benchmark — Hit Rate vs Cache Size');
    console.log('─'.repeat(55));
    console.log(
        `${'Cache Size'.padEnd(14)}${'Hit Rate'.padEnd(14)}${'Ops/sec'.padEnd(14)}`
    );
    console.log('─'.repeat(55));

    for (const size of cacheSizes) {
        const cache = new LRUCache<number, number>({ maxSize: size });

        for (let i = 0; i < Math.min(size, 50); i++) {
            await cache.put(i, i * 10);
        }
        cache.resetStats();

        const start = performance.now();
        for (let i = 0; i < totalOps; i++) {
            const key = Math.floor(Math.pow(Math.random(), 2) * keyRange);
            const value = await cache.get(key);
            if (value === null) {
                await cache.put(key, key * 10);
            }
        }
        const elapsed = (performance.now() - start) / 1000;

        const stats = cache.getStats();
        const opsPerSecond = Math.round(totalOps / elapsed);

        results.push({
            cacheSize: size,
            hitRate: stats.hitRate,
            opsPerSecond,
            totalOps,
        });

        console.log(
            `${String(size).padEnd(14)}${(stats.hitRate + '%').padEnd(14)}${opsPerSecond.toLocaleString().padEnd(14)}`
        );
    }

    console.log('─'.repeat(55));
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
}

async function runConcurrencyDemo(): Promise<void> {
    console.log('\n🔒 Concurrency Demo — 50 simultaneous operations');
    console.log('─'.repeat(45));

    const cache = new LRUCache<string, number>({ maxSize: 20 });

    const ops = Array.from({ length: 50 }, (_, i) =>
        i % 2 === 0 ? cache.put(`key:${i % 10}`, i) : cache.get(`key:${i % 10}`)
    );

    await Promise.all(ops);
    console.log(`Cache size after 50 concurrent ops: ${cache.size}`);
    console.log(`Stats: ${JSON.stringify(cache.getStats())}`);
}

async function main(): Promise<void> {
    await runTTLDemo();
    await runConcurrencyDemo();
    await runBenchmarks();
}

main().catch(console.error);
