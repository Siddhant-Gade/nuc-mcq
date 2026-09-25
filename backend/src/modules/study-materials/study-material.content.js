const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
/**
 * Extracts the 11-character video id from the supported YouTube URL forms.
 * Returns null for anything that is not a YouTube watch/short/embed/live URL —
 * arbitrary URLs and embed HTML are never accepted (confirmed Phase 13 rule).
 */
export function parseYoutubeVideoId(rawUrl) {
    let url;
    try {
        url = new URL(rawUrl.trim());
    }
    catch {
        return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return null;
    }
    const host = url.hostname.toLowerCase();
    const isYouTubeHost = host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com' || host === 'youtu.be' || host === 'music.youtube.com';
    if (!isYouTubeHost) {
        return null;
    }
    // https://youtu.be/<id>
    if (host === 'youtu.be') {
        const candidate = url.pathname.slice(1).split('/')[0] ?? '';
        return YOUTUBE_VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
    }
    // https://www.youtube.com/watch?v=<id>
    const queryId = url.searchParams.get('v');
    if (queryId !== null && YOUTUBE_VIDEO_ID_PATTERN.test(queryId)) {
        return queryId;
    }
    // https://www.youtube.com/shorts/<id>, /embed/<id>, /live/<id>
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length === 2 && ['shorts', 'embed', 'live'].includes(segments[0] ?? '')) {
        const candidate = segments[1] ?? '';
        return YOUTUBE_VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
    }
    return null;
}
/** The only iframe-compatible URL form clients may use for playback. */
export function buildYoutubeEmbedUrl(videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
const PDF_MAGIC = Buffer.from('%PDF');
const OLE2_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]);
const ZIP_MAGIC = Buffer.from([0x50, 0x4b]);
function hasMagic(buffer, magic) {
    return buffer.length >= magic.length && buffer.subarray(0, magic.length).equals(magic);
}
/**
 * Content-sniffs an uploaded document against its declared extension. MIME
 * types and extensions are client-controlled; magic bytes are much harder to
 * fake and give us a real guard for the PDF/DOC/DOCX whitelist.
 */
export function detectDocumentType(fileName, buffer) {
    const extension = (fileName.split('.').pop() ?? '').toLowerCase();
    switch (extension) {
        case 'pdf':
            return hasMagic(buffer, PDF_MAGIC) ? 'PDF' : null;
        case 'doc':
            // Legacy .doc is an OLE2 container.
            return hasMagic(buffer, OLE2_MAGIC) ? 'DOC' : null;
        case 'docx':
            // Office Open XML is a ZIP container.
            return hasMagic(buffer, ZIP_MAGIC) ? 'DOCX' : null;
        case 'ppt':
            // Legacy .ppt is an OLE2 container.
            return hasMagic(buffer, OLE2_MAGIC) ? 'PPT' : null;
        case 'pptx':
            // Office Open XML Presentation is a ZIP container.
            return hasMagic(buffer, ZIP_MAGIC) ? 'PPTX' : null;
        default:
            return null;
    }
}
const ALLOWED_CONTENT_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
export function isAllowedContentType(contentType) {
    return ALLOWED_CONTENT_TYPES.has(contentType.toLowerCase().split(';')[0]?.trim() ?? '');
}
