// Sistema de Gestão de Inventário de TI

// ===========================================
// DADOS E CONFIGURAÇÕES GLOBAIS
// ===========================================

let equipamentos = [];
let acessorios = [];
let cartuchos = [];
let acessoriosSelecionadosTemporariamente = [];

let dadosForamAlterados = false;
let tipoChart, statusChart, departamentoChart;

// ===========================================
// INICIALIZAÇÃO E EVENTOS GLOBAIS
// ===========================================

document.addEventListener("DOMContentLoaded", function () {
  inicializarAplicacao();
});

window.addEventListener("beforeunload", (event) => {
  if (dadosForamAlterados) {
    event.preventDefault();
    event.returnValue = "";
    return "Você possui alterações não salvas. Tem certeza que deseja sair?";
  }
});

function inicializarAplicacao() {
  aplicarTemaSalvo(); // <-- ADIÇÃO PARA TEMA
  configurarEventListeners();
  configurarMascaras();
  carregarDeLocalStorage();
  carregarAcessoriosDeLocalStorage();
  carregarCartuchosDeLocalStorage();
  mostrarTab("dashboard");
}

// ===========================================
// GERENCIAMENTO DE PERSISTÊNCIA (LocalStorage)
// ===========================================

function salvarParaLocalStorage() {
  localStorage.setItem("inventarioEquipamentos", JSON.stringify(equipamentos));
}

function carregarDeLocalStorage() {
  const dadosSalvos = localStorage.getItem("inventarioEquipamentos");
  equipamentos = dadosSalvos ? JSON.parse(dadosSalvos) : [];
}

function salvarAcessoriosParaLocalStorage() {
  localStorage.setItem("inventarioAcessorios", JSON.stringify(acessorios));
}

function carregarAcessoriosDeLocalStorage() {
  const dadosSalvos = localStorage.getItem("inventarioAcessorios");
  acessorios = dadosSalvos ? JSON.parse(dadosSalvos) : [];
}

function salvarCartuchosParaLocalStorage() {
  localStorage.setItem("inventarioCartuchos", JSON.stringify(cartuchos));
}

function carregarCartuchosDeLocalStorage() {
  const dadosSalvos = localStorage.getItem("inventarioCartuchos");
  cartuchos = dadosSalvos ? JSON.parse(dadosSalvos) : [];
}

// ===========================================
// NAVEGAÇÃO E EXIBIÇÃO DE ABAS
// ===========================================

function mostrarTab(tabId) {
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach((tab) => tab.classList.remove("active"));

  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => btn.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  document
    .querySelector(`.tab-btn[data-tab="${tabId}"]`)
    .classList.add("active");

  // Renderizar conteúdo específico da aba
  switch (tabId) {
    case "dashboard":
      renderizarDashboard();
      break;
    case "equipamentos":
      renderizarTabelaEquipamentos();
      break;
    case "acessorios":
      renderizarTabelaAcessorios();
      break;
    case "cartuchos":
      renderizarTabelaCartuchos();
      break;
    case "configuracoes":
      // Nenhuma ação de renderização necessária por enquanto
      break;
  }
}

// ===========================================
// CONFIGURAÇÃO DE EVENT LISTENERS
// ===========================================

function configurarEventListeners() {
  // Navegação principal
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => mostrarTab(btn.dataset.tab));
  });

  // Botão de alternar tema
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

  // Formulário de Equipamentos
  document
    .getElementById("form-equipamento")
    .addEventListener("submit", salvarEquipamento);
  document
    .getElementById("btn-cancelar-edicao")
    .addEventListener("click", cancelarEdicaoEquipamento);
  document
    .getElementById("btn-limpar-form")
    .addEventListener("click", limparFormularioEquipamento);

  // Botões de Acessórios no formulário de equipamento
  document
    .getElementById("btn-vincular-acessorio")
    .addEventListener("click", abrirModalVincularAcessorios);
  document
    .getElementById("btn-salvar-vinculo-acessorios")
    .addEventListener("click", salvarVinculoAcessorios);

  // Pesquisa de Equipamentos
  document
    .getElementById("pesquisa-equipamento")
    .addEventListener("input", filtrarTabelaEquipamentos);

  // Formulário de Acessórios
  document
    .getElementById("form-acessorio")
    .addEventListener("submit", salvarAcessorio);
  document
    .getElementById("btn-cancelar-edicao-acessorio")
    .addEventListener("click", cancelarEdicaoAcessorio);

  // Pesquisa de Acessórios
  document
    .getElementById("pesquisa-acessorio")
    .addEventListener("input", filtrarTabelaAcessorios);

  // Formulário de Cartuchos
  document
    .getElementById("form-cartucho")
    .addEventListener("submit", salvarCartucho);
  document
    .getElementById("btn-cancelar-edicao-cartucho")
    .addEventListener("click", cancelarEdicaoCartucho);

  // Pesquisa de Cartuchos
  document
    .getElementById("pesquisa-cartucho")
    .addEventListener("input", filtrarTabelaCartuchos);

  // Ações de Importação/Exportação
  document
    .getElementById("btn-exportar-csv-equip")
    .addEventListener("click", () => exportarParaCSV(equipamentos, "equipamentos"));
  document
    .getElementById("btn-exportar-json-equip")
    .addEventListener("click", () => exportarParaJSON(equipamentos, "equipamentos"));
  document
    .getElementById("input-importar-csv-equip")
    .addEventListener("change", importarDeCSV);
  document
    .getElementById("btn-importar-csv-equip")
    .addEventListener("click", () =>
      document.getElementById("input-importar-csv-equip").click()
    );
  document
    .getElementById("input-importar-json-equip")
    .addEventListener("change", importarDeJSON);
  document
    .getElementById("btn-importar-json-equip")
    .addEventListener("click", () =>
      document.getElementById("input-importar-json-equip").click()
    );

  //... (Adicionar listeners para exportação/importação de acessórios e cartuchos se necessário)
}

// ===========================================
// MÁSCARAS DE FORMULÁRIO (INPUTMASK)
// ===========================================

