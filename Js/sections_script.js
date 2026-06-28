const ITEMS_PER_PAGE = 20;

const sectionIcons = {
  Stories:    "bi-feather",
  Characters: "bi-person-fill",
  Locations:  "bi-geo-alt-fill",
  Objects:    "bi-box-fill"
};
const sectionThumbClass = {
  Stories:    "thumb-stories",
  Characters: "thumb-characters",
  Locations:  "thumb-locations",
  Objects:    "thumb-objects"
};
const sectionMap = {
  Stories:    "B-Stories",
  Characters: "C-Characters",
  Locations:  "D-Locations",
  Objects:    "E-Objects"
};
const API_URL = "http://127.0.0.1:5000";
const sectionItems = { Stories: [], Characters: [], Locations: [], Objects: [] };
const sectionPage  = { Stories: 1,  Characters: 1,  Locations: 1,  Objects: 1  };
const sectionView  = { Stories: "list", Characters: "list", Locations: "list", Objects: "list" };

let activeSection = null;
// ===== INICIALIZA CONTROLES DE CADA SEÇÃO =====
document.addEventListener("DOMContentLoaded", () => {
  Object.keys(sectionMap).forEach(section => {
    const sectionEl = document.getElementById(sectionMap[section]);
    if (!sectionEl) return;

    const tab = sectionEl.querySelector(".section-tab");

    const actions = document.createElement("div");
    actions.className = "section-tab-actions";

    const btnAdd = tab.querySelector(".btn-add");
    tab.removeChild(btnAdd);

    const viewToggle = document.createElement("div");
    viewToggle.className = "view-toggle";
    viewToggle.innerHTML = `
      <button class="view-btn active" data-view="list" title="List view">
        <i class="bi bi-list-ul"></i>
      </button>
      <button class="view-btn" data-view="grid" title="Grid view">
        <i class="bi bi-grid-fill"></i>
      </button>
    `;

    viewToggle.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        sectionView[section] = btn.dataset.view;
        viewToggle.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderSection(section);
      });
    });

    actions.appendChild(viewToggle);
    actions.appendChild(btnAdd);
    tab.appendChild(actions);

    const list = sectionEl.querySelector(".section-list");
    const pagination = document.createElement("div");
    pagination.className = "section-pagination";
    list.after(pagination);
  });
});
// ===== RENDERIZA PÁGINA ATUAL DE UMA SEÇÃO =====
function renderSection(section) {
  const sectionEl = document.getElementById(sectionMap[section]);
  if (!sectionEl) return;

  const list  = sectionEl.querySelector(".section-list");
  const pagEl = sectionEl.querySelector(".section-pagination");
  const items = sectionItems[section];
  const view  = sectionView[section];
  const page  = sectionPage[section];

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  if (page > totalPages) sectionPage[section] = totalPages;
  const curPage = sectionPage[section];

  const start = (curPage - 1) * ITEMS_PER_PAGE;
  const slice = items.slice(start, start + ITEMS_PER_PAGE);

  list.innerHTML = "";
  if (view === "grid") {
    list.classList.add("grid-view");
  } else {
    list.classList.remove("grid-view");
  }

  slice.forEach(item => {
    const card = buildCard(section, item.id, item.name);
    list.appendChild(card);
  });

  renderPagination(pagEl, section, curPage, totalPages);
}
// ===== RENDERIZA PAGINAÇÃO =====
function renderPagination(container, section, curPage, totalPages) {
  container.innerHTML = "";
  if (totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.className = "page-btn";
  prev.textContent = "‹";
  prev.disabled = curPage === 1;
  prev.addEventListener("click", () => {
    sectionPage[section] = curPage - 1;
    renderSection(section);
  });
  container.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (i === curPage ? " active" : "");
    btn.textContent = i;
    const p = i;
    btn.addEventListener("click", () => {
      sectionPage[section] = p;
      renderSection(section);
    });
    container.appendChild(btn);
  }

  const next = document.createElement("button");
  next.className = "page-btn";
  next.textContent = "›";
  next.disabled = curPage === totalPages;
  next.addEventListener("click", () => {
    sectionPage[section] = curPage + 1;
    renderSection(section);
  });
  container.appendChild(next);
}
// ===== CONSTRÓI UM CARD =====
function buildCard(section, id, name) {
  const icon = sectionIcons[section] || "bi-file";

  const card = document.createElement("div");
  card.className = "section-card";
  card.dataset.id = id;
  const thumbClass = sectionThumbClass[section] || "";
  const itemData = sectionItems[section]?.find(i => i.id === id);
  const cardThumbInner = itemData?.image
    ? `<img class="thumb-img" src="${itemData.image}" alt="thumb">`
    : `<i class="bi ${icon}"></i>`;
 card.innerHTML = `
    <div class="card-thumb ${thumbClass}">${cardThumbInner}</div>
      <span class="card-name" title="${name}">${name}</span>
    </div>
    <button class="card-delete" title="Delete">
      <i class="bi bi-trash3"></i>
    </button>
  `;

  card.querySelector(".card-delete").addEventListener("click", async (e) => {
    e.stopPropagation();
    await deleteItem(section, id, card);
  });

  card.addEventListener("click", () => {
    const currentName = card.querySelector(".card-name")?.textContent || name;
    openItemView(section, card, currentName, icon);
  });

  return card;
}
// ===== ABRIR ITEM VIEW =====
async function openItemView(section, card, name, icon) {
  const sectionEl = document.getElementById(sectionMap[section]);
  if (!sectionEl) return;

  sectionEl.querySelectorAll(".section-card").forEach(c => c.classList.remove("active"));
  card.classList.add("active");

  const content = sectionEl.querySelector(".section-content");
  const itemId  = card.dataset.id;
  const thumbCls = sectionThumbClass[section] || "";
  const sectionSingularMap = { Stories: "Story", Characters: "Character", Locations: "Location", Objects: "Object" };
  const categoryTitle = `<div class="item-category-title">Edit ${sectionSingularMap[section] || section}</div>`;
  const item = sectionItems[section]?.find(i => i.id === Number(itemId));
  const existingImage = item?.image || "";
  const thumbInner = existingImage
    ? `<img class="thumb-img" src="${existingImage}" alt="thumb">`
    : `<i class="bi ${icon} thumb-default-icon"></i>`;

  content.innerHTML = `
    <div class="item-view">
      ${categoryTitle}
      <div class="item-view-header">
        <div class="thumb-col">
          <div class="thumb-upload-wrap" title="Clique ou arraste uma imagem">
            <div class="item-view-thumb ${thumbCls}">${thumbInner}</div>
            <div class="thumb-upload-overlay"><i class="bi bi-camera-fill"></i></div>
            <input type="file" class="thumb-file-input" accept="image/*" style="display:none">
          </div>
          <p class="thumb-notice">Clique ou arraste uma imagem</p>
        </div>
        <div class="item-view-name-wrap">
          <span class="item-view-name">${name}</span>
          <button class="item-view-edit-btn" title="Edit name">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="item-view-dice-btn" title="Rolar dado">
            <i class="bi bi-dice-5-fill"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  const editBtn = content.querySelector(".item-view-edit-btn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const currentName = content.querySelector(".item-view-name")?.textContent || name;
      if (window.openRenameModal) window.openRenameModal(section, itemId, card, currentName);
    });
  }

  const thumbWrap = content.querySelector(".thumb-upload-wrap");
  const fileInput = content.querySelector(".thumb-file-input");
  const thumbEl   = content.querySelector(".item-view-thumb");

  function applyThumbImage(dataUrl) {
    thumbEl.innerHTML = `<img class="thumb-img" src="${dataUrl}" alt="thumb">`;
  }

  async function uploadThumb(dataUrl) {
    const userId = window.currentUserId;
    if (!userId) return;
    try {
      const res = await fetch(`${API_URL}/upload-thumb`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, id: Number(itemId), user_id: userId, image: dataUrl })
      });
      const data = await res.json();
      if (data.success) {
        const it = sectionItems[section]?.find(i => i.id === Number(itemId));
        if (it) it.image = dataUrl;
        // Update card thumb in the list
        const cardThumbEl = card.querySelector(".card-thumb");
        if (cardThumbEl) cardThumbEl.innerHTML = `<img class="thumb-img" src="${dataUrl}" alt="thumb">`;
      }
    } catch {}
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      applyThumbImage(e.target.result);
      await uploadThumb(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  thumbWrap.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
  thumbWrap.addEventListener("dragover", (e) => { e.preventDefault(); thumbWrap.classList.add("drag-over"); });
  thumbWrap.addEventListener("dragleave", () => thumbWrap.classList.remove("drag-over"));
  thumbWrap.addEventListener("drop", (e) => {
    e.preventDefault();
    thumbWrap.classList.remove("drag-over");
    handleFile(e.dataTransfer.files[0]);
  });

  const view = content.querySelector(".item-view");
  if (section === "Stories")    await openStoryView(view, itemId, window.currentUserId);
  if (section === "Characters") await openCharacterView(view, itemId, window.currentUserId);
  if (section === "Objects")    await openObjectView(view, itemId, window.currentUserId);
  if (section === "Locations")  await openLocationView(view, itemId, window.currentUserId);
}
// ===== DELETAR ITEM =====
async function deleteItem(section, id, card) {
  const userId = window.currentUserId;
  if (!userId) return;

  try {
    const res  = await fetch(`${API_URL}/delete-item`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, id, user_id: userId })
    });
    const data = await res.json();
    if (data.success) {
      sectionItems[section] = sectionItems[section].filter(i => i.id !== id);

      const sectionEl = document.getElementById(sectionMap[section]);
      if (card.classList.contains("active")) {
        const content = sectionEl?.querySelector(".section-content");
        if (content) {
          content.innerHTML = `<p class="section-placeholder">Select an existing item or create a new one to begin.</p>`;
        }
      }

      renderSection(section);
    } else {
      alert(data.error || "Failed to delete item.");
    }
  } catch {
    alert("Unable to connect to the server.");
  }
}
// ===== ADICIONAR CARD NA LISTA =====
function addCardToList(section, id, name, extra = {}) {
  if (!sectionItems[section]) return;
  sectionItems[section].push({ id, name, ...extra });

  const total = sectionItems[section].length;
  sectionPage[section] = Math.ceil(total / ITEMS_PER_PAGE);

  renderSection(section);
  if (window.updateDashboard) window.updateDashboard(sectionItems);
}
// ===== CARREGAR ITENS DO BANCO =====
async function loadUserItems(userId) {
  try {
    const res  = await fetch(`${API_URL}/get-items?user_id=${userId}`);
    const data = await res.json();
    if (!data.success) return;

    for (const [section, items] of Object.entries(data.items)) {
      sectionItems[section] = items;
      sectionPage[section]  = 1;
      renderSection(section);     
    }
    if (window.updateDashboard) window.updateDashboard(sectionItems);
  } catch (e) {
    console.error("Erro ao carregar itens:", e);
  }
}
window.loadUserItems = loadUserItems;

window.openStoryById = async function(storyId) {
  window.location.hash = 'B-Stories';
  await new Promise(r => setTimeout(r, 80));
  const card = document.querySelector(`#B-Stories .section-card[data-id='${storyId}']`);
  if (card) card.click();
};
// ===== LIMPAR SELEÇÃO AO NAVEGAR =====
function clearSectionSelection(sectionId) {
  const sectionEl = document.getElementById(sectionId);
  if (!sectionEl) return;
  sectionEl.querySelectorAll(".section-card").forEach(c => c.classList.remove("active"));
  const content = sectionEl.querySelector(".section-content");
  if (content) {
    content.innerHTML = `<p class="section-placeholder">Select an existing item or create a new one to begin.</p>`;
  }
}

