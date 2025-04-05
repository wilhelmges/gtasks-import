import Fastify from 'fastify';

const fastify = Fastify();

fastify.get('/', async (request, reply) => {
    return { message: 'Hello, Fastify!' };
});

const start = async () => {
    try {
        const port = process.env.PORT || 10000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server is listening on port ${port}`);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
