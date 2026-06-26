/* ===== DADOS DOS SELECTS DE OBJETO ===== */
const OBJ_TYPES = [
  "Arma", "Armadura", "Equipamento", "Ferramenta",
  "Artefato", "Consumível", "Livro", "Documento",
  "Joia", "Relíquia", "Instrumento","Outro"
];
const OBJ_ELEMENTS = [
  "Nenhum", "Fogo", "Água", "Terra",
  "Vento", "Raio", "Gelo", "Luz",
  "Trevas", "Natureza", "Veneno", "Metal",
  "Cristal", "Arcano", "Espírito", "Psíquico",
  "Tempo", "Espaço", "Caos", "Sangue", "Outro"
];
const OBJ_RARITIES = [
  "Comum", "Incomum","Raro", "Muito Raro", "Épico",
  "Lendário", "Mítico", "Único", "Divino",
];
const OBJ_STATUS = [
  "Normal", "Amaldiçoado", "Abençoado",
  "Quebrado", "Danificado", "Selado"
];
function buildObjSelectOptions(values, selected) {
  const blank = `<option value="">— Selecionar —</option>`;
  return blank + values.map(v =>
    `<option value="${v}"${v === selected ? " selected" : ""}>${v}</option>`
  ).join("");
}

/* ===== CARREGA E RENDERIZA ATRIBUTOS DO OBJETO ===== */
async function openObjectView(view, itemId, userId) {
  if (!userId) return;

  let obj_type = "", type_custom = "", element = "", element_custom = "",
      rarity = "", status = "", description = "";
  try {
    const res  = await fetch(`https://worldbuilder-b.onrender.com/get-item?section=Objects&id=${itemId}&user_id=${userId}`);
    const data = await res.json();
    if (data.success) {
      description = data.item.description || "";
      rarity      = data.item.rarity      || "";
      status      = data.item.status      || "";

      const savedType = data.item.obj_type || "";
      const typeInList = OBJ_TYPES.slice(0, -1);
      if (savedType && !typeInList.includes(savedType)) {
        obj_type    = "Outro";
        type_custom = savedType;
      } else {
        obj_type = savedType;
      }

      const savedElem = data.item.element || "";
      const elemInList = OBJ_ELEMENTS.slice(0, -1);
      if (savedElem && !elemInList.includes(savedElem)) {
        element        = "Outro";
        element_custom = savedElem;
      } else {
        element = savedElem;
      }
    }
  } catch { /* silently skip */ }

  const isTypeOutro = obj_type === "Outro";
  const isElemOutro = element  === "Outro";

  const attrsEl = document.createElement("div");
  attrsEl.className = "obj-attrs";
  attrsEl.innerHTML = `
    <div class="obj-attrs-block">
      <div class="obj-attrs-title">Identificação</div>
      <div class="obj-attrs-grid">
        <div class="obj-attr-field">
          <label>Tipo</label>
          <select class="obj-attr-select" id="obj-type">
            ${buildObjSelectOptions(OBJ_TYPES, obj_type)}
          </select>
          <input
            type="text"
            class="obj-attr-input"
            id="obj-type-custom"
            placeholder="Digite o tipo..."
            value="${type_custom}"
            style="display:${isTypeOutro ? "block" : "none"}; margin-top: 6px;"
          >
        </div>
        <div class="obj-attr-field">
          <label>Elemento</label>
          <select class="obj-attr-select" id="obj-element">
            ${buildObjSelectOptions(OBJ_ELEMENTS, element)}
          </select>
          <input
            type="text"
            class="obj-attr-input"
            id="obj-element-custom"
            placeholder="Digite o elemento..."
            value="${element_custom}"
            style="display:${isElemOutro ? "block" : "none"}; margin-top: 6px;"
          >
        </div>
        <div class="obj-attr-field">
          <label>Raridade</label>
          <select class="obj-attr-select" id="obj-rarity">
            ${buildObjSelectOptions(OBJ_RARITIES, rarity)}
          </select>
        </div>
        <div class="obj-attr-field">
          <label>Status</label>
          <select class="obj-attr-select" id="obj-status">
            ${buildObjSelectOptions(OBJ_STATUS, status)}
          </select>
        </div>
      </div>
    </div>

    <div class="obj-attrs-block">
      <div class="obj-attrs-title">Visão Geral</div>
      <div class="obj-attr-field">
        <label>Descrição</label>
        <textarea class="obj-attr-textarea" id="obj-desc" placeholder="Escreva uma breve descrição do objeto...">${description}</textarea>
      </div>
    </div>
    
    <div class="obj-save-row">
      <button class="obj-save-btn" id="obj-save-btn">Salvar Alterações</button>
      <span class="obj-save-status" id="obj-save-status"></span>
    </div>
  `;
  view.appendChild(attrsEl);

  const typeEl        = attrsEl.querySelector("#obj-type");
  const typeCustomEl  = attrsEl.querySelector("#obj-type-custom");
  const elemEl        = attrsEl.querySelector("#obj-element");
  const elemCustomEl  = attrsEl.querySelector("#obj-element-custom");
  const rarityEl      = attrsEl.querySelector("#obj-rarity");
  const statusEl2     = attrsEl.querySelector("#obj-status");
  const descEl        = attrsEl.querySelector("#obj-desc");
  const saveBtn       = attrsEl.querySelector("#obj-save-btn");
  const statusEl      = attrsEl.querySelector("#obj-save-status");

  typeEl.addEventListener("change", () => {
    if (typeEl.value === "Outro") {
      typeCustomEl.style.display = "block";
      typeCustomEl.focus();
    } else {
      typeCustomEl.style.display = "none";
      typeCustomEl.value = "";
    }
  });

  elemEl.addEventListener("change", () => {
    if (elemEl.value === "Outro") {
      elemCustomEl.style.display = "block";
      elemCustomEl.focus();
    } else {
      elemCustomEl.style.display = "none";
      elemCustomEl.value = "";
    }
  });

  saveBtn.addEventListener("click", async () => {
    const typeValue = typeEl.value === "Outro"
      ? (typeCustomEl.value.trim() || "Outro")
      : typeEl.value;
    const elemValue = elemEl.value === "Outro"
      ? (elemCustomEl.value.trim() || "Outro")
      : elemEl.value;

    saveBtn.disabled     = true;
    statusEl.textContent = "Salvando...";
    statusEl.className   = "obj-save-status";
    try {
      const res  = await fetch("https://worldbuilder-b.onrender.com/update-object", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(itemId),
          user_id: userId,
          obj_type: typeValue,
          element: elemValue,
          rarity: rarityEl.value,
          status: statusEl2.value,
          description: descEl.value
        })
      });
      const data = await res.json();
      if (data.success) {
        statusEl.textContent = "✓ Salvo";
        statusEl.className   = "obj-save-status saved";
        setTimeout(() => { statusEl.textContent = ""; }, 2000);
      } else {
        statusEl.textContent = "Erro ao salvar";
        statusEl.className   = "obj-save-status error";
      }
    } catch {
      statusEl.textContent = "Sem conexão";
      statusEl.className   = "obj-save-status error";
    } finally {
      saveBtn.disabled = false;
    }
  });
}