let lastHash = window.location.hash;
window.addEventListener("hashchange", () => {
  const oldHash = lastHash;
  lastHash = window.location.hash;
  if (oldHash && oldHash !== lastHash) {
    const oldId = oldHash.replace("#", "");
    clearSectionSelection(oldId);
  }
});
// ===== MODAL UNIFICADO =====
const sectionSingular = {
  Stories: "Story", Characters: "Character", Locations: "Location", Objects: "Object"
};

document.addEventListener("DOMContentLoaded", () => {
  const modal      = document.getElementById("shared-modal");
  const titleEl    = document.getElementById("shared-modal-title");
  const input      = document.getElementById("shared-modal-input");
  const errorEl    = document.getElementById("shared-modal-error");
  const cancelBtn  = document.getElementById("shared-modal-cancel");
  const confirmBtn = document.getElementById("shared-modal-confirm");

  function closeSharedModal() {
    modal.classList.remove("open");
    input.value = "";
    errorEl.textContent = "";
    input.style.borderColor = "";
    modal._onConfirm = null;
  }

  cancelBtn.addEventListener("click", closeSharedModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeSharedModal(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmBtn.click();
    if (e.key === "Escape") closeSharedModal();
  });

  confirmBtn.addEventListener("click", async () => {
    const name = input.value.trim();
    if (!name) {
      input.style.borderColor = "red";
      errorEl.textContent = "O nome não pode estar vazio.";
      return;
    }
    confirmBtn.disabled = true;
    errorEl.textContent = "";
    let shouldClose = true;
    if (modal._onConfirm) {
      try {
        const result = await modal._onConfirm(name);
        if (result && result.error) {
          errorEl.textContent = result.error;
          input.style.borderColor = "red";
          shouldClose = false;
        }
      } catch {
        errorEl.textContent = "Sem conexão com o servidor.";
        shouldClose = false;
      }
    }
    confirmBtn.disabled = false;
    if (shouldClose) closeSharedModal();
  });

  window.openSharedModal = function({ title, confirmText = "Confirm", defaultValue = "", onConfirm }) {
    titleEl.textContent = title;
    confirmBtn.textContent = confirmText;
    input.value = defaultValue;
    errorEl.textContent = "";
    input.style.borderColor = "";
    modal._onConfirm = onConfirm;
    modal.classList.add("open");
    setTimeout(() => { input.focus(); if (defaultValue) input.select(); }, 80);
  };

  window.openRenameModal = function(section, id, card, currentName) {
    window.openSharedModal({
      title: "Edit Name",
      confirmText: "Save",
      defaultValue: currentName,
      onConfirm: async (name) => {
        const userId = window.currentUserId;
        if (!userId) return { error: "Not logged in." };
        try {
          const res = await fetch(`${API_URL}/rename-item`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section, id: Number(id), user_id: userId, name })
          });
          const data = await res.json();
          if (data.success) {
            const item = sectionItems[section]?.find(i => i.id === Number(id));
            if (item) item.name = name;
            if (card) {
              const nameSpan = card.querySelector(".card-name");
              if (nameSpan) nameSpan.textContent = name;
            }
            const sectionEl = document.getElementById(sectionMap[section]);
            const viewName = sectionEl?.querySelector(".item-view-name");
            if (viewName) viewName.textContent = name;
          } else {
            return { error: data.error || "Erro ao salvar." };
          }
        } catch {
          return { error: "Sem conexão com o servidor." };
        }
      }
    });
  };
});