function configurarMascaras() {
  // Esta função seria para aplicar máscaras de input (ex: R$, datas, IPs)
  // Exemplo: Inputmask("R$ 999.999,99").mask(document.getElementById("valor"));
  // Por enquanto, está vazia.
}

// ===========================================
// DASHBOARD
// ===========================================

function renderizarDashboard() {
  // Atualizar contadores
  document.getElementById("count-equipamentos").textContent =
    equipamentos.length;
  document.getElementById("count-acessorios").textContent = acessorios.length;
  document.getElementById("count-cartuchos").textContent = cartuchos.length;
  document.getElementById("count-manutencao").textContent = equipamentos.filter(
    (e) => e.statusOperacional === "Em manutenção"
  ).length;

  // Criar/Atualizar gráficos
  criarGraficos();
}

function criarGraficos() {
  // Destruir gráficos antigos para evitar sobreposição de tooltips
  if (tipoChart) tipoChart.destroy();
  if (statusChart) statusChart.destroy();
  if (departamentoChart) departamentoChart.destroy();

  const ctxTipo = document
    .getElementById("chart-tipo-equipamento")
    .getContext("2d");
  const ctxStatus = document
    .getElementById("chart-status-equipamento")
    .getContext("2d");
  const ctxDepto = document
    .getElementById("chart-departamento")
    .getContext("2d");

  // Obter cores do CSS
  const style = getComputedStyle(document.documentElement);
  const chartColors = [
    style.getPropertyValue("--color-chart-1").trim(),
    style.getPropertyValue("--color-chart-2").trim(),
    style.getPropertyValue("--color-chart-3").trim(),
    style.getPropertyValue("--color-chart-4").trim(),
    style.getPropertyValue("--color-chart-5").trim(),
    style.getPropertyValue("--color-chart-6").trim(),
  ];
  const textColor = style.getPropertyValue("--color-text").trim();
  const gridColor = style.getPropertyValue("--color-border").trim();

  // Configurações globais de texto para Chart.js
  Chart.defaults.color = textColor;
  Chart.defaults.borderColor = gridColor;

  // 1. Gráfico de Pizza: Tipos de Equipamento
  const tipos = contarOcorrencias(equipamentos, "tipoEquipamento");
  tipoChart = new Chart(ctxTipo, {
    type: "doughnut",
    data: {
      labels: Object.keys(tipos),
      datasets: [
        {
          label: "Tipos de Equipamento",
          data: Object.values(tipos),
          backgroundColor: chartColors,
          borderColor: style.getPropertyValue("--color-surface").trim(),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: textColor,
          },
        },
        title: {
          display: true,
          text: "Equipamentos por Tipo",
          color: textColor,
        },
      },
    },
  });

  // 2. Gráfico de Barras: Status Operacional
  const status = contarOcorrencias(equipamentos, "statusOperacional");
  statusChart = new Chart(ctxStatus, {
    type: "bar",
    data: {
      labels: Object.keys(status),
      datasets: [
        {
          label: "Status Operacional",
          data: Object.values(status),
          backgroundColor: chartColors,
          borderColor: chartColors,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y", // Gráfico de barras horizontais
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor },
        },
        y: {
          ticks: { color: textColor },
          grid: { display: false },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: "Status dos Equipamentos",
          color: textColor,
        },
      },
    },
  });

  // 3. Gráfico de Pizza: Equipamentos por Departamento
  const departamentos = contarOcorrencias(equipamentos, "departamento");
  departamentoChart = new Chart(ctxDepto, {
    type: "pie",
    data: {
      labels: Object.keys(departamentos),
      datasets: [
        {
          label: "Departamentos",
          data: Object.values(departamentos),
          backgroundColor: chartColors,
          borderColor: style.getPropertyValue("--color-surface").trim(),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        title: {
          display: true,
          text: "Equipamentos por Departamento",
          color: textColor,
        },
      },
    },
  });
}

// ===========================================
// CRUD: EQUIPAMENTOS
// ===========================================

function salvarEquipamento(event) {
  event.preventDefault();
  const form = event.target;
  const id = form.dataset.editId;

  const equipamento = {
    registro:
      id ||
      `#E${Date.now()}` +
        Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0"),
    nomeUsuario: document.getElementById("nomeUsuario").value,
    email: document.getElementById("email").value,
    departamento: document.getElementById("departamento").value,
    tipoEquipamento: document.getElementById("tipoEquipamento").value,
    modelo: document.getElementById("modelo").value,
    numeroSerie: document.getElementById("numeroSerie").value,
    numeroPatrimonio: document.getElementById("numeroPatrimonio").value,
    statusOperacional: document.getElementById("statusOperacional").value,
    observacoes: document.getElementById("observacoes").value,
    acessorios: acessoriosSelecionadosTemporariamente.map((a) => a.id), // Salva apenas os IDs
  };

  if (id) {
    // Editando
    const index = equipamentos.findIndex((e) => e.registro === id);
    if (index !== -1) {
      equipamentos[index] = { ...equipamentos[index], ...equipamento };
    }
  } else {
    // Criando
    equipamentos.push(equipamento);
  }

  dadosForamAlterados = true;
  salvarParaLocalStorage();
  renderizarTabelaEquipamentos();
  limparFormularioEquipamento();
  mostrarAlerta("Equipamento salvo com sucesso!", "success");
}

