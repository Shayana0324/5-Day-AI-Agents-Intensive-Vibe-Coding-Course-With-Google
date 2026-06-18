// App State
let rawEntries = [];
let parsedUpdates = [];
let selectedIds = new Set();
let theme = 'dark';
let currentFilters = {
    search: '',
    type: 'all'
};

// Thread/Composer state
let composerDrafts = []; // Array of { title: string, text: string }
let activeComposerTabIdx = 0;

// Progress Ring Configuration
const progressRingBar = document.getElementById('char-progress');
let progressRingCircumference = 0;
if (progressRingBar) {
    const radius = progressRingBar.r.baseVal.value;
    progressRingCircumference = radius * 2 * Math.PI;
    progressRingBar.style.strokeDasharray = `${progressRingCircumference} ${progressRingCircumference}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchReleaseNotes();
});

// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(newTheme) {
    theme = newTheme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    const darkIcon = document.querySelector('.theme-icon-dark');
    const lightIcon = document.querySelector('.theme-icon-light');

    const themeBtn = document.getElementById('theme-toggle');

    if (theme === 'dark') {
        if (darkIcon) darkIcon.style.display = 'block';
        if (lightIcon) lightIcon.style.display = 'none';
        
        if (themeBtn) {
            themeBtn.classList.add('theme-toggle-active');
        }
    } else {
        if (darkIcon) darkIcon.style.display = 'none';
        if (lightIcon) lightIcon.style.display = 'block';

        if (themeBtn) {
            themeBtn.classList.add('theme-toggle-active');
        }
    }
}

// Fetch Notes from API
async function fetchReleaseNotes() {
    showLoader(true);
    showError(false);

    const refreshBtn = document.getElementById('refresh-btn');
    const spinner = refreshBtn ? refreshBtn.querySelector('.spinner-icon') : null;
    if (spinner) spinner.classList.add('spinning');

    try {
        const response = await fetch('/api/release-notes');
        const result = await response.json();

        if (result.success && Array.isArray(result.entries)) {
            rawEntries = result.entries;
            processEntries(rawEntries);
            renderDashboard();
        } else {
            throw new Error(result.error || 'Failed to fetch release notes from server');
        }
    } catch (err) {
        console.error(err);
        showError(true, err.message);
    } finally {
        showLoader(false);
        if (spinner) spinner.classList.remove('spinning');
    }
}

// Process XML Feed Entries
function processEntries(entries) {
    parsedUpdates = [];
    selectedIds.clear();
    updateSelectionDrawer();

    entries.forEach((entry, entryIdx) => {
        const updates = splitContentToUpdates(entry, entryIdx);
        parsedUpdates.push(...updates);
    });
}

// Splitting date content HTML into individual updates
function splitContentToUpdates(entry, entryIndex) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(entry.content, 'text/html');
    const updates = [];

    let currentType = 'General';
    let currentHtmlElements = [];
    let subIdx = 0;

    const children = Array.from(doc.body.childNodes);

    children.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'h3') {
            // Push previous block if exists
            if (currentHtmlElements.length > 0) {
                const tempDiv = document.createElement('div');
                currentHtmlElements.forEach(el => tempDiv.appendChild(el.cloneNode(true)));
                const htmlText = tempDiv.innerHTML;
                const plainText = tempDiv.textContent.trim().replace(/\s+/g, ' ');

                updates.push({
                    id: `${entryIndex}-${subIdx++}`,
                    date: entry.title,
                    updated: entry.updated,
                    link: entry.link,
                    type: cleanType(currentType),
                    typeDisplay: currentType,
                    html: htmlText,
                    plainText: plainText
                });
                currentHtmlElements = [];
            }
            currentType = node.textContent.trim();
        } else {
            currentHtmlElements.push(node);
        }
    });

    // Push final block
    if (currentHtmlElements.length > 0) {
        const tempDiv = document.createElement('div');
        currentHtmlElements.forEach(el => tempDiv.appendChild(el.cloneNode(true)));
        const htmlText = tempDiv.innerHTML;
        const plainText = tempDiv.textContent.trim().replace(/\s+/g, ' ');

        updates.push({
            id: `${entryIndex}-${subIdx++}`,
            date: entry.title,
            updated: entry.updated,
            link: entry.link,
            type: cleanType(currentType),
            typeDisplay: currentType,
            html: htmlText,
            plainText: plainText
        });
    }

    // Fallback if empty
    if (updates.length === 0 && entry.content.trim()) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = entry.content;
        updates.push({
            id: `${entryIndex}-0`,
            date: entry.title,
            updated: entry.updated,
            link: entry.link,
            type: 'general',
            typeDisplay: 'Update',
            html: entry.content,
            plainText: tempDiv.textContent.trim().replace(/\s+/g, ' ')
        });
    }

    return updates;
}

function cleanType(typeStr) {
    const t = typeStr.toLowerCase().trim();
    if (t.includes('feature')) return 'feature';
    if (t.includes('announcement')) return 'announcement';
    if (t.includes('change')) return 'change';
    if (t.includes('breaking')) return 'breaking';
    if (t.includes('issue')) return 'issue';
    return 'general';
}

// Render UI Components
function renderDashboard() {
    renderStats();
    renderFeed();
}

function renderStats() {
    document.getElementById('stat-days').textContent = rawEntries.length;
    document.getElementById('stat-updates').textContent = parsedUpdates.length;
    document.getElementById('stat-latest').textContent = rawEntries.length > 0 ? rawEntries[0].title : 'N/A';
}

function renderFeed() {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;

    feedContainer.innerHTML = '';

    // Apply filters
    const filteredUpdates = parsedUpdates.filter(update => {
        // Search text filter
        const matchesSearch = currentFilters.search === '' ||
            update.date.toLowerCase().includes(currentFilters.search) ||
            update.typeDisplay.toLowerCase().includes(currentFilters.search) ||
            update.plainText.toLowerCase().includes(currentFilters.search);

        // Type filter
        const matchesType = currentFilters.type === 'all' || update.type === currentFilters.type;

        return matchesSearch && matchesType;
    });

    if (filteredUpdates.length === 0) {
        feedContainer.innerHTML = `
            <div class="loader-container">
                <h3>No updates matched your filters</h3>
                <p>Try refining your search keyword or clearing the filters.</p>
            </div>
        `;
        feedContainer.style.display = 'block';
        return;
    }

    // Group filtered updates by date
    const groups = {};
    filteredUpdates.forEach(update => {
        if (!groups[update.date]) {
            groups[update.date] = [];
        }
        groups[update.date].push(update);
    });

    // Render grouped dates
    Object.keys(groups).forEach((date, index) => {
        const groupUpdates = groups[date];

        const groupEl = document.createElement('div');
        groupEl.className = 'timeline-group fade-in';
        groupEl.style.animationDelay = `${index * 0.05}s`;

        // Date Marker
        groupEl.innerHTML = `
            <div class="timeline-date-marker">
                <div class="marker-dot"></div>
                <div class="timeline-date-title">${date}</div>
            </div>
            <div class="timeline-cards"></div>
        `;

        const cardsContainer = groupEl.querySelector('.timeline-cards');

        // Render cards under this date
        groupUpdates.forEach(update => {
            const isSelected = selectedIds.has(update.id);
            const card = document.createElement('div');
            card.className = `note-card ${isSelected ? 'selected' : ''}`;
            card.dataset.id = update.id;

            card.innerHTML = `
                <div class="note-select-container">
                    <div class="custom-checkbox">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </div>
                <div class="note-card-main">
                    <div class="note-card-header">
                        <span class="tag tag-${update.type}">${update.typeDisplay}</span>
                    </div>
                    <div class="note-card-body">
                        ${update.html}
                    </div>
                    <div class="note-card-actions">
                        <button class="copy-btn-small" title="Copy update to clipboard">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                style="width:14px;height:14px;">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy</span>
                        </button>

                        <button class="tweet-btn-small" title="Tweet this individual update">
                            <svg class="icon" viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px;">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <span>Tweet Update</span>
                        </button>
                    </div>
                </div>
            `;

            // Toggle selection on click, EXCEPT when clicking on links or the tweet button
            card.addEventListener('click', (e) => {
                if (e.target.closest('a') || e.target.closest('.tweet-btn-small')) {
                    return;
                }
                toggleSelect(update.id);
            });

            const copyBtn = card.querySelector('.copy-btn-small');

            copyBtn.addEventListener('click', async (e) => {
                e.stopPropagation();

                const copyText = `
BigQuery Update
Date: ${update.date}
Type: ${update.typeDisplay}

${update.plainText}

Read more: ${update.link}
    `.trim();

                try {
                    await navigator.clipboard.writeText(copyText);

                    const original = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<span>Copied!</span>';

                    setTimeout(() => {
                        copyBtn.innerHTML = original;
                    }, 1500);

                } catch (err) {
                    console.error('Clipboard copy failed', err);
                }
            });
            // Individual tweet button click handler
            const tweetBtn = card.querySelector('.tweet-btn-small');
            tweetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openSingleTweetComposer(update);
            });

            cardsContainer.appendChild(card);
        });

        feedContainer.appendChild(groupEl);
    });

    feedContainer.style.display = 'block';
}

// Toggle Selection State
function toggleSelect(id) {
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
    } else {
        selectedIds.add(id);
    }

    // Update card styling
    const card = document.querySelector(`.note-card[data-id="${id}"]`);
    if (card) {
        if (selectedIds.has(id)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    }

    updateSelectionDrawer();
}

function updateSelectionDrawer() {
    const selectionBar = document.getElementById('selection-bar');
    const selectedCount = document.getElementById('selected-count');

    if (selectedIds.size > 0) {
        selectedCount.textContent = selectedIds.size;
        selectionBar.classList.add('show');
    } else {
        selectionBar.classList.remove('show');
    }
}

function clearSelection() {
    selectedIds.clear();
    document.querySelectorAll('.note-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    updateSelectionDrawer();
}

// Generate X / Twitter Draft Text
function generateTweetText(update) {
    const title = `BigQuery Update [${update.date}]`;
    const tag = `#BigQuery #${update.typeDisplay}`;

    // Clean snippet text
    let body = update.plainText;
    if (body.length > 180) {
        body = body.substring(0, 177) + '...';
    }

    return `${title} - ${update.typeDisplay}:\n${body}\n\nRead more: ${update.link}\n${tag}`;
}

