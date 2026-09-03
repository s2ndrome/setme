import { createUserProfile, isValidUsername, isUsernameAvailable } from '../api/client.js';
import { showToast } from '../ui/toast.js';
import { applyCustomCss } from '../ui/customCss.js';
import { resetTheme } from '../ui/theme.js';
import { resetFont } from '../ui/fonts.js';
import { resetSiteChrome } from '../ui/site.js';

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('연결이 너무 느립니다. 네트워크 상태를 확인하고 다시 시도해 주세요.')), ms)
    )
  ]);
}

export function renderOnboarding(container, { currentUser }) {
  applyCustomCss('');
  resetTheme();
  resetFont();
  resetSiteChrome();

  container.innerHTML = `
    <section class="auth-form">
      <h1>프로필 설정</h1>
      <p class="auth-switch">거의 다 됐어요! 사용할 핸들을 정해주세요.</p>
      <form id="onboardingForm">
        <label>핸들 (@username)
          <input type="text" name="username" placeholder="영문 소문자/숫자/밑줄 3~20자" required>
        </label>
        <label>닉네임
          <input type="text" name="nickname" value="${currentUser.email.split('@')[0]}" required>
        </label>
        <button type="submit" class="btn btn-primary">완료</button>
      </form>
    </section>
  `;

  const form = container.querySelector('#onboardingForm');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const username = data.get('username').trim().toLowerCase();
    const nickname = data.get('nickname').trim();

    if (!isValidUsername(username)) {
      showToast('핸들은 영문 소문자/숫자/밑줄 3~20자만 가능합니다.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';
    try {
      const available = await withTimeout(isUsernameAvailable(username), 15000);
      if (!available) {
        showToast('이미 사용 중인 핸들입니다.', 'error');
        return;
      }
      await withTimeout(createUserProfile({ username, nickname }), 15000);
      // Full reload so the app re-fetches the session with the new profile.
      window.location.assign(`/@${username}`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '완료';
    }
  });
}
