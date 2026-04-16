document.addEventListener("DOMContentLoaded", function () {
    fetch(document.querySelector("#telegramForm").dataset.botStatusUrl)
        .then(response => response.json())
        .then(data => {
            if (!data.active) {
                // Проверка: уже есть предупреждение?
                if (!document.querySelector("#bot-warning")) {
                    const warning = document.createElement("div");
                    warning.id = "bot-warning";
                    warning.className = "alert alert-danger mt-3";
                    warning.innerText = "⚠️ Telegram-бот недоступен. Отправка сообщений временно отключена.";
                    document.querySelector("#telegramForm").insertAdjacentElement("beforebegin", warning);
                }

                document.querySelectorAll("#telegramForm input, #telegramForm select, #telegramForm textarea, #telegramForm button")
                    .forEach(el => el.disabled = true);
            }
        })
        .catch(err => {
            console.error("Ошибка при проверке статуса бота:", err);
        });
});