// Open Single Tweet Composer
function openSingleTweetComposer(update) {
    activeComposerTabIdx = 0;
    composerDrafts = [{
        title: 'Draft Tweet',
        text: generateTweetText(update)
    }];

    setupComposerModal();
}

// Open Combined/Thread Composer for Multi-selection
function openMultiTweetComposer() {
    const selectedUpdates = parsedUpdates.filter(u => selectedIds.has(u.id));
    // Sort selected updates by date descending (standard timeline flow)
    selectedUpdates.sort((a, b) => new Date(b.updated) - new Date(a.updated));

    composerDrafts = [];

    // 1. Thread drafts (individual tweets sequentially)
    selectedUpdates.forEach((update, idx) => {
        const title = `Tweet ${idx + 1}/${selectedUpdates.length}`;
        let tweetBody = `[${idx + 1}/${selectedUpdates.length}] BigQuery [${update.date}] - ${update.typeDisplay}:\n`;
        let textLenLeft = 280 - tweetBody.length - 30; // buffer for links

        let snippet = update.plainText;
        if (snippet.length > textLenLeft) {
            snippet = snippet.substring(0, textLenLeft - 3) + '...';
        }

        tweetBody += `${snippet}\n\nRead details: ${update.link}`;
        composerDrafts.push({
            title: title,
            text: tweetBody
        });
    });

    // 2. Also offer a combined consolidated tweet option if fit
    if (selectedUpdates.length > 1) {
        let combinedText = `Google Cloud #BigQuery Updates Summary 🚀\n\n`;
        selectedUpdates.forEach(u => {
            let desc = u.plainText;
            if (desc.length > 40) desc = desc.substring(0, 37) + '...';
            combinedText += `• ${u.date} (${u.typeDisplay}): ${desc}\n`;
        });
        combinedText += `\nFeed: https://docs.cloud.google.com/bigquery/docs/release-notes`;

        composerDrafts.push({
            title: 'Consolidated Tweet',
            text: combinedText
        });
    }

    activeComposerTabIdx = 0;
    setupComposerModal();
}

