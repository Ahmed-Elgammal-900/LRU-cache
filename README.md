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

Sentinel head/tail nodes remove all edge cases from pointer manipulation.

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

```typescript
// 50 simultaneous operations — no race conditions
const ops = Array.from({ length: 50 }, (_, i) =>
    i % 2 === 0 ? cache.put(`key:${i}`, i) : cache.get(`key:${i}`)
);
await Promise.all(ops); // ✅ safe
```

### 4. Stats & Benchmarks

Built-in hit/miss/eviction tracking with a `getStats()` method.

```typescript
cache.getStats();
// → { hits: 9550, misses: 450, hitRate: 95.5, evictions: 312, size: 500 }
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

Tested with 10,000 operations per cache size using a Zipf-like skewed access pattern:

| Cache Size | Hit Rate  | Throughput          |
| ---------- | --------- | ------------------- |
| 10         | 4.68%     | 261,616 ops/sec     |
| 50         | 18.87%    | 611,738 ops/sec     |
| 100        | 31.49%    | 580,706 ops/sec     |
| 200        | 52.72%    | 602,080 ops/sec     |
| **500**    | **95.5%** | **538,587 ops/sec** |

> At capacity 500, the cache achieves a **95.5% hit rate** — meaning 9,550 out of 10,000 requests are served from memory with no database call needed.

---

## 📈 Complexity

| Operation         | Time | Space |
| ----------------- | ---- | ----- |
| `get(key)`        | O(1) | —     |
| `put(key, value)` | O(1) | —     |
| `delete(key)`     | O(1) | —     |
| `purgeExpired()`  | O(n) | —     |
| Overall           | —    | O(n)  |

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
