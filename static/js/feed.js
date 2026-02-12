function openComments(pageTitle) {
    const sheet = document.getElementById('comment-sheet');
    const content = document.getElementById('sheet-content');
    
    // Add active class to both sheet and content
    sheet.classList.add('active');
    content.classList.add('active');
    
    htmx.ajax('GET', '/comments/' + encodeURIComponent(pageTitle), '#comments-container');
}

function closeComments() {
    const sheet = document.getElementById('comment-sheet');
    const content = document.getElementById('sheet-content');
    
    // Remove active class from both
    content.classList.remove('active');
    
    setTimeout(() => {
        sheet.classList.remove('active');
    }, 300);
}

// Optional: Keyboard navigation
document.addEventListener('keydown', function(e) {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;

    const scrollAmount = feedContainer.clientHeight;

    if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        feedContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        feedContainer.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
    }
});
