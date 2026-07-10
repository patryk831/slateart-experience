import './styles.css';
import * as THREE from 'three';

const container = document.getElementById('experience-canvas');
const shell = document.querySelector('.experience-shell');
const fallbackNote = document.getElementById('fallback-note');
const actionButton = document.getElementById('experience-action');
const modeLinks = Array.from(document.querySelectorAll('[data-mode-link]'));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const queryParams = new URLSearchParams(window.location.search);
const showHtmlFallbackLink = queryParams.get('fallback') === '1';
let journeySteps = [];
let journeyIndex = 0;
let countdownTimer = null;

const copy = {
  story: {
    label: 'Story Book',
    eyebrow: 'SlateArt Story Mode',
    title: "Grandma's Story",
    subtitle: 'A memory opened from a SlateArt Smart Stone',
    body: 'A warm book opens on the table and reveals the story behind the stone: the places, dates, photographs and little details that make a life feel close again.',
    button: 'Open the Story',
    afterClick: 'The story is ready to read below the magic layer.',
    artifactLabel: 'Story book',
    artifactTitle: 'A life opens page by page',
    artifactBody: 'The photo becomes the cover, the dates become the first line, and each memory feels like a page carefully placed inside the stone.',
    chapters: ['Cover photo', 'The story', 'Gallery', 'Video link'],
  },
  voice: {
    label: 'Voice Stone',
    eyebrow: 'Voice From The Stone',
    title: 'Hear Their Voice',
    subtitle: 'A voice message waits inside the Smart Stone',
    body: 'The stone glows gently until someone taps to listen. Voice never autoplays; the moment begins only when the visitor chooses to hear it.',
    button: 'Tap to Listen',
    afterClick: 'Voice playback would begin now. Audio always requires this tap.',
    artifactLabel: 'Voice memory',
    artifactTitle: 'A tap before the voice begins',
    artifactBody: 'The page builds anticipation first, then invites the visitor to press play on the live story page where the audio is safely hosted.',
    chapters: ['Photo', 'Voice gate', 'Caption', 'Live playback'],
  },
  secret: {
    label: 'Secret Capsule',
    eyebrow: 'SlateArt Time Capsule',
    title: 'A Message For The Day That Matters',
    subtitle: 'Sealed until the chosen future date',
    body: 'The capsule stays closed until its unlock day. It can hold a private message for an anniversary, an 18th birthday, a memorial day or a family milestone.',
    button: 'Check the Capsule',
    afterClick: 'Still sealed. The message opens only on the selected date.',
    artifactLabel: 'Secret message',
    artifactTitle: 'Sealed for one exact moment',
    artifactBody: 'The message is treated like a small ceremony: protected before the date, then revealed with weight and calm when the time arrives.',
    chapters: ['Sealed note', 'Unlock date', 'Countdown', 'Reveal'],
  },
  collection: {
    label: 'Family Shelf',
    eyebrow: 'Family Stone Collection',
    title: 'One Stone. One Story. A Family Legacy.',
    subtitle: 'A connected archive of family memories',
    body: 'Each stone can open its own story, while the collection keeps grandparents, pets, weddings, homes, farms and journeys connected in one warm family archive.',
    button: 'Explore Collection',
    afterClick: 'The family shelf opens into connected Smart Stone memories.',
    artifactLabel: 'Family archive',
    artifactTitle: 'One collection, many stones',
    artifactBody: 'A single QR story can become the first chapter of a family archive, with every future stone joining the same legacy.',
    chapters: ['First stone', 'Family line', 'More stories', 'Legacy shelf'],
  },
};

function currentMode() {
  const mode = queryParams.get('mode') || 'story';
  return copy[mode] ? mode : 'story';
}

let mode = currentMode();
let content = personalizedContent(copy[mode], mode);