function editarEquipamento(id) {
  const equipamento = equipamentos.find((e) => e.registro === id);
  if (!equipamento) return;

  document.getElementById("form-equipamento").dataset.editId = id;
  document.getElementById("form-title-equipamento").textContent =
    "Editar Equipamento";
  document.getElementById("btn-salvar-equipamento").textContent =
    "Atualizar Equipamento";
  document.getElementById("btn-cancelar-edicao").style.display = "inline-block";
  document.getElementById("btn-limpar-form").style.display = "none";

  document.getElementById("nomeUsuario").value = equipamento.nomeUsuario || "";
  document.getElementById("email").value = equipamento.email || "";
  document.getElementById("departamento").value = equipamento.departamento || "";
  document.getElementById("tipoEquipamento").value =
    equipamento.tipoEquipamento || "";
  document.getElementById("modelo").value = equipamento.modelo || "";
  document.getElementById("numeroSerie").value = equipamento.numeroSerie || "";
  document.getElementById("numeroPatrimonio").value =
    equipamento.numeroPatrimonio || "";
  document.getElementById("statusOperacional").value =
    equipamento.statusOperacional || "";
  document.getElementById("observacoes").value = equipamento.observacoes || "";

  // Carregar acessórios vinculados
  acessoriosSelecionadosTemporariamente = (equipamento.acessorios || [])
    .map((acessorioId) => acessorios.find((a) => a.id === acessorioId))
    .filter(Boolean); // Filtra IDs que não existem mais

  renderizarAcessoriosTemporarios();

  // Focar no formulário
  document.getElementById("form-equipamento").scrollIntoView();
}

function confirmarExclusaoEquipamento(id) {
  abrirModalConfirm(
    "Tem certeza que deseja excluir este equipamento?",
    "Esta ação não pode ser desfeita.",
    () => excluirEquipamento(id)
  );
}

function excluirEquipamento(id) {
  equipamentos = equipamentos.filter((e) => e.registro !== id);
  dadosForamAlterados = true;
  salvarParaLocalStorage();
  renderizarTabelaEquipamentos();
  mostrarAlerta("Equipamento excluído com sucesso!", "success");
  fecharModalConfirm();
}

function limparFormularioEquipamento() {
  const form = document.getElementById("form-equipamento");
  form.reset();
  form.dataset.editId = "";
  document.getElementById("form-title-equipamento").textContent =
    "Adicionar Novo Equipamento";
  document.getElementById("btn-salvar-equipamento").textContent =
    "Salvar Equipamento";
  document.getElementById("btn-cancelar-edicao").style.display = "none";
  document.getElementById("btn-limpar-form").style.display = "inline-block";

  acessoriosSelecionadosTemporariamente = [];
  renderizarAcessoriosTemporarios();
}

function cancelarEdicaoEquipamento() {
  limparFormularioEquipamento();
}

