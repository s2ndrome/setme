import { signUp, authErrorMessage } from '../firebase/auth.js';
import { createUserProfile, isValidUsername, isUsernameAvailable } from '../firebase/firestore.js';
import { navigate } from '../router/router.js';
import { showToast } from '../ui/toast.js';

export function renderSignup(container) {
  container.innerHTML = `
    <section class="auth-form">
      <h1>회원가입</h1>
      <form id="signupForm">
        <label>핸들 (@username)
          <input type="text" name="username" placeholder="영문 소문자/숫자/밑줄 3~20자" required>
        </label>
        <label>닉네임
          <input type="text" name="nickname" placeholder="화면에 표시될 이름" required>
        </label>
        <label>이메일
          <input type="email" name="email" required>
        </label>
        <label>비밀번호
          <input type="password" name="password" minlength="6" required>
        </label>
        <button type="submit" class="btn btn-primary">가입하기</button>
      </form>
      <p class="auth-switch">이미 계정이 있나요? <a data-link href="/login">로그인</a></p>
    </section>
  `;

  const form = container.querySelector('#signupForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const username = data.get('username').trim().toLowerCase();
    const nickname = data.get('nickname').trim();
    const email = data.get('email').trim();
    const password = data.get('password');

    if (!isValidUsername(username)) {
      showToast('핸들은 영문 소문자/숫자/밑줄 3~20자만 가능합니다.', 'error');
      return;
    }

    submitBtn.disabled = true;
    try {
      const available = await isUsernameAvailable(username);
      if (!available) {
        showToast('이미 사용 중인 핸들입니다.', 'error');
        return;
      }

      const cred = await signUp(email, password);
      await createUserProfile(cred.user.uid, { username, nickname });
      navigate(`/@${username}`);
    } catch (err) {
      showToast(err.code ? authErrorMessage(err) : err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}
