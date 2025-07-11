import ioredis from 'ioredis';
const { createClient } = ioredis;

async function testRedisConnection() {
  const client = createClient({
    url: 'redis://localhost:6379',
    connectTimeout: 5000,
    retryStrategy: (times) => {
      if (times >= 3) return null;
      return 2000;
    },
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
    process.exit(1);
  });

  try {
    console.log('Successfully connected to Redis!');

    // 测试 set/get
    await client.set('test-key', 'Hello Redis');
    const value = await client.get('test-key');
    console.log('Retrieved value:', value);

    // 测试 setex（注意方法名）
    await client.setex('temp-key', 10, 'This will expire in 10 seconds');
    const tempValue = await client.get('temp-key');
    console.log('Temporary value:', tempValue);

  } catch (error) {
    console.error('Error occurred:', error);
  } finally {
    await client.quit();
  }
}

testRedisConnection().catch(console.error);
