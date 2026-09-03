import { listPosts, getPost, createPost, updatePost, deletePost, uploadImage } from '../api/client.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml } from '../ui/escape.js';

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

export async function renderBoard(container, { username, page, isOwner }) {
  container.innerHTML = `<div class="loading">불러오는 중...</div>`;

  let data;
  try {
    data = await listPosts(username, { page: page.slug });
  } catch (err) {
    container.innerHTML = `<p class="editor-panel-empty">게시글을 불러오지 못했습니다.</p>`;
    return;
  }

  function renderList() {
    container.innerHTML = `
      <div class="board">
        ${isOwner ? `<button class="btn btn-primary" id="newPostBtn">글쓰기</button>` : ''}
        <ul class="board-list">
          ${data.posts.length === 0 ? `<li class="board-empty">아직 글이 없어요.</li>` : ''}
          ${data.posts
            .map(
              (p) => `
            <li class="board-item" data-id="${p.id}">
              <span class="board-item-title">${escapeHtml(p.title || '(제목 없음)')}</span>
              ${p.visibility === 'private' ? '<span class="board-badge">비공개</span>' : ''}
              <span class="board-item-date">${new Date(p.createdAt).toLocaleDateString('ko-KR')}</span>
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
      container.querySelector('#newPostBtn').addEventListener('click', () => renderEditor(null));
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
        <button class="btn btn-ghost" id="backBtn">← 목록으로</button>
        <h2>${escapeHtml(post.title || '(제목 없음)')}</h2>
        <p class="board-detail-date">${new Date(post.createdAt).toLocaleString('ko-KR')}</p>
        <div class="board-detail-body">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>
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
            <button class="btn btn-ghost" id="editPostBtn">수정</button>
            <button class="btn btn-ghost" id="deletePostBtn">삭제</button>
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
      container.querySelector('#editPostBtn').addEventListener('click', () => renderEditor(post));
      container.querySelector('#deletePostBtn').addEventListener('click', async () => {
        if (!window.confirm('이 글을 삭제할까요?')) return;
        await deletePost(post.id);
        data = await listPosts(username, { page: page.slug });
        renderList();
      });
    }
  }

  function renderEditor(post) {
    const images = post?.images ? [...post.images] : [];
    container.innerHTML = `
      <form class="board-editor" id="postForm">
        <input type="text" name="title" placeholder="제목" value="${escapeHtml(post?.title || '')}" maxlength="100">
        <textarea name="content" placeholder="내용을 입력하세요" rows="10">${escapeHtml(post?.content || '')}</textarea>
        <div id="postImages" class="board-editor-images"></div>
        <button type="button" class="btn btn-ghost" id="addImageBtn">이미지 추가</button>
        <label class="editor-inline-check">
          <input type="checkbox" name="private" ${post?.visibility === 'private' ? 'checked' : ''}> 비공개 글
        </label>
        <div class="board-editor-actions">
          <button type="submit" class="btn btn-primary">저장</button>
          <button type="button" class="btn btn-ghost" id="cancelBtn">취소</button>
        </div>
      </form>
    `;

    function renderImages() {
      container.querySelector('#postImages').innerHTML = images
        .map(
          (src, i) =>
            `<div class="board-editor-image"><img src="${escapeHtml(src)}" alt=""><button type="button" data-remove="${i}">✕</button></div>`
        )
        .join('');
      container.querySelectorAll('[data-remove]').forEach((btn) => {
        btn.addEventListener('click', () => {
          images.splice(Number(btn.dataset.remove), 1);
          renderImages();
        });
      });
    }
    renderImages();

    container.querySelector('#addImageBtn').addEventListener('click', () => {
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
          renderImages();
        } catch (err) {
          showToast(err.message || '업로드에 실패했습니다.', 'error');
        }
      });
      input.click();
    });

    container.querySelector('#cancelBtn').addEventListener('click', () => {
      if (post) renderDetail(post.id);
      else renderList();
    });

    container.querySelector('#postForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const body = {
        title: form.get('title'),
        content: form.get('content'),
        images,
        visibility: form.get('private') ? 'private' : 'public'
      };
      try {
        let id = post?.id;
        if (post) {
          await updatePost({ id: post.id, ...body });
        } else {
          const created = await createPost({ pageId: page.id, ...body });
          id = created.id;
        }
        data = await listPosts(username, { page: page.slug });
        showToast('저장했어요.', 'success');
        renderDetail(id);
      } catch (err) {
        showToast(err.message || '저장에 실패했습니다.', 'error');
      }
    });
  }

  renderList();
}
