import { savePageElements, uploadImage, updateProfile } from '../api/client.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml } from '../ui/escape.js';
import { applyCustomCss } from '../ui/customCss.js';
import { THEME_PRESETS, applyTheme, resolveThemeColors } from '../ui/theme.js';
import { FONT_PRESETS, applyFont } from '../ui/fonts.js';

const MIN_SIZE = 20;
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 1400;
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

function genId() {
  return crypto.randomUUID ? crypto.randomUUID() : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeHref(href) {
  const value = String(href || '').trim();
  return /^(https?:|mailto:|tel:)/i.test(value) ? value : '';
}

function safeColor(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function ddayDiff(targetDate) {
  if (!targetDate) return 'D-DAY';
  const target = new Date(`${targetDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 'D-DAY';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays === 0) return 'D-DAY';
  return diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;
}

function linesOf(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function bannerGridItemHTML(item) {
  const body = item.found && item.image
    ? `<img src="${escapeHtml(item.image)}" alt="">`
    : `<span class="w-banner-card-empty"></span>`;
  return `
    <a class="w-banner-card" href="${escapeHtml(item.href)}" target="_blank" rel="noopener">
      ${body}
      <span class="w-banner-card-label">${escapeHtml(item.title)}</span>
    </a>
  `;
}

function bannerRowItemHTML(item) {
  return item.found && item.image
    ? `<a class="w-banner-row-item" href="${escapeHtml(item.href)}" target="_blank" rel="noopener"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}"></a>`
    : `<a class="w-banner-row-item w-banner-row-empty" href="${escapeHtml(item.href)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>`;
}

function bannerStripItemHTML(item) {
  return item.found && item.image
    ? `<a class="w-banner-strip-item" href="${escapeHtml(item.href)}" target="_blank" rel="noopener"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}"></a>`
    : `<a class="w-banner-strip-item w-banner-strip-empty" href="${escapeHtml(item.href)}" target="_blank" rel="noopener">@${escapeHtml(item.handle)}</a>`;
}

const WIDGETS = {
  dday: {
    label: '디데이',
    width: 200,
    height: 100,
    content: { label: 'D-DAY', targetDate: '' },
    style: {},
    render(content) {
      return `
        <div class="w-dday">
          <div class="w-dday-label">${escapeHtml(content.label || 'D-DAY')}</div>
          <div class="w-dday-value">${escapeHtml(ddayDiff(content.targetDate))}</div>
        </div>
      `;
    },
    fields(content) {
      return `
        <label>제목
          <input type="text" data-field="content.label" value="${escapeHtml(content.label || '')}">
        </label>
        <label>날짜
          <input type="date" data-field="content.targetDate" value="${escapeHtml(content.targetDate || '')}">
        </label>
      `;
    }
  },
  calendar: {
    label: '캘린더',
    width: 280,
    height: 300,
    content: { month: '', highlightDays: '' },
    style: {},
    render(content) {
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth();
      if (/^\d{4}-\d{2}$/.test(content.month || '')) {
        const [y, m] = content.month.split('-').map(Number);
        year = y;
        month = m - 1;
      }
      const highlight = new Set(
        String(content.highlightDays || '')
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
      );
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startWeekday = new Date(year, month, 1).getDay();
      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

      const cells = [];
      for (let i = 0; i < startWeekday; i++) cells.push('<span class="w-cal-cell w-cal-empty"></span>');
      for (let d = 1; d <= daysInMonth; d++) {
        const isToday = isCurrentMonth && d === now.getDate();
        const isHighlight = highlight.has(d);
        cells.push(`<span class="w-cal-cell ${isToday ? 'w-cal-today' : ''} ${isHighlight ? 'w-cal-highlight' : ''}">${d}</span>`);
      }
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
      return `
        <div class="w-calendar">
          <div class="w-cal-head">${year}. ${String(month + 1).padStart(2, '0')}</div>
          <div class="w-cal-grid w-cal-weekdays">${weekdays.map((w) => `<span>${w}</span>`).join('')}</div>
          <div class="w-cal-grid">${cells.join('')}</div>
        </div>
      `;
    },
    fields(content) {
      return `
        <label>표시할 달 (비우면 이번 달)
          <input type="month" data-field="content.month" value="${escapeHtml(content.month || '')}">
        </label>
        <label>강조할 날짜 (쉼표로 구분, 예: 5,14,25)
          <input type="text" data-field="content.highlightDays" value="${escapeHtml(content.highlightDays || '')}" placeholder="5,14,25">
        </label>
      `;
    }
  },
  divider: {
    label: '구분선',
    width: 300,
    height: 20,
    content: {},
    style: { color: '#e5e5e2', thickness: 2 },
    render(content, style) {
      const thickness = Number(style.thickness) || 2;
      const color = safeColor(style.color, '#e5e5e2');
      return `<div class="w-divider" style="border-top:${thickness}px solid ${color}"></div>`;
    },
    fields(content, style) {
      return `
        <label>색
          <input type="color" data-field="style.color" value="${safeColor(style.color, '#e5e5e2')}">
        </label>
        <label>두께
          <input type="number" min="1" max="20" data-field="style.thickness" value="${Number(style.thickness) || 2}">
        </label>
      `;
    }
  },
  preference: {
    label: '성향표 (호불호)',
    width: 320,
    height: 220,
    content: { likeTitle: 'LIKE', hateTitle: 'HATE', likes: '', hates: '' },
    style: {},
    render(content) {
      const likes = linesOf(content.likes);
      const hates = linesOf(content.hates);
      return `
        <div class="w-pref">
          <div class="w-pref-col">
            <h4>${escapeHtml(content.likeTitle || 'LIKE')}</h4>
            <ul>${likes.map((t) => `<li>♥ ${escapeHtml(t)}</li>`).join('')}</ul>
          </div>
          <div class="w-pref-col">
            <h4>${escapeHtml(content.hateTitle || 'HATE')}</h4>
            <ul>${hates.map((t) => `<li>✕ ${escapeHtml(t)}</li>`).join('')}</ul>
          </div>
        </div>
      `;
    },
    fields(content) {
      return `
        <label>LIKE 제목
          <input type="text" data-field="content.likeTitle" value="${escapeHtml(content.likeTitle || '')}">
        </label>
        <label>LIKE 목록 (줄바꿈으로 구분)
          <textarea data-field="content.likes" rows="3">${escapeHtml(content.likes || '')}</textarea>
        </label>
        <label>HATE 제목
          <input type="text" data-field="content.hateTitle" value="${escapeHtml(content.hateTitle || '')}">
        </label>
        <label>HATE 목록 (줄바꿈으로 구분)
          <textarea data-field="content.hates" rows="3">${escapeHtml(content.hates || '')}</textarea>
        </label>
      `;
    }
  },
  friends: {
    label: '친구 링크',
    width: 320,
    height: 200,
    content: { title: 'FRIENDS', items: '' },
    style: {},
    render(content) {
      const items = linesOf(content.items).map((line) => {
        const [label, href] = line.split('|').map((s) => (s || '').trim());
        return { label: label || line, href: safeHref(href) };
      });
      return `
        <div class="w-friends">
          <h4>${escapeHtml(content.title || 'FRIENDS')}</h4>
          <div class="w-friends-grid">
            ${items
              .map((item) =>
                item.href
                  ? `<a class="w-friend" href="${escapeHtml(item.href)}" target="_blank" rel="noopener">${escapeHtml(item.label)}</a>`
                  : `<span class="w-friend">${escapeHtml(item.label)}</span>`
              )
              .join('')}
          </div>
        </div>
      `;
    },
    fields(content) {
      return `
        <label>제목
          <input type="text" data-field="content.title" value="${escapeHtml(content.title || '')}">
        </label>
        <label>친구 목록 (한 줄에 "이름|https://링크")
          <textarea data-field="content.items" rows="5" placeholder="이름|https://example.com">${escapeHtml(content.items || '')}</textarea>
        </label>
      `;
    }
  },
  banner: {
    label: '배너 목록 (친구 배너)',
    width: 320,
    height: 240,
    content: { title: 'FRIENDS', layout: 'grid2', handles: '' },
    style: { blockBg: true, blockColor: '#ffffff' },
    render(content, style, el) {
      const handles = linesOf(content.handles).map((h) => h.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
      if (handles.length === 0) return `<div class="ce-placeholder">핸들을 추가해주세요</div>`;

      const resolvedMap = el?.resolved || {};
      const items = handles.map((handle) => {
        const r = resolvedMap[handle];
        return {
          handle,
          found: !!r?.found,
          image: r?.bannerImage || '',
          title: r?.bannerTitle || `@${handle}`,
          href: `/@${encodeURIComponent(handle)}`
        };
      });

      const layout = ['grid2', 'row', 'strip'].includes(content.layout) ? content.layout : 'grid2';
      if (layout === 'row') {
        return `<div class="w-banner-list w-banner-row">${items.map(bannerRowItemHTML).join('')}</div>`;
      }
      if (layout === 'strip') {
        return `<div class="w-banner-list w-banner-strip">${items.map(bannerStripItemHTML).join('')}</div>`;
      }
      return `
        <div class="w-banner-list w-banner-grid">
          ${content.title ? `<h4>${escapeHtml(content.title)}</h4>` : ''}
          <div class="w-banner-grid-inner">${items.map(bannerGridItemHTML).join('')}</div>
        </div>
      `;
    },
    fields(content) {
      const layout = content.layout || 'grid2';
      return `
        <label>제목 (카드형에서만 표시)
          <input type="text" data-field="content.title" value="${escapeHtml(content.title || '')}">
        </label>
        <label>배치 형식
          <select data-field="content.layout">
            <option value="grid2" ${layout === 'grid2' ? 'selected' : ''}>카드형 (2열)</option>
            <option value="row" ${layout === 'row' ? 'selected' : ''}>가로 나열형</option>
            <option value="strip" ${layout === 'strip' ? 'selected' : ''}>아이콘 배너형 (88x31)</option>
          </select>
        </label>
        <label>핸들 목록 (한 줄에 하나, @ 없이)
          <textarea data-field="content.handles" rows="5" placeholder="someone1&#10;someone2">${escapeHtml(content.handles || '')}</textarea>
        </label>
        <p class="editor-panel-empty">상대가 기본설정에서 배너를 등록해두면 자동으로 표시되고, 나중에 바꾸면 자동으로 반영돼요.</p>
      `;
    }
  },
  collapse: {
    label: '접은글',
    width: 320,
    height: 140,
    content: { title: '더보기', body: '' },
    style: {},
    render(content) {
      return `
        <details class="w-collapse">
          <summary>${escapeHtml(content.title || '더보기')}</summary>
          <div class="w-collapse-body">${escapeHtml(content.body || '')}</div>
        </details>
      `;
    },
    fields(content) {
      return `
        <label>제목 (접혔을 때 보이는 글자)
          <input type="text" data-field="content.title" value="${escapeHtml(content.title || '')}">
        </label>
        <label>내용 (펼치면 보이는 글자)
          <textarea data-field="content.body" rows="4">${escapeHtml(content.body || '')}</textarea>
        </label>
      `;
    }
  },
  gallery: {
    label: '갤러리',
    width: 320,
    height: 240,
    content: { images: [] },
    style: {},
    render(content) {
      const images = Array.isArray(content.images) ? content.images : [];
      if (images.length === 0) return `<div class="ce-placeholder">이미지를 추가해주세요</div>`;
      return `<div class="w-gallery">${images.map((src) => `<img src="${escapeHtml(src)}" alt="">`).join('')}</div>`;
    },
    fields() {
      return `<div id="galleryFields"></div>`;
    }
  },
  guestbook: {
    label: '방명록 바로가기',
    width: 260,
    height: 100,
    content: { title: '방명록', href: '' },
    style: {},
    render(content) {
      const href = safeHref(content.href);
      const label = escapeHtml(content.title || '방명록');
      return href
        ? `<a class="w-guestbook" href="${escapeHtml(href)}" target="_blank" rel="noopener">${label}<span>남기러 가기 →</span></a>`
        : `<div class="w-guestbook">${label}<span>방명록 페이지를 먼저 만들어주세요</span></div>`;
    },
    fields(content) {
      return `
        <label>제목
          <input type="text" data-field="content.title" value="${escapeHtml(content.title || '')}">
        </label>
        <p class="editor-panel-empty">메뉴 관리에서 방명록 페이지를 만들면 자동으로 연결돼요.</p>
      `;
    }
  },
  chat: {
    label: '채팅 로그',
    width: 340,
    height: 260,
    content: { title: 'CHAT', avatar: '', lines: '' },
    style: {},
    render(content) {
      const rows = linesOf(content.lines).map((line) => {
        const idx = line.indexOf('|');
        const speaker = idx === -1 ? '' : line.slice(0, idx).trim();
        const text = idx === -1 ? line : line.slice(idx + 1).trim();
        return { speaker, text };
      });
      const avatar = escapeHtml(content.avatar || '');
      const body = rows
        .map((row) => {
          if (!row.speaker) {
            return `<div class="w-chat-row w-chat-row-me"><div class="w-chat-bubble w-chat-bubble-me">${escapeHtml(row.text)}</div></div>`;
          }
          return `
            <div class="w-chat-row">
              ${avatar ? `<img class="w-chat-avatar" src="${avatar}" alt="">` : `<div class="w-chat-avatar w-chat-avatar-empty"></div>`}
              <div class="w-chat-col">
                <div class="w-chat-name">${escapeHtml(row.speaker)}</div>
                <div class="w-chat-bubble">${escapeHtml(row.text)}</div>
              </div>
            </div>
          `;
        })
        .join('');
      return `
        <div class="w-chat">
          <div class="w-chat-title">${escapeHtml(content.title || 'CHAT')}</div>
          <div class="w-chat-log">${body || '<div class="ce-placeholder">대화를 추가해주세요</div>'}</div>
        </div>
      `;
    },
    fields(content) {
      return `
        <label>제목
          <input type="text" data-field="content.title" value="${escapeHtml(content.title || '')}">
        </label>
        <button class="btn btn-ghost" data-upload="1" data-target="content.avatar">${content.avatar ? '아바타 바꾸기' : '아바타 업로드'}</button>
        ${content.avatar ? `<img class="editor-panel-preview" src="${escapeHtml(content.avatar)}" alt="">` : ''}
        <label>대화 내용 (한 줄에 "이름|대사", 내 대사는 이름 없이 "|대사")
          <textarea data-field="content.lines" rows="6" placeholder="SYNDROME|어디 가지 말고 내 시야 안에 있어.&#10;|......네에.">${escapeHtml(content.lines || '')}</textarea>
        </label>
      `;
    }
  },
  music: {
    label: '음악',
    width: 280,
    height: 90,
    content: { title: '', artist: '', audioUrl: '' },
    style: {},
    render(content) {
      const src = safeHref(content.audioUrl) || (content.audioUrl || '').trim();
      return `
        <div class="w-music">
          <div class="w-music-info">
            <div class="w-music-title">${escapeHtml(content.title || '재생할 곡을 등록해주세요')}</div>
            <div class="w-music-artist">${escapeHtml(content.artist || '')}</div>
          </div>
          ${src ? `<audio controls src="${escapeHtml(src)}"></audio>` : ''}
        </div>
      `;
    },
    fields(content) {
      return `
        <label>곡 제목
          <input type="text" data-field="content.title" value="${escapeHtml(content.title || '')}">
        </label>
        <label>아티스트
          <input type="text" data-field="content.artist" value="${escapeHtml(content.artist || '')}">
        </label>
        <label>오디오 링크
          <input type="text" data-field="content.audioUrl" value="${escapeHtml(content.audioUrl || '')}" placeholder="https://... 또는 업로드">
        </label>
        <button class="btn btn-ghost" data-upload-audio="1">오디오 업로드 (3MB 이하)</button>
      `;
    }
  },
  rating: {
    label: '별점 카드',
    width: 260,
    height: 120,
    content: { title: '', subtitle: '', rating: 4, imageSrc: '' },
    style: {},
    render(content) {
      const rating = Math.min(5, Math.max(0, Number(content.rating) || 0));
      const stars = Array.from({ length: 5 }, (_, i) => {
        const filled = i + 1 <= rating;
        const half = !filled && i + 0.5 <= rating;
        return `<span class="w-star ${filled ? 'full' : half ? 'half' : ''}">★</span>`;
      }).join('');
      const image = content.imageSrc
        ? `<img class="w-rating-img" src="${escapeHtml(content.imageSrc)}" alt="">`
        : '';
      return `
        <div class="w-rating">
          ${image}
          <div class="w-rating-body">
            <div class="w-rating-title">${escapeHtml(content.title || '제목')}</div>
            <div class="w-rating-stars">${stars} <span class="w-rating-num">${rating.toFixed(1)}</span></div>
            <div class="w-rating-subtitle">${escapeHtml(content.subtitle || '')}</div>
          </div>
        </div>
      `;
    },
    fields(content) {
      return `
        <label>제목
          <input type="text" data-field="content.title" value="${escapeHtml(content.title || '')}">
        </label>
        <label>부제/설명
          <input type="text" data-field="content.subtitle" value="${escapeHtml(content.subtitle || '')}">
        </label>
        <label>별점 (0~5, 0.5 단위)
          <input type="number" min="0" max="5" step="0.5" data-field="content.rating" value="${Number(content.rating) || 0}">
        </label>
        <button class="btn btn-ghost" data-upload="1" data-target="content.imageSrc">${content.imageSrc ? '썸네일 바꾸기' : '썸네일 업로드'}</button>
        ${content.imageSrc ? `<img class="editor-panel-preview" src="${escapeHtml(content.imageSrc)}" alt="">` : ''}
      `;
    }
  },
  progress: {
    label: '진행률 바',
    width: 280,
    height: 60,
    content: { label: '진행률', percent: 50 },
    style: { color: '#5b5bf0' },
    render(content, style) {
      const percent = Math.min(100, Math.max(0, Number(content.percent) || 0));
      const color = safeColor(style.color, '#5b5bf0');
      return `
        <div class="w-progress">
          <div class="w-progress-head">
            <span>${escapeHtml(content.label || '')}</span>
            <span>${percent}%</span>
          </div>
          <div class="w-progress-track"><div class="w-progress-fill" style="width:${percent}%;background:${color}"></div></div>
        </div>
      `;
    },
    fields(content, style) {
      return `
        <label>라벨
          <input type="text" data-field="content.label" value="${escapeHtml(content.label || '')}">
        </label>
        <label>진행률 (%)
          <input type="number" min="0" max="100" data-field="content.percent" value="${Number(content.percent) || 0}">
        </label>
        <label>색상
          <input type="color" data-field="style.color" value="${safeColor(style.color, '#5b5bf0')}">
        </label>
      `;
    }
  },
  donut: {
    label: '도넛 차트',
    width: 260,
    height: 260,
    content: { segments: '' },
    style: {},
    render(content) {
      const palette = ['#f76c6c', '#ffd166', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6'];
      const rows = linesOf(content.segments)
        .map((line) => {
          const [label, valueRaw] = line.split('|').map((s) => (s || '').trim());
          const value = Number(valueRaw);
          return { label: label || line, value: Number.isFinite(value) ? Math.max(0, value) : 0 };
        })
        .filter((row) => row.value > 0);
      const total = rows.reduce((sum, row) => sum + row.value, 0);
      if (total === 0) return `<div class="ce-placeholder">항목을 추가해주세요</div>`;

      let cumulative = 0;
      const stops = rows
        .map((row, i) => {
          const start = (cumulative / total) * 360;
          cumulative += row.value;
          const end = (cumulative / total) * 360;
          return `${palette[i % palette.length]} ${start}deg ${end}deg`;
        })
        .join(', ');

      const legend = rows
        .map(
          (row, i) => `
        <li><span class="w-donut-swatch" style="background:${palette[i % palette.length]}"></span>${escapeHtml(row.label)} <b>${Math.round((row.value / total) * 100)}%</b></li>
      `
        )
        .join('');

      return `
        <div class="w-donut">
          <div class="w-donut-ring" style="background:conic-gradient(${stops})"></div>
          <ul class="w-donut-legend">${legend}</ul>
        </div>
      `;
    },
    fields(content) {
      return `
        <label>항목 (한 줄에 "라벨|값")
          <textarea data-field="content.segments" rows="5" placeholder="독서|30&#10;운동|20&#10;게임|50">${escapeHtml(content.segments || '')}</textarea>
        </label>
      `;
    }
  }
};

export function applyBackground(el, background) {
  const bg = background || { type: 'color', value: '#f5f5f5' };
  el.style.backgroundImage = '';
  el.style.backgroundSize = '';
  el.style.backgroundRepeat = '';
  el.style.backgroundPosition = '';
  if (bg.type === 'image' && bg.value) {
    el.style.background = '#f5f5f5';
    el.style.backgroundImage = `url(${JSON.stringify(bg.value)})`;
    el.style.backgroundSize = bg.size || 'cover';
    el.style.backgroundRepeat = bg.repeat || 'no-repeat';
    el.style.backgroundPosition = 'center';
  } else {
    el.style.background = bg.value || '#f5f5f5';
  }
}

function elementBodyHTML(el) {
  const content = el.content || {};
  const style = el.style || {};
  switch (el.type) {
    case 'text': {
      const fontSize = Number(style.fontSize) || 16;
      const color = escapeHtml(style.color || '#222222');
      const weight = style.bold ? 700 : 400;
      const align = ['left', 'center', 'right'].includes(style.align) ? style.align : 'left';
      return `<div class="ce-text" style="font-size:${fontSize}px;color:${color};font-weight:${weight};text-align:${align}">${escapeHtml(content.text || '텍스트를 입력하세요')}</div>`;
    }
    case 'image': {
      const src = escapeHtml(content.src || '');
      return src
        ? `<img class="ce-image" src="${src}" alt="" draggable="false">`
        : `<div class="ce-placeholder">이미지 없음</div>`;
    }
    case 'box': {
      const bg = escapeHtml(style.background || '#ffffff');
      const radius = Number(style.borderRadius ?? 8) || 0;
      const borderWidth = Number(style.borderWidth ?? 1) || 0;
      const borderColor = escapeHtml(style.borderColor || '#e5e5e2');
      return `<div class="ce-box" style="background:${bg};border-radius:${radius}px;border:${borderWidth}px solid ${borderColor}"></div>`;
    }
    case 'button': {
      const label = escapeHtml(content.label || '버튼');
      const bg = escapeHtml(style.background || '#5b5bf0');
      const color = escapeHtml(style.color || '#ffffff');
      const radius = Number(style.borderRadius ?? 999) || 0;
      const href = safeHref(content.href);
      const styleAttr = `background:${bg};color:${color};border-radius:${radius}px`;
      return href
        ? `<a class="ce-button" href="${escapeHtml(href)}" target="_blank" rel="noopener" style="${styleAttr}">${label}</a>`
        : `<div class="ce-button" style="${styleAttr}">${label}</div>`;
    }
    case 'widget': {
      const def = WIDGETS[content.widgetKind];
      if (!def) return '';
      return `<div class="ce-widget">${def.render(content, style, el)}</div>`;
    }
    default:
      return '';
  }
}

// Shared by the editor's .ce-body and the static (view-mode) node — an
// element/widget can optionally sit inside an opaque, colored block
// instead of rendering straight onto the page background.
function wrapperStyle(el) {
  const rounded = !!el.style?.rounded;
  const blockOn = !!el.style?.blockBg;
  const shadowOn = !!el.style?.shadow;
  return {
    borderRadius: rounded ? '16px' : '0px',
    overflow: rounded || blockOn ? 'hidden' : 'visible',
    background: blockOn ? safeColor(el.style.blockColor, '#ffffff') : 'transparent',
    padding: blockOn ? '12px' : '0',
    boxShadow: shadowOn ? '0 10px 28px rgba(20, 20, 30, 0.22)' : 'none'
  };
}

export function renderStaticCanvas(mount, { background, elements }) {
  applyBackground(mount.parentElement || mount, background);
  mount.innerHTML = '';
  const sorted = [...(elements || [])].sort((a, b) => a.zIndex - b.zIndex);
  for (const el of sorted) {
    if (el.visible === false) continue;
    const node = document.createElement('div');
    node.className = 'canvas-element';
    const wrap = wrapperStyle(el);
    // box-shadow lives on the outer node (unclipped) while radius/overflow
    // clip only the inner body — putting both on one element would let
    // overflow:hidden clip the shadow away.
    Object.assign(node.style, {
      left: `${el.x}px`,
      top: `${el.y}px`,
      width: `${el.width}px`,
      height: `${el.height}px`,
      transform: `rotate(${el.rotation || 0}deg)`,
      opacity: el.opacity ?? 1,
      zIndex: el.zIndex ?? 0,
      boxShadow: wrap.boxShadow
    });
    const body = document.createElement('div');
    body.className = 'ce-body';
    Object.assign(body.style, {
      borderRadius: wrap.borderRadius,
      overflow: wrap.overflow,
      background: wrap.background,
      padding: wrap.padding,
      boxSizing: 'border-box'
    });
    body.innerHTML = elementBodyHTML(el);
    node.appendChild(body);
    mount.appendChild(node);
  }
}

const ELEMENT_DEFAULTS = {
  text: { width: 220, height: 60, content: { text: '텍스트를 입력하세요' }, style: { fontSize: 18, color: '#222222' } },
  image: { width: 240, height: 180, content: {}, style: {} },
  box: { width: 240, height: 160, content: {}, style: { background: '#ffffff', borderRadius: 12, borderColor: '#e5e5e2', borderWidth: 1 } },
  button: { width: 160, height: 48, content: { label: '버튼', href: '' }, style: { background: '#5b5bf0', color: '#ffffff' } }
};

export function mountEditor({
  container,
  pageId,
  background,
  elements: initialElements,
  guestbookHref,
  theme,
  themeColors,
  customCss,
  siteName,
  faviconUrl,
  cursorUrl,
  bannerImage,
  bannerTitle,
  fontFamily,
  onExit
}) {
  const state = {
    background: background ? { ...background } : { type: 'color', value: '#f5f5f5' },
    elements: (initialElements || []).map((el) => ({ ...el, id: el.id || genId() })),
    selectedId: null,
    dirty: false,
    tab: 'widgets',
    theme: theme || 'basic',
    themeColors: { ...(themeColors || {}) },
    customCss: customCss || '',
    siteName: siteName || '',
    faviconUrl: faviconUrl || '',
    cursorUrl: cursorUrl || '',
    bannerImage: bannerImage || '',
    bannerTitle: bannerTitle || '',
    fontFamily: fontFamily || 'pretendard'
  };

  container.innerHTML = `
    <div class="editor-shell">
      <div class="editor-toolbar">
        <span class="editor-toolbar-title">꾸미기 모드</span>
        <div class="editor-toolbar-group">
          <span class="editor-dirty-indicator" id="dirtyIndicator"></span>
          <button class="btn btn-primary" id="saveBtn">저장</button>
          <button class="btn btn-ghost" id="exitBtn">보기 모드로</button>
        </div>
      </div>
      <div class="editor-body">
        <div class="canvas-scroll">
          <div class="canvas-stage editor-stage" id="stage" style="width:${CANVAS_WIDTH}px;height:${CANVAS_HEIGHT}px"></div>
        </div>
        <aside class="editor-panel" id="panel">
          <div class="editor-tabs">
            <button type="button" class="editor-tab" data-tab="basic">기본설정</button>
            <button type="button" class="editor-tab" data-tab="background">배경</button>
            <button type="button" class="editor-tab" data-tab="widgets">위젯 설정</button>
          </div>
          <div class="editor-tab-body" id="tabBody"></div>
        </aside>
      </div>
    </div>
  `;

  const stage = container.querySelector('#stage');
  const dirtyIndicator = container.querySelector('#dirtyIndicator');

  applyBackground(stage.parentElement, state.background);

  function markDirty() {
    state.dirty = true;
    dirtyIndicator.textContent = '저장 안 됨';
  }

  function markClean() {
    state.dirty = false;
    dirtyIndicator.textContent = '';
  }

  function elementById(id) {
    return state.elements.find((el) => el.id === id);
  }

  function applyElementStyle(node, el) {
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    node.style.width = `${el.width}px`;
    node.style.height = `${el.height}px`;
    node.style.transform = `rotate(${el.rotation || 0}deg)`;
    node.style.opacity = el.opacity ?? 1;
    node.style.zIndex = el.zIndex ?? 0;
    node.style.display = el.visible === false ? 'none' : '';
  }

  function renderBody(node, el) {
    const body = node.querySelector('.ce-body');
    body.innerHTML = elementBodyHTML(el);
    const wrap = wrapperStyle(el);
    body.style.borderRadius = wrap.borderRadius;
    body.style.overflow = wrap.overflow;
    body.style.background = wrap.background;
    body.style.padding = wrap.padding;
    body.style.boxSizing = 'border-box';
    node.style.boxShadow = wrap.boxShadow;
  }

  function buildElementNode(el) {
    const node = document.createElement('div');
    node.className = 'canvas-element editor-element';
    node.dataset.id = el.id;
    applyElementStyle(node, el);
    node.innerHTML = `
      <div class="ce-body"></div>
      <div class="ce-handle ce-handle-nw" data-corner="nw"></div>
      <div class="ce-handle ce-handle-ne" data-corner="ne"></div>
      <div class="ce-handle ce-handle-sw" data-corner="sw"></div>
      <div class="ce-handle ce-handle-se" data-corner="se"></div>
      <div class="ce-rotate"></div>
    `;
    renderBody(node, el);

    node.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('ce-handle') || e.target.classList.contains('ce-rotate')) return;
      e.stopPropagation();
      selectElement(el.id);
      startDrag(e, node, el);
    });

    node.querySelectorAll('.ce-handle').forEach((handle) => {
      handle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        selectElement(el.id);
        startResize(e, node, el, handle.dataset.corner);
      });
    });

    node.querySelector('.ce-rotate').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      selectElement(el.id);
      startRotate(e, node, el);
    });

    return node;
  }

  function renderElements() {
    stage.innerHTML = '';
    for (const el of state.elements) {
      stage.appendChild(buildElementNode(el));
    }
    if (state.selectedId) {
      stage.querySelectorAll('.editor-element').forEach((n) => {
        n.classList.toggle('selected', n.dataset.id === state.selectedId);
      });
    }
  }

  function startDrag(e, node, el) {
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = el.x;
    const originY = el.y;
    let moved = false;

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
      el.x = originX + dx;
      el.y = originY + dy;
      applyElementStyle(node, el);
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved) markDirty();
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function startResize(e, node, el, corner) {
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { x: el.x, y: el.y, width: el.width, height: el.height };

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let { x, y, width, height } = origin;
      if (corner.includes('e')) width = Math.max(MIN_SIZE, origin.width + dx);
      if (corner.includes('s')) height = Math.max(MIN_SIZE, origin.height + dy);
      if (corner.includes('w')) {
        width = Math.max(MIN_SIZE, origin.width - dx);
        x = origin.x + (origin.width - width);
      }
      if (corner.includes('n')) {
        height = Math.max(MIN_SIZE, origin.height - dy);
        y = origin.y + (origin.height - height);
      }
      el.x = x;
      el.y = y;
      el.width = width;
      el.height = height;
      applyElementStyle(node, el);
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      markDirty();
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function startRotate(e, node, el) {
    const rect = node.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const originRotation = el.rotation || 0;

    function onMove(ev) {
      const angle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI);
      el.rotation = (((originRotation + (angle - startAngle)) % 360) + 360) % 360;
      applyElementStyle(node, el);
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      markDirty();
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function selectElement(id) {
    state.selectedId = id;
    stage.querySelectorAll('.editor-element').forEach((n) => {
      n.classList.toggle('selected', n.dataset.id === id);
    });
    setTab('widgets');
  }

  function deselect() {
    state.selectedId = null;
    stage.querySelectorAll('.editor-element').forEach((n) => n.classList.remove('selected'));
    renderTabBody();
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.target === stage) deselect();
  });

  function setTab(tab) {
    state.tab = tab;
    renderTabBody();
  }

  function renderTabBody() {
    container.querySelectorAll('.editor-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
    const body = container.querySelector('#tabBody');
    if (state.tab === 'basic') renderBasicTab(body);
    else if (state.tab === 'background') renderBackgroundTab(body);
    else renderWidgetsTab(body);
  }

  container.querySelectorAll('.editor-tab').forEach((btn) => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab));
  });

  function uploadStateField(onDone) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/gif,image/webp';
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > MAX_UPLOAD_BYTES) {
        showToast('이미지 용량은 3MB 이하만 가능합니다.', 'error');
        return;
      }
      try {
        const url = await uploadImage(file);
        onDone(url);
      } catch (err) {
        showToast(err.message || '업로드에 실패했습니다.', 'error');
      }
    });
    input.click();
  }

  function renderBasicTab(body) {
    body.innerHTML = `
      <h3>기본 설정</h3>
      <label>사이트 이름
        <input type="text" id="siteNameInput" maxlength="60" value="${escapeHtml(state.siteName)}" placeholder="탭 제목 및 공유될 이름">
      </label>
      <label>폰트
        <select id="fontSelect">
          ${Object.entries(FONT_PRESETS)
            .map(([key, font]) => `<option value="${key}" ${state.fontFamily === key ? 'selected' : ''}>${escapeHtml(font.label)}</option>`)
            .join('')}
        </select>
      </label>
      <label>파비콘
        <div class="editor-panel-actions">
          <button type="button" class="btn btn-ghost" id="faviconBtn">${state.faviconUrl ? '변경' : '업로드'}</button>
          ${state.faviconUrl ? `<button type="button" class="btn btn-ghost" id="faviconRemoveBtn">삭제</button>` : ''}
        </div>
        ${state.faviconUrl ? `<img class="editor-panel-preview" style="width:40px;height:40px;object-fit:cover" src="${escapeHtml(state.faviconUrl)}" alt="">` : ''}
      </label>
      <label>마우스 커서
        <div class="editor-panel-actions">
          <button type="button" class="btn btn-ghost" id="cursorBtn">${state.cursorUrl ? '변경' : '업로드'}</button>
          ${state.cursorUrl ? `<button type="button" class="btn btn-ghost" id="cursorRemoveBtn">삭제</button>` : ''}
        </div>
        ${state.cursorUrl ? `<img class="editor-panel-preview" style="width:40px;height:40px;object-fit:cover" src="${escapeHtml(state.cursorUrl)}" alt="">` : ''}
      </label>
      <hr>
      <p class="editor-panel-empty">아래 배너는 다른 사람이 "배너" 위젯에 내 핸들을 입력하면 자동으로 표시되는 이미지예요. 나중에 바꾸면 걸어둔 곳에도 자동으로 반영돼요.</p>
      <label>내 배너 이미지 (88×31 권장)
        <div class="editor-panel-actions">
          <button type="button" class="btn btn-ghost" id="bannerBtn">${state.bannerImage ? '변경' : '업로드'}</button>
          ${state.bannerImage ? `<button type="button" class="btn btn-ghost" id="bannerRemoveBtn">삭제</button>` : ''}
        </div>
        ${state.bannerImage ? `<img class="editor-panel-preview" style="width:88px;height:31px;object-fit:cover" src="${escapeHtml(state.bannerImage)}" alt="">` : ''}
      </label>
      <label>배너 제목 (이미지가 없을 때 대신 표시)
        <input type="text" id="bannerTitleInput" maxlength="60" value="${escapeHtml(state.bannerTitle)}">
      </label>
    `;

    body.querySelector('#siteNameInput').addEventListener('input', (e) => {
      state.siteName = e.target.value;
      markDirty();
    });
    body.querySelector('#bannerTitleInput').addEventListener('input', (e) => {
      state.bannerTitle = e.target.value;
      markDirty();
    });
    body.querySelector('#fontSelect').addEventListener('change', (e) => {
      state.fontFamily = e.target.value;
      applyFont(state.fontFamily);
      markDirty();
    });
    body.querySelector('#faviconBtn').addEventListener('click', () =>
      uploadStateField((url) => {
        state.faviconUrl = url;
        markDirty();
        renderTabBody();
      })
    );
    body.querySelector('#cursorBtn').addEventListener('click', () =>
      uploadStateField((url) => {
        state.cursorUrl = url;
        markDirty();
        renderTabBody();
      })
    );
    body.querySelector('#bannerBtn').addEventListener('click', () =>
      uploadStateField((url) => {
        state.bannerImage = url;
        markDirty();
        renderTabBody();
      })
    );
    const faviconRemoveBtn = body.querySelector('#faviconRemoveBtn');
    if (faviconRemoveBtn) faviconRemoveBtn.addEventListener('click', () => { state.faviconUrl = ''; markDirty(); renderTabBody(); });
    const cursorRemoveBtn = body.querySelector('#cursorRemoveBtn');
    if (cursorRemoveBtn) cursorRemoveBtn.addEventListener('click', () => { state.cursorUrl = ''; markDirty(); renderTabBody(); });
    const bannerRemoveBtn = body.querySelector('#bannerRemoveBtn');
    if (bannerRemoveBtn) bannerRemoveBtn.addEventListener('click', () => { state.bannerImage = ''; markDirty(); renderTabBody(); });
  }

  function renderBackgroundTab(body) {
    const bg = state.background;
    const COLOR_LABELS = { bg: '배경색', surface: '박스색', primary: '포인트색', text: '기본 글자', muted: '서브 글자' };

    body.innerHTML = `
      <h3>테마</h3>
      <div class="theme-swatch-grid" id="themeSwatchGrid">
        ${Object.entries(THEME_PRESETS)
          .map(
            ([key, preset]) => `
          <button type="button" class="theme-swatch ${key === state.theme ? 'active' : ''}" data-theme="${key}"
            style="background:${preset.bg};color:${preset.text};border-color:${preset.primary}">
            ${escapeHtml(preset.label)}
          </button>
        `
          )
          .join('')}
      </div>
      <div class="theme-color-fields" id="themeColorFields"></div>
      <hr>
      <h3>배경</h3>
      <label>종류
        <select id="bgType">
          <option value="color" ${bg.type === 'color' ? 'selected' : ''}>단색</option>
          <option value="gradient" ${bg.type === 'gradient' ? 'selected' : ''}>그라데이션</option>
          <option value="image" ${bg.type === 'image' ? 'selected' : ''}>이미지</option>
        </select>
      </label>
      <div id="bgFields"></div>
      <hr>
      <h3>커스텀 CSS</h3>
      <p class="editor-panel-empty">내 개인홈을 볼 때만 적용돼요.</p>
      <textarea id="customCssInput" rows="8" spellcheck="false" placeholder=".profile-bio { color: hotpink; }">${escapeHtml(state.customCss)}</textarea>
    `;

    function renderColorFields() {
      const colors = resolveThemeColors(state.theme, state.themeColors);
      body.querySelector('#themeColorFields').innerHTML = Object.keys(COLOR_LABELS)
        .map(
          (key) => `
        <label class="theme-color-field">${COLOR_LABELS[key]}
          <input type="color" data-color="${key}" value="${colors[key]}">
        </label>
      `
        )
        .join('');

      body.querySelectorAll('[data-color]').forEach((input) => {
        input.addEventListener('input', () => {
          state.themeColors = { ...state.themeColors, [input.dataset.color]: input.value };
          applyTheme(state.theme, state.themeColors);
          markDirty();
        });
      });
    }
    renderColorFields();
    applyTheme(state.theme, state.themeColors);

    body.querySelectorAll('[data-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.theme = btn.dataset.theme;
        state.themeColors = {};
        body.querySelectorAll('[data-theme]').forEach((b) => b.classList.toggle('active', b === btn));
        renderColorFields();
        applyTheme(state.theme, state.themeColors);
        markDirty();
      });
    });

    function renderBgFields() {
      const fields = body.querySelector('#bgFields');
      if (bg.type === 'color') {
        const value = /^#[0-9a-fA-F]{6}$/.test(bg.value) ? bg.value : '#f5f5f5';
        fields.innerHTML = `<label>색상<input type="color" id="bgColor" value="${value}"></label>`;
        fields.querySelector('#bgColor').addEventListener('input', (e) => {
          bg.value = e.target.value;
          applyBackground(stage.parentElement, bg);
          markDirty();
        });
      } else if (bg.type === 'gradient') {
        fields.innerHTML = `
          <label>CSS 그라데이션
            <input type="text" id="bgGradient" value="${escapeHtml(bg.value || 'linear-gradient(135deg,#a8c0ff,#fbc2eb)')}" placeholder="linear-gradient(...)">
          </label>
        `;
        fields.querySelector('#bgGradient').addEventListener('input', (e) => {
          bg.value = e.target.value;
          applyBackground(stage.parentElement, bg);
          markDirty();
        });
      } else if (bg.type === 'image') {
        fields.innerHTML = `
          <button type="button" class="btn btn-ghost" id="bgUploadBtn">${bg.value ? '이미지 바꾸기' : '이미지 업로드'}</button>
          ${bg.value ? `<img class="editor-panel-preview" src="${escapeHtml(bg.value)}" alt="">` : ''}
          <label>맞춤
            <select id="bgSize">
              <option value="cover" ${bg.size === 'cover' || !bg.size ? 'selected' : ''}>화면 채우기</option>
              <option value="contain" ${bg.size === 'contain' ? 'selected' : ''}>전체 보이기</option>
              <option value="repeat" ${bg.size === 'repeat' ? 'selected' : ''}>반복</option>
            </select>
          </label>
        `;
        fields.querySelector('#bgUploadBtn').addEventListener('click', () => {
          uploadStateField((url) => {
            bg.value = url;
            applyBackground(stage.parentElement, bg);
            markDirty();
            renderBgFields();
          });
        });
        fields.querySelector('#bgSize').addEventListener('change', (e) => {
          bg.size = e.target.value === 'repeat' ? 'auto' : e.target.value;
          bg.repeat = e.target.value === 'repeat' ? 'repeat' : 'no-repeat';
          applyBackground(stage.parentElement, bg);
          markDirty();
        });
      }
    }

    renderBgFields();
    body.querySelector('#bgType').addEventListener('change', (e) => {
      bg.type = e.target.value;
      if (bg.type === 'color' && !/^#[0-9a-fA-F]{6}$/.test(bg.value)) bg.value = '#f5f5f5';
      renderBgFields();
      applyBackground(stage.parentElement, bg);
      markDirty();
    });

    body.querySelector('#customCssInput').addEventListener('input', (e) => {
      state.customCss = e.target.value;
      applyCustomCss(state.customCss);
      markDirty();
    });
  }

  function renderWidgetsTab(body) {
    const el = elementById(state.selectedId);
    if (!el) {
      body.innerHTML = `
        <h3>요소 추가</h3>
        <div class="editor-add-grid">
          <button type="button" class="btn btn-ghost" data-add="text">+텍스트</button>
          <button type="button" class="btn btn-ghost" data-add="image">+이미지</button>
          <button type="button" class="btn btn-ghost" data-add="box">+박스</button>
          <button type="button" class="btn btn-ghost" data-add="button">+버튼</button>
        </div>
        <label>위젯 추가
          <select id="widgetSelect">
            <option value="">선택해주세요</option>
            ${Object.entries(WIDGETS)
              .map(([key, def]) => `<option value="${key}">${escapeHtml(def.label)}</option>`)
              .join('')}
          </select>
        </label>
        <p class="editor-panel-empty">캔버스에서 요소를 클릭하면 여기서 세부 설정을 편집할 수 있어요.</p>
      `;
      body.querySelectorAll('[data-add]').forEach((btn) => {
        btn.addEventListener('click', () => addElement(btn.dataset.add));
      });
      body.querySelector('#widgetSelect').addEventListener('change', (e) => {
        const kind = e.target.value;
        if (!kind) return;
        addElement('widget', kind);
        e.target.value = '';
      });
      return;
    }

    body.innerHTML = `
      <button type="button" class="btn btn-ghost" id="widgetsBackBtn">← 목록으로</button>
      <div class="editor-panel-actions">
        <button type="button" class="btn btn-ghost" data-act="front">앞으로</button>
        <button type="button" class="btn btn-ghost" data-act="back">뒤로</button>
        <button type="button" class="btn btn-ghost" data-act="duplicate">복제</button>
        <button type="button" class="btn btn-ghost" data-act="hide">${el.visible === false ? '보이기' : '숨기기'}</button>
        <button type="button" class="btn btn-ghost" data-act="delete">삭제</button>
      </div>
      <label>투명도
        <input type="range" min="0" max="1" step="0.05" value="${el.opacity ?? 1}" data-field="opacity">
      </label>
      <label class="editor-inline-check">
        <input type="checkbox" ${el.style?.rounded ? 'checked' : ''} data-field="style.rounded"> 모서리 둥글게
      </label>
      <label class="editor-inline-check">
        <input type="checkbox" ${el.style?.blockBg ? 'checked' : ''} data-field="style.blockBg"> 배경 블록 사용
      </label>
      <label>블록 색상
        <input type="color" value="${safeColor(el.style?.blockColor, '#ffffff')}" data-field="style.blockColor">
      </label>
      <label class="editor-inline-check">
        <input type="checkbox" ${el.style?.shadow ? 'checked' : ''} data-field="style.shadow"> 그림자 효과
      </label>
      ${elementFieldsHTML(el)}
    `;

    body.querySelector('#widgetsBackBtn').addEventListener('click', deselect);
    body.querySelector('[data-act="front"]').addEventListener('click', () => reorder(el, 'front'));
    body.querySelector('[data-act="back"]').addEventListener('click', () => reorder(el, 'back'));
    body.querySelector('[data-act="duplicate"]').addEventListener('click', () => duplicateElement(el));
    body.querySelector('[data-act="hide"]').addEventListener('click', () => toggleVisible(el));
    body.querySelector('[data-act="delete"]').addEventListener('click', () => deleteElement(el));

    body.querySelectorAll('[data-field]').forEach((input) => {
      input.addEventListener('input', () => updateField(el, input));
    });
    body.querySelectorAll('[data-upload]').forEach((btn) => {
      btn.addEventListener('click', () => triggerImageUpload(el, btn.dataset.target || 'content.src'));
    });
    body.querySelectorAll('[data-upload-audio]').forEach((btn) => {
      btn.addEventListener('click', () => triggerAudioUpload(el));
    });
    if (el.type === 'widget' && el.content?.widgetKind === 'gallery') {
      renderGalleryFields(el);
    }
  }

  function elementFieldsHTML(el) {
    const content = el.content || {};
    const style = el.style || {};
    if (el.type === 'text') {
      return `
        <label>내용
          <textarea data-field="content.text" rows="3">${escapeHtml(content.text || '')}</textarea>
        </label>
        <label>글자 크기
          <input type="number" min="8" max="120" value="${Number(style.fontSize) || 16}" data-field="style.fontSize">
        </label>
        <label>색상
          <input type="color" value="${/^#[0-9a-fA-F]{6}$/.test(style.color) ? style.color : '#222222'}" data-field="style.color">
        </label>
        <label class="editor-inline-check">
          <input type="checkbox" ${style.bold ? 'checked' : ''} data-field="style.bold"> 굵게
        </label>
        <label>정렬
          <select data-field="style.align">
            <option value="left" ${style.align === 'left' || !style.align ? 'selected' : ''}>왼쪽</option>
            <option value="center" ${style.align === 'center' ? 'selected' : ''}>가운데</option>
            <option value="right" ${style.align === 'right' ? 'selected' : ''}>오른쪽</option>
          </select>
        </label>
      `;
    }
    if (el.type === 'image') {
      return `
        <button type="button" class="btn btn-ghost" data-upload="1">${content.src ? '이미지 바꾸기' : '이미지 업로드'}</button>
        ${content.src ? `<img class="editor-panel-preview" src="${escapeHtml(content.src)}" alt="">` : ''}
      `;
    }
    if (el.type === 'box') {
      return `
        <label>배경색
          <input type="color" value="${/^#[0-9a-fA-F]{6}$/.test(style.background) ? style.background : '#ffffff'}" data-field="style.background">
        </label>
        <label>모서리 둥글기
          <input type="number" min="0" max="200" value="${Number(style.borderRadius ?? 8)}" data-field="style.borderRadius">
        </label>
        <label>테두리 색
          <input type="color" value="${/^#[0-9a-fA-F]{6}$/.test(style.borderColor) ? style.borderColor : '#e5e5e2'}" data-field="style.borderColor">
        </label>
        <label>테두리 두께
          <input type="number" min="0" max="20" value="${Number(style.borderWidth ?? 1)}" data-field="style.borderWidth">
        </label>
      `;
    }
    if (el.type === 'button') {
      return `
        <label>버튼 텍스트
          <input type="text" value="${escapeHtml(content.label || '')}" data-field="content.label">
        </label>
        <label>링크 주소
          <input type="text" value="${escapeHtml(content.href || '')}" data-field="content.href" placeholder="https://">
        </label>
        <label>배경색
          <input type="color" value="${/^#[0-9a-fA-F]{6}$/.test(style.background) ? style.background : '#5b5bf0'}" data-field="style.background">
        </label>
        <label>글자색
          <input type="color" value="${/^#[0-9a-fA-F]{6}$/.test(style.color) ? style.color : '#ffffff'}" data-field="style.color">
        </label>
      `;
    }
    if (el.type === 'widget') {
      const def = WIDGETS[content.widgetKind];
      return def ? def.fields(content, style) : '';
    }
    return '';
  }

  function renderGalleryFields(el) {
    const images = Array.isArray(el.content.images) ? el.content.images : [];
    const wrap = container.querySelector('#galleryFields');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="board-editor-images">
        ${images
          .map(
            (src, i) =>
              `<div class="board-editor-image"><img src="${escapeHtml(src)}" alt=""><button type="button" data-remove-gallery="${i}">✕</button></div>`
          )
          .join('')}
      </div>
      <button type="button" class="btn btn-ghost" data-add-gallery="1">이미지 추가</button>
    `;
    wrap.querySelectorAll('[data-remove-gallery]').forEach((btn) => {
      btn.addEventListener('click', () => {
        images.splice(Number(btn.dataset.removeGallery), 1);
        el.content = { ...el.content, images };
        renderGalleryFields(el);
        refreshElementBody(el);
        markDirty();
      });
    });
    wrap.querySelector('[data-add-gallery]').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/gif,image/webp';
      input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;
        if (file.size > MAX_UPLOAD_BYTES) {
          showToast('이미지 용량은 3MB 이하만 가능합니다.', 'error');
          return;
        }
        try {
          const url = await uploadImage(file);
          images.push(url);
          el.content = { ...el.content, images };
          renderGalleryFields(el);
          refreshElementBody(el);
          markDirty();
        } catch (err) {
          showToast(err.message || '업로드에 실패했습니다.', 'error');
        }
      });
      input.click();
    });
  }

  function refreshElementBody(el) {
    const node = stage.querySelector(`.editor-element[data-id="${el.id}"]`);
    if (node) renderBody(node, el);
  }

  function updateField(el, input) {
    const path = input.dataset.field;
    const value = input.type === 'checkbox' ? input.checked
      : input.type === 'number' ? Number(input.value)
      : input.type === 'range' ? Number(input.value)
      : input.value;

    if (path === 'opacity') {
      el.opacity = value;
    } else {
      const [group, key] = path.split('.');
      el[group] = { ...(el[group] || {}), [key]: value };
    }

    const node = stage.querySelector(`.editor-element[data-id="${el.id}"]`);
    applyElementStyle(node, el);
    renderBody(node, el);
    markDirty();
  }

  async function triggerImageUpload(el, targetPath = 'content.src') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/gif,image/webp';
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > MAX_UPLOAD_BYTES) {
        showToast('이미지 용량은 3MB 이하만 가능합니다.', 'error');
        return;
      }
      try {
        const url = await uploadImage(file);
        const [group, key] = targetPath.split('.');
        el[group] = { ...(el[group] || {}), [key]: url };
        refreshElementBody(el);
        renderTabBody();
        markDirty();
      } catch (err) {
        showToast(err.message || '업로드에 실패했습니다.', 'error');
      }
    });
    input.click();
  }

  async function triggerAudioUpload(el) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/mpeg,audio/ogg,audio/wav,audio/mp4,.mp3,.ogg,.wav,.m4a';
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > MAX_UPLOAD_BYTES) {
        showToast('오디오 용량은 3MB 이하만 가능합니다.', 'error');
        return;
      }
      try {
        const url = await uploadImage(file);
        el.content = { ...(el.content || {}), audioUrl: url };
        refreshElementBody(el);
        renderTabBody();
        markDirty();
      } catch (err) {
        showToast(err.message || '업로드에 실패했습니다.', 'error');
      }
    });
    input.click();
  }

  function reorder(el, direction) {
    const zs = state.elements.map((e) => e.zIndex);
    el.zIndex = direction === 'front' ? Math.max(0, ...zs) + 1 : Math.min(0, ...zs) - 1;
    renderElements();
    markDirty();
  }

  function toggleVisible(el) {
    el.visible = el.visible === false;
    renderElements();
    renderTabBody();
    markDirty();
  }

  function duplicateElement(el) {
    const copy = {
      ...el,
      id: genId(),
      x: el.x + 20,
      y: el.y + 20,
      content: structuredClone(el.content),
      style: structuredClone(el.style)
    };
    state.elements.push(copy);
    renderElements();
    selectElement(copy.id);
    markDirty();
  }

  function deleteElement(el) {
    state.elements = state.elements.filter((e) => e.id !== el.id);
    state.selectedId = null;
    renderElements();
    renderTabBody();
    markDirty();
  }

  function addElement(type, widgetKind) {
    let width, height, content, style;
    if (type === 'widget') {
      const def = WIDGETS[widgetKind];
      if (!def) return;
      width = def.width;
      height = def.height;
      content = { ...structuredClone(def.content), widgetKind };
      if (widgetKind === 'guestbook') content.href = guestbookHref || '';
      style = structuredClone(def.style);
    } else {
      const defaults = ELEMENT_DEFAULTS[type];
      if (!defaults) return;
      ({ width, height } = defaults);
      content = { ...defaults.content };
      style = { ...defaults.style };
    }

    const maxZ = Math.max(0, ...state.elements.map((e) => e.zIndex));
    const el = {
      id: genId(),
      type,
      x: 60 + Math.random() * 60,
      y: 60 + Math.random() * 60,
      width,
      height,
      rotation: 0,
      zIndex: maxZ + 1,
      visible: true,
      opacity: 1,
      content,
      style
    };
    state.elements.push(el);
    renderElements();
    selectElement(el.id);
    markDirty();
  }

  container.querySelector('#saveBtn').addEventListener('click', async () => {
    const btn = container.querySelector('#saveBtn');
    btn.disabled = true;
    btn.textContent = '저장 중...';
    try {
      await Promise.all([
        updateProfile({
          background: state.background,
          theme: state.theme,
          themeColors: state.themeColors,
          customCss: state.customCss,
          siteName: state.siteName,
          faviconUrl: state.faviconUrl,
          cursorUrl: state.cursorUrl,
          bannerImage: state.bannerImage,
          bannerTitle: state.bannerTitle,
          fontFamily: state.fontFamily
        }),
        savePageElements(pageId, state.elements)
      ]);
      markClean();
      showToast('저장했어요.', 'success');
    } catch (err) {
      showToast(err.message || '저장에 실패했습니다.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '저장';
    }
  });

  container.querySelector('#exitBtn').addEventListener('click', () => {
    if (state.dirty && !window.confirm('저장하지 않은 변경사항이 있어요. 저장하지 않고 나갈까요?')) {
      return;
    }
    onExit(state.elements, {
      background: state.background,
      theme: state.theme,
      themeColors: state.themeColors,
      customCss: state.customCss,
      siteName: state.siteName,
      faviconUrl: state.faviconUrl,
      cursorUrl: state.cursorUrl,
      bannerImage: state.bannerImage,
      bannerTitle: state.bannerTitle,
      fontFamily: state.fontFamily
    });
  });

  renderElements();
  setTab('widgets');
}