function cleanText(value, maxLength = 180) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function removeLegacyPrompts(value) {
  return String(value || '')
    .replace(/want the guided version\??/gi, '')
    .replace(/open cinematic journey/gi, '')
    .replace(/open html fallback page/gi, '')
    .replace(/open photos and full story/gi, '')
    .replace(/view photos and full story/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanLongText(value, maxLength = 7000) {
  return removeLegacyPrompts(value)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function splitIntoParagraphs(value) {
  const text = cleanLongText(value);
  if (!text) return [];
  const byBreaks = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  if (byBreaks.length > 1) return byBreaks;
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function storyChapters(value, maxChars = 780) {
  const paragraphs = splitIntoParagraphs(value);
  const chapters = [];
  let current = '';

  paragraphs.forEach((paragraph) => {
    if (!current) {
      current = paragraph;
      return;
    }
    if (`${current}\n\n${paragraph}`.length <= maxChars) {
      current = `${current}\n\n${paragraph}`;
    } else {
      chapters.push(current);
      current = paragraph;
    }
  });

  if (current) chapters.push(current);
  return chapters.slice(0, 8);
}

function paramText(name, maxLength = 180) {
  return cleanText(queryParams.get(name), maxLength);
}

function safeUrl(value, allowedHosts = ['stories.slateart.ie', 'slateart.ie', 'www.slateart.ie']) {
  const raw = cleanText(value, 900);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return '';
    if (!allowedHosts.includes(url.hostname)) return '';
    return url.toString();
  } catch (error) {
    return '';
  }
}

function safeEmbedUrl(value) {
  return safeUrl(value, ['www.youtube-nocookie.com', 'player.vimeo.com']);
}

function safeExternalVideoUrl(value) {
  return safeUrl(value, ['youtu.be', 'youtube.com', 'www.youtube.com', 'vimeo.com', 'www.vimeo.com']);
}

function sanitizeGallery(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 15)
    .map((item, index) => {
      const url = safeUrl(item?.url);
      if (!url) return null;
      return {
        url,
        thumb: safeUrl(item?.thumb) || url,
        alt: cleanText(item?.alt, 140) || `Gallery photo ${index + 1}`,
      };
    })
    .filter(Boolean);
}

function sanitizeLayers(value, selectedMode) {
  const allowed = new Set(['story', 'voice', 'time_capsule']);
  const fallback = selectedMode === 'secret'
    ? ['story', 'time_capsule']
    : selectedMode === 'voice'
      ? ['story', 'voice']
      : ['story'];
  if (!Array.isArray(value)) return fallback;
  const layers = value.map((item) => cleanText(item, 40)).filter((item) => allowed.has(item));
  return layers.length ? Array.from(new Set(['story', ...layers])) : fallback;
}

function sanitizeSecret(value) {
  if (!value || value.active !== true) {
    return { active: false, status: 'empty', title: 'Secret Message', body: '', unlockLabel: '', unlockIso: '', message: '' };
  }
  const status = ['pending', 'locked', 'open'].includes(value.status) ? value.status : 'pending';
  return {
    active: true,
    status,
    title: cleanText(value.title, 120) || 'Secret Message',
    label: cleanText(value.label, 120),
    body: cleanText(value.body, 500) || 'A message waiting for the right moment.',
    unlockLabel: cleanText(value.unlock_label, 120),
    unlockIso: cleanText(value.unlock_iso, 80),
    message: status === 'open' ? cleanText(value.message, 5000) : '',
  };
}

function sanitizeVoice(value) {
  if (!value || value.active !== true) {
    return { active: false, caption: '', audioUrl: '' };
  }
  return {
    active: true,
    caption: cleanText(value.caption, 190) || 'A voice kept inside this Smart Stone.',
    audioUrl: safeUrl(value.audio_url),
  };
}

function personalizedContent(base, selectedMode) {
  const title = paramText('title', 92);
  const subtitle = paramText('subtitle', 150);
  const body = paramText('body', 280);
  const message = paramText('message', 620);
  const date = paramText('date', 90);
  const location = paramText('location', 90);
  const count = paramText('count', 20);
  const unlock = paramText('unlock', 90);
  const unlockIso = paramText('unlock_iso', 80);
  const image = safeUrl(queryParams.get('image'));
  const sourceUrl = safeUrl(queryParams.get('source'));
  const result = {
    ...base,
    meta: [],
    image,
    sourceUrl,
    storyText: '',
    gallery: [],
    videoEmbedUrl: '',
    videoUrl: '',
    layers: selectedMode === 'secret' ? ['story', 'time_capsule'] : selectedMode === 'voice' ? ['story', 'voice'] : ['story'],
    voice: { active: selectedMode === 'voice', caption: base.artifactBody || '', audioUrl: '' },
    secret: {
      active: selectedMode === 'secret',
      status: selectedMode === 'secret' ? 'locked' : 'empty',
      title: base.artifactTitle || 'Secret Message',
      body: base.artifactBody || '',
      unlockLabel: unlock,
      unlockIso,
      message: message || '',
    },
    collectionTitle: '',
  };

  if (title) result.title = title;
  if (subtitle) result.subtitle = subtitle;
  if (body) result.body = body;
  if (message && selectedMode === 'secret') {
    result.subtitle = 'The chosen day has arrived';
    result.body = 'The sealed message is now open. This moment is designed to feel calm, important and worth returning to.';
    result.button = 'Open Live Keepsake Page';
    result.artifactTitle = 'The message is open';
    result.artifactBody = message;
    result.secret.status = 'open';
    result.secret.title = 'The message is open';
    result.secret.message = message;
    result.afterClick = 'The live story page holds the full message and keepsake details.';
  }
  if (date) result.meta.push({ label: selectedMode === 'secret' ? 'Unlock date' : 'Dates', value: date });
  if (unlock && selectedMode === 'secret') result.meta.push({ label: 'Sealed until', value: unlock });
  if (!unlock && unlockIso && selectedMode === 'secret') result.meta.push({ label: 'Sealed until', value: new Date(unlockIso).toLocaleString() });
  if (location) result.meta.push({ label: 'Place', value: location });
  if (count && selectedMode === 'collection') result.meta.push({ label: 'Stories', value: count });
  if (sourceUrl) result.afterClick = 'The simple fallback page stays available if this device cannot show the full experience.';

  return result;
}

function apiRequestUrl() {
  const story = cleanText(queryParams.get('story'), 190);
  const collection = cleanText(queryParams.get('collection'), 190);
  const slugPattern = /^[a-z0-9][a-z0-9-]{1,188}$/;

  if (slugPattern.test(story)) {
    return `https://stories.slateart.ie/api/experience?story=${encodeURIComponent(story)}`;
  }
  if (slugPattern.test(collection)) {
    return `https://stories.slateart.ie/api/experience?collection=${encodeURIComponent(collection)}`;
  }
  return '';
}

function contentFromApi(data) {
  if (!data || data.ok !== true) return null;
  const apiMode = cleanText(data.mode, 20);
  const selectedMode = copy[apiMode] ? apiMode : mode;
  const result = {
    ...copy[selectedMode],
    meta: [],
    image: '',
    sourceUrl: '',
    storyText: '',
    gallery: [],
    videoEmbedUrl: '',
    videoUrl: '',
    layers: sanitizeLayers(data.layers, selectedMode),
    voice: sanitizeVoice(data.voice),
    secret: sanitizeSecret(data.secret),
    collectionTitle: cleanText(data.collection_title, 120),
  };

  const title = cleanText(data.title, 92);
  const subtitle = cleanText(data.subtitle, 150);
  const body = cleanText(data.body, 280);
  const message = cleanText(data.message, 620);
  const date = cleanText(data.date, 90);
  const location = cleanText(data.location, 90);
  const unlock = cleanText(data.unlock, 90);
  const count = cleanText(data.count, 20);
  const image = safeUrl(data.image);
  const sourceUrl = safeUrl(data.source);
  const storyText = cleanLongText(data.story_text, 7000);
  const gallery = sanitizeGallery(data.gallery);
  const videoEmbedUrl = safeEmbedUrl(data.video?.embed_url);
  const videoUrl = safeExternalVideoUrl(data.video?.url);

  if (title) result.title = title;
  if (subtitle) result.subtitle = subtitle;
  if (body) result.body = body;
  if (message && selectedMode === 'secret') {
    result.subtitle = 'The chosen day has arrived';
    result.body = 'The sealed message is now open. This moment is designed to feel calm, important and worth returning to.';
    result.button = 'Open Live Keepsake Page';
    result.artifactTitle = 'The message is open';
    result.artifactBody = message;
    result.secret.status = 'open';
    result.secret.title = 'The message is open';
    result.secret.message = message;
    result.afterClick = 'The live story page holds the full message and keepsake details.';
  }
  if (date) result.meta.push({ label: selectedMode === 'secret' ? 'Unlock date' : 'Dates', value: date });
  if (unlock && selectedMode === 'secret') result.meta.push({ label: 'Sealed until', value: unlock });
  if (location) result.meta.push({ label: 'Place', value: location });
  if (count && selectedMode === 'collection') result.meta.push({ label: 'Stories', value: count });
  if (image) result.image = image;
  if (storyText) result.storyText = storyText;
  result.gallery = gallery;
  result.videoEmbedUrl = videoEmbedUrl;
  result.videoUrl = videoUrl;
  if (result.secret.active && result.secret.status === 'open' && result.secret.message) {
    result.artifactTitle = result.secret.title;
    result.artifactBody = result.secret.message;
  } else if (result.secret.active) {
    result.artifactTitle = result.secret.title;
    result.artifactBody = result.secret.body;
  }
  if (sourceUrl) {
    result.sourceUrl = sourceUrl;
    result.afterClick = 'The simple fallback page stays available if this device cannot show the full experience.';
  }

  return { mode: selectedMode, content: result };
}

async function hydrateContentFromApi() {
  const url = apiRequestUrl();
  if (!url) return;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
    });
    if (!response.ok) return;
    const data = await response.json();
    const hydrated = contentFromApi(data);
    if (!hydrated) return;
    mode = hydrated.mode;
    content = hydrated.content;
  } catch (error) {
    // Keep the URL parameter fallback if the live story API is temporarily unavailable.
  }
}

