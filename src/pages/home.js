import {
  getPublicProfile,
  signOutUser,
  getPages,
  getPageElements,
  createPage,
  renamePage,
  reorderPages,
  deletePage,
  updateProfile,
  uploadImage
} from '../api/client.js';
import { renderStaticCanvas, mountEditor } from '../editor/canvas.js';
import { renderBoard } from './board.js';
import { renderGuestbook } from './guestbook.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml } from '../ui/escape.js';
import { applyCustomCss } from '../ui/customCss.js';
import { THEME_PRESETS, applyTheme, resolveThemeColors } from '../ui/theme.js';

const KIND_LABEL = { canvas: '자유 페이지', board: '게시판', guestbook: '방명록' };

export async function renderHome(container, { username, pageSlug }) {
  container.innerHTML = `<div class="loading">불러오는 중...</div>`;

  let profileData;
  let pagesData;
  try {
    [profileData, pagesData] = await Promise.all([getPublicProfile(username), getPages(username)]);
  } catch (err) {
    if (err.status === 404) {
      container.innerHTML = `
        <section class="empty-state">
          <h1>@${username}</h1>
          <p>존재하지 않는 핸들입니다.</p>
          <a class="btn btn-ghost" data-link href="/">홈으로</a>
        </section>
      `;
      return;
    }
    if (err.status === 403) {
      container.innerHTML = `
        <section class="empty-state">
          <h1>@${username}</h1>
          <p>비공개로 설정된 개인홈입니다.</p>
          <a class="btn btn-ghost" data-link href="/">홈으로</a>
        </section>
      `;
      return;
    }
    console.error('개인홈을 불러오지 못했습니다.', err);
    container.innerHTML = `
      <section class="empty-state">
        <h1>연결 오류</h1>
        <p>서버에 연결하지 못했습니다. 새로고침 해주세요.</p>
        <a class="btn btn-ghost" data-link href="/">홈으로</a>
      </section>
    `;
    return;
  }

  const { profile } = profileData;
  const home = profileData.home;
  const isOwner = pagesData.isOwner;
  let pages = pagesData.pages;

  let repositioningHeader = false;
  let headerDragPosition = null;
  let headerDragCleanup = null;

  function findPage() {
    return (pageSlug ? pages.find((p) => p.slug === pageSlug) : null) || pages.find((p) => p.isDefault) || pages[0];
  }

  async function refreshPages() {
    const res = await getPages(username);
    pages = res.pages;
  }

  function renderMenu(activePage) {
    return `
      <nav class="home-menu">
        ${pages
          .map(
            (p) => `
          <a class="home-menu-item ${p.id === activePage.id ? 'active' : ''}" data-link
             href="/@${username}${p.isDefault ? '' : '/p/' + p.slug}">${escapeHtml(p.name)}</a>
        `
          )
          .join('')}
        ${isOwner ? `<button type="button" class="home-menu-manage" id="managePagesBtn">✎</button>` : ''}
      </nav>
    `;
  }

  async function renderShell() {
    const page = findPage();
    if (!page) {
      container.innerHTML = `<section class="empty-state"><h1>페이지가 없어요.</h1></section>`;
      return;
    }

    applyCustomCss(home.customCss || '');
    applyTheme(home.theme, home.themeColors);

    container.innerHTML = `
      <section class="home-view">
        <header class="home-topbar">
          <span>@${profile.username}</span>
          ${
            isOwner
              ? `
            <div class="home-topbar-actions">
              ${page.kind === 'canvas' ? `<button class="btn btn-ghost" id="editModeBtn">꾸미기 모드</button>` : ''}
              <button class="btn btn-ghost" id="themeBtn">테마</button>
              <button class="btn btn-ghost" id="customCssBtn">CSS 편집</button>
              <button class="btn btn-ghost" id="logoutBtn">로그아웃</button>
            </div>
          `
              : ''
          }
        </header>

        ${
          page.isDefault
            ? `
          <div class="home-header">
            ${
              home.headerImage
                ? `<img class="home-header-img" id="headerImg" src="${escapeHtml(home.headerImage)}" alt="" draggable="false"
                    style="object-position:${(home.headerPosition?.x ?? 50)}% ${(home.headerPosition?.y ?? 50)}%">`
                : `<div class="home-header-placeholder">${isOwner ? '헤더 이미지를 추가해보세요' : ''}</div>`
            }
            ${
              isOwner
                ? `
              <div class="home-header-actions">
                <button type="button" class="btn btn-ghost" id="headerImageBtn">${home.headerImage ? '이미지 변경' : '이미지 추가'}</button>
                ${home.headerImage ? `<button type="button" class="btn btn-ghost" id="headerRepositionBtn">위치 조정</button>` : ''}
                ${home.headerImage ? `<button type="button" class="btn btn-ghost" id="headerImageRemoveBtn">삭제</button>` : ''}
              </div>
            `
                : ''
            }
          </div>
        `
            : ''
        }

        ${renderMenu(page)}
        <div id="pageContent"></div>
      </section>
    `;

    if (isOwner) {
      container.querySelector('#logoutBtn').addEventListener('click', async () => {
        await signOutUser();
        window.location.assign('/');
      });
      container.querySelector('#managePagesBtn').addEventListener('click', openPagesManager);
      container.querySelector('#customCssBtn').addEventListener('click', openCustomCssEditor);
      container.querySelector('#themeBtn').addEventListener('click', openThemeEditor);
      const editBtn = container.querySelector('#editModeBtn');
      if (editBtn) editBtn.addEventListener('click', () => enterEditMode(page));

      const headerBtn = container.querySelector('#headerImageBtn');
      if (headerBtn) headerBtn.addEventListener('click', pickHeaderImage);
      const headerRepositionBtn = container.querySelector('#headerRepositionBtn');
      if (headerRepositionBtn) headerRepositionBtn.addEventListener('click', toggleHeaderReposition);
      const headerRemoveBtn = container.querySelector('#headerImageRemoveBtn');
      if (headerRemoveBtn) {
        headerRemoveBtn.addEventListener('click', async () => {
          try {
            await updateProfile({ headerImage: '' });
            home.headerImage = '';
            renderShell();
          } catch (err) {
            showToast(err.message || '삭제에 실패했습니다.', 'error');
          }
        });
      }
    }

    const content = container.querySelector('#pageContent');

    if (page.kind === 'canvas') {
      let elementsData;
      try {
        elementsData = await getPageElements(username, page.isDefault ? undefined : page.slug);
      } catch (err) {
        content.innerHTML = `<p class="editor-panel-empty">페이지를 불러오지 못했습니다.</p>`;
        return;
      }
      content.innerHTML = `
        <div class="canvas-scroll">
          <div class="canvas-stage" id="canvasStage" style="width:900px;height:1400px"></div>
        </div>
      `;
      renderStaticCanvas(content.querySelector('#canvasStage'), {
        background: home.background,
        elements: elementsData.elements
      });
    } else if (page.kind === 'board') {
      renderBoard(content, { username, page, isOwner });
    } else if (page.kind === 'guestbook') {
      renderGuestbook(content, { username, isOwner });
    }
  }

  function pickHeaderImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/gif,image/webp';
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) {
        showToast('이미지 용량은 3MB 이하만 가능합니다.', 'error');
        return;
      }
      try {
        const url = await uploadImage(file);
        await updateProfile({ headerImage: url });
        home.headerImage = url;
        renderShell();
      } catch (err) {
        showToast(err.message || '업로드에 실패했습니다.', 'error');
      }
    });
    input.click();
  }

  function toggleHeaderReposition() {
    const img = container.querySelector('#headerImg');
    const btn = container.querySelector('#headerRepositionBtn');
    if (!img || !btn) return;

    if (!repositioningHeader) {
      repositioningHeader = true;
      headerDragPosition = { x: home.headerPosition?.x ?? 50, y: home.headerPosition?.y ?? 50 };
      btn.textContent = '위치 저장';
      img.style.cursor = 'grab';
      showToast('이미지를 드래그해서 위치를 맞춘 뒤 "위치 저장"을 눌러주세요.', 'success');

      let dragging = false;
      const onDown = (e) => {
        dragging = true;
        img.style.cursor = 'grabbing';
        e.preventDefault();
      };
      const onMove = (e) => {
        if (!dragging) return;
        const rect = img.getBoundingClientRect();
        headerDragPosition = {
          x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
          y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))
        };
        img.style.objectPosition = `${headerDragPosition.x}% ${headerDragPosition.y}%`;
      };
      const onUp = () => {
        dragging = false;
        img.style.cursor = 'grab';
      };

      img.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      headerDragCleanup = () => {
        img.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
    } else {
      repositioningHeader = false;
      if (headerDragCleanup) headerDragCleanup();
      saveHeaderPosition(headerDragPosition);
    }
  }

  async function saveHeaderPosition(position) {
    try {
      await updateProfile({ headerPosition: position });
      home.headerPosition = position;
      showToast('저장했어요.', 'success');
    } catch (err) {
      showToast(err.message || '저장에 실패했습니다.', 'error');
    }
    renderShell();
  }

  async function enterEditMode(page) {
    let elementsData;
    try {
      elementsData = await getPageElements(username, page.isDefault ? undefined : page.slug);
    } catch (err) {
      showToast('페이지를 불러오지 못했습니다.', 'error');
      return;
    }
    mountEditor({
      container,
      pageId: elementsData.pageId,
      background: home.background,
      elements: elementsData.elements,
      onExit: (savedElements, savedBackground) => {
        home.background = savedBackground;
        renderShell();
      }
    });
  }

  function openCustomCssEditor() {
    const savedCss = home.customCss || '';
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box">
        <h3>커스텀 CSS</h3>
        <p class="auth-switch">내 개인홈을 볼 때만 적용돼요. 다른 사람 페이지나 사이트 다른 곳엔 영향 없어요.</p>
        <textarea id="customCssInput" rows="12" spellcheck="false" placeholder=".profile-bio { color: hotpink; }">${escapeHtml(savedCss)}</textarea>
        <div class="board-editor-actions">
          <button type="button" class="btn btn-primary" id="customCssSaveBtn">저장</button>
          <button type="button" class="btn btn-ghost" id="customCssCancelBtn">취소</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector('#customCssInput');
    input.addEventListener('input', () => applyCustomCss(input.value));

    function close() {
      applyCustomCss(home.customCss || '');
      modal.remove();
    }

    modal.querySelector('#customCssSaveBtn').addEventListener('click', async () => {
      try {
        await updateProfile({ customCss: input.value });
        home.customCss = input.value;
        showToast('저장했어요.', 'success');
        modal.remove();
      } catch (err) {
        showToast(err.message || '저장에 실패했습니다.', 'error');
      }
    });
    modal.querySelector('#customCssCancelBtn').addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }

  function openThemeEditor() {
    let selectedTheme = home.theme || 'basic';
    let overrides = { ...(home.themeColors || {}) };

    const COLOR_LABELS = { bg: '배경색', surface: '박스색', primary: '포인트색', text: '기본 글자', muted: '서브 글자' };

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box">
        <h3>테마</h3>
        <div class="theme-swatch-grid" id="themeSwatchGrid">
          ${Object.entries(THEME_PRESETS)
            .map(
              ([key, preset]) => `
            <button type="button" class="theme-swatch ${key === selectedTheme ? 'active' : ''}" data-theme="${key}"
              style="background:${preset.bg};color:${preset.text};border-color:${preset.primary}">
              ${escapeHtml(preset.label)}
            </button>
          `
            )
            .join('')}
        </div>
        <div class="theme-color-fields" id="themeColorFields"></div>
        <div class="board-editor-actions">
          <button type="button" class="btn btn-primary" id="themeSaveBtn">저장</button>
          <button type="button" class="btn btn-ghost" id="themeCancelBtn">취소</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    function renderColorFields() {
      const colors = resolveThemeColors(selectedTheme, overrides);
      modal.querySelector('#themeColorFields').innerHTML = Object.keys(COLOR_LABELS)
        .map(
          (key) => `
        <label class="theme-color-field">${COLOR_LABELS[key]}
          <input type="color" data-color="${key}" value="${colors[key]}">
        </label>
      `
        )
        .join('');

      modal.querySelectorAll('[data-color]').forEach((input) => {
        input.addEventListener('input', () => {
          overrides = { ...overrides, [input.dataset.color]: input.value };
          applyTheme(selectedTheme, overrides);
        });
      });
    }
    renderColorFields();
    applyTheme(selectedTheme, overrides);

    modal.querySelectorAll('[data-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedTheme = btn.dataset.theme;
        overrides = {};
        modal.querySelectorAll('[data-theme]').forEach((b) => b.classList.toggle('active', b === btn));
        renderColorFields();
        applyTheme(selectedTheme, overrides);
      });
    });

    function close() {
      applyTheme(home.theme, home.themeColors);
      modal.remove();
    }

    modal.querySelector('#themeSaveBtn').addEventListener('click', async () => {
      try {
        await updateProfile({ theme: selectedTheme, themeColors: overrides });
        home.theme = selectedTheme;
        home.themeColors = overrides;
        showToast('저장했어요.', 'success');
        modal.remove();
      } catch (err) {
        showToast(err.message || '저장에 실패했습니다.', 'error');
      }
    });
    modal.querySelector('#themeCancelBtn').addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }

  function openPagesManager() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box">
        <h3>메뉴 관리</h3>
        <ul class="pages-manager-list" id="pagesManagerList"></ul>
        <form class="pages-manager-add" id="pagesAddForm">
          <input type="text" name="name" placeholder="새 페이지 이름" maxlength="30" required>
          <select name="kind">
            <option value="canvas">자유 페이지</option>
            <option value="board">게시판</option>
            <option value="guestbook">방명록</option>
          </select>
          <button type="submit" class="btn btn-primary">추가</button>
        </form>
        <button type="button" class="btn btn-ghost" id="pagesManagerClose">닫기</button>
      </div>
    `;
    document.body.appendChild(modal);

    function renderRows() {
      modal.querySelector('#pagesManagerList').innerHTML = pages
        .map(
          (p, i) => `
        <li data-id="${p.id}">
          <span class="pages-manager-kind">${KIND_LABEL[p.kind] || p.kind}</span>
          <input type="text" class="pages-manager-name" value="${escapeHtml(p.name)}">
          <div class="pages-manager-actions">
            <button type="button" data-move="up" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" data-move="down" ${i === pages.length - 1 ? 'disabled' : ''}>↓</button>
            ${p.isDefault ? '' : `<button type="button" data-delete="1">삭제</button>`}
          </div>
        </li>
      `
        )
        .join('');

      modal.querySelectorAll('.pages-manager-name').forEach((input) => {
        input.addEventListener('change', async () => {
          const id = input.closest('li').dataset.id;
          try {
            await renamePage(id, input.value);
            await refreshPages();
            renderRows();
          } catch (err) {
            showToast(err.message || '이름 변경에 실패했습니다.', 'error');
          }
        });
      });

      modal.querySelectorAll('[data-move]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.closest('li').dataset.id;
          const index = pages.findIndex((p) => p.id === id);
          const targetIndex = btn.dataset.move === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= pages.length) return;
          const newOrder = [...pages];
          [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
          try {
            await reorderPages(newOrder.map((p) => p.id));
            await refreshPages();
            renderRows();
          } catch (err) {
            showToast(err.message || '순서 변경에 실패했습니다.', 'error');
          }
        });
      });

      modal.querySelectorAll('[data-delete]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.closest('li').dataset.id;
          if (!window.confirm('이 페이지를 삭제할까요? 안의 내용도 함께 삭제됩니다.')) return;
          try {
            await deletePage(id);
            await refreshPages();
            renderRows();
          } catch (err) {
            showToast(err.message || '삭제에 실패했습니다.', 'error');
          }
        });
      });
    }
    renderRows();

    modal.querySelector('#pagesAddForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      try {
        await createPage(form.get('name'), form.get('kind'));
        await refreshPages();
        renderRows();
        e.target.reset();
      } catch (err) {
        showToast(err.message || '페이지 추가에 실패했습니다.', 'error');
      }
    });

    function close() {
      modal.remove();
      renderShell();
    }
    modal.querySelector('#pagesManagerClose').addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }

  renderShell();
}