function renderizarTabelaEquipamentos(lista = equipamentos) {
  const tabelaBody = document
    .getElementById("tabela-equipamentos")
    .querySelector("tbody");
  tabelaBody.innerHTML = ""; // Limpa a tabela

  if (lista.length === 0) {
    tabelaBody.innerHTML =
      '<tr><td colspan="10" class="text-center">Nenhum equipamento encontrado.</td></tr>';
    return;
  }

  lista.forEach((equip) => {
    const row = document.createElement("tr");
    row.dataset.id = equip.registro;

    // Usamos template literals para construir o HTML
    // A célula de Observações será preenchida via textContent para segurança
    row.innerHTML = `
      <td data-label="Patrimônio">${equip.numeroPatrimonio || "N/A"}</td>
      <td data-label="Usuário">${equip.nomeUsuario || "N/A"}</td>
      <td data-label="Departamento">${equip.departamento || "N/A"}</td>
      <td data-label="Tipo">${equip.tipoEquipamento || "N/A"}</td>
      <td data-label="Modelo">${equip.modelo || "N/A"}</td>
      <td data-label="Nº de Série">${equip.numeroSerie || "N/A"}</td>
      <td data-label="Status">
        <span class="status-badge status-${normalizarString(
          equip.statusOperacional
        )}">
          ${equip.statusOperacional || "N/A"}
        </span>
      </td>
      <td data-label="Acessórios">
        ${renderizarIconesAcessorios(
          equip.acessorios || [],
          `equip-${equip.registro}`
        )}
      </td>
      <td data-label="Observações" class="obs-cell">
        </td>
      <td data-label="Ações">
        <button class="btn-icon" title="Editar" onclick="editarEquipamento('${
          equip.registro
        }')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-icon btn-icon--danger" title="Excluir" onclick="confirmarExclusaoEquipamento('${
          equip.registro
        }')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    // ****** INÍCIO DA CORREÇÃO ******
    // Inserir observações de forma segura para evitar quebra de HTML
    const obsCell = row.querySelector(".obs-cell");
    if (obsCell) {
      obsCell.textContent = equip.observacoes || "";
    }
    // ****** FIM DA CORREÇÃO ******

    tabelaBody.appendChild(row);
  });

  // (Re)ativar tooltips para ícones de acessórios
  configurarTooltipsAcessorios();
}

function filtrarTabelaEquipamentos() {
  const termo = document
    .getElementById("pesquisa-equipamento")
    .value.toLowerCase();
  const filtrados = equipamentos.filter((equip) => {
    return (
      (equip.nomeUsuario &&
        equip.nomeUsuario.toLowerCase().includes(termo)) ||
      (equip.departamento &&
        equip.departamento.toLowerCase().includes(termo)) ||
      (equip.tipoEquipamento &&
        equip.tipoEquipamento.toLowerCase().includes(termo)) ||
      (equip.modelo && equip.modelo.toLowerCase().includes(termo)) ||
      (equip.numeroSerie && equip.numeroSerie.toLowerCase().includes(termo)) ||
      (equip.numeroPatrimonio &&
        equip.numeroPatrimonio.toLowerCase().includes(termo)) ||
      (equip.statusOperacional &&
        equip.statusOperacional.toLowerCase().includes(termo))
    );
  });
  renderizarTabelaEquipamentos(filtrados);
}

// ===========================================
// CRUD: ACESSÓRIOS
// ===========================================

function salvarAcessorio(event) {
  event.preventDefault();
  const form = event.target;
  const id = form.dataset.editId;

  const acessorio = {
    id:
      id ||
      `#A${Date.now()}` +
        Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0"),
    tipo: document.getElementById("acessorio-tipo").value,
    modelo: document.getElementById("acessorio-modelo").value,
    numeroSerie: document.getElementById("acessorio-numeroSerie").value,
    status: document.getElementById("acessorio-status").value,
    observacao: document.getElementById("acessorio-observacao").value,
  };

  if (id) {
    // Editando
    const index = acessorios.findIndex((a) => a.id === id);
    if (index !== -1) {
      acessorios[index] = { ...acessorios[index], ...acessorio };
    }
  } else {
    // Criando
    acessorios.push(acessorio);
  }

  dadosForamAlterados = true;
  salvarAcessoriosParaLocalStorage();
  renderizarTabelaAcessorios();
  limparFormularioAcessorio();
  mostrarAlerta("Acessório salvo com sucesso!", "success");
}

function editarAcessorio(id) {
  const acessorio = acessorios.find((a) => a.id === id);
  if (!acessorio) return;

  const form = document.getElementById("form-acessorio");
  form.dataset.editId = id;
  document.getElementById("form-title-acessorio").textContent =
    "Editar Acessório";
  document.getElementById("btn-salvar-acessorio").textContent =
    "Atualizar Acessório";
  document.getElementById("btn-cancelar-edicao-acessorio").style.display =
    "inline-block";

  document.getElementById("acessorio-tipo").value = acessorio.tipo || "";
  document.getElementById("acessorio-modelo").value = acessorio.modelo || "";
  document.getElementById("acessorio-numeroSerie").value =
    acessorio.numeroSerie || "";
  document.getElementById("acessorio-status").value = acessorio.status || "";
  document.getElementById("acessorio-observacao").value =
    acessorio.observacao || "";

  form.scrollIntoView();
}

function confirmarExclusaoAcessorio(id) {
  // Verificar se o acessório está vinculado a algum equipamento
  const vinculado = equipamentos.some((e) =>
    (e.acessorios || []).includes(id)
  );
  if (vinculado) {
    abrirModalConfirm(
      "Acessório Vinculado!",
      "Este acessório está vinculado a um ou mais equipamentos. Excluí-lo irá removê-lo de todos os equipamentos. Deseja continuar?",
      () => excluirAcessorio(id)
    );
  } else {
    abrirModalConfirm(
      "Tem certeza que deseja excluir este acessório?",
      "Esta ação não pode ser desfeita.",
      () => excluirAcessorio(id)
    );
  }
}

function excluirAcessorio(id) {
  // Remover de 'acessorios'
  acessorios = acessorios.filter((a) => a.id !== id);

  // Remover de todos os equipamentos que o possuem
  equipamentos.forEach((equip) => {
    if (equip.acessorios && equip.acessorios.includes(id)) {
      equip.acessorios = equip.acessorios.filter((aId) => aId !== id);
    }
  });

  dadosForamAlterados = true;
  salvarAcessoriosParaLocalStorage();
  salvarParaLocalStorage(); // Salvar equipamentos também
  renderizarTabelaAcessorios();
  renderizarTabelaEquipamentos(); // Atualizar ícones na tabela de equipamentos
  mostrarAlerta("Acessório excluído e desvinculado com sucesso!", "success");
  fecharModalConfirm();
}

function limparFormularioAcessorio() {
  const form = document.getElementById("form-acessorio");
  form.reset();
  form.dataset.editId = "";
  document.getElementById("form-title-acessorio").textContent =
    "Adicionar Novo Acessório";
  document.getElementById("btn-salvar-acessorio").textContent =
    "Salvar Acessório";
  document.getElementById("btn-cancelar-edicao-acessorio").style.display =
    "none";
}

function cancelarEdicaoAcessorio() {
  limparFormularioAcessorio();
}

function renderizarTabelaAcessorios(lista = acessorios) {
  const tabelaBody = document
    .getElementById("tabela-acessorios")
    .querySelector("tbody");
  tabelaBody.innerHTML = "";

  if (lista.length === 0) {
    tabelaBody.innerHTML =
      '<tr><td colspan="6" class="text-center">Nenhum acessório encontrado.</td></tr>';
    return;
  }

  lista.forEach((acessorio) => {
    const row = document.createElement("tr");
    row.dataset.id = acessorio.id;

    row.innerHTML = `
      <td data-label="Tipo">${acessorio.tipo || "N/A"}</td>
      <td data-label="Modelo">${acessorio.modelo || "N/A"}</td>
      <td data-label="Nº de Série">${acessorio.numeroSerie || "N/A"}</td>
      <td data-label="Status">
        <span class="status-badge status-${normalizarString(
          acessorio.status
        )}">
          ${acessorio.status || "N/A"}
        </span>
      </td>
      <td data-label="Observação" class="obs-cell">
        </td>
      <td data-label="Ações">
        <button class="btn-icon" title="Editar" onclick="editarAcessorio('${
          acessorio.id
        }')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-icon btn-icon--danger" title="Excluir" onclick="confirmarExclusaoAcessorio('${
          acessorio.id
        }')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    // ****** INÍCIO DA CORREÇÃO ******
    // Inserir observações de forma segura para evitar quebra de HTML
    const obsCell = row.querySelector(".obs-cell");
    if (obsCell) {
      obsCell.textContent = acessorio.observacao || "";
    }
    // ****** FIM DA CORREÇÃO ******

    tabelaBody.appendChild(row);
  });
}

function filtrarTabelaAcessorios() {
  const termo = document
    .getElementById("pesquisa-acessorio")
    .value.toLowerCase();
  const filtrados = acessorios.filter((a) => {
    return (
      (a.tipo && a.tipo.toLowerCase().includes(termo)) ||
      (a.modelo && a.modelo.toLowerCase().includes(termo)) ||
      (a.numeroSerie && a.numeroSerie.toLowerCase().includes(termo)) ||
      (a.status && a.status.toLowerCase().includes(termo))
    );
  });
  renderizarTabelaAcessorios(filtrados);
}

// ===========================================
// CRUD: CARTUCHOS
// ===========================================

function salvarCartucho(event) {
  event.preventDefault();
  const form = event.target;
  const id = form.dataset.editId;

  const cartucho = {
    id:
      id ||
      `#C${Date.now()}` +
        Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0"),
    modelo: document.getElementById("cartucho-modelo").value,
    tipo: document.getElementById("cartucho-tipo").value,
    cor: document.getElementById("cartucho-cor").value,
    status: document.getElementById("cartucho-status").value,
    observacao: document.getElementById("cartucho-observacao").value,
  };

  if (id) {
    // Editando
    const index = cartuchos.findIndex((c) => c.id === id);
    if (index !== -1) {
      cartuchos[index] = { ...cartuchos[index], ...cartucho };
    }
  } else {
    // Criando
    cartuchos.push(cartucho);
  }

  dadosForamAlterados = true;
  salvarCartuchosParaLocalStorage();
  renderizarTabelaCartuchos();
  limparFormularioCartucho();
  mostrarAlerta("Cartucho salvo com sucesso!", "success");
}

function editarCartucho(id) {
  const cartucho = cartuchos.find((c) => c.id === id);
  if (!cartucho) return;

  const form = document.getElementById("form-cartucho");
  form.dataset.editId = id;
  document.getElementById("form-title-cartucho").textContent =
    "Editar Cartucho";
  document.getElementById("btn-salvar-cartucho").textContent =
    "Atualizar Cartucho";
  document.getElementById("btn-cancelar-edicao-cartucho").style.display =
    "inline-block";

  document.getElementById("cartucho-modelo").value = cartucho.modelo || "";
  document.getElementById("cartucho-tipo").value = cartucho.tipo || "";
  document.getElementById("cartucho-cor").value = cartucho.cor || "";
  document.getElementById("cartucho-status").value = cartucho.status || "";
  document.getElementById("cartucho-observacao").value =
    cartucho.observacao || "";

  form.scrollIntoView();
}

function confirmarExclusaoCartucho(id) {
  abrirModalConfirm(
    "Tem certeza que deseja excluir este cartucho?",
    "Esta ação não pode ser desfeita.",
    () => excluirCartucho(id)
  );
}

function excluirCartucho(id) {
  cartuchos = cartuchos.filter((c) => c.id !== id);
  dadosForamAlterados = true;
  salvarCartuchosParaLocalStorage();
  renderizarTabelaCartuchos();
  mostrarAlerta("Cartucho excluído com sucesso!", "success");
  fecharModalConfirm();
}

function limparFormularioCartucho() {
  const form = document.getElementById("form-cartucho");
  form.reset();
  form.dataset.editId = "";
  document.getElementById("form-title-cartucho").textContent =
    "Adicionar Novo Cartucho";
  document.getElementById("btn-salvar-cartucho").textContent =
    "Salvar Cartucho";
  document.getElementById("btn-cancelar-edicao-cartucho").style.display =
    "none";
}

function cancelarEdicaoCartucho() {
  limparFormularioCartucho();
}

function renderizarTabelaCartuchos(lista = cartuchos) {
  const tabelaBody = document
    .getElementById("tabela-cartuchos")
    .querySelector("tbody");
  tabelaBody.innerHTML = "";

  if (lista.length === 0) {
    tabelaBody.innerHTML =
      '<tr><td colspan="7" class="text-center">Nenhum cartucho encontrado.</td></tr>';
    return;
  }

  lista.forEach((cartucho) => {
    const row = document.createElement("tr");
    row.dataset.id = cartucho.id;

    row.innerHTML = `
      <td data-label="Modelo">${cartucho.modelo || "N/A"}</td>
      <td data-label="Tipo">${cartucho.tipo || "N/A"}</td>
      <td data-label="Cor">${cartucho.cor || "N/A"}</td>
      <td data-label="Status">
        <span class="status-badge status-${normalizarString(cartucho.status)}">
          ${cartucho.status || "N/A"}
        </span>
      </td>
      <td data-label="Observação" class="obs-cell">
        </td>
      <td data-label="Ações">
        <button class="btn-icon" title="Editar" onclick="editarCartucho('${
          cartucho.id
        }')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-icon btn-icon--danger" title="Excluir" onclick="confirmarExclusaoCartucho('${
          cartucho.id
        }')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    // ****** INÍCIO DA CORREÇÃO ******
    // Inserir observações de forma segura para evitar quebra de HTML
    const obsCell = row.querySelector(".obs-cell");
    if (obsCell) {
      obsCell.textContent = cartucho.observacao || "";
    }
    // ****** FIM DA CORREÇÃO ******

    tabelaBody.appendChild(row);
  });
}

function filtrarTabelaCartuchos() {
  const termo = document
    .getElementById("pesquisa-cartucho")
    .value.toLowerCase();
  const filtrados = cartuchos.filter((c) => {
    return (
      (c.modelo && c.modelo.toLowerCase().includes(termo)) ||
      (c.tipo && c.tipo.toLowerCase().includes(termo)) ||
      (c.cor && c.cor.toLowerCase().includes(termo)) ||
      (c.status && c.status.toLowerCase().includes(termo))
    );
  });
  renderizarTabelaCartuchos(filtrados);
}

// ===========================================
// GERENCIAMENTO DE ACESSÓRIOS VINCULADOS
// ===========================================

function abrirModalVincularAcessorios() {
  const modalBody = document.getElementById("lista-acessorios-modal");
  modalBody.innerHTML = ""; // Limpar lista anterior

  const acessoriosDisponiveis = acessorios.filter(
    (a) => a.status === "Disponível"
  );

  if (acessoriosDisponiveis.length === 0) {
    modalBody.innerHTML = "<p>Nenhum acessório disponível para vincular.</p>";
  } else {
    acessoriosDisponiveis.forEach((acessorio) => {
      const isChecked = acessoriosSelecionadosTemporariamente.some(
        (a) => a.id === acessorio.id
      );
      const label = document.createElement("label");
      label.className = "checkbox-container";
      label.innerHTML = `
        <input type="checkbox" 
               data-id="${acessorio.id}" 
               onchange="toggleAcessorioTemp(this)"
               ${isChecked ? "checked" : ""}>
        <span class="checkmark"></span>
        ${acessorio.tipo} - ${acessorio.modelo || "N/A"} (S/N: ${
        acessorio.numeroSerie || "N/A"
      })
      `;
      modalBody.appendChild(label);
    });
  }

  document.getElementById("modal-vincular-acessorios").style.display = "flex";
}

function fecharModalVincularAcessorios() {
  document.getElementById("modal-vincular-acessorios").style.display = "none";
}

function toggleAcessorioTemp(checkbox) {
  const id = checkbox.dataset.id;
  if (checkbox.checked) {
    const acessorio = acessorios.find((a) => a.id === id);
    if (
      acessorio &&
      !acessoriosSelecionadosTemporariamente.some((a) => a.id === id)
    ) {
      acessoriosSelecionadosTemporariamente.push(acessorio);
    }
  } else {
    acessoriosSelecionadosTemporariamente =
      acessoriosSelecionadosTemporariamente.filter((a) => a.id !== id);
  }
}

function salvarVinculoAcessorios() {
  // A lista 'acessoriosSelecionadosTemporariamente' já está atualizada.
  // Apenas renderizamos os ícones/tags no formulário.
  renderizarAcessoriosTemporarios();
  fecharModalVincularAcessorios();
}

function renderizarAcessoriosTemporarios() {
  const container = document.getElementById(
    "acessorios-vinculados-container"
  );
  container.innerHTML = "";

  if (acessoriosSelecionadosTemporariamente.length === 0) {
    container.innerHTML =
      '<p class="text-muted">Nenhum acessório vinculado.</p>';
    return;
  }

  acessoriosSelecionadosTemporariamente.forEach((acessorio) => {
    const tag = document.createElement("span");
    tag.className = "acessorio-tag";
    tag.innerHTML = `
      ${getIconeAcessorio(acessorio.tipo, true)} 
      ${acessorio.tipo} ${
      acessorio.modelo ? `(${acessorio.modelo})` : ""
    }
      <button type="button" class="btn-remover-tag" onclick="removerAcessorioTemp('${
        acessorio.id
      }')">&times;</button>
    `;
    container.appendChild(tag);
  });
}

function removerAcessorioTemp(id) {
  acessoriosSelecionadosTemporariamente =
    acessoriosSelecionadosTemporariamente.filter((a) => a.id !== id);
  renderizarAcessoriosTemporarios();
}

function renderizarIconesAcessorios(listaIds = [], tooltipId) {
  if (!listaIds || listaIds.length === 0) {
    return "-";
  }

  const acessoriosVinculados = listaIds
    .map((id) => acessorios.find((a) => a.id === id))
    .filter(Boolean); // Filtra os que não foram encontrados

  if (acessoriosVinculados.length === 0) {
    return "-";
  }

  // Criar o conteúdo do tooltip
  const tooltipContent = acessoriosVinculados
    .map(
      (a) =>
        `<strong>${a.tipo}</strong>: ${a.modelo || "N/A"} (S/N: ${
          a.numeroSerie || "N/A"
        })`
    )
    .join("<br>");

  return `
    <span class="acessorios-icon-wrapper" 
          data-tooltip-id="${tooltipId}" 
          data-tooltip-content="${escapeHTML(tooltipContent)}">
      ${getIconeAcessorio(acessoriosVinculados[0].tipo, false)}
      ${
        acessoriosVinculados.length > 1
          ? `<span class="acessorio-count">+${
              acessoriosVinculados.length - 1
            }</span>`
          : ""
      }
    </span>
  `;
}

function getIconeAcessorio(tipo, comClasse = false) {
  const tipoNorm = normalizarString(tipo);
  let icone = "fa-question-circle"; // Padrão
  let classeCor = "icon-outros";

  if (tipoNorm.includes("mouse")) {
    icone = "fa-mouse";
    classeCor = "icon-mouses";
  } else if (tipoNorm.includes("teclado") || tipoNorm.includes("kit")) {
    icone = "fa-keyboard";
    classeCor = "icon-kit";
  } else if (tipoNorm.includes("monitor")) {
    icone = "fa-desktop";
    classeCor = "icon-monitores";
  } else if (tipoNorm.includes("headset") || tipoNorm.includes("fone")) {
    icone = "fa-headset";
    classeCor = "icon-headsets";
  } else if (tipoNorm.includes("suporte")) {
    icone = "fa-laptop-medical"; // Ícone sugestivo
    classeCor = "icon-suportes";
  }

  return `<i class="fas ${icone} ${comClasse ? classeCor : ""}"></i>`;
}

// ===========================================
// IMPORTAÇÃO / EXPORTAÇÃO
// ===========================================

function exportarParaCSV(dados, nomeArquivo) {
  if (dados.length === 0) {
    mostrarAlerta("Não há dados para exportar.", "warning");
    return;
  }

  const colunas = Object.keys(dados[0]);
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += colunas.join(",") + "\r\n"; // Cabeçalho

  dados.forEach((linha) => {
    const valores = colunas.map((col) => {
      let val = linha[col];
      if (val === null || val === undefined) {
        val = "";
      } else if (typeof val === "object") {
        val = JSON.stringify(val); // Converte arrays (ex: acessorios)
      } else {
        val = String(val);
      }
      // Trata valores que contêm vírgula, aspas ou quebras de linha
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        val = `"${val.replace(/"/g, '""')}"`; // Escapa aspas duplicando-as
      }
      return val;
    });
    csvContent += valores.join(",") + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${nomeArquivo}_${new Date().toISOString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  mostrarAlerta("Dados exportados para CSV com sucesso!", "success");
}

