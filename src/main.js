import { onAuthChange } from './firebase/auth.js';
import { getUserProfile } from './firebase/firestore.js';
import { parsePath, navigate, initLinkInterception } from './router/router.js';
import { renderLanding } from './pages/landing.js';
import { renderOnboarding } from './pages/onboarding.js';
import { renderHome } from './pages/home.js';

const app = document.getElementById('app');

let currentUser = null;
let currentProfile = null;
let profileLoadFailed = false;

function renderRetry() {
  app.innerHTML = `
    <section class="empty-state">
      <h1>연결 오류</h1>
      <p>서버에 연결하지 못했습니다.</p>
      <button class="btn btn-primary" id="retryBtn">다시 시도</button>
    </section>
  `;
  app.querySelector('#retryBtn').addEventListener('click', () => window.location.reload());
}

async function render() {
  const route = parsePath(window.location.pathname);

  if (profileLoadFailed) {
    renderRetry();
    return;
  }

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

app.innerHTML = `<div class="loading">불러오는 중...</div>`;

onAuthChange(async (user) => {
  currentUser = user;
  profileLoadFailed = false;
  try {
    currentProfile = user ? await getUserProfile(user.uid) : null;
  } catch (err) {
    console.error('프로필을 불러오지 못했습니다.', err);
    currentProfile = null;
    profileLoadFailed = true;
  }
  render();
});
