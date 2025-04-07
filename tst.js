import client from './redis-client.js';

try {
  await client.connect();
  //await client.set('hello', 'world');
  const str = await client.get('107573009322689221443');
  //console.log(str);
  const tasks = JSON.parse(str);
  console.log(tasks[1].title);
} catch (err) {
  console.error('Redis error:', err);
} finally {
  await client.quit();
}