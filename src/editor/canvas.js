import { saveCanvas, uploadImage } from '../api/client.js';
import { showToast } from '../ui/toast.js';

const MIN_SIZE = 20;
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 1400;
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

function genId() {
  return crypto.randomUUID ? crypto.randomUUID() : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(href) {
  const value = String(href || '').trim();
  return /^(https?:|mailto:|tel:)/i.test(value) ? value : '';
}

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
    default:
      return '';
  }
}

export function renderStaticCanvas(mount, { background, elements }) {
  applyBackground(mount, background);
  mount.innerHTML = '';
  const sorted = [...(elements || [])].sort((a, b) => a.zIndex - b.zIndex);
  for (const el of sorted) {
    if (el.visible === false) continue;
    const node = document.createElement('div');
    node.className = 'canvas-element';
    Object.assign(node.style, {
      left: `${el.x}px`,
      top: `${el.y}px`,
      width: `${el.width}px`,
      height: `${el.height}px`,
      transform: `rotate(${el.rotation || 0}deg)`,
      opacity: el.opacity ?? 1,
      zIndex: el.zIndex ?? 0
    });
    node.innerHTML = elementBodyHTML(el);
    mount.appendChild(node);
  }
}

const ELEMENT_DEFAULTS = {
  text: { width: 220, height: 60, content: { text: '텍스트를 입력하세요' }, style: { fontSize: 18, color: '#222222' } },
  image: { width: 240, height: 180, content: {}, style: {} },
  box: { width: 240, height: 160, content: {}, style: { background: '#ffffff', borderRadius: 12, borderColor: '#e5e5e2', borderWidth: 1 } },
  button: { width: 160, height: 48, content: { label: '버튼', href: '' }, style: { background: '#5b5bf0', color: '#ffffff' } }
};