function updateContent() {
  shell.dataset.mode = mode;
  shell.classList.toggle('is-live', Boolean(apiRequestUrl()));
  document.title = `SlateArt Experience | ${content.title}`;
  document.getElementById('experience-eyebrow').textContent = content.eyebrow;
  document.getElementById('experience-title').textContent = content.title;
  document.getElementById('experience-subtitle').textContent = content.subtitle;
  document.getElementById('experience-copy').textContent = content.body;
  actionButton.textContent = content.button;
  actionButton.hidden = true;
  const sourceLink = document.getElementById('experience-source-link');
  if (sourceLink) {
    if (content.sourceUrl && showHtmlFallbackLink) {
      sourceLink.href = content.sourceUrl;
      sourceLink.hidden = false;
      sourceLink.textContent = 'Open simple fallback page';
    } else {
      sourceLink.hidden = true;
      sourceLink.removeAttribute('href');
    }
  }

  const imageWrap = document.getElementById('experience-image-wrap');
  const image = document.getElementById('experience-image');
  if (content.image && imageWrap && image && !apiRequestUrl()) {
    image.src = content.image;
    image.alt = content.title;
    imageWrap.hidden = false;
  } else if (imageWrap) {
    imageWrap.hidden = true;
  }

  const meta = document.getElementById('experience-meta');
  if (meta) {
    meta.replaceChildren();
    if (content.meta.length) {
      content.meta.forEach((item) => {
        const chip = document.createElement('span');
        const label = document.createElement('strong');
        const value = document.createElement('em');
        label.textContent = item.label;
        value.textContent = item.value;
        chip.append(label, value);
        meta.appendChild(chip);
      });
      meta.hidden = false;
    } else {
      meta.hidden = true;
    }
  }

  const artifact = document.getElementById('experience-artifact');
  const artifactLabel = document.getElementById('experience-artifact-label');
  const artifactTitle = document.getElementById('experience-artifact-title');
  const artifactBody = document.getElementById('experience-artifact-body');
  const artifactBars = document.getElementById('experience-artifact-bars');
  if (artifact && artifactLabel && artifactTitle && artifactBody && artifactBars) {
    artifact.dataset.artifactMode = mode;
    artifactLabel.textContent = content.artifactLabel || copy[mode].artifactLabel;
    artifactTitle.textContent = content.artifactTitle || copy[mode].artifactTitle;
    artifactBody.textContent = content.artifactBody || copy[mode].artifactBody;
    artifactBars.replaceChildren();
    const barCount = mode === 'story' ? 4 : mode === 'collection' ? 6 : 7;
    for (let index = 0; index < barCount; index += 1) {
      const bar = document.createElement('span');
      bar.style.setProperty('--bar-index', String(index));
      artifactBars.appendChild(bar);
    }
  }
  journeySteps = buildJourneySteps(content, mode);
  journeyIndex = 0;
  renderMemoryNodes();
  renderJourney();

  modeLinks.forEach((link) => {
    const active = link.dataset.modeLink === mode;
    link.classList.toggle('is-active', active);
    link.setAttribute('aria-current', active ? 'page' : 'false');
    const url = new URL(window.location.href);
    url.searchParams.set('mode', link.dataset.modeLink);
    link.href = `${url.pathname}${url.search}`;
  });
}