// Configure and Display Composer Modal
function setupComposerModal() {
    const modal = document.getElementById('composer-modal');
    const tabsContainer = document.getElementById('composer-tabs-container');
    const textarea = document.getElementById('tweet-textarea');

    // Build tabs if multiple drafts
    if (composerDrafts.length > 1) {
        tabsContainer.innerHTML = '';
        composerDrafts.forEach((draft, idx) => {
            const btn = document.createElement('button');
            btn.className = `modal-tab ${idx === activeComposerTabIdx ? 'active' : ''}`;
            btn.textContent = draft.title;
            btn.addEventListener('click', () => switchComposerTab(idx));
            tabsContainer.appendChild(btn);
        });
        tabsContainer.style.display = 'flex';
    } else {
        tabsContainer.style.display = 'none';
    }

    // Load active draft
    textarea.value = composerDrafts[activeComposerTabIdx].text;
    updateCharacterCount();
    updateNavigationButtons();

    modal.classList.add('show');
}

function switchComposerTab(idx) {
    // Save current textarea content to state before switching
    const textarea = document.getElementById('tweet-textarea');
    composerDrafts[activeComposerTabIdx].text = textarea.value;

    // Switch tab
    activeComposerTabIdx = idx;

    // Highlight active tab
    const tabs = document.querySelectorAll('.modal-tab');
    tabs.forEach((tab, index) => {
        if (index === idx) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Load text
    textarea.value = composerDrafts[idx].text;
    updateCharacterCount();
    updateNavigationButtons();
}

function updateCharacterCount() {
    const textarea = document.getElementById('tweet-textarea');
    const counterText = document.getElementById('char-count');
    const progressRing = document.getElementById('char-progress');

    if (!textarea || !counterText) return;

    const count = textarea.value.length;
    counterText.textContent = `${count}/280`;

    // Progress indicator calculations
    if (progressRing && progressRingCircumference > 0) {
        const percent = Math.min(100, (count / 280) * 100);
        const offset = progressRingCircumference - (percent / 100) * progressRingCircumference;
        progressRing.style.strokeDashoffset = offset;

        // Change color based on limit warning
        if (count > 280) {
            progressRing.style.stroke = '#ef4444'; // Red
            counterText.style.color = '#ef4444';
        } else if (count > 250) {
            progressRing.style.stroke = '#fbbf24'; // Orange
            counterText.style.color = '#fbbf24';
        } else {
            progressRing.style.stroke = 'var(--accent)'; // Blue
            counterText.style.color = 'var(--text-secondary)';
        }
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('modal-prev-btn');
    const nextBtn = document.getElementById('modal-next-btn');

    if (!prevBtn || !nextBtn) return;

    if (composerDrafts.length > 1) {
        prevBtn.style.display = activeComposerTabIdx > 0 ? 'block' : 'none';
        nextBtn.style.display = activeComposerTabIdx < composerDrafts.length - 1 ? 'block' : 'none';
    } else {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }
}

function postActiveTweet() {
    const textarea = document.getElementById('tweet-textarea');
    if (!textarea) return;

    const tweetText = textarea.value;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank');
}

function closeModal() {
    const modal = document.getElementById('composer-modal');
    modal.classList.remove('show');
}

// Event Listeners Setup
function setupEventListeners() {
    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            setTheme(theme === 'dark' ? 'light' : 'dark');
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchReleaseNotes);
    }

    // Retry button
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', fetchReleaseNotes);
    }

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentFilters.search = e.target.value.toLowerCase().trim();
            renderFeed();
        });
    }

    // Type Filter Tags
    const filterTags = document.querySelectorAll('.filter-tag');
    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');

            currentFilters.type = tag.dataset.type;
            renderFeed();
        });
    });

    // Selection Drawer Actions
    const clearBtn = document.getElementById('clear-selection-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSelection);
    }

    const composeBtn = document.getElementById('compose-thread-btn');
    if (composeBtn) {
        composeBtn.addEventListener('click', openMultiTweetComposer);
    }

    // Composer Modal Actions
    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    const textarea = document.getElementById('tweet-textarea');
    if (textarea) {
        textarea.addEventListener('input', updateCharacterCount);
    }

    const prevBtn = document.getElementById('modal-prev-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => switchComposerTab(activeComposerTabIdx - 1));
    }

    const nextBtn = document.getElementById('modal-next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => switchComposerTab(activeComposerTabIdx + 1));
    }

    const launchBtn = document.getElementById('launch-tweet-btn');
    if (launchBtn) {
        launchBtn.addEventListener('click', postActiveTweet);
    }

    // Close modal on click outside container
    const modal = document.getElementById('composer-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Export CSV
    const exportBtn = document.getElementById('export-csv-btn');

    if (exportBtn) {
        exportBtn.addEventListener('click', exportFilteredToCSV);
    }
}

