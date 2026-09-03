import { signUp, signIn } from '../api/client.js';
import { showToast } from '../ui/toast.js';
import { applyCustomCss } from '../ui/customCss.js';
import { resetTheme } from '../ui/theme.js';
import { resetFont } from '../ui/fonts.js';
import { resetSiteChrome } from '../ui/site.js';

export function renderLanding(container, { currentUser, profile }) {
  applyCustomCss('');
  resetTheme();
  resetFont();
  resetSiteChrome();

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
            ${
              mode === 'signup'
                ? `
              <label>초대 코드
                <input type="text" name="inviteCode" autocomplete="off">
              </label>
            `
                : ''
            }
            <button type="submit" class="btn btn-primary">${mode === 'signup' ? '가입하기' : '로그인'}</button>
          </form>
          <p class="auth-switch">
            ${mode === 'signup' ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
            <button type="button" class="link-button" id="modeToggleBtn">${mode === 'signup' ? '로그인' : '회원가입'}</button>
          </p>
        </section>
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
      const inviteCode = data.get('inviteCode');

      submitBtn.disabled = true;
      try {
        if (mode === 'signup') {
          await signUp(email, password, inviteCode);
        } else {
          await signIn(email, password);
        }
        // Full reload so the app re-fetches the session from scratch.
        window.location.assign('/');
      } catch (err) {
        showToast(err.message, 'error');
        submitBtn.disabled = false;
      }
    });
  }

  renderForm();
}
