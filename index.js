import express from 'express';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ініціалізація OAuth2 клієнта
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Скоупи
const SCOPES = [
    'https://www.googleapis.com/auth/tasks.readonly',
    'https://www.googleapis.com/auth/userinfo.profile'
];

// Головна сторінка
app.get('/', (req, res) => {
    res.send('<a href="/auth">Авторизуватися через Google</a>');
});

// Авторизація — перенаправлення користувача
app.get('/auth', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    res.redirect(authUrl);
});

// Функція для отримання задач
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

        const userId = userInfo.data.resourceName.split('/')[1];

        const tasks = google.tasks({ version: 'v1', auth: oauth2Client });
        const res = await tasks.tasklists.list();
        const tasklists = res.data.items;

        if (!tasklists || tasklists.length === 0) {
            throw new Error('Немає списків задач.');
        }

        const taskListsWithTasks = await Promise.all(tasklists.map(async (tasklist) => {
            const taskListTasks = await tasks.tasks.list({
                tasklist: tasklist.id,
            });
            tasklist.tasks = taskListTasks.data.items || [];
            return tasklist;
        }));

        return { userId, taskListsWithTasks };
    } catch (error) {
        console.error(error);
        throw new Error('Сталася помилка під час отримання даних.');
    }
}

// Обробка callback після авторизації
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).json({ error: 'Не вказано код авторизації' });
    }

    try {
        const { userId, taskListsWithTasks } = await getTaskLists(code);
        res.json({
            userId,
            taskLists: taskListsWithTasks.map(tasklist => ({
                id: tasklist.id,
                title: tasklist.title,
                tasks: (tasklist.tasks || []).map(task => ({
                    id: task.id,
                    title: task.title,
                    //status: task.status,
                    //due: task.due,
                })),
            })),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Healthcheck
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});