export function mountEditor({ container, background, elements: initialElements, onExit }) {
  const state = {
    background: background ? { ...background } : { type: 'color', value: '#f5f5f5' },
    elements: (initialElements || []).map((el) => ({ ...el, id: el.id || genId() })),
    selectedId: null,
    dirty: false
  };

  container.innerHTML = `
    <div class="editor-shell">
      <div class="editor-toolbar">
        <div class="editor-toolbar-group">
          <button class="btn btn-ghost" data-add="text">+텍스트</button>
          <button class="btn btn-ghost" data-add="image">+이미지</button>
          <button class="btn btn-ghost" data-add="box">+박스</button>
          <button class="btn btn-ghost" data-add="button">+버튼</button>
          <button class="btn btn-ghost" id="bgBtn">배경</button>
        </div>
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
          <p class="editor-panel-empty">요소를 선택하면 여기서 편집할 수 있어요.</p>
        </aside>
      </div>
    </div>
  `;

  const stage = container.querySelector('#stage');
  const panel = container.querySelector('#panel');
  const dirtyIndicator = container.querySelector('#dirtyIndicator');

  applyBackground(stage, state.background);

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
    node.querySelector('.ce-body').innerHTML = elementBodyHTML(el);
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
    renderPanel();
  }

  function deselect() {
    state.selectedId = null;
    stage.querySelectorAll('.editor-element').forEach((n) => n.classList.remove('selected'));
    renderPanel();
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.target === stage) deselect();
  });

  function renderPanel() {
    const el = elementById(state.selectedId);
    if (!el) {
      panel.innerHTML = `<p class="editor-panel-empty">요소를 선택하면 여기서 편집할 수 있어요.</p>`;
      return;
    }
    panel.innerHTML = `
      <div class="editor-panel-actions">
        <button class="btn btn-ghost" data-act="front">앞으로</button>
        <button class="btn btn-ghost" data-act="back">뒤로</button>
        <button class="btn btn-ghost" data-act="duplicate">복제</button>
        <button class="btn btn-ghost" data-act="hide">${el.visible === false ? '보이기' : '숨기기'}</button>
        <button class="btn btn-ghost" data-act="delete">삭제</button>
      </div>
      <label>투명도
        <input type="range" min="0" max="1" step="0.05" value="${el.opacity ?? 1}" data-field="opacity">
      </label>
      ${elementFieldsHTML(el)}
    `;

    panel.querySelector('[data-act="front"]').addEventListener('click', () => reorder(el, 'front'));
    panel.querySelector('[data-act="back"]').addEventListener('click', () => reorder(el, 'back'));
    panel.querySelector('[data-act="duplicate"]').addEventListener('click', () => duplicateElement(el));
    panel.querySelector('[data-act="hide"]').addEventListener('click', () => toggleVisible(el));
    panel.querySelector('[data-act="delete"]').addEventListener('click', () => deleteElement(el));

    panel.querySelectorAll('[data-field]').forEach((input) => {
      input.addEventListener('input', () => updateField(el, input));
    });
    panel.querySelectorAll('[data-upload]').forEach((btn) => {
      btn.addEventListener('click', () => triggerImageUpload(el));
    });
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
        <button class="btn btn-ghost" data-upload="1">${content.src ? '이미지 바꾸기' : '이미지 업로드'}</button>
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
    return '';
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

  async function triggerImageUpload(el) {
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
        el.content = { ...(el.content || {}), src: url };
        const node = stage.querySelector(`.editor-element[data-id="${el.id}"]`);
        renderBody(node, el);
        renderPanel();
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
    markDirty();
  }

  function duplicateElement(el) {
    const copy = { ...el, id: genId(), x: el.x + 20, y: el.y + 20 };
    state.elements.push(copy);
    renderElements();
    selectElement(copy.id);
    markDirty();
  }

  function deleteElement(el) {
    state.elements = state.elements.filter((e) => e.id !== el.id);
    state.selectedId = null;
    renderElements();
    renderPanel();
    markDirty();
  }

  function addElement(type) {
    const defaults = ELEMENT_DEFAULTS[type];
    if (!defaults) return;
    const maxZ = Math.max(0, ...state.elements.map((e) => e.zIndex));
    const el = {
      id: genId(),
      type,
      x: 60 + Math.random() * 60,
      y: 60 + Math.random() * 60,
      rotation: 0,
      zIndex: maxZ + 1,
      visible: true,
      opacity: 1,
      ...defaults,
      content: { ...defaults.content },
      style: { ...defaults.style }
    };
    state.elements.push(el);
    renderElements();
    selectElement(el.id);
    markDirty();
  }

  container.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => addElement(btn.dataset.add));
  });

  function openBackgroundPanel() {
    const bg = state.background;
    panel.innerHTML = `
      <h3>배경 설정</h3>
      <label>종류
        <select id="bgType">
          <option value="color" ${bg.type === 'color' ? 'selected' : ''}>단색</option>
          <option value="gradient" ${bg.type === 'gradient' ? 'selected' : ''}>그라데이션</option>
          <option value="image" ${bg.type === 'image' ? 'selected' : ''}>이미지</option>
        </select>
      </label>
      <div id="bgFields"></div>
      <button class="btn btn-ghost" id="bgBackBtn">← 요소 편집으로</button>
    `;

    function renderBgFields() {
      const fields = panel.querySelector('#bgFields');
      if (bg.type === 'color') {
        const value = /^#[0-9a-fA-F]{6}$/.test(bg.value) ? bg.value : '#f5f5f5';
        fields.innerHTML = `<label>색상<input type="color" id="bgColor" value="${value}"></label>`;
        fields.querySelector('#bgColor').addEventListener('input', (e) => {
          bg.value = e.target.value;
          applyBackground(stage, bg);
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
          applyBackground(stage, bg);
          markDirty();
        });
      } else if (bg.type === 'image') {
        fields.innerHTML = `
          <button class="btn btn-ghost" id="bgUploadBtn">${bg.value ? '이미지 바꾸기' : '이미지 업로드'}</button>
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
              bg.value = await uploadImage(file);
              applyBackground(stage, bg);
              markDirty();
              renderBgFields();
            } catch (err) {
              showToast(err.message || '업로드에 실패했습니다.', 'error');
            }
          });
          input.click();
        });
        fields.querySelector('#bgSize').addEventListener('change', (e) => {
          bg.size = e.target.value === 'repeat' ? 'auto' : e.target.value;
          bg.repeat = e.target.value === 'repeat' ? 'repeat' : 'no-repeat';
          applyBackground(stage, bg);
          markDirty();
        });
      }
    }

    renderBgFields();
    panel.querySelector('#bgType').addEventListener('change', (e) => {
      bg.type = e.target.value;
      if (bg.type === 'color' && !/^#[0-9a-fA-F]{6}$/.test(bg.value)) bg.value = '#f5f5f5';
      renderBgFields();
      applyBackground(stage, bg);
      markDirty();
    });
    panel.querySelector('#bgBackBtn').addEventListener('click', renderPanel);
  }

  container.querySelector('#bgBtn').addEventListener('click', openBackgroundPanel);

  container.querySelector('#saveBtn').addEventListener('click', async () => {
    const btn = container.querySelector('#saveBtn');
    btn.disabled = true;
    btn.textContent = '저장 중...';
    try {
      await saveCanvas({ background: state.background, elements: state.elements });
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
    onExit(state.elements, state.background);
  });

  renderElements();
}
