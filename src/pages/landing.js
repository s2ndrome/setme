import {
  signInWithGoogle,
  isCancelledPopupError,
  signUpWithEmail,
  signInWithEmail,
  describeEmailAuthError
} from '../firebase/auth.js';
import { showToast } from '../ui/toast.js';

export function renderLanding(container, { currentUser, profile }) {
  if (currentUser && profile) {
    container.innerHTML = `
      <section class="landing">
        <h1 class="landing-title">setme</h1>
        <p class="landing-sub">나만의 인터넷 공간을 자유롭게 꾸며보세요.</p>
        <div class="landing-actions">
          <a class="btn btn-primary" data-link href="/@${profile.username}">내 개인홈으로 이동</a>
        </div>
      </section>
    `;
    return;
  }

  let mode = 'signin';

  function renderForm() {
    container.innerHTML = `
      <section class="landing">
        <h1 class="landing-title">setme</h1>
        <p class="landing-sub">나만의 인터넷 공간을 자유롭게 꾸며보세요.</p>

        <section class="auth-form">
          <h1>${mode === 'signup' ? '회원가입' : '로그인'}</h1>
          <form id="emailAuthForm">
            <label>이메일
              <input type="email" name="email" required autocomplete="email">
            </label>
            <label>비밀번호
              <input type="password" name="password" required minlength="6" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}">
            </label>
            <button type="submit" class="btn btn-primary">${mode === 'signup' ? '가입하기' : '로그인'}</button>
          </form>
          <p class="auth-switch">
            ${mode === 'signup' ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
            <button type="button" class="link-button" id="modeToggleBtn">${mode === 'signup' ? '로그인' : '회원가입'}</button>
          </p>
        </section>

        <div class="landing-actions">
          <button id="googleSignInBtn" class="btn btn-ghost">Google로 계속하기</button>
        </div>
      </section>
    `;

    container.querySelector('#modeToggleBtn').addEventListener('click', () => {
      mode = mode === 'signup' ? 'signin' : 'signup';
      renderForm();
    });

    const form = container.querySelector('#emailAuthForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const email = data.get('email').trim();
      const password = data.get('password');

      submitBtn.disabled = true;
      try {
        if (mode === 'signup') {
          await signUpWithEmail(email, password);
        } else {
          await signInWithEmail(email, password);
        }
      } catch (err) {
        showToast(describeEmailAuthError(err), 'error');
        submitBtn.disabled = false;
      }
    });

    const googleBtn = container.querySelector('#googleSignInBtn');
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

  renderForm();
}
