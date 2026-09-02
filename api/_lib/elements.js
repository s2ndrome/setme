const ALLOWED_TYPES = new Set(['text', 'image', 'box', 'button']);
const MAX_ELEMENTS = 300;
const MAX_JSON_BYTES = 20_000; // per content/style blob

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function boundedJson(value) {
  const obj = value && typeof value === 'object' ? value : {};
  const text = JSON.stringify(obj);
  if (text.length > MAX_JSON_BYTES) {
    throw new Error('요소 데이터가 너무 큽니다.');
  }
  return text;
}

// Normalizes and validates one element from the client. Returns null for
// anything malformed so the save can skip it instead of failing outright.
export function sanitizeElement(raw) {
  if (!raw || !ALLOWED_TYPES.has(raw.type)) return null;

  try {
    return {
      type: raw.type,
      x: clampNumber(raw.x, -20000, 20000, 0),
      y: clampNumber(raw.y, -20000, 20000, 0),
      width: clampNumber(raw.width, 10, 4000, 200),
      height: clampNumber(raw.height, 10, 4000, 80),
      rotation: ((clampNumber(raw.rotation, -36000, 36000, 0) % 360) + 360) % 360,
      zIndex: Math.round(clampNumber(raw.zIndex, 0, 9999, 0)),
      visible: raw.visible !== false,
      opacity: clampNumber(raw.opacity, 0, 1, 1),
      content: boundedJson(raw.content),
      style: boundedJson(raw.style)
    };
  } catch {
    return null;
  }
}

export function sanitizeElements(list) {
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, MAX_ELEMENTS)
    .map(sanitizeElement)
    .filter(Boolean);
}
