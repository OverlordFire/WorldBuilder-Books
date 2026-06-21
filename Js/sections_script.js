let activeSection = null;
// ===== CARREGAR ITENS DO BANCO =====
async function loadUserItems(userId) {
  try {
    const res  = await fetch(`https://worldbuilder-b.onrender.com/get-items?user_id=${userId}`);
    const data = await res.json();
    if (!data.success) return;

    for (const [section, items] of Object.entries(data.items)) {
      for (const item of items) {
        addCardToList(section, item.id, item.name);
      }
    }
  } catch (e) {
    console.error("Erro ao carregar itens:", e);
  }
}

window.loadUserItems = loadUserItems;

const sectionIcons = {
  Stories:    "bi-feather",
  Characters: "bi-person-fill",
  Locations:  "bi-geo-alt-fill",
  Objects:    "bi-box-fill"
};

const sectionMap = {
  Stories:    "B-Stories",
  Characters: "C-Characters",
  Locations:  "D-Locations",
  Objects:    "E-Objects"
};
// ===== OPEN MODAL =====
document.querySelectorAll('.btn-add').forEach(button => {
  button.addEventListener('click', () => {
    activeSection = button.dataset.section;
    document.getElementById('create-modal').classList.add('open');
  });
});
// ===== CANCEL MODAL =====
document.querySelectorAll('.modal-btn-cancel').forEach(button => {
  button.addEventListener('click', () => {
    document.getElementById('create-modal').classList.remove('open');
    document.getElementById('modal-name-input').value = '';
    document.getElementById('modal-name-input').style.borderColor = '';
  });
});
// ===== CONFIRM MODAL (salvar no banco) =====
document.getElementById('modal-confirm').addEventListener('click', async () => {
  const name    = document.getElementById('modal-name-input').value.trim();
  const userId  = window.currentUserId;

  if (!name) {
    document.getElementById('modal-name-input').placeholder = 'Enter a name...';
    document.getElementById('modal-name-input').style.borderColor = 'red';
    return;
  }

  if (!userId) {
    alert('You must be logged in to create items.');
    return;
  }

  try {
    const res  = await fetch('https://worldbuilder-b.onrender.com/create-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: activeSection, name, user_id: userId })
    });
    const data = await res.json();

    if (data.success) {
      addCardToList(activeSection, data.id, data.name);
      document.getElementById('create-modal').classList.remove('open');
      document.getElementById('modal-name-input').value = '';
      document.getElementById('modal-name-input').style.borderColor = '';
    } else {
      alert(data.error || 'Failed to create item.');
    }
  } catch {
    alert('Unable to connect to the server.');
  }
});

// ===== CLIQUE NO CARD =====
function attachCardClick(card, section) {
  card.addEventListener('click', () => {
    const sectionId = sectionMap[section];
    const sectionEl = sectionId
      ? document.getElementById(sectionId)
      : card.closest('section');

    // Remove active de todos os cards da seção
    sectionEl.querySelectorAll('.section-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    const name      = card.querySelector('.card-name').innerText;
    const thumbIcon = card.querySelector('.card-thumb i').className;
    const content   = sectionEl.querySelector('.section-content');

    content.innerHTML = `
      <div class="item-view">
        <div class="item-view-header">
          <div class="item-view-thumb"><i class="${thumbIcon}"></i></div>
          <div class="item-view-name-wrap">
            <span class="item-view-name">${name}</span>
            <button class="item-view-edit-btn" title="Edit name">
              <i class="bi bi-pencil"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });
}

// ===== ADICIONAR CARD NA LISTA =====
function addCardToList(section, id, name) {

  const sectionEl = document.getElementById(sectionMap[section]);
  if (!sectionEl) return;

  const list = sectionEl.querySelector('.section-list');
  if (!list) return;

  const icon = sectionIcons[section] || 'bi-file';

  const card = document.createElement('div');
  card.className = 'section-card';
  card.dataset.id = id;
  card.innerHTML = `
    <div class="card-thumb"><i class="bi ${icon}"></i></div>
    <div class="card-info">
      <span class="card-name">${name}</span>
    </div>
  `;
  list.appendChild(card);
  attachCardClick(card, section);
}

// ===== ATIVAR CLIQUE NOS CARDS JÁ EXISTENTES NO HTML =====
document.querySelectorAll('section').forEach(sectionEl => {
  const sectionId = sectionEl.id;
  const section   = Object.keys(sectionMap).find(k => sectionMap[k] === sectionId);
  sectionEl.querySelectorAll('.section-card').forEach(card => {
    attachCardClick(card, section);
  });
});