function buildJourneySteps(data, selectedMode) {
  const steps = [];
  if (selectedMode === 'collection') {
    steps.push({
      label: 'Family archive',
      title: data.title,
      body: data.body,
      type: 'collection',
    });
    if (data.gallery?.length) {
      steps.push({
        label: 'Family photos',
        title: `${data.gallery.length} collection photo${data.gallery.length === 1 ? '' : 's'}`,
        body: 'Swipe through the memories connected to this collection.',
        type: 'gallery',
        gallery: data.gallery,
        galleryIndex: 0,
      });
    }
    steps.push({
      label: 'Next stone',
      title: 'Add another story to this family collection',
      body: 'A family archive becomes more valuable each time another stone, place, voice or memory joins it.',
      type: 'family',
    });
    return steps;
  }

  const layers = Array.isArray(data.layers) ? data.layers : ['story'];
  steps.push({
    label: 'Cover',
    title: data.title,
    body: data.subtitle || data.body || 'The image opens the memory.',
    type: 'image',
    image: data.image,
  });

  if (layers.includes('story') || data.storyText) {
    const chapters = storyChapters(data.storyText || data.body);
    if (chapters.length) {
      chapters.forEach((chapter, index) => {
        steps.push({
          label: `Chapter ${index + 1}`,
          title: index === 0 ? 'The story begins' : `Story chapter ${index + 1}`,
          body: chapter,
          type: 'text',
        });
      });
    }
  }

  if (layers.includes('time_capsule') || data.secret?.active) {
    steps.push({
      label: 'Secret Message',
      title: data.secret?.title || 'Secret Message',
      body: data.secret?.body || data.artifactBody || data.body,
      type: 'secret',
      secret: data.secret,
    });
  }

  if (layers.includes('voice') || data.voice?.active) {
    steps.push({
      label: 'Voice',
      title: 'Voice From The Stone',
      body: data.voice?.caption || data.artifactBody || 'A voice memory is connected to this Smart Stone.',
      type: 'voice',
      voice: data.voice,
    });
  }

  if (data.gallery?.length) {
    steps.push({
      label: 'Gallery',
      title: `${data.gallery.length} photo${data.gallery.length === 1 ? '' : 's'} in this memory`,
      body: 'Tap a photo for full screen. On a phone, swipe through the gallery like a private album.',
      type: 'gallery',
      gallery: data.gallery,
      galleryIndex: 0,
    });
  }

  if (data.videoEmbedUrl) {
    steps.push({
      label: 'Video',
      title: 'Watch this memory',
      body: 'A video scene belongs inside the story, so the visitor can stay in the Smart Stone experience.',
      type: 'video',
      embedUrl: data.videoEmbedUrl,
      videoUrl: data.videoUrl,
    });
  }

  if (data.collectionTitle) {
    steps.push({
      label: 'Collection',
      title: data.collectionTitle,
      body: 'This memory is connected to a wider family collection. One stone can become the start of a legacy.',
      type: 'family',
    });
  }

  steps.push({
    label: 'Keep adding',
    title: 'One stone can become the start of a collection',
    body: data.collectionTitle
      ? 'This story is already connected to a family archive. More stones can be added over time.'
      : 'A Smart Stone can stand alone, or become the first chapter of a family collection.',
    type: 'family',
  });

  return steps;
}

function renderMemoryNodes() {
  const chapters = document.getElementById('experience-chapters');
  if (!chapters) return;
  chapters.replaceChildren();
  journeySteps.forEach((step, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `memory-node memory-node-${step.type}`;
    button.classList.toggle('is-active', index === journeyIndex);
    if (step.type === 'secret' && step.secret?.status === 'locked') {
      button.classList.add('is-locked');
    }
    const dot = document.createElement('span');
    dot.className = 'memory-node-dot';
    const text = document.createElement('span');
    text.className = 'memory-node-label';
    text.textContent = step.label;
    button.append(dot, text);
    button.addEventListener('click', () => {
      journeyIndex = index;
      renderJourney();
    });
    chapters.appendChild(button);
  });
}

function renderJourney() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
  const section = document.getElementById('experience-journey');
  const media = document.getElementById('journey-media');
  const stepLabel = document.getElementById('journey-step');
  const title = document.getElementById('journey-title');
  const body = document.getElementById('journey-body');
  const thumbs = document.getElementById('journey-thumbs');
  const prev = document.getElementById('journey-prev');
  const next = document.getElementById('journey-next');
  if (!section || !media || !stepLabel || !title || !body || !thumbs || !prev || !next || !journeySteps.length) {
    if (section) section.hidden = true;
    return;
  }

  section.hidden = false;
  const step = journeySteps[journeyIndex];
  renderMemoryNodes();
  stepLabel.textContent = `${journeyIndex + 1} of ${journeySteps.length} - ${step.label}`;
  title.textContent = step.title;
  body.replaceChildren();
  if (!['secret', 'voice'].includes(step.type) && step.body) {
    appendProse(body, step.body);
  }
  media.replaceChildren();
  thumbs.replaceChildren();

  if (step.type === 'image' && step.image) {
    media.appendChild(journeyImage(step.image, step.title, [{ url: step.image, thumb: step.image, alt: step.title }], 0));
  } else if (step.type === 'gallery') {
    const current = step.gallery[step.galleryIndex || 0];
    media.appendChild(journeyImage(current.url, current.alt, step.gallery, step.galleryIndex || 0));
    step.gallery.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = index === (step.galleryIndex || 0) ? 'is-active' : '';
      const img = document.createElement('img');
      img.src = item.thumb;
      img.alt = item.alt;
      button.appendChild(img);
      button.addEventListener('click', () => {
        step.galleryIndex = index;
        renderJourney();
      });
      thumbs.appendChild(button);
    });
  } else if (step.type === 'video' && step.embedUrl) {
    const iframe = document.createElement('iframe');
    iframe.src = step.embedUrl;
    iframe.title = step.title;
    iframe.loading = 'lazy';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    media.appendChild(iframe);
  } else if (step.type === 'secret') {
    renderSecretStep(step, media, body);
  } else if (step.type === 'voice') {
    renderVoiceStep(step, media, body);
  } else {
    const mark = document.createElement('div');
    mark.className = `journey-symbol journey-symbol-${step.type}`;
    mark.textContent = step.type === 'family' ? 'Family' : step.type === 'collection' ? 'Legacy' : 'Story';
    media.appendChild(mark);
  }

  prev.disabled = journeyIndex === 0;
  next.textContent = journeyIndex === journeySteps.length - 1 ? 'Begin again' : 'Next';
}

