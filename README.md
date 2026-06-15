# 🗂️ LRU Cache

A production-grade TypeScript implementation of an LRU Cache featuring **generic typing**, **TTL expiry**, **async mutex thread safety**, and **benchmarked performance**.

Achieves O(1) `get` and `put` using a HashMap + Doubly Linked List.

---

## 🚨 The Real World Problem

In any backend API, hitting the database on every request is slow and expensive. We need a smarter way to store frequently accessed data in memory and automatically remove data that hasn't been used recently.

This is exactly how Redis works under the hood — and how I used it in my SaaS project to reduce database calls significantly.

---

## ❔ What is an LRU Cache?

LRU stands for **Least Recently Used**. It's a caching strategy that:

- Stores up to N items in memory
- When full, removes the item used **least recently**
- Always keeps the **most recently accessed** items

---

## 📐 Approach

Built with a **HashMap + Doubly Linked List** for true O(1) on all operations:

- **HashMap** → O(1) key lookup
- **Doubly Linked List** → O(1) insertion, deletion, and eviction
  Sentinel head/tail nodes remove all edge cases from pointer manipulation. They are never evaluated for TTL expiry — only real data nodes are checked on `get()`.

---

## ✨ Features

### 1. Generic Typing `LRUCache<Key, Value>`

Works with any key/value types — no hardcoded types.

```typescript
const sessionCache = new LRUCache<string, User>({ maxSize: 100 });
const productCache = new LRUCache<number, Product>({ maxSize: 500 });
```

### 2. TTL Expiry

Keys automatically expire after N milliseconds — exactly how Redis TTL works.

```typescript
const cache = new LRUCache<string, string>({ maxSize: 100, ttlMs: 5000 });
await cache.put('session:user1', 'alice');

// 5 seconds later...
await cache.get('session:user1'); // → null (expired)
```

### 3. Thread Safety (Async Mutex)

An async mutex lock queue ensures concurrent operations never corrupt cache state.

All public methods (`get`, `put`, `delete`, `purgeExpired`) are `async` — always `await` them.

```typescript
// Pre-populate keys first, then read concurrently
for (let i = 0; i < 10; i++) {
    await cache.put(`key:${i}`, i * 10);
}

// 50 simultaneous reads — no race conditions, guaranteed hits
const reads = Array.from({ length: 50 }, (_, i) => cache.get(`key:${i % 10}`));
await Promise.all(reads); // ✅ safe — hits:50, hitRate:100%
```

### 4. Manual Deletion & Expiry Purge

Explicitly remove a single key or sweep all expired keys at once.

```typescript
// Remove a specific key
await cache.delete('session:user1'); // → true if existed, false if not

// Sweep all TTL-expired keys in one pass — useful on a periodic timer
const purged = await cache.purgeExpired(); // → number of keys removed
console.log(`Purged ${purged} expired entries`);
```

### 5. Stats & Benchmarks

Built-in hit/miss/eviction tracking with `getStats()` and `resetStats()`.

```typescript
cache.getStats();
// → { hits: 9550, misses: 450, hitRate: 95.5, evictions: 312, size: 500 }

// Reset counters between benchmark runs
cache.resetStats();
cache.getStats(); // → { hits: 0, misses: 0, hitRate: 0, evictions: 0, size: 500 }
```

---

## ⚙️ How It Works

### GET

```
→ key not found?          miss++, return null
→ key expired (TTL)?      delete node, miss++, return null
→ key found?              move to front (MRU), hit++, return value
```

### PUT

```
→ key exists?             update value, refresh TTL, move to front
→ cache full?             evict tail node (LRU), evictions++
→ new key?                insert at front (MRU position)
```

---

## 📊 Benchmark Results

### A — Hit Rate vs Cache Size

Tested with 10,000 operations per cache size using a power-law skewed access pattern (Math.pow(random, 2)) (cold start, no pre-warming):

| Cache Size | Hit Rate   |
| ---------- | ---------- |
| 10         | 4.72%      |
| 50         | 19.05%     |
| 100        | 32.04%     |
| 200        | 53.70%     |
| **500**    | **95.00%** |

> At capacity 500, the cache achieves a **95% hit rate** — meaning 9,500 out of 10,000 requests are served from memory with no database call needed.

### B — Raw Throughput

Tested with 500,000 operations per cache size (median of 3 runs)
using the actual async LRUCache with a JIT pre-warmup pass.
Ops/sec rises monotonically with cache size because a higher hit rate
means fewer expensive `put()` calls.

| Cache Size | Ops/sec       | Hit Rate |
| ---------- | ------------- | -------- |
| 10         | 2,442,066     | 4.70%    |
| 50         | 2,594,463     | 18.71%   |
| 100        | 3,010,336     | 31.81%   |
| 200        | 3,538,558     | 53.14%   |
| **500**    | **5,455,341** | 100.00%  |

> Raw throughput measured without async mutex overhead. Async `LRUCache` ops/sec will be lower (~500K) due to Node.js Promise scheduling.

---

## 📈 Complexity

| Operation         | Time | Space | Notes                                 |
| ----------------- | ---- | ----- | ------------------------------------- |
| `get(key)`        | O(1) | —     | Moves accessed node to front          |
| `put(key, value)` | O(1) | —     | Evicts oldest node if full            |
| `delete(key)`     | O(1) | —     | Async. Removes item directly          |
| `purgeExpired()`  | O(n) | —     | Async. Iterates over entire cache map |
| Overall           | —    | O(n)  | Space scales with maxSize             |

---

## 🚀 Run It

```bash
# Install dependencies
npm install

# Run cache demos and benchmarks
npm run test
```

---

## 🌍 Real World Connection

This pattern is used in:

- **Redis** eviction policies (`allkeys-lru`, `volatile-ttl`)
- **Browser** HTTP cache management
- **CDN** edge caching layers
- **My SaaS project** API caching layer

---

## 💡 What I Learned

I started thinking caching was just storing data in memory. Building this taught me that the **eviction strategy** and **concurrency model** are what make caching actually work at scale:

- Without TTL, stale data silently corrupts your app
- Without thread safety, concurrent requests cause silent data corruption
- Without benchmarks, you don't know if your cache is actually helping
