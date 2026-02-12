// WikiTok SPA Application

class WikiTok {
    constructor() {
        this.currentUser = null;
        this.feedItems = [];
        this.viewedHistory = this.getViewedHistory();
        this.trackedCards = new Set();
        this.cardViewStartTimes = new Map();
        this.currentView = 'feed';
        this.isLoading = false;
    }

    // LocalStorage
    getViewedHistory() {
        try {
            const history = localStorage.getItem('wikitok_viewed_history');
            return history ? JSON.parse(history) : [];
        } catch {
            return [];
        }
    }

    addToViewedHistory(contentId) {
        const history = this.getViewedHistory();
        const filtered = history.filter(id => id !== contentId);
        const updated = [contentId, ...filtered].slice(0, 10);
        localStorage.setItem('wikitok_viewed_history', JSON.stringify(updated));
        this.viewedHistory = updated;
    }

    wasRecentlyViewed(contentId) {
        return this.viewedHistory.includes(contentId);
    }

    // API Calls
    async api(endpoint, options = {}) {
        const url = `/api${endpoint}`;
        const opts = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            opts.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, opts);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API Error');
        }

        return data;
    }

    // Auth
    async login(username) {
        const data = await this.api('/login', {
            method: 'POST',
            body: { username }
        });

        this.currentUser = data.user;
        return data;
    }

    async logout() {
        await this.api('/logout', { method: 'POST' });
        this.currentUser = null;
        window.location.reload();
    }

    async getCurrentUser() {
        try {
            const data = await this.api('/me');
            this.currentUser = data.user;
            return this.currentUser;
        } catch {
            return null;
        }
    }

    // Feed
    async loadFeed() {
        const exclude = this.viewedHistory.join(',');
        const data = await this.api(`/feed?exclude=${encodeURIComponent(exclude)}`);
        return data.items;
    }

    async loadMore() {
        if (this.isLoading) return [];

        this.isLoading = true;
        this.showLoading(true);

        const exclude = this.viewedHistory.join(',');
        const data = await this.api(`/load_more?exclude=${encodeURIComponent(exclude)}`);

        this.isLoading = false;
        this.showLoading(false);

        return data.items;
    }

    showLoading(show) {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.classList.toggle('opacity-0', !show);
            indicator.classList.toggle('opacity-100', show);
        }
    }

    // Interactions
    async toggleLike(contentId) {
        const data = await this.api('/toggle_like', {
            method: 'POST',
            body: { content_id: contentId }
        });
        return data.is_liked;
    }

    async getComments(contentId) {
        const data = await this.api(`/comments/${contentId}`);
        return data;
    }

    async postComment(contentId, text) {
        const data = await this.api('/comments', {
            method: 'POST',
            body: { content_id: contentId, text }
        });
        return data.comment;
    }

    async share(contentId) {
        await this.api('/share', {
            method: 'POST',
            body: { content_id: contentId }
        });
    }

    async trackView(contentId, duration) {
        if (duration < 0.5) return;
        if (this.trackedCards.has(contentId)) return;
        if (this.wasRecentlyViewed(contentId)) return;

        this.trackedCards.add(contentId);
        this.addToViewedHistory(contentId);

        await this.api('/track_view', {
            method: 'POST',
            body: { content_id: contentId, view_duration: duration }
        });
    }

    // Renderers
    renderFeedCard(item) {
        const heartIcon = item.is_liked ? '❤️' : '🤍';
        const heartBg = item.is_liked ? 'bg-red-600' : 'bg-gray-800/60 hover:bg-gray-700';
        const likeText = item.is_liked ? 'Liked' : 'Like';
        const escapedTitle = this.escapeHtml(item.title);

        return `
            <div class="snap-center relative w-full h-full flex flex-col justify-end pb-20 border-b border-gray-900"
                 data-content-id="${item.content_id}"
                 data-page-title="${item.title}">
                ${item.image ? `
                <div class="absolute inset-0 bg-cover bg-center opacity-60" style="background-image: url('${item.image}');"></div>
                <div class="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/90"></div>
                ` : ''}

                <div class="relative z-10 px-4 max-w-[85%] pointer-events-none">
                    <div class="mb-4 pointer-events-auto">
                        <h2 class="text-2xl font-bold mb-2 drop-shadow-lg text-white">${escapedTitle}</h2>
                        <p class="text-sm text-gray-200 line-clamp-3 leading-relaxed drop-shadow-md">${this.escapeHtml(item.summary)}</p>
                    </div>
                    <div class="flex flex-wrap gap-2 pointer-events-auto">
                        ${item.related.slice(0, 5).map(tag => `
                            <span class="bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-xs">#${this.escapeHtml(tag.substring(0, 10))}</span>
                        `).join('')}
                    </div>
                </div>

                <div class="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-20 pointer-events-auto" style="width: 4rem;">
                    <button class="like-button flex flex-col items-center group active:scale-90 transition-transform cursor-pointer"
                            data-content-id="${item.content_id}"
                            data-is-liked="${item.is_liked}">
                        <div class="w-12 h-12 ${heartBg} rounded-full flex items-center justify-center mb-1 transition-colors">
                            <span class="text-2xl">${heartIcon}</span>
                        </div>
                        <span class="text-xs font-bold drop-shadow-md like-text">${likeText}</span>
                    </button>

                    <button class="comments-button flex flex-col items-center group active:scale-90 transition-transform cursor-pointer"
                            data-content-id="${item.content_id}">
                        <div class="w-12 h-12 bg-gray-800/60 backdrop-blur-sm rounded-full flex items-center justify-center mb-1">
                            <span class="text-2xl">💬</span>
                        </div>
                        <span class="text-xs font-bold drop-shadow-md">${item.comment_count || 0}</span>
                    </button>

                    <button class="share-button flex flex-col items-center group active:scale-90 transition-transform cursor-pointer"
                            data-content-id="${item.content_id}"
                            data-page-title="${escapedTitle}">
                        <div class="w-12 h-12 bg-gray-800/60 backdrop-blur-sm rounded-full flex items-center justify-center mb-1">
                            <span class="text-2xl">↪️</span>
                        </div>
                        <span class="text-xs font-bold drop-shadow-md">Share</span>
                    </button>
                </div>
            </div>
        `;
    }

    updateLikeButton(button, isLiked) {
        const heartIcon = isLiked ? '❤️' : '🤍';
        const heartBg = isLiked ? 'bg-red-600' : 'bg-gray-800/60 hover:bg-gray-700';
        const likeText = isLiked ? 'Liked' : 'Like';

        button.querySelector('span.text-2xl').textContent = heartIcon;
        button.querySelector('.w-12').className = `w-12 h-12 ${heartBg} rounded-full flex items-center justify-center mb-1 transition-colors`;
        button.querySelector('.like-text').textContent = likeText;
        button.dataset.isLiked = isLiked;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Comments
    openComments(contentId) {
        console.log('Opening comments for:', contentId);

        this.getComments(contentId).then(data => {
            console.log('Comments received:', data);

            const sheet = document.getElementById('comment-sheet');
            const overlay = sheet.querySelector('.overlay-backdrop');
            const container = document.getElementById('sheet-content');
            const form = document.getElementById('comment-form');

            // Set content_id in the form
            if (form) {
                form.content_id.value = contentId;
                console.log('Set content_id in form:', contentId);
            }

            sheet.classList.remove('opacity-0', 'pointer-events-none');
            overlay.classList.add('pointer-events-auto');

            setTimeout(() => {
                container.classList.remove('translate-y-full');
            }, 10);

            this.renderComments(data.comments, data.page_title);
        }).catch(error => {
            console.error('Failed to load comments:', error);
            alert('Failed to load comments: ' + error.message);
        });
    }

    closeComments() {
        console.log('Closing comments');
        const sheet = document.getElementById('comment-sheet');
        const overlay = sheet.querySelector('.overlay-backdrop');
        const container = document.getElementById('sheet-content');

        if (!sheet || !container) {
            console.error('Comment sheet elements not found!');
            return;
        }

        container.classList.add('translate-y-full');

        setTimeout(() => {
            sheet.classList.add('opacity-0', 'pointer-events-none');
            overlay.classList.remove('pointer-events-auto');
            console.log('Comments closed');
        }, 300);
    }

    renderComments(comments, pageTitle) {
        const container = document.getElementById('comments-list');

        if (comments.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 py-10">No comments yet. Say something!</p>';
            return;
        }

        container.innerHTML = comments.map(c => `
            <div class="mb-4 p-3 bg-gray-800 rounded-lg">
                <p class="font-bold text-sm text-blue-400">${this.escapeHtml(c.user.username)}</p>
                <p class="text-gray-200">${this.escapeHtml(c.text)}</p>
            </div>
        `).join('');
    }

    appendComment(comment) {
        console.log('Appending comment:', comment);
        const container = document.getElementById('comments-list');

        if (!container) {
            console.error('comments-list container not found!');
            return;
        }

        const noComments = container.querySelector('.text-center');
        if (noComments) {
            container.innerHTML = '';
        }

        const commentHtml = `
            <div class="mb-4 p-3 bg-gray-800 rounded-lg">
                <p class="font-bold text-sm text-blue-400">${this.escapeHtml(comment.user.username)}</p>
                <p class="text-gray-200">${this.escapeHtml(comment.text)}</p>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', commentHtml);
        console.log('Comment added to DOM');
    }

    async handleLike(button) {
        const contentId = button.dataset.contentId;
        const currentlyLiked = button.dataset.isLiked === 'true';

        try {
            const isLiked = await this.toggleLike(contentId);
            this.updateLikeButton(button, isLiked);
        } catch (error) {
            console.error('Failed to toggle like:', error);
        }
    }

    async handleCommentSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const contentId = form.content_id.value;
        const text = form.text.value;

        console.log('Submitting comment:', { contentId, text });

        if (!text.trim()) return;

        try {
            const comment = await this.postComment(contentId, text);
            console.log('Comment response:', comment);
            this.appendComment(comment);
            form.reset();
        } catch (error) {
            console.error('Failed to post comment:', error);
            alert('Failed to post comment: ' + error.message);
        }
    }

    async shareContent(contentId, pageTitle) {
        try {
            await this.share(contentId);

            if (navigator.share) {
                await navigator.share({
                    title: 'WikiTok',
                    text: `Check out this Wikipedia article: ${pageTitle}`,
                    url: window.location.href
                });
            } else {
                await navigator.clipboard.writeText(`${pageTitle} - WikiTok`);
                alert('Link copied to clipboard!');
            }
        } catch (error) {
            console.error('Share failed:', error);
        }
    }

    // View Tracking
    setupViewTracking() {
        const feedContainer = document.getElementById('feed-container');

        const viewObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const card = entry.target;
                const contentId = card.dataset.contentId;

                if (!contentId) return;

                if (entry.isIntersecting) {
                    if (!this.cardViewStartTimes.has(contentId)) {
                        this.cardViewStartTimes.set(contentId, Date.now());
                    }
                } else {
                    const startTime = this.cardViewStartTimes.get(contentId);
                    if (startTime) {
                        const duration = (Date.now() - startTime) / 1000;
                        this.trackView(contentId, duration);
                        this.cardViewStartTimes.delete(contentId);
                    }
                }
            });
        }, { threshold: 0.5 });

        // Track when leaving page
        window.addEventListener('beforeunload', () => {
            this.cardViewStartTimes.forEach((startTime, contentId) => {
                const duration = (Date.now() - startTime) / 1000;
                if (duration >= 0.5 && !this.trackedCards.has(contentId) && !this.wasRecentlyViewed(contentId)) {
                    const blob = new Blob(
                        [JSON.stringify({ content_id: contentId, view_duration: duration })],
                        { type: 'application/json' }
                    );
                    navigator.sendBeacon('/api/track_view', blob);
                }
            });
        });

        return viewObserver;
    }

    observeNewCards(observer, newCards) {
        newCards.forEach(card => observer.observe(card));
    }

    // Infinite Scroll
    setupInfiniteScroll() {
        const loadingIndicator = document.getElementById('loading-indicator');

        const loadMoreObserver = new IntersectionObserver(async (entries) => {
            if (entries[0].isIntersecting && !this.isLoading) {
                const newItems = await this.loadMore();

                if (newItems.length > 0) {
                    const feedContainer = document.getElementById('feed-container');
                    const observer = this.viewObserver;

                    newItems.forEach(item => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = this.renderFeedCard(item);
                        const card = tempDiv.firstElementChild;

                        loadingIndicator.insertAdjacentElement('beforebegin', card);

                        // Setup like button
                        const likeButton = card.querySelector('.like-button');
                        if (likeButton) {
                            likeButton.addEventListener('click', () => this.handleLike(likeButton));
                        }

                        observer.observe(card);
                    });
                } else {
                    loadingIndicator.style.display = 'none';
                    loadMoreObserver.disconnect();
                }
            }
        }, { rootMargin: '400px' });

        loadMoreObserver.observe(loadingIndicator);
    }

    // Initialize
    async init() {
        // Check auth
        const user = await this.getCurrentUser();

        if (!user) {
            this.renderLogin();
            return;
        }

        this.currentUser = user;

        // Load feed
        const items = await this.loadFeed();
        this.feedItems = items;

        // Render
        this.renderFeed(items);

        // Setup tracking
        this.viewObserver = this.setupViewTracking();

        // Setup infinite scroll
        this.setupInfiniteScroll();

        // Setup event listeners
        this.setupEventListeners();
    }

    renderFeed(items) {
        const feedContainer = document.getElementById('feed-container');

        feedContainer.innerHTML = items.map(item => this.renderFeedCard(item)).join('') + `
            <div id="loading-indicator" class="h-32 flex items-center justify-center opacity-0 transition-opacity">
                <div class="text-center">
                    <div class="loading-spinner text-4xl mb-2">🌀</div>
                    <p class="text-gray-400">Loading more content...</p>
                </div>
            </div>
        `;

        // Setup like buttons
        feedContainer.querySelectorAll('.like-button').forEach(button => {
            button.addEventListener('click', () => this.handleLike(button));
        });

        // Observe all cards
        if (this.viewObserver) {
            feedContainer.querySelectorAll('[data-content-id]').forEach(card => {
                this.viewObserver.observe(card);
            });
        }
    }

    renderLogin() {
        document.body.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-black p-4">
                <div class="w-full bg-gray-900 rounded-2xl p-8 border border-gray-800">
                    <h1 class="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                        WikiTok
                    </h1>
                    <p class="text-gray-400 text-center mb-8">Discover Wikipedia, one scroll at a time</p>

                    <form id="login-form" class="space-y-4">
                        <input type="text" name="username" placeholder="Enter username" required
                            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <button type="submit"
                            class="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-bold text-white hover:opacity-90 transition-opacity">
                            Enter WikiTok
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const username = formData.get('username');

            try {
                await this.login(username);
                window.location.reload();
            } catch (error) {
                alert('Login failed: ' + error.message);
            }
        });
    }

    setupEventListeners() {
        // Comment form
        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => this.handleCommentSubmit(e));
        }

        // Event delegation for close comments (click on overlay or close button)
        document.addEventListener('click', (e) => {
            // Check if clicking the overlay or close button
            const overlay = e.target.closest('.overlay-backdrop');
            const closeBtn = e.target.closest('.close-btn');
            const dragHandle = e.target.matches('.w-12.h-1\\.5') || e.target.closest('.w-12.h-1\\.5');

            if (overlay || closeBtn || dragHandle) {
                this.closeComments();
            }
        });

        // Event delegation for comments buttons
        document.addEventListener('click', (e) => {
            const commentsButton = e.target.closest('.comments-button');
            if (commentsButton) {
                e.preventDefault();
                const contentId = commentsButton.dataset.contentId;
                this.openComments(contentId);
            }
        });

        // Event delegation for share buttons
        document.addEventListener('click', (e) => {
            const shareButton = e.target.closest('.share-button');
            if (shareButton) {
                e.preventDefault();
                const contentId = shareButton.dataset.contentId;
                const pageTitle = shareButton.dataset.pageTitle;
                this.shareContent(contentId, pageTitle);
            }
        });

        // Navigation
        document.querySelectorAll('[data-route]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate(link.dataset.route);
            });
        });
    }

    async navigate(route) {
        if (route === 'logout') {
            await this.logout();
        } else if (route === 'profile') {
            await this.showProfile();
        } else if (route === 'feed') {
            window.location.reload();
        }
    }

    async showProfile() {
        try {
            const data = await this.api('/profile');

            document.body.innerHTML = `
                <div class="min-h-screen bg-black text-white p-4">
                        <nav class="flex justify-between items-center mb-8">
                            <a href="/" class="text-2xl">🏠</a>
                            <h1 class="text-xl font-bold">Profile</h1>
                            <button data-route="logout" class="text-2xl">🚪</button>
                        </nav>

                        <div class="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                            <div class="text-center mb-6">
                                <div class="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                    👤
                                </div>
                                <h2 class="text-2xl font-bold">${this.escapeHtml(data.user.username)}</h2>
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <div class="bg-gray-800 rounded-lg p-4 text-center">
                                    <p class="text-3xl font-bold text-red-500">${data.stats.likes}</p>
                                    <p class="text-gray-400">Likes</p>
                                </div>
                                <div class="bg-gray-800 rounded-lg p-4 text-center">
                                    <p class="text-3xl font-bold text-blue-500">${data.stats.comments}</p>
                                    <p class="text-gray-400">Comments</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <nav class="fixed bottom-0 h-16 bg-black border-t border-gray-800 flex justify-around items-center z-50" style="width: 100%; max-width: 480px; left: 50%; transform: translateX(-50%);">
                        <a href="/" class="flex flex-col items-center text-white">
                            <span class="text-2xl">🏠</span>
                            <span class="text-[10px] font-bold mt-1">Home</span>
                        </a>
                        <div class="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center -mt-6 border-4 border-black">
                            <span class="text-xl">➕</span>
                        </div>
                        <button data-route="profile" class="flex flex-col items-center text-white bg-transparent border-0">
                            <span class="text-2xl">👤</span>
                            <span class="text-[10px] font-bold mt-1">Profile</span>
                        </button>
                    </nav>
                </div>
            `;

            // Re-setup navigation
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to load profile:', error);
            if (error.message?.includes('401')) {
                window.location.reload();
            }
        }
    }
}

// Initialize app
const app = new WikiTok();

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