function appendProse(container, text) {
  const paragraphs = splitIntoParagraphs(text);
  if (!paragraphs.length) return;
  paragraphs.forEach((paragraph) => {
    const p = document.createElement('p');
    p.textContent = paragraph;
    container.appendChild(p);
  });
}

function journeyImage(src, alt, gallery = [], index = 0) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'journey-image-button';
  const image = document.createElement('img');
  image.src = src;
  image.alt = alt;
  image.loading = 'lazy';
  button.appendChild(image);
  button.addEventListener('click', () => openImageViewer(gallery.length ? gallery : [{ url: src, alt }], index));
  return button;
}

function renderSecretStep(step, media, body) {
  const secret = step.secret || {};
  const symbol = document.createElement('div');
  symbol.className = `journey-symbol journey-symbol-secret journey-symbol-${secret.status || 'pending'}`;
  symbol.textContent = secret.status === 'open' ? 'Opened' : secret.status === 'locked' ? 'Sealed' : 'Waiting';
  media.appendChild(symbol);

  const panel = document.createElement('div');
  panel.className = `secret-ceremony secret-ceremony-${secret.status || 'pending'}`;
  const label = document.createElement('strong');
  label.textContent = secret.status === 'open'
    ? 'The message is open'
    : secret.status === 'locked'
      ? 'Sealed for one exact moment'
      : 'Secret Message is ready';
  panel.appendChild(label);

  if (secret.status === 'locked' && secret.unlockIso) {
    const until = document.createElement('span');
    until.textContent = secret.unlockLabel ? `Opens ${secret.unlockLabel}` : 'Waiting for the chosen date';
    panel.appendChild(until);
    const countdown = document.createElement('div');
    countdown.className = 'secret-countdown';
    panel.appendChild(countdown);
    startCountdown(countdown, secret.unlockIso);
  } else if (secret.status === 'open' && secret.message) {
    const ribbon = document.createElement('span');
    ribbon.className = 'secret-ribbon';
    ribbon.textContent = 'A letter from the stone';
    panel.appendChild(ribbon);
    const message = document.createElement('blockquote');
    message.textContent = secret.message;
    panel.appendChild(message);
  } else {
    const note = document.createElement('span');
    note.textContent = secret.body || 'The owner can add the hidden message and unlock date from their story account.';
    panel.appendChild(note);
  }
  body.appendChild(panel);
}

function renderVoiceStep(step, media, body) {
  const voice = step.voice || {};
  const symbol = document.createElement('div');
  symbol.className = 'journey-symbol journey-symbol-voice';
  symbol.textContent = 'Voice';
  media.appendChild(symbol);

  const player = document.createElement('div');
  player.className = 'voice-card';
  const title = document.createElement('strong');
  title.textContent = 'Hear the voice from this stone';
  player.appendChild(title);
  const caption = document.createElement('span');
  caption.textContent = voice.caption || step.body;
  player.appendChild(caption);
  const waveform = document.createElement('div');
  waveform.className = 'voice-waveform';
  for (let index = 0; index < 24; index += 1) {
    const bar = document.createElement('i');
    bar.style.setProperty('--wave-index', String(index));
    waveform.appendChild(bar);
  }
  player.appendChild(waveform);
  if (voice.audioUrl) {
    const audio = document.createElement('audio');
    audio.controls = false;
    audio.preload = 'none';
    audio.src = voice.audioUrl;
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'voice-play-button';
    play.textContent = 'Hear the voice from this stone';
    play.addEventListener('click', async () => {
      try {
        if (audio.paused) {
          await audio.play();
          play.textContent = 'Pause voice message';
          player.classList.add('is-playing');
        } else {
          audio.pause();
          play.textContent = 'Hear the voice from this stone';
          player.classList.remove('is-playing');
        }
      } catch (error) {
        play.textContent = 'Tap again to start audio';
      }
    });
    audio.addEventListener('ended', () => {
      play.textContent = 'Hear the voice from this stone';
      player.classList.remove('is-playing');
    });
    player.appendChild(play);
    player.appendChild(audio);
  } else {
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'voice-play-button voice-play-button-disabled';
    play.disabled = true;
    play.textContent = 'Voice recording will appear here';
    player.appendChild(play);
    const note = document.createElement('em');
    note.textContent = 'Voice Message is active. The customer can add the recording from their story account.';
    player.appendChild(note);
  }
  body.appendChild(player);
}

function startCountdown(container, unlockIso) {
  const unlockTime = Date.parse(unlockIso);
  if (!Number.isFinite(unlockTime)) return;
  const units = [
    ['days', 86400000],
    ['hours', 3600000],
    ['minutes', 60000],
    ['seconds', 1000],
  ];
  const boxes = units.map(([label]) => {
    const box = document.createElement('span');
    const value = document.createElement('strong');
    const small = document.createElement('small');
    value.textContent = '--';
    small.textContent = label;
    box.append(value, small);
    container.appendChild(box);
    return value;
  });
  const update = () => {
    let diff = Math.max(0, unlockTime - Date.now());
    units.forEach(([, size], index) => {
      const amount = Math.floor(diff / size);
      boxes[index].textContent = String(amount).padStart(2, '0');
      diff -= amount * size;
    });
  };
  update();
  countdownTimer = window.setInterval(update, 1000);
}

