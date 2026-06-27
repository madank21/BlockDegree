/**
 * Sanitize free-text search input before embedding in PostgREST filter strings.
 * Strips characters that could manipulate `.or()` filter syntax.
 */
function sanitizeSearchInput(search) {
  if (!search || typeof search !== 'string') return '';
  return search
    .trim()
    .slice(0, 100)
    .replace(/[%_,.()\\]/g, '')
    .replace(/[^a-zA-Z0-9@.\s\-]/g, '');
}

module.exports = { sanitizeSearchInput };
