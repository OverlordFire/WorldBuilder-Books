async function openStoryView(view, storyId, userId) {
  const res  = await fetch(`${API_URL}/get-story?story_id=${storyId}&user_id=${userId}`);
  const data = await res.json();
  if (!data.success) return;

  const story   = data.story;
  const volumes = data.volumes || [];

  const genreOptions = ["","Fantasia","Ficção Científica","Romance","Terror","Mistério","Aventura","Drama","Comédia","Histórico","Distopia","Outro"];
  const statusOptions = ["","Em andamento","Pausado","Concluído","Abandonado"];

  function optionsHtml(list, current) {
    return list.map(o => `<option value="${o}" ${o === current ? "selected" : ""}>${o || "— selecione —"}</option>`).join("");
  }

  const attrsEl = document.createElement("div");
  attrsEl.className = "story-attrs";
  attrsEl.innerHTML = `
    <div class="story-attrs-block">
      <div class="story-attrs-title">Informações</div>
      <div class="story-attrs-grid">
        <div class="story-attr-field">
          <label>Gênero</label>
          <select class="story-attr-select" id="story-genre-${storyId}">
            ${optionsHtml(genreOptions, story.genre || "")}
          </select>
        </div>
        <div class="story-attr-field">
          <label>Status</label>
          <select class="story-attr-select" id="story-status-${storyId}">
            ${optionsHtml(statusOptions, story.status || "")}
          </select>
        </div>
      </div>
    </div>
    <div class="story-attrs-block">
      <div class="story-attr-field">
        <label>Sinopse</label>
        <textarea class="story-attr-textarea" id="story-synopsis-${storyId}" placeholder="Escreva uma breve descrição da história...">${escSt(story.synopsis || "")}</textarea>
      </div>
    </div>

    <div class="story-save-row">
      <button class="story-save-btn" id="story-save-btn-${storyId}">Salvar Alterações</button>
      <span class="story-save-status" id="story-save-status-${storyId}"></span>
    </div>

    <div class="story-attrs-block">
      <div class="story-volumes-header">
        <div class="story-attrs-title">Volumes</div>
        <button class="story-add-btn" id="story-add-vol-${storyId}">
          <i class="bi bi-plus"></i> Adicionar Volume
        </button>
      </div>
      <div class="story-volumes-list" id="story-volumes-list-${storyId}"></div>
    </div>
  `;
  view.appendChild(attrsEl);

  const saveBtn  = view.querySelector(`#story-save-btn-${storyId}`);
  const statusEl = view.querySelector(`#story-save-status-${storyId}`);
  saveBtn.addEventListener("click", async () => {
    const genre    = view.querySelector(`#story-genre-${storyId}`).value;
    const status   = view.querySelector(`#story-status-${storyId}`).value;
    const synopsis = view.querySelector(`#story-synopsis-${storyId}`).value;
    saveBtn.disabled     = true;
    statusEl.textContent = "Salvando...";
    statusEl.className   = "story-save-status";
    try {
      const r = await fetch(`${API_URL}/update-story`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: storyId, user_id: userId, genre, status, synopsis })
      });
      const d = await r.json();
      if (d.success) {
        statusEl.textContent = "✓ Salvo";
        statusEl.className   = "story-save-status saved";
        setTimeout(() => { statusEl.textContent = ""; }, 2000);
      } else {
        statusEl.textContent = "Erro ao salvar";
        statusEl.className   = "story-save-status error";
      }
    } catch {
      statusEl.textContent = "Sem conexão";
      statusEl.className   = "story-save-status error";
    } finally {
      saveBtn.disabled = false;
    }
  });

  const volList = view.querySelector(`#story-volumes-list-${storyId}`);
  volumes.forEach(vol => renderVolume(volList, vol, storyId, userId));

  view.querySelector(`#story-add-vol-${storyId}`).addEventListener("click", async () => {
    const count = volList.querySelectorAll(".story-volume-block").length + 1;
    const defaultName = `Volume ${count}`;
    const r = await fetch(`${API_URL}/create-volume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story_id: storyId, user_id: userId, name: defaultName })
    });
    const d = await r.json();
    if (d.success) renderVolume(volList, { id: d.id, name: d.name, chapters: [] }, storyId, userId);
  });
}

function renderVolume(container, vol, storyId, userId) {
  const block = document.createElement("div");
  block.className = "story-volume-block";
  block.dataset.volumeId = vol.id;

  block.innerHTML = `
    <div class="story-volume-header">
      <i class="bi bi-chevron-down story-volume-chevron"></i>
      <span class="story-volume-name">${escSt(vol.name)}</span>
      <div class="story-volume-actions">
        <button class="story-icon-btn rename-vol" title="Renomear"><i class="bi bi-pencil"></i></button>
        <button class="story-icon-btn delete delete-vol" title="Deletar"><i class="bi bi-trash3"></i></button>
      </div>
    </div>
    <div class="story-chapters-list"></div>
    <div class="story-add-chapter-row">
      <i class="bi bi-plus"></i> Adicionar Capítulo
    </div>
  `;

  const header    = block.querySelector(".story-volume-header");
  const chList    = block.querySelector(".story-chapters-list");
  const addChRow  = block.querySelector(".story-add-chapter-row");

  header.addEventListener("click", (e) => {
    if (e.target.closest(".story-icon-btn")) return;
    block.classList.toggle("collapsed");
  });

  block.querySelector(".rename-vol").addEventListener("click", () => {
    const current = block.querySelector(".story-volume-name").textContent;
    openVolumeModal(async (name) => {
      const r = await fetch(`${API_URL}/rename-volume`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume_id: vol.id, user_id: userId, name })
      });
      const d = await r.json();
      if (d.success) block.querySelector(".story-volume-name").textContent = name;
    }, { title: "Rename Volume", confirmText: "Save", defaultValue: current });
  });
  block.querySelector(".delete-vol").addEventListener("click", () => {
    const name = block.querySelector(".story-volume-name").textContent;
    window.openDeleteModal({
      message: `Deletar "${name}" e todos os capítulos?`,
      onConfirm: async () => {
        const r = await fetch(`${API_URL}/delete-volume`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ volume_id: vol.id, user_id: userId })
        });
        const d = await r.json();
        if (d.success) block.remove();
      }
    });
  });

  addChRow.addEventListener("click", async () => {
    const count = chList.querySelectorAll(".story-chapter-row").length + 1;
    const defaultName = `Capítulo ${count}`;
    const r = await fetch(`${API_URL}/create-chapter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volume_id: vol.id, story_id: storyId, user_id: userId, name: defaultName })
    });
    const d = await r.json();
    if (d.success) renderChapter(chList, { id: d.id, name: d.name }, vol.id, userId);
  });

  (vol.chapters || []).forEach(ch => renderChapter(chList, ch, vol.id, userId));
  container.appendChild(block);
}

