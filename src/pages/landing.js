export function renderLanding(container, { currentUser, profile }) {
  const ownLink = currentUser && profile
    ? `<a class="btn btn-primary" data-link href="/@${profile.username}">내 개인홈으로 이동</a>`
    : `
      <a class="btn btn-primary" data-link href="/signup">시작하기</a>
      <a class="btn btn-ghost" data-link href="/login">로그인</a>
    `;

  container.innerHTML = `
    <section class="landing">
      <h1 class="landing-title">setme</h1>
      <p class="landing-sub">나만의 인터넷 공간을 자유롭게 꾸며보세요.</p>
      <div class="landing-actions">${ownLink}</div>
    </section>
  `;
}