// Helpers
function showLoader(show) {
    const loader = document.getElementById('loader-view');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

function showError(show, message = '') {
    const errorView = document.getElementById('error-view');
    const errMsg = document.getElementById('error-message');

    if (errorView) {
        errorView.style.display = show ? 'flex' : 'none';
        if (show && errMsg) {
            errMsg.textContent = message || 'Unable to load release notes. Please check connection and try again.';
        }
    }
}

function exportFilteredToCSV() {
    const filteredUpdates = parsedUpdates.filter(update => {
        const matchesSearch =
            currentFilters.search === '' ||
            update.date.toLowerCase().includes(currentFilters.search) ||
            update.typeDisplay.toLowerCase().includes(currentFilters.search) ||
            update.plainText.toLowerCase().includes(currentFilters.search);

        const matchesType =
            currentFilters.type === 'all' ||
            update.type === currentFilters.type;

        return matchesSearch && matchesType;
    });

    if (filteredUpdates.length === 0) {
        alert('No updates available to export.');
        return;
    }

    const headers = ['Date', 'Type', 'Content', 'Link'];

    const rows = filteredUpdates.map(update => [
        update.date,
        update.typeDisplay,
        update.plainText.replace(/"/g, '""'),
        update.link
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row =>
            row.map(field => `"${field}"`).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'bigquery_release_notes.csv';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}
