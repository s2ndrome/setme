import { getUidByUsername, getUserProfile, getHome } from '../firebase/firestore.js';
import { signOutUser } from '../firebase/auth.js';
import { navigate } from '../router/router.js';

export async function renderHome(container, { username, currentUser }) {
  container.innerHTML = `<div class="loading">불러오는 중...</div>`;

  let uid;
  try {
    uid = await getUidByUsername(username);
  } catch (err) {
    console.error('개인홈을 불러오지 못했습니다.', err);
    container.innerHTML = `
      <section class="empty-state">
        <h1>연결 오류</h1>
        <p>서버에 연결하지 못했습니다. 새로고침 해주세요.</p>
        <a class="btn btn-ghost" data-link href="/">홈으로</a>
      </section>
    `;
    return;
  }

  if (!uid) {
    container.innerHTML = `
      <section class="empty-state">
        <h1>@${username}</h1>
        <p>존재하지 않는 핸들입니다.</p>
        <a class="btn btn-ghost" data-link href="/">홈으로</a>
      </section>
    `;
    return;
  }

  let profile, home;
  try {
    [profile, home] = await Promise.all([getUserProfile(uid), getHome(uid)]);
  } catch (err) {
    console.error('개인홈을 불러오지 못했습니다.', err);
    container.innerHTML = `
      <section class="empty-state">
        <h1>연결 오류</h1>
        <p>서버에 연결하지 못했습니다. 새로고침 해주세요.</p>
        <a class="btn btn-ghost" data-link href="/">홈으로</a>
      </section>
    `;
    return;
  }
  const isOwner = currentUser && currentUser.uid === uid;

  if (!isOwner && home?.visibility === 'private') {
    container.innerHTML = `
      <section class="empty-state">
        <h1>@${username}</h1>
        <p>비공개로 설정된 개인홈입니다.</p>
        <a class="btn btn-ghost" data-link href="/">홈으로</a>
      </section>
    `;
    return;
  }

  container.innerHTML = `
    <section class="home-view">
      <header class="home-topbar">
        <span>@${profile.username}</span>
        ${isOwner ? `
          <div class="home-topbar-actions">
            <button class="btn btn-ghost" id="editModeBtn" disabled title="Phase 2에서 제공 예정">꾸미기 모드</button>
            <button class="btn btn-ghost" id="logoutBtn">로그아웃</button>
          </div>
        ` : ''}
      </header>

      <div class="profile-card">
        <div class="profile-avatar">
          ${profile.profileImage
            ? `<img src="${profile.profileImage}" alt="${profile.nickname}">`
            : `<div class="profile-avatar-placeholder">${profile.nickname[0]}</div>`}
        </div>
        <h2>${profile.nickname}</h2>
        <p class="profile-bio">${profile.bio || (isOwner ? '아직 소개글이 없어요. 프로필을 편집해보세요.' : '')}</p>
      </div>
    </section>
  `;

  if (isOwner) {
    container.querySelector('#logoutBtn').addEventListener('click', async () => {
      await signOutUser();
      navigate('/');
    });
  }
}