function openImageViewer(gallery, startIndex = 0) {
  const items = Array.isArray(gallery) && gallery.length ? gallery : [];
  if (!items.length) return;
  let index = Math.max(0, Math.min(startIndex, items.length - 1));
  const overlay = document.createElement('div');
  overlay.className = 'image-viewer';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.tabIndex = -1;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'image-viewer-close';
  close.textContent = 'Close';
  const image = document.createElement('img');
  const caption = document.createElement('p');
  caption.className = 'image-viewer-caption';
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'image-viewer-nav image-viewer-prev';
  previous.textContent = 'Back';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'image-viewer-nav image-viewer-next';
  next.textContent = 'Next';

  function render() {
    const item = items[index];
    image.src = item.url;
    image.alt = item.alt || 'SlateArt memory photo';
    caption.textContent = `${index + 1} of ${items.length}${item.alt ? ` - ${item.alt}` : ''}`;
    previous.hidden = items.length <= 1;
    next.hidden = items.length <= 1;
  }

  function move(delta) {
    index = (index + delta + items.length) % items.length;
    render();
  }

  previous.addEventListener('click', (event) => {
    event.stopPropagation();
    move(-1);
  });
  next.addEventListener('click', (event) => {
    event.stopPropagation();
    move(1);
  });

  overlay.append(close, previous, image, next, caption);
  function onKeydown(event) {
    if (event.key === 'Escape') {
      dismiss();
    } else if (event.key === 'ArrowRight') {
      move(1);
    } else if (event.key === 'ArrowLeft') {
      move(-1);
    }
  }

  const dismiss = () => {
    window.removeEventListener('keydown', onKeydown);
    overlay.remove();
  };
  close.addEventListener('click', dismiss);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) dismiss();
  });
  let touchStartX = 0;
  overlay.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0]?.clientX || 0;
  }, { passive: true });
  overlay.addEventListener('touchend', (event) => {
    const endX = event.changedTouches[0]?.clientX || 0;
    const delta = endX - touchStartX;
    if (Math.abs(delta) > 44) {
      move(delta > 0 ? -1 : 1);
    }
  }, { passive: true });
  window.addEventListener('keydown', onKeydown);
  render();
  document.body.appendChild(overlay);
  overlay.focus();
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (error) {
    return false;
  }
}

function showFallback() {
  shell.classList.add('is-fallback');
  if (fallbackNote) fallbackNote.hidden = false;
}

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.78,
    metalness: options.metalness ?? 0.04,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });
}

function createParticles(count = 210) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 9.8;
    positions[index * 3 + 1] = Math.random() * 5.2 - 0.55;
    positions[index * 3 + 2] = (Math.random() - 0.5) * 6.2;
    scales[index] = Math.random();
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

  const particleMaterial = new THREE.PointsMaterial({
    color: 0xf3c66a,
    size: 0.034,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });

  return new THREE.Points(geometry, particleMaterial);
}

function createMagicRibbon() {
  const ribbon = new THREE.Group();
  const ringMaterial = material(0xd7a64a, {
    roughness: 0.42,
    metalness: 0.24,
    transparent: true,
    opacity: 0.48,
    emissive: 0xb87922,
    emissiveIntensity: 0.18,
  });

  [1.5, 2.15, 2.85].forEach((radius, index) => {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 8, 120), ringMaterial);
    torus.rotation.x = Math.PI / 2 + index * 0.07;
    torus.rotation.z = index * 0.8;
    torus.position.y = 0.52 + index * 0.03;
    ribbon.add(torus);
  });

  return ribbon;
}

function createTable() {
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(4.7, 5.5, 0.32, 96),
    material(0x4c2a17, { roughness: 0.88, metalness: 0.02 })
  );
  table.position.y = -0.24;
  table.receiveShadow = true;
  return table;
}

function createBook() {
  const group = new THREE.Group();
  const cover = material(0x311a12, { roughness: 0.82 });
  const page = material(0xf2ddba, { roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  const gold = material(0xd49a35, { roughness: 0.48, metalness: 0.22 });
  const ink = material(0x6c4a32, { roughness: 0.96, metalness: 0 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.14, 2.18), cover);
  base.position.y = 0.04;
  group.add(base);

  const border = new THREE.Mesh(new THREE.BoxGeometry(3.38, 0.035, 2.3), gold);
  border.position.y = 0.13;
  group.add(border);

  const leftPivot = new THREE.Group();
  const rightPivot = new THREE.Group();
  leftPivot.position.set(-0.04, 0.22, 0);
  rightPivot.position.set(0.04, 0.23, 0);

  const leftPage = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.035, 2.02), page);
  leftPage.position.x = -0.76;

  const rightPage = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.035, 2.02), page);
  rightPage.position.x = 0.76;

  const photoPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.012, 0.62),
    material(0x151412, { roughness: 0.72, metalness: 0.08 })
  );
  photoPlate.position.set(-0.02, 0.03, 0.38);
  leftPage.add(photoPlate);

  const photoGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.014, 0.5),
    material(0xf4dca8, { roughness: 0.58, metalness: 0, emissive: 0xc99134, emissiveIntensity: 0.12 })
  );
  photoGlow.position.set(-0.02, 0.045, 0.38);
  leftPage.add(photoGlow);

  for (let index = 0; index < 7; index += 1) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(index === 0 ? 0.72 : 1.05, 0.012, 0.018), ink);
    line.position.set(-0.04, 0.04, -0.62 + index * 0.18);
    rightPage.add(line);
  }

  leftPivot.add(leftPage);
  rightPivot.add(rightPage);
  group.add(leftPivot, rightPivot);

  const floatingPages = new THREE.Group();
  for (let index = 0; index < 5; index += 1) {
    const floatingPage = new THREE.Mesh(
      new THREE.BoxGeometry(0.46 + index * 0.04, 0.012, 0.62),
      material(0xffefcc, { roughness: 0.86, transparent: true, opacity: 0.48 })
    );
    floatingPage.position.set(-1.9 + index * 0.26, 0.74 + index * 0.07, -0.88 + index * 0.23);
    floatingPage.rotation.set(0.15 + index * 0.05, 0.2 - index * 0.04, -0.25 + index * 0.09);
    floatingPages.add(floatingPage);
  }
  group.add(floatingPages);

  const bookmark = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.015, 1.65),
    material(0x8f1d18, { roughness: 0.68 })
  );
  bookmark.position.set(0.1, 0.27, 0.1);
  group.add(bookmark);

  group.rotation.x = -0.08;
  group.rotation.z = 0.02;
  return { group, animate: (elapsed, ease) => {
    leftPivot.rotation.z = THREE.MathUtils.lerp(0.02, 0.73, ease);
    rightPivot.rotation.z = THREE.MathUtils.lerp(-0.02, -0.73, ease);
    group.rotation.y = Math.sin(elapsed * 0.35) * 0.05;
    floatingPages.children.forEach((pageMesh, index) => {
      pageMesh.position.y += Math.sin(elapsed * 0.8 + index) * 0.0014;
      pageMesh.rotation.y = Math.sin(elapsed * 0.42 + index) * 0.12;
    });
  } };
}

