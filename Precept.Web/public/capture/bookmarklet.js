/**
 * Precept Job Capture Bookmarklet
 *
 * Drag the link in index.html to your browser's bookmarks bar. When viewing a
 * job posting, click the bookmark to open Precept's capture page with the URL
 * and page title pre-filled. The Precept app then fetches the posting,
 * extracts structured fields, and creates a draft application.
 *
 * This file is the readable source. The actual bookmark is the minified
 * javascript: URL inside public/capture/index.html.
 */
(function () {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);
  // Replace the origin below if you are self-hosting Precept.
  window.open(`https://precept.app/capture?url=${url}&title=${title}`, '_blank');
})();
