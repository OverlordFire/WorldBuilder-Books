/* ===== DADOS DOS SELECTS DE PERSONAGEM ===== */
const STORY_ROLES = [
  "Protagonista", "Co-protagonista", "Antagonista", "Secundário",
  "Mentor", "Rival", "Aliado", "Figurante"
];
const CHAR_CLASSES = [
  "Herói", "Vilão", "Guerreiro", "Mago", "Arqueiro", "Cavaleiro",
  "Ferreiro", "Alquimista", "Sacerdote", "Mercador", "Assassino",
"Caçador", "Bárbaro", "Monge", "Bardo", "Druida", "Invocador",
  "Necromante", "Curandeiro", "Cientista", "Inventor", "Fazendeiro","Outro"
];
const CHAR_RACES = [
  "Humano", "Elfo", "Elfo Sombrio", "Alto Elfo",
  "Anão", "Halfling", "Gnomo", "Orc", "Meio-Orc",
  "Meio-Elfo", "Tiefling", "Draconato", "Aasimar",
  "Genasi", "Firbolg", "Goliath", "Tabaxi", "Kenku",
  "Lagarto", "Tritão", "Outro"
];

function buildSelectOptions(values, selected) {
  const blank = `<option value="">— Selecionar —</option>`;
  return blank + values.map(v =>
    `<option value="${v}"${v === selected ? " selected" : ""}>${v}</option>`
  ).join("");
}

/* ===== CARREGA E RENDERIZA ATRIBUTOS DO PERSONAGEM ===== */
async function openCharacterView(view, itemId, userId) {
  if (!userId) return;

  let story_role = "", character_class = "",class_custom = "", race = "", race_custom = "", gender = "N/A", description = "";
  try {
    const res  = await fetch(`${API_URL}/get-item?section=Characters&id=${itemId}&user_id=${userId}`);
    const data = await res.json();
    if (data.success) {
      story_role  = data.item.story_role  || "";
      gender      = data.item.gender      || "N/A";
      description = data.item.description || "";
      
      const savedClass = data.item.character_class || "";
      const classInList = CHAR_CLASSES.slice(0, -1);
      if (savedClass && !classInList.includes(savedClass)) {
        character_class = "Outro";
        class_custom    = savedClass;
      } else {
        character_class = savedClass;
      }

      const savedRace = data.item.race || "";
      const raceInList = CHAR_RACES.slice(0, -1);
      if (savedRace && !raceInList.includes(savedRace)) {
        if (savedRace && !CHAR_RACES.includes(savedRace)) {
          race        = "Outro";
          race_custom = savedRace;
        } else {
          race = savedRace;
        }
      }
    }
  } 
  catch { /* silently skip */ }
  const isClassOutro = character_class === "Outro";
  const isRaceOutro  = race === "Outro";
  
  const attrsEl = document.createElement("div");
  attrsEl.className = "char-attrs";
  attrsEl.innerHTML = `
    <div class="char-attrs-block">
      <div class="char-attrs-title">Identidade</div>
      <div class="char-attrs-grid">
        <div class="char-attr-field">
          <label>Papel/Titulo</label>
          <select class="char-attr-select" id="attr-story-role">
            ${buildSelectOptions(STORY_ROLES, story_role)}
          </select>
        </div>
        <div class="char-attr-field">
          <label>Classe</label>
          <select class="char-attr-select" id="attr-class">
            ${buildSelectOptions(CHAR_CLASSES, character_class)}
          </select>
          <input
            type="text"
            class="char-attr-input"
            id="attr-class-custom"
            placeholder="Digite a classe..."
            value="${class_custom}"
            style="display:${isClassOutro ? "block" : "none"}; margin-top: 6px;"
          >
        </div>
        <div class="char-attr-field">
          <label>Raça</label>
          <select class="char-attr-select" id="attr-race">
            ${buildSelectOptions(CHAR_RACES, race)}
          </select>
          <input
            type="text"
            class="char-attr-input"
            id="attr-race-custom"
            placeholder="Digite a raça..."
            value="${race_custom}"
            style="display:${isRaceOutro ? "block" : "none"}; margin-top: 6px;"
          >
        </div>
        <div class="char-attr-field">
          <label>Gênero</label>
          <select class="char-attr-select" id="attr-gender">
            <option value="N/A"${gender === "N/A" ? " selected" : ""}>N/A</option>
            <option value="Masculino"${gender === "Masculino" ? " selected" : ""}>Masculino</option>
            <option value="Feminino"${gender === "Feminino" ? " selected" : ""}>Feminino</option>
          </select>
        </div>
      </div>
    </div>

    <div class="char-attrs-block">
      <div class="char-attrs-title">Visão Geral</div>
      <div class="char-attr-field">
        <label>Descrição</label>
        <textarea class="char-attr-textarea" id="attr-desc" placeholder="Escreva uma breve descrição do personagem...">${description}</textarea>
      </div>
    </div>

    <div class="char-save-row">
      <button class="char-save-btn" id="char-save-btn">Salvar Alterações</button>
      <span class="char-save-status" id="char-save-status"></span>
    </div>
  `;
  view.appendChild(attrsEl);

  const roleEl        = attrsEl.querySelector("#attr-story-role");
  const classEl       = attrsEl.querySelector("#attr-class");
  const classCustomEl = attrsEl.querySelector("#attr-class-custom");
  const raceEl        = attrsEl.querySelector("#attr-race");
  const raceCustomEl  = attrsEl.querySelector("#attr-race-custom");
  const genderEl      = attrsEl.querySelector("#attr-gender");
  const descEl        = attrsEl.querySelector("#attr-desc");
  const saveBtn       = attrsEl.querySelector("#char-save-btn");
  const statusEl      = attrsEl.querySelector("#char-save-status");

  classEl.addEventListener("change", () => {
    if (classEl.value === "Outro") {
      classCustomEl.style.display = "block";
      classCustomEl.focus();
    } else {
      classCustomEl.style.display = "none";
      classCustomEl.value = "";
    }
  });

  raceEl.addEventListener("change", () => {
    if (raceEl.value === "Outro") {
      raceCustomEl.style.display = "block";
      raceCustomEl.focus();
    } else {
      raceCustomEl.style.display = "none";
      raceCustomEl.value = "";
    }
  });
  saveBtn.addEventListener("click", async () => {
    const classValue = classEl.value === "Outro"
      ? (classCustomEl.value.trim() || "Outro")
      : classEl.value;
    const raceValue = raceEl.value === "Outro"
      ? (raceCustomEl.value.trim() || "Outro")
      : raceEl.value;

    saveBtn.disabled     = true;
    statusEl.textContent = "Salvando...";
    statusEl.className   = "char-save-status";
    try {
      const res  = await fetch(`${API_URL}/update-character`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(itemId),
          user_id: userId,
          story_role: roleEl.value,
          character_class: classValue,
          race: raceValue,
          gender: genderEl.value,
          description: descEl.value
        })
      });
      const data = await res.json();
      if (data.success) {
        statusEl.textContent = "✓ Salvo";
        statusEl.className   = "char-save-status saved";
        setTimeout(() => { statusEl.textContent = ""; }, 2000);
      } else {
        statusEl.textContent = "Erro ao salvar";
        statusEl.className   = "char-save-status error";
      }
    } catch {
      statusEl.textContent = "Sem conexão";
      statusEl.className   = "char-save-status error";
    } 
    finally {
      saveBtn.disabled = false;
    }
  });
}