function createVoiceStone() {
  const group = new THREE.Group();
  const stone = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.25, 2),
    material(0x1e2526, {
      roughness: 0.86,
      metalness: 0.1,
      emissive: 0x102b2a,
      emissiveIntensity: 0.22,
    })
  );
  stone.scale.set(1.1, 0.72, 0.84);
  stone.position.y = 0.55;
  group.add(stone);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 48, 32),
    material(0x70f0d0, {
      roughness: 0.18,
      metalness: 0.02,
      transparent: true,
      opacity: 0.72,
      emissive: 0x2bd9ba,
      emissiveIntensity: 1.2,
    })
  );
  core.position.set(0, 0.58, 0.75);
  group.add(core);

  const rings = new THREE.Group();
  const ringMaterial = material(0x8cefdc, {
    roughness: 0.34,
    metalness: 0.18,
    transparent: true,
    opacity: 0.42,
    emissive: 0x32c9b5,
    emissiveIntensity: 0.35,
  });

  [1.45, 1.95, 2.45].forEach((radius, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.01, 8, 120), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.58 + index * 0.05;
    rings.add(ring);
  });
  group.add(rings);

  const waveBars = new THREE.Group();
  for (let index = 0; index < 11; index += 1) {
    const height = 0.16 + (index % 5) * 0.11;
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, height, 0.035),
      material(0x8cf5df, {
        roughness: 0.28,
        metalness: 0.08,
        emissive: 0x35d2bd,
        emissiveIntensity: 0.52,
      })
    );
    bar.position.set(-0.5 + index * 0.1, 0.72, 0.98);
    waveBars.add(bar);
  }
  group.add(waveBars);

  return { group, animate: (elapsed) => {
    stone.rotation.y = elapsed * 0.22;
    stone.rotation.x = Math.sin(elapsed * 0.7) * 0.08;
    core.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.08);
    rings.rotation.z += prefersReducedMotion ? 0 : 0.006;
    waveBars.children.forEach((bar, index) => {
      const pulse = 0.78 + Math.abs(Math.sin(elapsed * 2.2 + index * 0.55)) * 0.72;
      bar.scale.y = prefersReducedMotion ? 1 : pulse;
    });
  } };
}

function createSecretCapsule() {
  const group = new THREE.Group();
  const boxMat = material(0x281a2d, { roughness: 0.72, metalness: 0.06 });
  const gold = material(0xd6a24a, {
    roughness: 0.38,
    metalness: 0.28,
    emissive: 0x8a5416,
    emissiveIntensity: 0.08,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.18, 1.92), boxMat);
  base.position.y = 0.48;
  group.add(base);

  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 1.1, -0.92);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.28, 2.05), boxMat);
  lid.position.z = 0.92;
  lidPivot.add(lid);
  group.add(lidPivot);

  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.12), gold);
  lock.position.set(0, 0.48, 1.03);
  group.add(lock);

  const letter = new THREE.Mesh(
    new THREE.BoxGeometry(1.78, 0.035, 1.08),
    material(0xffecd0, { roughness: 0.88, metalness: 0, emissive: 0x5a2a18, emissiveIntensity: 0.04 })
  );
  letter.position.set(0, 0.94, 0.16);
  letter.rotation.x = -0.1;
  group.add(letter);

  const seal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.042, 42),
    material(0x9e1717, { roughness: 0.58, metalness: 0.04, emissive: 0x4b0505, emissiveIntensity: 0.18 })
  );
  seal.position.set(0, 0.98, 0.72);
  seal.rotation.x = Math.PI / 2;
  group.add(seal);

  const letterLines = new THREE.Group();
  for (let index = 0; index < 4; index += 1) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.82 - index * 0.08, 0.01, 0.018),
      material(0x6b4231, { roughness: 0.92 })
    );
    line.position.set(-0.22, 1.005, -0.28 + index * 0.18);
    letterLines.add(line);
  }
  group.add(letterLines);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 48, 32),
    material(0xffcf73, {
      transparent: true,
      opacity: 0.22,
      emissive: 0xffb342,
      emissiveIntensity: 1.4,
    })
  );
  glow.position.set(0, 1.02, 0.08);
  group.add(glow);

  return { group, animate: (elapsed, ease) => {
    const sealedOpen = Math.min(0.34, ease * 0.34);
    lidPivot.rotation.x = -sealedOpen;
    group.rotation.y = Math.sin(elapsed * 0.25) * 0.04;
    glow.scale.setScalar(1 + Math.sin(elapsed * 1.7) * 0.12);
    letter.position.y = 0.94 + Math.sin(elapsed * 0.95) * 0.018;
    seal.rotation.z = Math.sin(elapsed * 0.7) * 0.06;
  } };
}

