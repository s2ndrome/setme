import { createUserProfile, isValidUsername, isUsernameAvailable } from '../firebase/firestore.js';
import { navigate } from '../router/router.js';
import { showToast } from '../ui/toast.js';

export function renderOnboarding(container, { currentUser }) {
  container.innerHTML = `
    <section class="auth-form">
      <h1>프로필 설정</h1>
      <p class="auth-switch">거의 다 됐어요! 사용할 핸들을 정해주세요.</p>
      <form id="onboardingForm">
        <label>핸들 (@username)
          <input type="text" name="username" placeholder="영문 소문자/숫자/밑줄 3~20자" required>
        </label>
        <label>닉네임
          <input type="text" name="nickname" value="${currentUser.displayName || ''}" required>
        </label>
        <button type="submit" class="btn btn-primary">완료</button>
      </form>
    </section>
  `;

  const form = container.querySelector('#onboardingForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const username = data.get('username').trim().toLowerCase();
    const nickname = data.get('nickname').trim();

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
      await createUserProfile(currentUser.uid, {
        username,
        nickname,
        profileImage: currentUser.photoURL || ''
      });
      navigate(`/@${username}`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}
