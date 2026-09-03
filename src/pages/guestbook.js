import { listGuestbook, postGuestbook, deleteGuestbookEntry } from '../api/client.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml } from '../ui/escape.js';

export async function renderGuestbook(container, { username, isOwner }) {
  container.innerHTML = `<div class="loading">불러오는 중...</div>`;

  let data;
  try {
    data = await listGuestbook(username);
  } catch (err) {
    container.innerHTML = `<p class="editor-panel-empty">방명록을 불러오지 못했습니다.</p>`;
    return;
  }

  function render() {
    container.innerHTML = `
      <div class="guestbook">
        <form class="guestbook-form" id="gbForm">
          <input type="text" name="author" placeholder="이름" maxlength="30" required>
          <textarea name="content" placeholder="메시지를 남겨보세요" rows="2" maxlength="500" required></textarea>
          <button type="submit" class="btn btn-primary">남기기</button>
        </form>
        <ul class="guestbook-list">
          ${data.entries.length === 0 ? `<li class="board-empty">아직 방명록이 없어요.</li>` : ''}
          ${data.entries
            .map(
              (e) => `
            <li class="guestbook-entry" data-id="${e.id}">
              <div class="guestbook-entry-head">
                <strong>${escapeHtml(e.author)}</strong>
                <span>${new Date(e.createdAt).toLocaleDateString('ko-KR')}</span>
                ${isOwner || e.isMine ? `<button type="button" class="link-button" data-delete="${e.id}">삭제</button>` : ''}
              </div>
              <p>${escapeHtml(e.content)}</p>
            </li>
          `
            )
            .join('')}
        </ul>
      </div>
    `;

    container.querySelector('#gbForm').addEventListener('submit', async (evt) => {
      evt.preventDefault();
      const form = new FormData(evt.target);
      try {
        await postGuestbook(username, form.get('author'), form.get('content'));
        data = await listGuestbook(username);
        render();
        showToast('방명록을 남겼어요.', 'success');
      } catch (err) {
        showToast(err.message || '작성에 실패했습니다.', 'error');
      }
    });

    container.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('삭제할까요?')) return;
        try {
          await deleteGuestbookEntry(btn.dataset.delete);
          data = await listGuestbook(username);
          render();
        } catch (err) {
          showToast(err.message || '삭제에 실패했습니다.', 'error');
        }
      });
    });
  }

  render();
}
