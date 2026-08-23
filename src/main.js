import { onAuthChange } from './firebase/auth.js';
import { getUserProfile } from './firebase/firestore.js';
import { parsePath, initLinkInterception } from './router/router.js';
import { renderLanding } from './pages/landing.js';
import { renderSignup } from './pages/signup.js';
import { renderLogin } from './pages/login.js';
import { renderHome } from './pages/home.js';

const app = document.getElementById('app');

let currentUser = null;
let currentProfile = null;

async function render() {
  const route = parsePath(window.location.pathname);

  switch (route.name) {
    case 'landing':
      renderLanding(app, { currentUser, profile: currentProfile });
      break;
    case 'signup':
      renderSignup(app);
      break;
    case 'login':
      renderLogin(app);
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
  currentProfile = user ? await getUserProfile(user.uid) : null;
  render();
});
