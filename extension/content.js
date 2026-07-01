(function () {
  let processedVideoIds = new Set();
  let analysisInProgress = false;

  // Listen for navigation updates on YouTube (since it is a single-page app)
  window.addEventListener('yt-navigate-finish', () => {
    processedVideoIds.clear();
    runEchoFilter();
  });

  // Run on initial page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runEchoFilter);
  } else {
    runEchoFilter();
  }

  // Set up observer to handle infinite scrolling
  const observer = new MutationObserver(() => {
    runEchoFilter();
  });
  
  // Start observing the page body for dynamic insertions
  observer.observe(document.body, { childList: true, subtree: true });

  async function runEchoFilter() {
    // Only run on YouTube search results page
    if (window.location.pathname !== '/results') {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search_query');
    if (!searchQuery) return;

    // Grab all video renderers in the DOM
    const videoElements = document.querySelectorAll('ytd-video-renderer');
    if (videoElements.length === 0) return;

    // Find new, unprocessed video IDs
    const newVideoIds = [];
    const elementMap = new Map();

    videoElements.forEach((el) => {
      // Avoid processing the same DOM element multiple times
      if (el.hasAttribute('data-echofilter-processed')) return;

      const anchor = el.querySelector('a#thumbnail');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      const match = href.match(/[?&]v=([^&#]+)/);
      if (!match) return;
      const videoId = match[1];

      if (videoId && !processedVideoIds.has(videoId)) {
        elementMap.set(videoId, el);
        newVideoIds.push(videoId);
      }
    });

    // Only process in batches of 10 to protect resources
    const batchToProcess = newVideoIds.slice(0, 10);
    if (batchToProcess.length === 0 || analysisInProgress) return;

    analysisInProgress = true;

    // Retrieve settings (defaults if not configured yet)
    chrome.storage.local.get(['apiUrl', 'userId', 'userApiKey'], (settings) => {
      const apiUrl = settings.apiUrl || 'http://localhost:3000';
      const userId = settings.userId || 'usr_' + Math.random().toString(36).substring(2, 11);
      const userApiKey = settings.userApiKey || '';

      console.log(`[EchoFilter] Requesting analysis via background proxy for: "${searchQuery}"`, batchToProcess);
      
      // Dispatch requests through the background worker to bypass mixed-content (HTTP/HTTPS) block
      chrome.runtime.sendMessage({
        type: 'FETCH_API',
        url: `${apiUrl}/api/analyze`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          userId,
          searchQuery,
          videoIds: batchToProcess,
          userApiKey,
        }
      }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          console.error('[EchoFilter] Background fetch failed:', chrome.runtime.lastError || response);
          analysisInProgress = false;
          return;
        }

        const result = response.result;
        if (!result.ok) {
          console.error('[EchoFilter] API returned error status:', result.status, result.data);
          analysisInProgress = false;
          return;
        }

        const data = result.data;
        const results = data.results || {};

        // 1. Process and inject card UI
        batchToProcess.forEach((videoId) => {
          processedVideoIds.add(videoId);
          const el = elementMap.get(videoId);
          if (!el) return;

          el.setAttribute('data-echofilter-processed', 'true');
          const report = results[videoId];
          if (!report) return;

          // Compute final score: S_final = 0.65 * D_info - 0.25 * R_filler + 0.10 * log10(C_community + 1)
          const D_info = report.metrics.infoDensityScore;
          const R_filler = report.metrics.fillerRatio;
          const C_community = report.communityConfirmations || 0;
          
          const sFinal = (0.65 * D_info) - (0.25 * R_filler) + (0.10 * Math.log10(C_community + 1));
          const roundedScore = Math.max(-1, Math.min(1, Math.round(sFinal * 100) / 100));

          el.setAttribute('data-echofilter-score', roundedScore.toString());
          injectAnalysisUI(el, videoId, report, roundedScore, apiUrl, userId);
        });

        // 2. Sort/Re-order DOM elements
        reorderVideoResults();
        analysisInProgress = false;
      });
    });
  }

  function injectAnalysisUI(videoEl, videoId, report, score, apiUrl, userId) {
    // Check if we already injected UI
    if (videoEl.querySelector('.echofilter-card')) return;

    // Locate the right container to insert the badge card
    const targetContainer = videoEl.querySelector('#meta') || videoEl.querySelector('#dismissible');
    if (!targetContainer) return;

    // Create the widget elements
    const card = document.createElement('div');
    card.className = 'echofilter-card';

    // Set styling class by verdict
    let verdictClass = 'verdict-clickbait';
    let verdictLabel = 'Clickbait / Fluff';
    if (report.verdict === 'HIGH_DENSITY') {
      verdictClass = 'verdict-high';
      verdictLabel = 'High Density';
    } else if (report.verdict === 'SURFACE_LEVEL') {
      verdictClass = 'verdict-surface';
      verdictLabel = 'Surface Level';
    }

    // Inline SVGs
    const logoSvg = `<svg class="ef-svg-icon logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.25-2.5 3.5-2.5 3.5s2.25-1 3.5-2.5L18 5l-4-4L4.5 16.5z"/><path d="m12 15 9 9 3-3-9-9-3 3z"/><path d="M10 14 5.5 9.5"/></svg>`;
    const tagSvg = `<svg class="ef-svg-icon button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    const momentSvg = `<svg class="ef-svg-icon moment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`;

    // Prepare key timestamps HTML
    let timestampsHTML = '';
    if (report.keyTimestamps && report.keyTimestamps.length > 0) {
      timestampsHTML = `
        <div class="echofilter-timestamps-section">
          <span class="section-title">Key Moments</span>
          <ul class="timestamp-list">
            ${report.keyTimestamps.map(ts => {
              const minutes = Math.floor(ts.timeInSeconds / 60);
              const seconds = Math.floor(ts.timeInSeconds % 60).toString().padStart(2, '0');
              const jumpUrl = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(ts.timeInSeconds)}`;
              return `
                <li>
                  <a href="${jumpUrl}" target="_blank" class="timestamp-link">
                    ${momentSvg}
                    <span>${minutes}:${seconds}</span>
                  </a>
                  <span class="timestamp-reason">${ts.relevanceReason}</span>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      `;
    } else {
      const reasonText = report.verdictReason || 'No technical highlights extracted.';
      timestampsHTML = `
        <div class="echofilter-timestamps-section">
          <span class="no-moments">${reasonText}</span>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="echofilter-header">
        <div class="logo-area">
          ${logoSvg}
          <span class="logo-text">EchoFilter</span>
        </div>
        <div class="score-badge ${verdictClass}">
          <span class="verdict-text">${verdictLabel}</span>
          <span class="score-number">${score > 0 ? '+' : ''}${score}</span>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-row">
          <span class="metric-label">Info Density</span>
          <div class="metric-bar-bg">
            <div class="metric-bar-fill info" style="width: ${report.metrics.infoDensityScore * 100}%"></div>
          </div>
          <span class="metric-val">${Math.round(report.metrics.infoDensityScore * 100)}%</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Filler Ratio</span>
          <div class="metric-bar-bg">
            <div class="metric-bar-fill filler" style="width: ${report.metrics.fillerRatio * 100}%"></div>
          </div>
          <span class="metric-val">${Math.round(report.metrics.fillerRatio * 100)}%</span>
        </div>
      </div>

      ${timestampsHTML}

      <div class="echofilter-footer">
        <button class="tag-button" data-video="${videoId}">
          ${tagSvg}
          <span class="tag-label">Mark Outdated Deps</span>
          <span class="tag-count">${report.communityConfirmations || 0}</span>
        </button>
      </div>
    `;

    // Handle tag button action
    const tagBtn = card.querySelector('.tag-button');
    tagBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      tagBtn.disabled = true;
      tagBtn.classList.add('loading');

      // Dispatch request via background worker
      chrome.runtime.sendMessage({
        type: 'FETCH_API',
        url: `${apiUrl}/api/tag`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          videoId,
          tag: 'OUTDATED_DEPENDENCIES',
          userId,
        }
      }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success || !response.result.ok) {
          tagBtn.disabled = false;
          tagBtn.classList.remove('loading');
          console.error('[EchoFilter] Tagging failed:', chrome.runtime.lastError || response);
          alert('Failed to record tag.');
          return;
        }

        tagBtn.classList.remove('loading');
        tagBtn.classList.add('success');
        tagBtn.innerHTML = `
          <svg class="ef-svg-icon success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="tag-label">Tag Recorded!</span>
        `;
        
        // Increment count locally
        const countEl = card.querySelector('.tag-count');
        if (countEl) {
          countEl.textContent = (parseInt(countEl.textContent || '0', 10) + 1).toString();
        }
      });
    });

    targetContainer.appendChild(card);
  }

  function reorderVideoResults() {
    const videoElements = Array.from(document.querySelectorAll('ytd-video-renderer'));
    if (videoElements.length === 0) return;

    const parentContainer = videoElements[0].parentElement;
    if (!parentContainer) return;

    const allChildNodes = Array.from(parentContainer.children);
    const processedElements = videoElements.filter(el => el.hasAttribute('data-echofilter-score'));
    if (processedElements.length === 0) return;

    processedElements.sort((a, b) => {
      const scoreA = parseFloat(a.getAttribute('data-echofilter-score') || '0');
      const scoreB = parseFloat(b.getAttribute('data-echofilter-score') || '0');
      return scoreB - scoreA;
    });

    processedElements.forEach((el) => {
      el.classList.add('echofilter-ranked-item');
      parentContainer.appendChild(el);
    });

    allChildNodes.forEach((node) => {
      if (!processedElements.includes(node)) {
        parentContainer.appendChild(node);
      }
    });
  }
})();
