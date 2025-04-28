# Запуск Back-End части

## Требования
- Установленный [Python 3.8+](https://www.python.org/downloads/)
- Установленный [Poetry](https://python-poetry.org/docs/#installation)

## Установка и запуск

1. **Клонирование репозитория**  
    ```bash
    git clone git@github.com:MGzyzz/multi_tools.git
    cd remember_back_end
    ```

2. **Установка зависимостей и активация виртуального окружения с помощью Poetry**  

    **Для Windows**:
    ```bash
    poetry install
    poetry shell
    ```

    **Для macOS/Linux**:
    ```bash
    poetry install
    poetry shell
    ```

3. **Применение миграций**  
     ```bash
     python manage.py migrate
     ```

4. **Загрузка данных из фикстур**  
     ```bash
     python manage.py loaddata core/fixtures/dumps.json
     ```

5. **Запуск сервера разработки**  
     ```bash
     python manage.py runserver
     ```

6. **Доступ к приложению**  
     Откройте в браузере: [http://localhost:8000](http:localhost:8000) или [http://127.0.0.1:8000](http://127.0.0.1:8000)

## Дополнительно
- Для создания суперпользователя:
  ```bash
  python manage.py createsuperuser
  ```

## Поддержка
Если возникли вопросы, обратитесь к [документации](http:localhost:8000/swagger) или свяжитесь с разработчиком в Telegram: [@MGzyzz](https://t.me/MGzyzz)

## QR Telegram

![back_end/media/mgzyzz.png](back_end/media/mgzyzz.png)