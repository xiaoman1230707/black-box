/* GG 玩家社区 — 共享交互 */

/* 点赞切换 */
document.addEventListener('click', (e) => {
  const like = e.target.closest('[data-like]');
  if (like) {
    e.preventDefault();
    const countEl = like.querySelector('[data-count]');
    const liked = like.classList.toggle('liked');
    if (countEl) {
      let n = parseInt(countEl.textContent.replace(/[^\d]/g, ''), 10) || 0;
      n += liked ? 1 : -1;
      countEl.textContent = n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n;
    }
  }
});

/* 标签筛选 */
function initTagFilter() {
  const bar = document.querySelector('[data-tagbar]');
  if (!bar) return;
  const cards = [...document.querySelectorAll('[data-tags]')];
  bar.addEventListener('click', (e) => {
    const chip = e.target.closest('.tag-chip');
    if (!chip) return;
    bar.querySelectorAll('.tag-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    const tag = chip.dataset.tag;
    let shown = 0;
    cards.forEach((card) => {
      const ok = tag === 'all' || card.dataset.tags.split(' ').includes(tag);
      card.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    const counter = document.querySelector('[data-result-count]');
    if (counter) counter.textContent = shown;
  });
}

/* 轮播图 */
function initCarousel() {
  const car = document.querySelector('[data-carousel]');
  if (!car) return;
  const track = car.querySelector('.carousel-track');
  const slides = track.children.length;
  const dots = car.querySelectorAll('.dot');
  let i = 0, timer;
  const go = (n) => {
    i = (n + slides) % slides;
    track.style.transform = `translateX(-${i * 100}%)`;
    dots.forEach((d, k) => d.classList.toggle('active', k === i));
  };
  car.querySelector('.next')?.addEventListener('click', () => { go(i + 1); reset(); });
  car.querySelector('.prev')?.addEventListener('click', () => { go(i - 1); reset(); });
  dots.forEach((d, k) => d.addEventListener('click', () => { go(k); reset(); }));
  const reset = () => { clearInterval(timer); timer = setInterval(() => go(i + 1), 5000); };
  reset();
}

/* 下拉刷新 */
function initPullRefresh() {
  const ptr = document.querySelector('[data-ptr]');
  if (!ptr) return;
  const label = ptr.querySelector('[data-ptr-label]');
  const grid = document.querySelector('.post-grid');
  const MAX = 96, TRIGGER = 60;

  let active = false, startY = 0, eased = 0;

  const atTop = () => (window.scrollY || document.documentElement.scrollTop) <= 0;

  function begin(y) {
    if (!atTop() || ptr.classList.contains('refreshing')) return;
    active = true; startY = y; eased = 0;
    ptr.classList.add('pulling');
  }

  function drag(y, preventer) {
    if (!active) return;
    const dist = y - startY;
    if (dist <= 0) { end(); return; }
    if (preventer) preventer();                 // 阻止页面回弹/选中
    eased = Math.min(MAX, dist * 0.55);
    ptr.style.height = eased + 'px';
    const ready = eased >= TRIGGER;
    ptr.classList.toggle('ready', ready);
    if (label) label.textContent = ready ? '释放即可刷新' : '下拉刷新';
  }

  function end() {
    if (!active) return;
    active = false;
    ptr.classList.remove('pulling');
    if (eased >= TRIGGER) refresh();
    else collapse();
  }

  function collapse() {
    ptr.classList.remove('ready');
    ptr.style.height = '0px';
  }

  function refresh() {
    ptr.classList.remove('ready');
    ptr.classList.add('refreshing');
    ptr.style.height = '52px';
    if (label) label.textContent = '正在刷新…';
    setTimeout(() => {
      if (label) label.textContent = '已是最新内容';
      if (grid) {
        grid.classList.remove('refreshed');
        void grid.offsetWidth;                  // 重新触发动画
        grid.classList.add('refreshed');
      }
      setTimeout(() => {
        ptr.classList.remove('refreshing');
        if (label) label.textContent = '下拉刷新';
        ptr.style.height = '0px';
      }, 650);
    }, 1100);
  }

  /* 触摸 */
  window.addEventListener('touchstart', (e) => begin(e.touches[0].clientY), { passive: true });
  window.addEventListener('touchmove', (e) => drag(e.touches[0].clientY, () => { if (e.cancelable) e.preventDefault(); }), { passive: false });
  window.addEventListener('touchend', end);

  /* 鼠标拖拽（桌面演示） */
  window.addEventListener('mousedown', (e) => { if (atTop()) begin(e.clientY); });
  window.addEventListener('mousemove', (e) => drag(e.clientY, () => e.preventDefault()));
  window.addEventListener('mouseup', end);
}

document.addEventListener('DOMContentLoaded', () => {
  initTagFilter();
  initCarousel();
  initPullRefresh();
});
