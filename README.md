# VK → Telegram Forwarder

Пересылает новые сообщения (текст + фото) из беседы ВКонтакте в группу Telegram.

- VK: User Long Poll API через [vk-io](https://github.com/negezor/vk-io)
- Telegram: бот через [grammY](https://grammy.dev)
- Запускается в Docker на личном сервере (например, Raspberry Pi 5)

## Как работает

```
VK беседа  -->  vkClient (Long Poll)  -->  forwarder  -->  tgClient (Bot)  -->  TG группа
```

Каждое входящее сообщение форматируется как `[Имя Фамилия]: текст` и отправляется как текст, фото или медиагруппа.

## Требования

- Node.js >= 20 (или Docker)
- VK User Token (получается через Implicit Flow)
- Telegram Bot Token от [@BotFather](https://t.me/BotFather)

## Запуск локально

```bash
cp .env.example .env
# заполнить .env токенами
npm install
npm start
```

## Переменные окружения

| Переменная      | Описание                                                         |
|-----------------|------------------------------------------------------------------|
| `VK_USER_TOKEN` | Токен пользователя ВК (Implicit Flow). Обновлять периодически   |
| `VK_PEER_ID`    | peer_id беседы (`2000000000 + chat_id`)                          |
| `TG_BOT_TOKEN`  | Токен бота от @BotFather                                         |
| `TG_CHAT_ID`    | ID целевого чата TG (отрицательное для групп)                    |

> `VK_PEER_ID` = `2000000000 + chat_id`. chat_id виден в URL беседы ВК или через API.

## Docker

```bash
cp .env.example .env
# заполнить .env

docker compose up --build -d
```

Контейнер перезапускается автоматически (`restart: unless-stopped`).

## Структура проекта

```
src/
  index.js       # точка входа
  vkClient.js    # VK Long Poll
  tgClient.js    # Telegram Bot (grammY)
  forwarder.js   # логика пересылки
```

## Лицензия

MIT
