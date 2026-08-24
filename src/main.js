import { onAuthChange } from './firebase/auth.js';
import { getUserProfile } from './firebase/firestore.js';
import { parsePath, navigate, initLinkInterception } from './router/router.js';
import { renderLanding } from './pages/landing.js';
import { renderOnboarding } from './pages/onboarding.js';
import { renderHome } from './pages/home.js';
import { showToast } from './ui/toast.js';

const app = document.getElementById('app');

let currentUser = null;
let currentProfile = null;

async function render() {
  const route = parsePath(window.location.pathname);

  if (currentUser && !currentProfile && route.name !== 'onboarding') {
    navigate('/onboarding');
    return;
  }
  if (currentUser && currentProfile && route.name === 'onboarding') {
    navigate(`/@${currentProfile.username}`);
    return;
  }

  switch (route.name) {
    case 'landing':
      renderLanding(app, { currentUser, profile: currentProfile });
      break;
    case 'onboarding':
      renderOnboarding(app, { currentUser });
      break;
    case 'home':
      renderHome(app, { username: route.username, currentUser });
      break;
    default:
      app.innerHTML = `<section class="empty-state"><h1>404</h1><p>페이지를 찾을 수 없습니다.</p></section>`;
  }
}

initLinkInterception();
window.addEventListener('popstate', render);
window.addEventListener('setme:navigate', render);

onAuthChange(async (user) => {
  currentUser = user;
  try {
    currentProfile = user ? await getUserProfile(user.uid) : null;
  } catch (err) {
    console.error('프로필을 불러오지 못했습니다.', err);
    currentProfile = null;
    showToast('서버 연결에 실패했습니다. 새로고침 해주세요.', 'error');
  }
  render();
});