document.querySelectorAll(".btn-add").forEach(button => {
  button.addEventListener("click", () => {
    activeSection = button.dataset.section;
    const label = sectionSingular[activeSection] || activeSection;
    window.openSharedModal({
      title: "New " + label,
      confirmText: "Create",
      onConfirm: async (name) => {
        const userId = window.currentUserId;
        if (!userId) return { error: "You must be logged in to create items." };
        try {
          const res = await fetch(`${API_URL}/create-item`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section: activeSection, name, user_id: userId })
          });
          const data = await res.json();
          if (data.success) {
            const extra = activeSection === "Stories" ? { last_accessed: new Date().toISOString() } : {};
            addCardToList(activeSection, data.id, data.name, extra);
          } else {
            return { error: data.error || "Failed to create item." };
          }
        } catch {
          return { error: "Unable to connect to the server." };
        }
      }
    });
  });
});
// ===== MODAL DELETE =====
document.addEventListener("DOMContentLoaded", () => {
  const modal      = document.getElementById("delete-modal");
  const messageEl  = document.getElementById("delete-modal-message");
  const cancelBtn  = document.getElementById("delete-modal-cancel");
  const confirmBtn = document.getElementById("delete-modal-confirm");

  function closeDeleteModal() {
    modal.classList.remove("open");
    modal._onConfirm = null;
  }

  cancelBtn.addEventListener("click", closeDeleteModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeDeleteModal(); });

  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;
    if (modal._onConfirm) await modal._onConfirm();
    confirmBtn.disabled = false;
    closeDeleteModal();
  });

  window.openDeleteModal = function({ message, onConfirm }) {
    messageEl.textContent = message;
    modal._onConfirm = onConfirm;
    modal.classList.add("open");
  };
});