function createCollectionShelf() {
  const group = new THREE.Group();
  const wood = material(0x4c2a17, { roughness: 0.82 });
  const gold = material(0xd6a24a, { roughness: 0.45, metalness: 0.24 });
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.18, 1.0), wood);
  shelf.position.y = 0.1;
  group.add(shelf);

  const colors = [0x432318, 0x1f3b38, 0x502239, 0x61411d, 0x24314d];
  colors.forEach((color, index) => {
    const item = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 1.38 + (index % 2) * 0.22, 0.72),
      material(color, { roughness: 0.76, metalness: 0.05 })
    );
    item.position.set(-1.4 + index * 0.7, 0.86 + (index % 2) * 0.1, 0);
    item.rotation.z = (index - 2) * 0.025;
    group.add(item);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.055, 0.75), gold);
    stripe.position.set(item.position.x, item.position.y + 0.35, 0.37);
    stripe.rotation.z = item.rotation.z;
    group.add(stripe);
  });

  const smallStone = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.38, 1),
    material(0x232323, { roughness: 0.88, metalness: 0.08 })
  );
  smallStone.position.set(2, 0.52, 0.2);
  smallStone.scale.set(1.12, 0.66, 0.82);
  group.add(smallStone);

  const legacyNodes = new THREE.Group();
  const nodeMaterial = material(0xf0c56b, {
    roughness: 0.44,
    metalness: 0.22,
    emissive: 0x8c5f14,
    emissiveIntensity: 0.18,
  });
  const nodePositions = [
    [-0.9, 1.95, 0.34],
    [0, 2.28, 0.28],
    [0.9, 1.95, 0.34],
  ];
  nodePositions.forEach((position) => {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 18), nodeMaterial);
    node.position.set(...position);
    legacyNodes.add(node);
  });
  for (let index = 0; index < 2; index += 1) {
    const branch = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.025, 0.025), nodeMaterial);
    branch.position.set(index === 0 ? -0.46 : 0.46, 2.12, 0.32);
    branch.rotation.z = index === 0 ? 0.34 : -0.34;
    legacyNodes.add(branch);
  }
  group.add(legacyNodes);

  return { group, animate: (elapsed) => {
    group.rotation.y = Math.sin(elapsed * 0.28) * 0.055;
    legacyNodes.children.forEach((node, index) => {
      if (node.geometry?.type === 'SphereGeometry') {
        node.scale.setScalar(1 + Math.sin(elapsed * 1.1 + index) * 0.08);
      }
    });
  } };
}

function createModeObject(selectedMode) {
  if (selectedMode === 'voice') return createVoiceStone();
  if (selectedMode === 'secret') return createSecretCapsule();
  if (selectedMode === 'collection') return createCollectionShelf();
  return createBook();
}

function initExperience() {
  if (!container || !supportsWebGL()) {
    showFallback();
    return;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x110c0a, 6, 14);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 2.25, 6.2);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xf9dfb6, 0x1b1210, 1.65));

  const spotlight = new THREE.SpotLight(0xffd08a, 4.4, 12, Math.PI / 6, 0.65, 1.08);
  spotlight.position.set(0, 4.8, 3.1);
  spotlight.castShadow = true;
  scene.add(spotlight);

  const tealFill = new THREE.PointLight(mode === 'voice' ? 0x52e6d0 : 0x6c9fa0, mode === 'voice' ? 1.9 : 0.9, 7);
  tealFill.position.set(-2.8, 1.7, 2.4);
  scene.add(tealFill);

  const emberFill = new THREE.PointLight(mode === 'secret' ? 0xff9e43 : 0xb35b24, 1.25, 7);
  emberFill.position.set(2.6, 1.3, 2.1);
  scene.add(emberFill);

  const table = createTable();
  scene.add(table);

  const modeObject = createModeObject(mode);
  modeObject.group.position.y = 0.08;
  modeObject.group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(modeObject.group);

  const ribbon = createMagicRibbon();
  scene.add(ribbon);

  const particles = createParticles(mode === 'collection' ? 260 : 210);
  scene.add(particles);

  const clock = new THREE.Clock();

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.position.z = width < 720 ? 7.5 : 6.2;
    camera.position.y = width < 720 ? 2.72 : 2.25;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener('resize', resize);
  resize();

  function animate() {
    const elapsed = clock.getElapsedTime();
    const openAmount = prefersReducedMotion ? 1 : Math.min(1, elapsed / 2.25);
    const ease = 1 - Math.pow(1 - openAmount, 3);

    modeObject.animate(elapsed, ease);

    if (!prefersReducedMotion) {
      particles.rotation.y += mode === 'voice' ? 0.0015 : 0.001;
      particles.position.y = Math.sin(elapsed * 0.5) * 0.045;
      ribbon.rotation.z += mode === 'secret' ? 0.002 : 0.003;
      ribbon.rotation.y = Math.sin(elapsed * 0.3) * 0.08;
    }

    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
  }

  animate();
}

actionButton?.addEventListener('click', () => {
  shell.classList.toggle('is-expanded');
  const expanded = shell.classList.contains('is-expanded');
  actionButton.textContent = expanded ? 'Return to the Stone' : content.button;
  const status = document.getElementById('experience-status');
  if (!status) return;
  status.replaceChildren();
  if (!expanded) return;
  if (content.sourceUrl) {
    const link = document.createElement('a');
    link.href = content.sourceUrl;
    link.textContent = 'Open simple fallback page';
    link.rel = 'noopener';
    status.append(document.createTextNode(content.afterClick + ' '), link);
    return;
  }
  status.textContent = content.afterClick;
});

document.getElementById('journey-prev')?.addEventListener('click', () => {
  if (!journeySteps.length) return;
  journeyIndex = Math.max(0, journeyIndex - 1);
  renderJourney();
});

document.getElementById('journey-next')?.addEventListener('click', () => {
  if (!journeySteps.length) return;
  const step = journeySteps[journeyIndex];
  if (step?.type === 'gallery' && step.gallery?.length && (step.galleryIndex || 0) < step.gallery.length - 1) {
    step.galleryIndex = (step.galleryIndex || 0) + 1;
  } else if (journeyIndex < journeySteps.length - 1) {
    journeyIndex += 1;
  } else {
    journeyIndex = 0;
    const galleryStep = journeySteps.find((item) => item.type === 'gallery');
    if (galleryStep) galleryStep.galleryIndex = 0;
  }
  renderJourney();
});

async function startExperience() {
  await hydrateContentFromApi();
  updateContent();
  initExperience();
}

startExperience();
