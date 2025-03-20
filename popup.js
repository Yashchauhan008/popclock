// Handles popup functionality
document.addEventListener('DOMContentLoaded', () => {
    const noteInput = document.getElementById('noteInput');
    const saveButton = document.getElementById('saveNote');
    const noteList = document.getElementById('noteList');

    // Load existing notes
    chrome.storage.local.get(['notes'], (result) => {
        const notes = result.notes || [];
        renderNotes(notes);
    });

    // Save note
    saveButton.addEventListener('click', () => {
        const noteText = noteInput.value.trim();
        if (noteText) {
            chrome.storage.local.get(['notes'], (result) => {
                const notes = result.notes || [];
                notes.push({
                    text: noteText,
                    timestamp: new Date().toISOString()
                });
                chrome.storage.local.set({ notes }, () => {
                    noteInput.value = '';
                    renderNotes(notes);
                });
            });
        }
    });

    // Render notes
    function renderNotes(notes) {
        noteList.innerHTML = '';
        notes.reverse().forEach((note, index) => {
            const li = document.createElement('li');
            const date = new Date(note.timestamp).toLocaleString();
            li.innerHTML = `
                <div class="note-content">${note.text}</div>
                <div class="note-timestamp">${date}</div>
                <button class="delete-note" data-index="${index}">Delete</button>
            `;
            noteList.appendChild(li);
        });

        // Add delete functionality
        document.querySelectorAll('.delete-note').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = notes.length - 1 - parseInt(e.target.dataset.index);
                chrome.storage.local.get(['notes'], (result) => {
                    const updatedNotes = result.notes.filter((_, i) => i !== index);
                    chrome.storage.local.set({ notes: updatedNotes }, () => {
                        renderNotes(updatedNotes);
                    });
                });
            });
        });
    }
});
