# Ad-Dash Setup Instructions

## Проблема с аутентификацией решена! 🎉

### Что было исправлено:

1. **CORS настройки** - добавлены localhost URLs
2. **База данных** - создан скрипт инициализации SQLite
3. **Безопасность** - исправлена проверка is_active поля
4. **Конфигурация** - добавлен .env файл с настройками

## Быстрый запуск:

### 1. Backend (Python/FastAPI)

```bash
cd backend

# Установить зависимости
pip install -r requirements.txt

# Инициализировать базу данных
python init_db.py

# Запустить сервер
python run_server.py
```

Сервер будет доступен по адресу: http://localhost:8000

### 2. Frontend (React)

```bash
cd frontend

# Установить зависимости
npm install

# Запустить в режиме разработки
npm start
```

Frontend будет доступен по адресу: http://localhost:3000

## Тестирование аутентификации:

```bash
cd backend
python test_auth.py
```

## Основные изменения:

### Backend:
- ✅ Исправлены CORS настройки
- ✅ Добавлен скрипт инициализации БД
- ✅ Улучшена безопасность проверки is_active
- ✅ Добавлен .env файл с настройками

### Frontend:
- ✅ Код уже корректный, никаких изменений не требуется

## API Endpoints:

- `POST /auth/signup` - Регистрация
- `POST /auth/token` - Вход в систему
- `GET /api/adsets` - Получение данных рекламных кампаний

## Устранение проблем:

Если все еще возникают ошибки:

1. **Проверьте, что backend запущен** на порту 8000
2. **Проверьте, что frontend запущен** на порту 3000
3. **Проверьте консоль браузера** для детальных ошибок
4. **Убедитесь, что база данных инициализирована** (запустите `python init_db.py`)

## Структура базы данных:

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Теперь аутентификация должна работать корректно! 🚀
