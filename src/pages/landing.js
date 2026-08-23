import { signInWithGoogle, isCancelledPopupError } from '../firebase/auth.js';
import { showToast } from '../ui/toast.js';

export function renderLanding(container, { currentUser, profile }) {
  const actions = currentUser && profile
    ? `<a class="btn btn-primary" data-link href="/@${profile.username}">내 개인홈으로 이동</a>`
    : `<button id="googleSignInBtn" class="btn btn-primary">Google로 시작하기</button>`;

  container.innerHTML = `
    <section class="landing">
      <h1 class="landing-title">setme</h1>
      <p class="landing-sub">나만의 인터넷 공간을 자유롭게 꾸며보세요.</p>
      <div class="landing-actions">${actions}</div>
    </section>
  `;

  const googleBtn = container.querySelector('#googleSignInBtn');
  if (!googleBtn) return;

  googleBtn.addEventListener('click', async () => {
    googleBtn.disabled = true;
    try {
      await signInWithGoogle();
    } catch (err) {
      if (!isCancelledPopupError(err)) {
        showToast('로그인 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      googleBtn.disabled = false;
    }
  });
}
