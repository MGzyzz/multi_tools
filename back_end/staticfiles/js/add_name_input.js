// Функция добавления получателя
function addRecipient(element, studentName) {
    const selectedRecipientsContainer = document.getElementById('selected-recipients');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const recipientInput = document.getElementById('recipient');
    
    const telegramId = element.getAttribute('data-telegram-id');
    const currentIds = recipientInput.value ? recipientInput.value.split(',') : [];
    
    if (!currentIds.includes(telegramId)) {
        currentIds.push(telegramId);
        recipientInput.value = currentIds.join(',');

        const selectedTag = document.createElement('span');
        selectedTag.className = 'badge bg-info text-white p-2 d-flex align-items-center';
        selectedTag.innerHTML = `
            ${studentName}
            <button type="button" class="btn-close btn-close-white ms-2" 
                    onclick="removeRecipient(this, '${telegramId}')"></button>
        `;

        selectedRecipientsContainer.appendChild(selectedTag);
        element.style.display = 'none';

        clearAllBtn.disabled = false;
    }
}

// Функция удаления получателя
function removeRecipient(button, telegramId) {
    const recipientInput = document.getElementById('recipient');
    const currentIds = recipientInput.value.split(',');

    const updatedIds = currentIds.filter(id => id !== telegramId);
    recipientInput.value = updatedIds.join(',');

    button.closest('span').remove();

    document.querySelector(`.student-card[data-telegram-id="${telegramId}"]`).style.display = 'block';

    if (updatedIds.length === 0) {
        document.getElementById('clear-all-btn').disabled = true;
    }
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('clear-all-btn').addEventListener('click', function() {
        const recipientInput = document.getElementById('recipient');
        const selectedRecipientsContainer = document.getElementById('selected-recipients');

        document.querySelectorAll('.student-card').forEach(card => {
            card.style.display = 'block';
        });

        selectedRecipientsContainer.innerHTML = '';
        recipientInput.value = '';
        this.disabled = true;
    });
});