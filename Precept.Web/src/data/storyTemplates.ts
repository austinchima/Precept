import type { StoryCategory, ConfidenceLevel } from '../types';

export interface StoryTemplate {
  title: string;
  category: StoryCategory;
  sourceProject: string;
  confidenceLevel: ConfidenceLevel;
  codeSnippet: string;
  explanation: string;
}

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    title: 'Token-bucket rate limiter',
    category: 'SystemDesign',
    sourceProject: 'API Gateway',
    confidenceLevel: 'Okay',
    codeSnippet: `const bucket = new Map<string, { tokens: number; last: number }>();

function allowRequest(key: string, rate: number, capacity: number): boolean {
  const now = Date.now();
  const entry = bucket.get(key) ?? { tokens: capacity, last: now };
  const elapsed = (now - entry.last) / 1000;
  entry.tokens = Math.min(capacity, entry.tokens + elapsed * rate);
  entry.last = now;
  if (entry.tokens < 1) return false;
  entry.tokens -= 1;
  bucket.set(key, entry);
  return true;
}`,
    explanation: `I implemented a token-bucket rate limiter to protect our API gateway from traffic spikes. The bucket refills tokens proportional to the allowed rate and caps at a configurable capacity. Each request consumes one token; if the bucket is empty, the request is rejected with a 429 status. I chose token bucket over fixed window because it avoids the thundering-herd problem at window boundaries and allows short bursts. Trade-offs: it requires in-memory state per key, so for a distributed deployment I would back it with Redis and use Lua to keep refill + consume atomic.`,
  },
  {
    title: 'Cache-aside with invalidation',
    category: 'Backend',
    sourceProject: 'Order Service',
    confidenceLevel: 'Okay',
    codeSnippet: `async function getOrder(id: string) {
  const cached = await redis.get('order:' + id);
  if (cached) return JSON.parse(cached);
  const order = await db.orders.findById(id);
  if (order) await redis.setex('order:' + id, 300, JSON.stringify(order));
  return order;
}

async function updateOrder(id: string, data: OrderPatch) {
  const order = await db.orders.update(id, data);
  await redis.del('order:' + id);
  return order;
}`,
    explanation: `I used cache-aside to reduce database load on frequently read order data. On read, the app checks Redis first; on a miss it loads from Postgres and writes back to Redis with a 5-minute TTL. On write, I update the database and invalidate the cache key so the next read reflects fresh data. The main risk is a race condition where a stale read repopulates the cache after invalidation; to mitigate that I used a short TTL and considered cache-update locking for high-contention keys.`,
  },
  {
    title: 'Blue-green deployment with health checks',
    category: 'DevOps',
    sourceProject: 'Release Platform',
    confidenceLevel: 'Okay',
    codeSnippet: `jobs:
  deploy:
    steps:
      - deploy --env=blue --tag=$VERSION
      - health-check --env=blue --retries=10
      - switch-traffic --to=blue
      - sleep 60
      - rollback --env=green --if-failed`,
    explanation: `I set up a blue-green deployment pipeline to release with zero downtime. The CI/CD job deploys the new version to the inactive environment, runs automated health checks, then switches traffic via the load balancer. The previous environment remains warm for a minute as a rollback target. This removed our maintenance-window releases and cut rollback time from minutes to seconds. The cost is doubled infrastructure, so we only run it during business hours and scale the idle environment down overnight.`,
  },
  {
    title: 'JWT authentication middleware',
    category: 'Security',
    sourceProject: 'Auth Service',
    confidenceLevel: 'Okay',
    codeSnippet: `app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.sendStatus(401);
  const token = auth.slice(7);
  try {
    req.user = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    next();
  } catch {
    res.sendStatus(403);
  }
});`,
    explanation: `I wrote JWT middleware to authenticate requests to our internal services. Tokens are signed with RS256 using an asymmetric key pair, so only the auth service holds the private key while resource services verify with the public key. I reject missing or malformed tokens with 401 and invalid signatures with 403. To limit blast radius, tokens are short-lived (15 minutes) and refreshed via a separate httpOnly-cookie refresh flow. I also added a small token-cache layer to avoid verifying the same token repeatedly within its validity window.`,
  },
  {
    title: 'Virtualized list for large tables',
    category: 'Frontend',
    sourceProject: 'Analytics Dashboard',
    confidenceLevel: 'Okay',
    codeSnippet: `<FixedSizeList
  height={600}
  itemCount={rows.length}
  itemSize={48}
  width="100%"
>
  {({ index, style }) => (
    <Row style={style} data={rows[index]} />
  )}
</FixedSizeList>`,
    explanation: `I replaced a standard rendered table with react-window virtualization when our analytics dashboard slowed down past ~1,000 rows. Virtualization only mounts DOM nodes for the visible viewport, keeping scroll and interactions smooth regardless of dataset size. I paired it with windowed server-side sorting and a stable row key to preserve selection state. One gotcha was dynamic row heights; I handled that by measuring representative rows and using a fixed average with overscan to reduce whitespace flicker.`,
  },
  {
    title: 'Composite index for slow query',
    category: 'Database',
    sourceProject: 'Reporting Pipeline',
    confidenceLevel: 'Okay',
    codeSnippet: `CREATE INDEX idx_events_tenant_created
  ON events(tenant_id, created_at DESC)
  INCLUDE (event_type, payload)
  WHERE deleted_at IS NULL;`,
    explanation: `I optimized a reporting query that scanned millions of events by adding a composite index on tenant_id and created_at. The query filtered by tenant, sorted by date, and selected only a few columns, so I used INCLUDE to make the index covering and avoid heap lookups. After deployment, execution time dropped from 4.2 seconds to ~40 milliseconds. I monitored index write amplification and found it acceptable for our read-heavy reporting workload; for a write-heavy path I would have considered a partial index or a separate read replica.`,
  },
];

export function getTemplatesByCategory(category?: StoryCategory): StoryTemplate[] {
  if (!category) return STORY_TEMPLATES;
  return STORY_TEMPLATES.filter((t) => t.category === category);
}
