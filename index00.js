// Замість старого способу використання listen, використовуємо async/await
import Fastify from 'fastify'; const fastify = Fastify();
import { google } from 'googleapis';
import dotenv from 'dotenv'; dotenv.config();

// Створення сервера для OAuth 2.0
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// URL для отримання авторизації
const SCOPES = ['https://www.googleapis.com/auth/tasks.readonly',  'https://www.googleapis.com/auth/userinfo.profile' ];

// Підготовка Fastify для відправки запитів
fastify.get('/', (request, reply) => {
    reply.type('text/html; charset=utf-8').send(`<a href="/auth">Авторизуватися через Google</a>`);
});

// Маршрут для отримання посилання на авторизацію
fastify.get('/auth', (request, reply) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    reply.redirect(authUrl);
});

// Функція для отримання списків задач
async function getTaskLists(code) {
    if (!code) {
        throw new Error('Не вдалося отримати код авторизації.');
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const people = google.people({ version: 'v1', auth: oauth2Client });
        const userInfo = await people.people.get({
            resourceName: 'people/me',
            personFields: 'names,photos',
        });
        
        // Отримуємо ID користувача
        const userId = userInfo.data.resourceName.split('/')[1];

        const tasks = google.tasks({ version: 'v1', auth: oauth2Client });
        const res = await tasks.tasklists.list();
        const tasklists = res.data.items;

        if (!tasklists || tasklists.length === 0) {
            throw new Error('Немає списків задач.');
        }
        // Отримуємо всі задачі для кожного списку задач
        const taskListsWithTasks = await Promise.all(tasklists.map(async (tasklist) => {
            const taskListTasks = await tasks.tasks.list({
                tasklist: tasklist.id,  // Використовуємо id списку задач
            });
            tasklist.tasks = taskListTasks.data.items || [];  // Додаємо задачі до кожного списку задач
            return tasklist;
        }));

        return { userId, taskListsWithTasks };;
    } catch (error) {
        console.error(error);
        throw new Error('Сталася помилка під час отримання даних.');
    }
}

// Маршрут для callback після авторизації
fastify.get('/callback', async (request, reply) => {
    try {
        const { userId, taskListsWithTasks } = await getTaskLists(request.query.code);
        
        reply.type('application/json').send({
            userId,
            taskLists: taskListsWithTasks.map(tasklist => ({
                id: tasklist.id,
                title: tasklist.title,
                tasks: tasklist.tasks.map(task => ({
                    id: task.id,
                    title: task.title,
                    //status: task.status,
                    // Дата виконання задачі (якщо є) //due: task.due, 
                })),
            })),
        });
    } catch (error) {
        reply.send(error.message);
    }
});

// Запуск сервера з async/await
const start = async () => {
    try {
        const HOST = '0.0.0.0';
        const port = process.env.PORT || 4000;
        await fastify.listen({port, HOST}); //{ port: port, host: HOST }
        console.log('Сервер запущено на http://localhost:' + port);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
