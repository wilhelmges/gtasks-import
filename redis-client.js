import { createClient } from 'redis';
import 'dotenv/config';

const client = createClient({
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  }
});

client.on('error', err => console.log('Redis Client Error', err));

export default client;

if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('Файл запущено напряму');
  await client.connect();
  await client.set('fomo', 'boro');
  const result = await client.get('fomo');
  console.log(result) 
  await client.quit();
}
