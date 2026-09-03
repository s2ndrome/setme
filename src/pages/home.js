import {
  getPublicProfile,
  signOutUser,
  getPages,
  getPageElements,
  createPage,
  renamePage,
  reorderPages,
  deletePage
} from '../api/client.js';
import { renderStaticCanvas, mountEditor } from '../editor/canvas.js';
import { renderBoard } from './board.js';
import { renderGuestbook } from './guestbook.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml } from '../ui/escape.js';

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

    container.innerHTML = `
      <section class="home-view">
        <header class="home-topbar">
          <span>@${profile.username}</span>
          ${
            isOwner
              ? `
            <div class="home-topbar-actions">
              ${page.kind === 'canvas' ? `<button class="btn btn-ghost" id="editModeBtn">꾸미기 모드</button>` : ''}
              <button class="btn btn-ghost" id="logoutBtn">로그아웃</button>
            </div>
          `
              : ''
          }
        </header>

        ${
          page.isDefault
            ? `
          <div class="profile-card">
            <div class="profile-avatar">
              ${
                profile.profileImage
                  ? `<img src="${profile.profileImage}" alt="${escapeHtml(profile.nickname)}">`
                  : `<div class="profile-avatar-placeholder">${escapeHtml(profile.nickname[0] || '?')}</div>`
              }
            </div>
            <h2>${escapeHtml(profile.nickname)}</h2>
            <p class="profile-bio">${escapeHtml(profile.bio) || (isOwner ? '아직 소개글이 없어요. 프로필을 편집해보세요.' : '')}</p>
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
      const editBtn = container.querySelector('#editModeBtn');
      if (editBtn) editBtn.addEventListener('click', () => enterEditMode(page));
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
