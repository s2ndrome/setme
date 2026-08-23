import { signIn, resetPassword, authErrorMessage } from '../firebase/auth.js';
import { getUserProfile } from '../firebase/firestore.js';
import { navigate } from '../router/router.js';
import { showToast } from '../ui/toast.js';

export function renderLogin(container) {
  container.innerHTML = `
    <section class="auth-form">
      <h1>로그인</h1>
      <form id="loginForm">
        <label>이메일
          <input type="email" name="email" required>
        </label>
        <label>비밀번호
          <input type="password" name="password" required>
        </label>
        <button type="submit" class="btn btn-primary">로그인</button>
      </form>
      <button id="resetPasswordBtn" class="link-button">비밀번호를 잊으셨나요?</button>
      <p class="auth-switch">계정이 없나요? <a data-link href="/signup">회원가입</a></p>
    </section>
  `;

  const form = container.querySelector('#loginForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const email = data.get('email').trim();
    const password = data.get('password');

    submitBtn.disabled = true;
    try {
      const cred = await signIn(email, password);
      const profile = await getUserProfile(cred.user.uid);
      navigate(profile ? `/@${profile.username}` : '/');
    } catch (err) {
      showToast(authErrorMessage(err), 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  container.querySelector('#resetPasswordBtn').addEventListener('click', async () => {
    const email = form.querySelector('input[name="email"]').value.trim();
    if (!email) {
      showToast('이메일을 먼저 입력해 주세요.', 'error');
      return;
    }
    try {
      await resetPassword(email);
      showToast('비밀번호 재설정 메일을 보냈습니다.', 'success');
    } catch (err) {
      showToast(authErrorMessage(err), 'error');
    }
  });
}