function renderChapter(container, ch, volumeId, userId) {
  const row = document.createElement("div");
  row.className = "story-chapter-row";
  row.dataset.chapterId = ch.id;
  row.innerHTML = `
    <i class="bi bi-file-text story-chapter-icon"></i>
    <span class="story-chapter-name" title="${escSt(ch.name)}">${escSt(ch.name)}</span>
    <div class="story-chapter-actions">
      <button class="story-icon-btn rename-ch" title="Renomear"><i class="bi bi-pencil"></i></button>
      <button class="story-icon-btn delete delete-ch" title="Deletar"><i class="bi bi-trash3"></i></button>
    </div>
  `;

  row.addEventListener("click", (e) => {
    if (e.target.closest(".story-icon-btn")) return;
    openChapterEditor(ch.id, ch.name, userId);
  });

  row.querySelector(".rename-ch").addEventListener("click", () => {
    const current = row.querySelector(".story-chapter-name").textContent;
    openVolumeModal(async (name) => {
      const r = await fetch(`${API_URL}/rename-chapter`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: ch.id, user_id: userId, name })
      });
      const d = await r.json();
      if (d.success) {
        row.querySelector(".story-chapter-name").textContent = name;
        row.querySelector(".story-chapter-name").title = name;
      }
    }, { defaultValue: current });
  });

  row.querySelector(".delete-ch").addEventListener("click", () => {
    const name = row.querySelector(".story-chapter-name").textContent;
    window.openDeleteModal({
      message: `Deletar capítulo "${name}"?`,
      onConfirm: async () => {
        const r = await fetch(`${API_URL}/delete-chapter`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapter_id: ch.id, user_id: userId })
        });
        const d = await r.json();
        if (d.success) row.remove();
      }
    });
  });

  container.appendChild(row);
}

