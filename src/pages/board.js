import { listPosts, getPost, createPost, updatePost, deletePost, uploadImage, getPages } from '../api/client.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml } from '../ui/escape.js';

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const FONT_CHOICES = [
  { label: '기본', value: '' },
  { label: 'Pretendard', value: 'Pretendard' },
  { label: 'Noto Sans KR', value: "'Noto Sans KR'" },
  { label: 'Gowun Dodum', value: "'Gowun Dodum'" },
  { label: 'Nanum Myeongjo', value: "'Nanum Myeongjo'" }
];
const SIZE_CHOICES = [12, 14, 16, 18, 20, 24, 28, 32];

export async function renderBoard(container, { username, page, isOwner }) {
  container.innerHTML = `<div class="loading">불러오는 중...</div>`;

  let data;
  try {
    data = await listPosts(username, { page: page.slug });
  } catch (err) {
    container.innerHTML = `<p class="editor-panel-empty">게시글을 불러오지 못했습니다.</p>`;
    return;
  }

  function coverThumb(p) {
    return p.coverImage
      ? `<img class="board-item-thumb" src="${escapeHtml(p.coverImage)}" alt="">`
      : `<span class="board-item-thumb board-item-thumb-empty"></span>`;
  }

  function renderList() {
    container.innerHTML = `
      <div class="board">
        ${isOwner ? `<button type="button" class="btn btn-primary" id="newPostBtn">글쓰기</button>` : ''}
        <ul class="board-list">
          ${data.posts.length === 0 ? `<li class="board-empty">아직 글이 없어요.</li>` : ''}
          ${data.posts
            .map(
              (p) => `
            <li class="board-item" data-id="${p.id}">
              ${coverThumb(p)}
              <div class="board-item-body">
                <span class="board-item-title">${escapeHtml(p.title || '(제목 없음)')} ${p.visibility === 'private' ? '<span class="board-badge">비공개</span>' : ''}</span>
                <span class="board-item-date">${new Date(p.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
            </li>
          `
            )
            .join('')}
        </ul>
      </div>
    `;
    container.querySelectorAll('.board-item').forEach((li) => {
      li.addEventListener('click', () => renderDetail(li.dataset.id));
    });
    if (isOwner) {
      container.querySelector('#newPostBtn').addEventListener('click', () => openEditor(null));
    }
  }

  async function renderDetail(id) {
    container.innerHTML = `<div class="loading">불러오는 중...</div>`;
    let res;
    try {
      res = await getPost(username, id);
    } catch (err) {
      showToast('글을 불러오지 못했습니다.', 'error');
      renderList();
      return;
    }
    const post = res.post;
    container.innerHTML = `
      <article class="board-detail">
        <button type="button" class="btn btn-ghost" id="backBtn">← 목록으로</button>
        ${post.coverImage ? `<img class="board-detail-cover" src="${escapeHtml(post.coverImage)}" alt="">` : ''}
        <h2>${escapeHtml(post.title || '(제목 없음)')}</h2>
        <p class="board-detail-date">${new Date(post.createdAt).toLocaleString('ko-KR')}</p>
        <div class="board-detail-body">${post.content}</div>
        ${
          post.images.length
            ? `<div class="board-detail-images">${post.images
                .map((src) => `<img src="${escapeHtml(src)}" alt="">`)
                .join('')}</div>`
            : ''
        }
        ${
          isOwner
            ? `
          <div class="board-detail-actions">
            <button type="button" class="btn btn-ghost" id="editPostBtn">수정</button>
            <button type="button" class="btn btn-ghost" id="deletePostBtn">삭제</button>
          </div>
        `
            : ''
        }
      </article>
    `;
    container.querySelector('#backBtn').addEventListener('click', async () => {
      data = await listPosts(username, { page: page.slug });
      renderList();
    });
    if (isOwner) {
      container.querySelector('#editPostBtn').addEventListener('click', () => openEditor(post));
      container.querySelector('#deletePostBtn').addEventListener('click', async () => {
        if (!window.confirm('이 글을 삭제할까요?')) return;
        await deletePost(post.id);
        data = await listPosts(username, { page: page.slug });
        renderList();
      });
    }
  }

  // Owner-only compose modal: one unified writer for every category (board
  // page) at once, rather than a separate editor per page — posts pick
  // their category from a dropdown instead of being locked to whichever
  // page the writer happened to click "글쓰기" from.
  async function openEditor(initialPost) {
    let categories;
    try {
      const pagesRes = await getPages(username);
      categories = pagesRes.pages.filter((p) => p.kind === 'board');
    } catch (err) {
      showToast('카테고리를 불러오지 못했습니다.', 'error');
      return;
    }

    let myPosts;
    try {
      const res = await listPosts(username, { limit: 50 });
      myPosts = res.posts;
    } catch (err) {
      myPosts = [];
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay post-editor-overlay';
    overlay.innerHTML = `
      <div class="post-editor-modal">
        <aside class="post-editor-sidebar">
          <div class="post-editor-sidebar-head">
            <h3>내 글</h3>
            <button type="button" class="btn btn-primary" id="newPostBtn">+ 새글</button>
          </div>
          <ul class="post-editor-list" id="postEditorList"></ul>
        </aside>
        <div class="post-editor-main">
          <button type="button" class="post-editor-close" id="closeEditorBtn">✕</button>
          <div class="post-editor-topbar">
            <span class="post-editor-status" id="postStatusLabel"></span>
            <div class="post-editor-actions">
              <button type="button" class="btn btn-ghost" id="deletePostBtn" hidden>삭제</button>
              <button type="button" class="btn btn-ghost" id="saveDraftBtn">임시저장</button>
              <button type="button" class="btn btn-primary" id="publishBtn">발행하기</button>
            </div>
          </div>
          <div class="post-editor-toolbar">
            <button type="button" data-cmd="bold"><b>B</b></button>
            <button type="button" data-cmd="italic"><i>I</i></button>
            <button type="button" data-cmd="underline"><u>U</u></button>
            <button type="button" data-cmd="strikeThrough"><s>S</s></button>
            <input type="color" id="textColorInput" title="글자색" value="#222222">
            <select id="fontFamilySelect" title="폰트">
              ${FONT_CHOICES.map((f) => `<option value="${escapeHtml(f.value)}">${escapeHtml(f.label)}</option>`).join('')}
            </select>
            <select id="fontSizeSelect" title="크기">
              <option value="">크기</option>
              ${SIZE_CHOICES.map((s) => `<option value="${s}">${s}px</option>`).join('')}
            </select>
            <span class="post-editor-toolbar-sep"></span>
            <button type="button" id="insertImageBtn" title="이미지 삽입">🖼️</button>
            <button type="button" id="insertLinkBtn" title="링크 삽입">🔗</button>
          </div>
          <input type="text" id="postTitleInput" class="post-editor-title" placeholder="제목을 입력하세요" maxlength="100">
          <div class="post-editor-meta">
            <label>카테고리
              <select id="postCategorySelect">
                ${categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
              </select>
            </label>
            <label class="post-editor-cover">대표 이미지 (배너)
              <div class="post-editor-cover-row">
                <span id="postCoverLabel">첨부된 파일 없음</span>
                <button type="button" class="btn btn-ghost" id="coverBtn">첨부</button>
                <button type="button" class="btn btn-ghost" id="coverRemoveBtn" hidden>제거</button>
              </div>
            </label>
          </div>
          <div class="post-editor-body" id="postBody" contenteditable="true" data-placeholder="내용을 적어보세요..."></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const state = {
      id: null,
      coverImage: '',
      images: []
    };

    const titleInput = overlay.querySelector('#postTitleInput');
    const bodyEl = overlay.querySelector('#postBody');
    const categorySelect = overlay.querySelector('#postCategorySelect');
    const statusLabel = overlay.querySelector('#postStatusLabel');
    const deleteBtn = overlay.querySelector('#deletePostBtn');
    const coverLabel = overlay.querySelector('#postCoverLabel');
    const coverRemoveBtn = overlay.querySelector('#coverRemoveBtn');

    function renderPostList() {
      overlay.querySelector('#postEditorList').innerHTML = myPosts.length
        ? myPosts
            .map(
              (p) => `
          <li class="post-editor-list-item ${p.id === state.id ? 'active' : ''}" data-id="${p.id}">
            <span>${escapeHtml(p.title || '(제목 없음)')}</span>
            ${p.visibility === 'private' ? '<span class="board-badge">비공개</span>' : ''}
          </li>
        `
            )
            .join('')
        : `<li class="post-editor-list-empty">작성된 글이 없습니다.</li>`;
      overlay.querySelectorAll('.post-editor-list-item').forEach((li) => {
        li.addEventListener('click', () => loadPost(li.dataset.id));
      });
    }

    function setCover(url) {
      state.coverImage = url;
      coverLabel.textContent = url ? '이미지 첨부됨' : '첨부된 파일 없음';
      coverRemoveBtn.hidden = !url;
    }

    function fillForm(post) {
      state.id = post?.id || null;
      state.coverImage = post?.coverImage || '';
      state.images = post?.images ? [...post.images] : [];
      titleInput.value = post?.title || '';
      bodyEl.innerHTML = post?.content || '';
      setCover(state.coverImage);
      if (post?.pageId) categorySelect.value = post.pageId;
      else if (categories.some((c) => c.id === page.id)) categorySelect.value = page.id;
      statusLabel.textContent = post ? '✎ 수정 중' : '✎ 작성 중';
      deleteBtn.hidden = !post;
      renderPostList();
    }

    async function loadPost(id) {
      try {
        const res = await getPost(username, id);
        fillForm(res.post);
      } catch (err) {
        showToast('글을 불러오지 못했습니다.', 'error');
      }
    }

    fillForm(initialPost);

    overlay.querySelector('#newPostBtn').addEventListener('click', () => fillForm(null));

    overlay.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        bodyEl.focus();
        document.execCommand(btn.dataset.cmd, false, null);
      });
    });

    function wrapSelection(apply) {
      bodyEl.focus();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !bodyEl.contains(sel.anchorNode)) return;
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      apply(span);
      try {
        range.surroundContents(span);
      } catch {
        const frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
      }
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.addRange(newRange);
    }

    overlay.querySelector('#textColorInput').addEventListener('input', (e) => {
      wrapSelection((span) => (span.style.color = e.target.value));
    });
    overlay.querySelector('#fontFamilySelect').addEventListener('change', (e) => {
      if (!e.target.value) return;
      wrapSelection((span) => (span.style.fontFamily = e.target.value));
      e.target.value = '';
    });
    overlay.querySelector('#fontSizeSelect').addEventListener('change', (e) => {
      if (!e.target.value) return;
      wrapSelection((span) => (span.style.fontSize = `${e.target.value}px`));
      e.target.value = '';
    });

    overlay.querySelector('#insertImageBtn').addEventListener('click', () => {
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
          bodyEl.focus();
          document.execCommand('insertImage', false, url);
        } catch (err) {
          showToast(err.message || '업로드에 실패했습니다.', 'error');
        }
      });
      input.click();
    });

    overlay.querySelector('#insertLinkBtn').addEventListener('click', () => {
      const url = window.prompt('연결할 링크 주소를 입력해주세요 (https://)');
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) {
        showToast('http:// 또는 https:// 로 시작하는 주소만 가능합니다.', 'error');
        return;
      }
      bodyEl.focus();
      document.execCommand('createLink', false, url);
    });

    overlay.querySelector('#coverBtn').addEventListener('click', () => {
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
          setCover(url);
        } catch (err) {
          showToast(err.message || '업로드에 실패했습니다.', 'error');
        }
      });
      input.click();
    });
    coverRemoveBtn.addEventListener('click', () => setCover(''));

    async function save(visibility) {
      if (categories.length === 0) {
        showToast('먼저 메뉴 관리에서 게시판(카테고리)을 만들어주세요.', 'error');
        return;
      }
      const body = {
        pageId: categorySelect.value,
        title: titleInput.value,
        content: bodyEl.innerHTML,
        coverImage: state.coverImage,
        images: state.images,
        visibility
      };
      try {
        let id = state.id;
        if (state.id) {
          await updatePost({ id: state.id, ...body });
        } else {
          const created = await createPost(body);
          id = created.id;
        }
        showToast(visibility === 'public' ? '발행했어요.' : '임시저장했어요.', 'success');
        const res = await listPosts(username, { limit: 50 });
        myPosts = res.posts;
        const savedPost = myPosts.find((p) => p.id === id) || { ...body, id };
        fillForm(savedPost);
      } catch (err) {
        showToast(err.message || '저장에 실패했습니다.', 'error');
      }
    }

    overlay.querySelector('#saveDraftBtn').addEventListener('click', () => save('private'));
    overlay.querySelector('#publishBtn').addEventListener('click', () => save('public'));

    deleteBtn.addEventListener('click', async () => {
      if (!state.id || !window.confirm('이 글을 삭제할까요?')) return;
      try {
        await deletePost(state.id);
        myPosts = myPosts.filter((p) => p.id !== state.id);
        fillForm(null);
        showToast('삭제했어요.', 'success');
      } catch (err) {
        showToast(err.message || '삭제에 실패했습니다.', 'error');
      }
    });

    async function close() {
      overlay.remove();
      data = await listPosts(username, { page: page.slug });
      renderList();
    }
    overlay.querySelector('#closeEditorBtn').addEventListener('click', close);
  }

  renderList();
}
