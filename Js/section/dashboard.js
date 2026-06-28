document.addEventListener("DOMContentLoaded", () => {

  document.querySelectorAll(".dash-stat-card[data-nav]").forEach(card => {
    card.addEventListener("click", () => {
      const target = card.getAttribute("data-nav");
      if (target) {
        window.location.hash = target.replace("#", "");
      }
    });
  });

  const btnNewStory = document.getElementById("dash-btn-new-story");
  if (btnNewStory) {
    btnNewStory.addEventListener("click", () => {
      triggerModal("Stories");
    });
  }

  const btnNewChar = document.getElementById("dash-btn-new-char");
  if (btnNewChar) {
    btnNewChar.addEventListener("click", () => {
      triggerModal("Characters");
    });
  }

  function triggerModal(section) {
    const btn = document.querySelector(`.btn-add[data-section="${section}"]`);
    if (btn) btn.click();
  }
});

function updateDashboard(sectionItems) {
  const chars   = (sectionItems.Characters || []).length;
  const locs    = (sectionItems.Locations  || []).length;
  const objs    = (sectionItems.Objects    || []).length;
  const stories = (sectionItems.Stories    || []).length;

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl("dash-count-stories",    stories);
  setEl("dash-count-characters", chars);
  setEl("dash-count-locations",  locs);
  setEl("dash-count-objects",    objs);
  setEl("dash-sum-chars",   chars);
  setEl("dash-sum-locs",    locs);
  setEl("dash-sum-stories", stories);
  setEl("dash-sum-objs",    objs);

  renderRecentStories(sectionItems.Stories || []);
}

function renderRecentStories(storyItems) {
  const list = document.getElementById("dash-stories-list");
  if (!list) return;

  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const recent = storyItems
    .filter(s => {
      if (!s.last_accessed) return false;
      const t = new Date(s.last_accessed).getTime();
      return !isNaN(t) && (now - t) <= ONE_WEEK_MS;
    })
    .sort((a, b) => new Date(b.last_accessed) - new Date(a.last_accessed))
    .slice(0, 5);

  if (recent.length === 0) {
    list.innerHTML = `
      <div class="dash-empty-state">
        <div class="dash-empty-state-icon"><i class="bi bi-feather"></i></div>
        <p>Nenhuma história recente.</p>
      </div>`;
    return;
  }
  list.innerHTML = recent.map(story => {
    const ago = timeAgo(new Date(story.last_accessed));
    return `
    <div class="dash-story-card" data-story-id="${story.id}">
      <div class="dash-story-icon"><i class="bi bi-feather"></i></div>
      <div class="dash-story-info">
        <span class="dash-story-name">${escapeHtml(story.name)}</span>
        <span class="dash-story-time">${ago}</span>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll(".dash-story-card").forEach(card => {
    card.addEventListener("click", () => {
      const storyId = card.dataset.storyId;
      if (window.openStoryById) window.openStoryById(storyId);
      else window.location.hash = "B-Stories";
    });
  });
}
function timeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return "agora mesmo";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)} dias`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

window.updateDashboard = updateDashboard;