async function openChapterEditor(chapterId, chapterName, userId) {
  const res  = await fetch(`${API_URL}/get-chapter?chapter_id=${chapterId}&user_id=${userId}`);
  const data = await res.json();
  if (!data.success) return;

  const ch = data.chapter;

  const overlay = document.createElement("div");
  overlay.className = "chapter-editor-overlay";
  overlay.innerHTML = `
    <div class="chapter-editor-topbar">
      <button class="chapter-editor-back"><i class="bi bi-arrow-left"></i> Voltar</button>
      <div class="chapter-editor-title-wrap">
        <input class="chapter-editor-title" value="${escSt(ch.name)}" spellcheck="false">
      </div>
      <div class="chapter-editor-status" id="ch-save-status">
        <i class="bi bi-check-circle-fill"></i> Salvo
      </div>
      <div class="chapter-editor-wordcount" id="ch-wordcount">Palavras: 0</div>
    </div>
    <div class="chapter-editor-body">
      <div class="chapter-editor-subtitle-wrap">
        <input class="chapter-editor-subtitle" placeholder="Subtítulo ou nota do capítulo..." value="">
      </div>
      <hr class="chapter-editor-divider">
      <textarea class="chapter-editor-textarea" placeholder="Era uma manhã fria...">${escSt(ch.content || "")}</textarea>
    </div>
  `;

  document.body.appendChild(overlay);

  const textarea   = overlay.querySelector(".chapter-editor-textarea");
  const titleInput = overlay.querySelector(".chapter-editor-title");
  const statusEl   = overlay.querySelector("#ch-save-status");
  const wordEl     = overlay.querySelector("#ch-wordcount");

  function countWords(text) {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }
  function updateWordCount() {
    wordEl.textContent = `Palavras: ${countWords(textarea.value).toLocaleString("pt-BR")}`;
  }
  updateWordCount();

  let saveTimer = null;
  function markUnsaved() {
    statusEl.classList.remove("saved");
    statusEl.innerHTML = '<i class="bi bi-clock"></i> Salvando...';
  }
  async function autoSave() {
    try {
      const r = await fetch(`${API_URL}/save-chapter`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: chapterId, user_id: userId, content: textarea.value })
      });
      const d = await r.json();
      if (d.success) {
        statusEl.classList.add("saved");
        statusEl.innerHTML = '<i class="bi bi-check-circle-fill"></i> Salvo automaticamente ✓';
      }
    } catch {}
  }

  textarea.addEventListener("input", () => {
    updateWordCount();
    markUnsaved();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(autoSave, 1200);
  });

  titleInput.addEventListener("change", async () => {
    const name = titleInput.value.trim();
    if (!name) return;
    await fetch(`${API_URL}/rename-chapter`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapter_id: chapterId, user_id: userId, name })
    });
    const row = document.querySelector(`.story-chapter-row[data-chapter-id="${chapterId}"]`);
    if (row) {
      const nameEl = row.querySelector(".story-chapter-name");
      if (nameEl) { nameEl.textContent = name; nameEl.title = name; }
    }
  });

  overlay.querySelector(".chapter-editor-back").addEventListener("click", async () => {
    clearTimeout(saveTimer);
    await autoSave();
    overlay.remove();
  });
}

function escSt(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openVolumeModal(callback, opts) {
  window.openSharedModal({
    title: (opts && opts.title) || "Edit Name",
    confirmText: (opts && opts.confirmText) || "Save",
    defaultValue: (opts && opts.defaultValue) || "",
    onConfirm: async (name) => { await callback(name); }
  });
}

window.openStoryView = openStoryView;