/* ===== DADOS DOS SELECTS DE LOCALIZAÇÃO ===== */
const LOC_TYPES = [
  "Cidade", "Vila", "Reino", "Castelo", "Floresta", "Deserto",
  "Pântano", "Montanha", "Caverna", "Masmorra", "Ilha",
  "Templo", "Ruínas", "Planeta", "Mundo", "Outro"
];
const LOC_STATUS = [
  "Habitado", "Abandonado", "Em Ruínas", "Destruído",
  "Oculto", "Sagrado", "Amaldiçoado", "Desconhecido"
];
const LOC_PERIGO = [
  "Nenhum", "Baixo", "Médio", "Alto", "Extremo"
];
const LOC_REGIAO = [
  "Norte", "Sul", "Leste", "Oeste", "Centro", "Outro"
];

function buildLocSelectOptions(values, selected) {
  const blank = `<option value="">— Selecionar —</option>`;
  return blank + values.map(v =>
    `<option value="${v}"${v === selected ? " selected" : ""}>${v}</option>`
  ).join("");
}

/* ===== CARREGA E RENDERIZA ATRIBUTOS DA LOCALIZAÇÃO ===== */
async function openLocationView(view, itemId, userId) {
  if (!userId) return;

  let loc_type = "", type_custom = "", loc_status = "", loc_perigo = "",
      loc_regiao = "", regiao_custom = "", description = "";
  try {
    const res  = await fetch(`${API_URL}/get-item?section=Locations&id=${itemId}&user_id=${userId}`);
    const data = await res.json();
    if (data.success) {
      description = data.item.description || "";
      loc_status  = data.item.loc_status  || "";
      loc_perigo  = data.item.loc_perigo  || "";

      const savedType = data.item.loc_type || "";
      const typeInList = LOC_TYPES.slice(0, -1);
      if (savedType && !typeInList.includes(savedType)) {
        loc_type    = "Outro";
        type_custom = savedType;
      } else {
        loc_type = savedType;
      }

      const savedRegiao = data.item.loc_regiao || "";
      const regiaoInList = LOC_REGIAO.slice(0, -1);
      if (savedRegiao && !regiaoInList.includes(savedRegiao)) {
        loc_regiao    = "Outro";
        regiao_custom = savedRegiao;
      } else {
        loc_regiao = savedRegiao;
      }
    }
  } catch { /* silently skip */ }

  const isTypeOutro   = loc_type   === "Outro";
  const isRegiaoOutro = loc_regiao === "Outro";
  console.log("Cheguei aqui");
  const attrsEl = document.createElement("div");
  attrsEl.className = "loc-attrs";
  attrsEl.innerHTML = `
    <div class="loc-attrs-block">
      <div class="loc-attrs-title">Identificação</div>
      <div class="loc-attrs-grid">
        <div class="loc-attr-field">
          <label>Tipo</label>
          <select class="loc-attr-select" id="loc-type">
            ${buildLocSelectOptions(LOC_TYPES, loc_type)}
          </select>
          <input
            type="text"
            class="loc-attr-input"
            id="loc-type-custom"
            placeholder="Digite o tipo..."
            value="${type_custom}"
            style="display:${isTypeOutro ? "block" : "none"}; margin-top: 6px;"
          >
        </div>
        <div class="loc-attr-field">
          <label>Status</label>
          <select class="loc-attr-select" id="loc-status">
            ${buildLocSelectOptions(LOC_STATUS, loc_status)}
          </select>
        </div>
        <div class="loc-attr-field">
          <label>Perigo</label>
          <select class="loc-attr-select" id="loc-perigo">
            ${buildLocSelectOptions(LOC_PERIGO, loc_perigo)}
          </select>
        </div>
        <div class="loc-attr-field">
          <label>Região</label>
          <select class="loc-attr-select" id="loc-regiao">
            ${buildLocSelectOptions(LOC_REGIAO, loc_regiao)}
          </select>
          <input
            type="text"
            class="loc-attr-input"
            id="loc-regiao-custom"
            placeholder="Digite a região..."
            value="${regiao_custom}"
            style="display:${isRegiaoOutro ? "block" : "none"}; margin-top: 6px;"
          >
        </div>
      </div>
    </div>

    <div class="loc-attrs-block">
      <div class="loc-attrs-title">Visão Geral</div>
      <div class="loc-attr-field">
        <label>Descrição</label>
        <textarea class="loc-attr-textarea" id="loc-desc" placeholder="Escreva uma breve descrição da localização...">${description}</textarea>
      </div>
    </div>

    <div class="loc-save-row">
      <button class="loc-save-btn" id="loc-save-btn">Salvar Alterações</button>
      <span class="loc-save-status" id="loc-save-status"></span>
    </div>
  `;
  console.log("Cheguei aqui");
  
  view.appendChild(attrsEl);

  const typeEl        = attrsEl.querySelector("#loc-type");
  const typeCustomEl  = attrsEl.querySelector("#loc-type-custom");
  const statusEl      = attrsEl.querySelector("#loc-status");
  const perigoEl      = attrsEl.querySelector("#loc-perigo");
  const regiaoEl      = attrsEl.querySelector("#loc-regiao");
  const regiaoCustomEl = attrsEl.querySelector("#loc-regiao-custom");
  const descEl        = attrsEl.querySelector("#loc-desc");
  const saveBtn       = attrsEl.querySelector("#loc-save-btn");
  const statusMsg     = attrsEl.querySelector("#loc-save-status");

  typeEl.addEventListener("change", () => {
    if (typeEl.value === "Outro") {
      typeCustomEl.style.display = "block";
      typeCustomEl.focus();
    } else {
      typeCustomEl.style.display = "none";
      typeCustomEl.value = "";
    }
  });

  regiaoEl.addEventListener("change", () => {
    if (regiaoEl.value === "Outro") {
      regiaoCustomEl.style.display = "block";
      regiaoCustomEl.focus();
    } else {
      regiaoCustomEl.style.display = "none";
      regiaoCustomEl.value = "";
    }
  });

  saveBtn.addEventListener("click", async () => {
    const typeValue = typeEl.value === "Outro"
      ? (typeCustomEl.value.trim() || "Outro")
      : typeEl.value;
    const regiaoValue = regiaoEl.value === "Outro"
      ? (regiaoCustomEl.value.trim() || "Outro")
      : regiaoEl.value;

    saveBtn.disabled      = true;
    statusMsg.textContent = "Salvando...";
    statusMsg.className   = "loc-save-status";
    try {
      const res  = await fetch(`${API_URL}/update-location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(itemId),
          user_id: userId,
          loc_type:    typeValue,
          loc_status:  statusEl.value,
          loc_perigo:  perigoEl.value,
          loc_regiao:  regiaoValue,
          description: descEl.value
        })
      });
      const data = await res.json();
      if (data.success) {
        statusMsg.textContent = "✓ Salvo";
        statusMsg.className   = "loc-save-status saved";
        setTimeout(() => { statusMsg.textContent = ""; }, 2000);
      } else {
        statusMsg.textContent = "Erro ao salvar";
        statusMsg.className   = "loc-save-status error";
      }
    } catch {
      statusMsg.textContent = "Sem conexão";
      statusMsg.className   = "loc-save-status error";
    } finally {
      saveBtn.disabled = false;
    }
  });
}