function exportarParaJSON(dados, nomeArquivo) {
  if (dados.length === 0) {
    mostrarAlerta("Não há dados para exportar.", "warning");
    return;
  }
  const dataStr = JSON.stringify(dados, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
  const link = document.createElement("a");
  link.setAttribute("href", dataUri);
  link.setAttribute("download", `${nomeArquivo}_${new Date().toISOString()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  mostrarAlerta("Dados exportados para JSON com sucesso!", "success");
}

function importarDeCSV(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const texto = e.target.result;
      const linhas = texto.split(/[\r\n]+/); // Divide por quebra de linha
      if (linhas.length < 2) {
        throw new Error("Arquivo CSV vazio ou sem cabeçalho.");
      }

      // Detecta a seção de equipamentos
      let inicioEquipamentos = linhas.findIndex((l) =>
        l.startsWith("###EQUIPAMENTOS###")
      );
      if (inicioEquipamentos === -1) {
        // Tenta importar sem o marcador, assumindo que é só de equipamentos
        inicioEquipamentos = 0;
      } else {
        inicioEquipamentos++; // Pula a linha do marcador
      }

      // Pega o cabeçalho
      const cabecalho = parseCSVLine(linhas[inicioEquipamentos]);
      const novosEquipamentos = [];

      for (let i = inicioEquipamentos + 1; i < linhas.length; i++) {
        const linha = linhas[i];
        if (!linha || linha.startsWith("###")) break; // Para se não houver linha ou encontrar outra seção

        const valores = parseCSVLine(linha);
        if (valores.length !== cabecalho.length) continue; // Ignora linhas mal formatadas

        const equipamento = {};
        cabecalho.forEach((key, index) => {
          equipamento[key] = valores[index];
        });
        novosEquipamentos.push(equipamento);
      }

      // (Lógica para Acessórios e Cartuchos seria adicionada aqui)

      if (novosEquipamentos.length > 0) {
        // Substitui ou mescla os dados
        equipamentos = mesclarDados(
          equipamentos,
          novosEquipamentos,
          "registro"
        );
        dadosForamAlterados = true;
        salvarParaLocalStorage();
        renderizarTabelaEquipamentos();
        renderizarDashboard();
        mostrarAlerta(
          `${novosEquipamentos.length} equipamentos importados/atualizados!`,
          "success"
        );
      } else {
        throw new Error("Nenhum equipamento válido encontrado no arquivo.");
      }
    } catch (error) {
      mostrarAlerta(`Erro ao importar CSV: ${error.message}`, "error");
    } finally {
      event.target.value = null; // Limpa o input
    }
  };
  reader.readAsText(file);
}

function importarDeJSON(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const dadosImportados = JSON.parse(e.target.result);
      if (Array.isArray(dadosImportados)) {
        // Substitui ou mescla os dados
        equipamentos = mesclarDados(equipamentos, dadosImportados, "registro");
        dadosForamAlterados = true;
        salvarParaLocalStorage();
        renderizarTabelaEquipamentos();
        renderizarDashboard();
        mostrarAlerta(
          `${dadosImportados.length} equipamentos importados/atualizados!`,
          "success"
        );
      } else if (typeof dadosImportados === "object" && dadosImportados !== null) {
        // Tenta importar estrutura complexa (ex: { equipamentos: [], acessorios: [] })
        let count = 0;
        if (Array.isArray(dadosImportados.equipamentos)) {
          equipamentos = mesclarDados(
            equipamentos,
            dadosImportados.equipamentos,
            "registro"
          );
          count += dadosImportados.equipamentos.length;
        }
        if (Array.isArray(dadosImportados.acessorios)) {
          acessorios = mesclarDados(
            acessorios,
            dadosImportados.acessorios,
            "id"
          );
        }
        if (Array.isArray(dadosImportados.cartuchos)) {
          cartuchos = mesclarDados(
            cartuchos,
            dadosImportados.cartuchos,
            "id"
          );
        }
        
        if(count > 0) {
            dadosForamAlterados = true;
            salvarParaLocalStorage();
            salvarAcessoriosParaLocalStorage();
            salvarCartuchosParaLocalStorage();
            renderizarTabelaEquipamentos();
            renderizarTabelaAcessorios();
            renderizarTabelaCartuchos();
            renderizarDashboard();
            mostrarAlerta("Dados importados/atualizados com sucesso!", "success");
        } else {
             throw new Error("Formato JSON não reconhecido.");
        }
      } else {
        throw new Error("Arquivo JSON não contém um array de dados válido.");
      }
    } catch (error) {
      mostrarAlerta(`Erro ao importar JSON: ${error.message}`, "error");
    } finally {
      event.target.value = null; // Limpa o input
    }
  };
  reader.readAsText(file);
}

function mesclarDados(dadosAtuais, dadosNovos, chaveUnica) {
  const mapa = new Map(dadosAtuais.map((item) => [item[chaveUnica], item]));
  dadosNovos.forEach((item) => {
    mapa.set(item[chaveUnica], item); // Sobrescreve antigos com novos
  });
  return Array.from(mapa.values());
}

/**
 * Analisa uma única linha de um CSV, tratando campos com aspas.
 * @param {string} textline - A linha do CSV.
 * @returns {string[]} - Um array com os valores da linha.
 */
function parseCSVLine(textline) {
  const values = [];
  let inQuote = false;
  let currentValue = "";

  for (let i = 0; i < textline.length; i++) {
    const char = textline[i];
    const nextChar = textline[i + 1];

    if (char === '"') {
      if (inQuote && nextChar === '"') {
        // É uma aspa dupla escapada
        currentValue += '"';
        i++; // Pula a próxima aspa
      } else {
        // É o início ou fim de um campo entre aspas
        inQuote = !inQuote;
      }
    } else if (char === "," && !inQuote) {
      // Fim de um valor
      values.push(currentValue);
      currentValue = "";
    } else {
      currentValue += char;
    }
  }
  // Adiciona o último valor
  values.push(currentValue);
  return values;
}

// ===========================================
// MODAIS E ALERTAS
// ===========================================

// --- Tooltip de Acessórios ---
let tooltipElement;
let currentTooltipId = null;

function configurarTooltipsAcessorios() {
  if (!tooltipElement) {
    tooltipElement = document.getElementById("acessorio-tooltip");
  }

  const wrappers = document.querySelectorAll(".acessorios-icon-wrapper");

  wrappers.forEach((wrapper) => {
    wrapper.addEventListener("mouseenter", (e) => {
      const target = e.currentTarget;
      const tooltipId = target.dataset.tooltipId;

      // Evita piscar se o mouse se mover sobre o mesmo ícone
      if (currentTooltipId === tooltipId) return;
      currentTooltipId = tooltipId;

      const content = target.dataset.tooltipContent;
      tooltipElement.innerHTML = content;
      tooltipElement.style.display = "block";
      posicionarTooltip(target);
    });

    wrapper.addEventListener("mouseleave", () => {
      tooltipElement.style.display = "none";
      currentTooltipId = null;
    });

    wrapper.addEventListener("mousemove", () => {
      if (currentTooltipId === wrapper.dataset.tooltipId) {
        posicionarTooltip(wrapper);
      }
    });
  });
}

function posicionarTooltip(target) {
  const rect = target.getBoundingClientRect();
  const tooltipRect = tooltipElement.getBoundingClientRect();
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  // Tenta posicionar acima
  let top = rect.top + scrollY - tooltipRect.height - 8; // 8px de margem
  let left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;

  // Ajusta se sair pela esquerda
  if (left < scrollX) {
    left = scrollX + 8;
  }
  // Ajusta se sair pela direita
  if (left + tooltipRect.width > scrollX + window.innerWidth) {
    left = scrollX + window.innerWidth - tooltipRect.width - 8;
  }
  // Ajusta se sair por cima (posiciona abaixo)
  if (top < scrollY) {
    top = rect.bottom + scrollY + 8;
  }

  tooltipElement.style.top = `${top}px`;
  tooltipElement.style.left = `${left}px`;
}

// --- Alertas (Toasts) ---
function mostrarAlerta(mensagem, tipo = "info") {
  const container = document.getElementById("alert-container") || createAlertContainer();
  const alerta = document.createElement("div");
  alerta.className = `alert alert-${tipo} show`;
  alerta.innerHTML = `
    <i class="fas ${getIconeAlerta(tipo)}"></i>
    <span>${mensagem}</span>
    <button class="alert-close" onclick="fecharAlerta(this)">&times;</button>
  `;

  container.prepend(alerta); // Adiciona no topo

  // Auto-fechar
  setTimeout(() => {
    alerta.classList.remove("show");
    alerta.classList.add("hide");
    alerta.addEventListener("transitionend", () => {
      if (alerta.parentElement) {
        alerta.parentElement.removeChild(alerta);
      }
    });
  }, 5000); // Fecha após 5 segundos
}

function createAlertContainer() {
    const container = document.createElement("div");
    container.id = "alert-container";
    document.body.appendChild(container);
    return container;
}

function fecharAlerta(button) {
  const alerta = button.parentElement;
  alerta.classList.remove("show");
  alerta.classList.add("hide");
  alerta.addEventListener("transitionend", () => {
     if (alerta.parentElement) {
        alerta.parentElement.removeChild(alerta);
      }
  });
}

function getIconeAlerta(tipo) {
  switch (tipo) {
    case "success":
      return "fa-check-circle";
    case "error":
      return "fa-exclamation-circle";
    case "warning":
      return "fa-exclamation-triangle";
    default:
      return "fa-info-circle";
  }
}

// --- Modal de Confirmação ---
let confirmCallback = null;

function abrirModalConfirm(
  titulo,
  mensagem,
  callback,
  dynamicContent = ""
) {
  confirmCallback = callback;
  document.getElementById("confirm-title").textContent = titulo;
  document.getElementById("confirm-message").textContent = mensagem;
  document.getElementById("confirm-dynamic-content").innerHTML =
    dynamicContent;
  document.getElementById("modal-confirm").style.display = "flex";
  document
    .getElementById("confirm-delete-btn")
    .addEventListener("click", onConfirmClick);
}

function onConfirmClick() {
  if (typeof confirmCallback === "function") {
    confirmCallback();
  }
  // Callback é responsável por fechar o modal
}

function fecharModalConfirm() {
  document.getElementById("modal-confirm").style.display = "none";
  document
    .getElementById("confirm-delete-btn")
    .removeEventListener("click", onConfirmClick);
  confirmCallback = null;
  document.getElementById("confirm-dynamic-content").innerHTML = "";
}

// --- Fechamento de Modais (Genérico) ---
window.onclick = function (event) {
  if (event.target.classList.contains("modal")) {
    event.target.style.display = "none";
    if (event.target.id === "modal-confirm") {
      fecharModalConfirm();
    }
  }
};

// ===========================================
// UTILITÁRIOS
// ===========================================

function contarOcorrencias(array, chave) {
  return array.reduce((acc, obj) => {
    const valor = obj[chave] || "Não definido";
    acc[valor] = (acc[valor] || 0) + 1;
    return acc;
  }, {});
}

function normalizarString(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ===========================================
// GERENCIAMENTO DE TEMA (Dark/Light)
// ===========================================

/**
 * Aplica o tema salvo no localStorage ao carregar a página.
 */
function aplicarTemaSalvo() {
  const savedTheme = localStorage.getItem("themePreference");
  // Se não houver tema salvo, usa o 'light' como padrão
  const theme = savedTheme || "light";
  document.documentElement.setAttribute("data-color-scheme", theme);
  atualizarIconeTema(theme);
}

/**
 * Alterna o tema entre 'light' e 'dark' e salva no localStorage.
 */
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute("data-color-scheme") === "dark";
  const newTheme = isDark ? "light" : "dark";

  html.setAttribute("data-color-scheme", newTheme);
  localStorage.setItem("themePreference", newTheme);
  atualizarIconeTema(newTheme);
  // Re-renderiza os gráficos ao trocar de tema para pegar as novas cores das variáveis CSS
  if (document.getElementById("dashboard").classList.contains("active")) {
    criarGraficos();
  }
}

/**
 * Atualiza o ícone (sol/lua) no botão de tema.
 * @param {string} theme - O tema atual ('light' ou 'dark').
 */
function atualizarIconeTema(theme) {
  const moonIcon = document.getElementById("theme-toggle-icon-moon");
  const sunIcon = document.getElementById("theme-toggle-icon-sun");

  if (!moonIcon || !sunIcon) return;

  if (theme === "dark") {
    moonIcon.style.display = "none";
    sunIcon.style.display = "inline";
  } else {
    moonIcon.style.display = "inline";
    sunIcon.style.display = "none";
  }
}
