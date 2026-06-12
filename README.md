# FrameLock GitHub Pages Site v3

Статический сайт для GitHub Pages: лендинг, форма заявки, личный кабинет заявки и локальная демо-админка.

## Важно
GitHub Pages не запускает Node.js backend и не хранит общую базу. Поэтому текущая версия сохраняет заявки в localStorage браузера. Это полноценный frontend-прототип и красивый публичный сайт. Для настоящей выдачи ключей всем игрокам нужен backend на Node.js и Velocity API.

## Как опубликовать
1. Загрузите файлы в корень GitHub репозитория.
2. Settings -> Pages.
3. Source: Deploy from a branch.
4. Branch: main, folder: /root.
5. Save.

## Настройки
Откройте `assets/config.js`:

```js
adminLogin: 'admin',
adminPassword: 'framelock',
backendEndpoint: ''
```

Логин админки для демо:
- login: `admin`
- password: `framelock`

Для настоящей админки этот пароль нельзя использовать как защиту. На GitHub Pages JS виден всем.

## Функции
- главная страница
- описание проекта
- правила
- форма заявки
- секретный код заявки
- личный кабинет заявки
- админ-панель
- изменение статуса заявки
- локальная генерация demo-ключа
- export JSON / CSV
- мобильная адаптация
