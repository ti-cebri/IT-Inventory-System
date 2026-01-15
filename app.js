// Sistema de Gestão de Inventário de TI - Versão Online (Firebase)

// ===========================================
// DADOS E CONFIGURAÇÕES GLOBAIS
// ===========================================

let equipamentos = [];
let acessorios = [];
let cartuchos = [];
let acessoriosSelecionadosTemporariamente = [];

let dadosForamAlterados = false;
let tipoChart, statusChart, departamentoChart;

// Configuração de Paginação
let paginasAtuais = {
  computing: 1,
  infra: 1,
  others: 1,
  acessorios: 1,
};

// ===========================================
// INTEGRAÇÃO COM FIREBASE (NOVO)
// ===========================================

// Função unificada para salvar tudo na nuvem
async function salvarNoFirebase() {
  // Verifica se o Firebase foi inicializado e se há usuário logado
  if (!window.db || !window.auth || !window.auth.currentUser) return;

  const salvarBtn = document.getElementById("btn-exportar-csv");

  // Feedback visual no botão
  if (salvarBtn) {
    salvarBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Salvando...';
    salvarBtn.disabled = true;
  }

  try {
    const dadosGerais = {
      equipamentos: equipamentos,
      acessorios: acessorios,
      cartuchos: cartuchos,
      lastUpdate: new Date().toISOString(),
      updatedBy: window.auth.currentUser.email,
    };

    // Salva na coleção 'cebri_data', documento 'inventario_geral'
    await window.setDoc(
      window.doc(window.db, "cebri_data", "inventario_geral"),
      dadosGerais
    );

    setEstadoAlteracao(false);
    mostrarMensagem("Alterações sincronizadas com a nuvem!", "success");
  } catch (error) {
    console.error("Erro ao salvar no Firebase:", error);
    mostrarMensagem("Erro ao salvar na nuvem: " + error.message, "error");
  } finally {
    // Restaura o botão
    if (salvarBtn) {
      salvarBtn.innerHTML = '<i class="fas fa-download"></i> Exportar CSV';
      salvarBtn.disabled = false;
    }
    atualizarEstadoBotaoSalvar();
  }
}

// Função global chamada pelo index.html assim que o login é feito
window.carregarDadosDoFirebase = async function () {
  mostrarMensagem("Sincronizando dados...", "info");

  try {
    const docRef = window.doc(window.db, "cebri_data", "inventario_geral");
    const docSnap = await window.getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Carrega os arrays globais
      equipamentos = data.equipamentos || [];
      acessorios = data.acessorios || [];
      cartuchos = data.cartuchos || [];

      mostrarMensagem("Dados atualizados!", "success");
    } else {
      console.log("Banco de dados vazio. Iniciando arrays vazios.");
      mostrarMensagem("Bem-vindo! O banco de dados está vazio.", "info");
    }

    // Atualiza toda a interface com os dados carregados
    inicializarInterfaceAposCarga();
  } catch (error) {
    console.error("Erro ao carregar:", error);
    mostrarMensagem("Erro de conexão. Verifique sua internet.", "error");
  }
};

function inicializarInterfaceAposCarga() {
  atualizarEstadoBotaoSalvar();
  setEstadoAlteracao(false);
  mostrarTab("dashboard");
  // Força a atualização da aba atual caso não seja dashboard
  const activeTabBtn = document.querySelector(".tab-btn.active");
  if (activeTabBtn && activeTabBtn.dataset.tab !== "dashboard") {
    mostrarTab(activeTabBtn.dataset.tab);
  }
}

// ===========================================
// INICIALIZAÇÃO E EVENTOS GLOBAIS
// ===========================================

document.addEventListener("DOMContentLoaded", function () {
  // Apenas configura visual e eventos.
  // NÃO carrega dados aqui. O Login no index.html fará isso.
  aplicarTemaSalvo();
  configurarEventListeners();
  configurarMascaras();
});

window.addEventListener("beforeunload", (event) => {
  if (dadosForamAlterados) {
    event.preventDefault();
    event.returnValue = "";
    return "Você possui alterações não salvas. Tem certeza que deseja sair?";
  }
});

// ===========================================
// COMPATIBILIDADE (Redireciona LocalStorage para Firebase)
// ===========================================

// Essas funções substituem as antigas para o seu código continuar funcionando
function salvarParaLocalStorage() {
  salvarNoFirebase();
}
function salvarAcessoriosParaLocalStorage() {
  salvarNoFirebase();
}
function salvarCartuchosParaLocalStorage() {
  salvarNoFirebase();
}

// ===========================================
// NAVEGAÇÃO E EXIBIÇÃO DE CONTEÚDO
// ===========================================

function mostrarTab(tabId) {
  // Elementos globais
  const globalActions = document.querySelector(".global-actions");
  const btnCarregar = document.getElementById("btn-global-carregar");
  const btnSalvar = document.getElementById("btn-exportar-csv");

  // 1. Gestão de abas e botões de navegação
  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  document.querySelector(`[data-tab="${tabId}"]`).classList.add("active");

  // 2. Lógica de Visibilidade dos Botões do Topo

  // Lista de abas onde o botão "Salvar CSV" deve aparecer
  const abasComSalvar = ["lista", "impressoras", "cartuchos", "acessorios"];

  // Reset: Esconde tudo primeiro
  globalActions.style.display = "none";
  if (btnCarregar) btnCarregar.style.display = "none";
  if (btnSalvar) btnSalvar.style.display = "none";

  if (tabId === "dashboard") {
    // No Dashboard: Mostra o container e APENAS o botão Carregar
    globalActions.style.display = ""; // Usa o display flex do CSS
    if (btnCarregar) btnCarregar.style.display = "inline-flex";
  } else if (abasComSalvar.includes(tabId)) {
    // Nas Listas: Mostra o container e APENAS o botão Salvar
    globalActions.style.display = ""; // Usa o display flex do CSS
    if (btnSalvar) btnSalvar.style.display = "inline-flex";
  }

  // 3. Atualizações específicas de cada aba
  if (tabId === "dashboard") atualizarDashboard();
  if (tabId === "lista") aplicarFiltrosEquipamentos();
  if (tabId === "impressoras") atualizarListaImpressoras();
  if (tabId === "acessorios") aplicarFiltrosAcessorios();
  if (tabId === "manutencao") atualizarListaManutencao();
  if (tabId === "cartuchos") atualizarListaCartuchos();
  if (tabId === "arquivados") {
    atualizarListaArquivados();
    atualizarListaCartuchosArquivados();
  }
  if (tabId === "lixeira") atualizarLixeira();
  if (tabId === "cadastro") {
    mostrarFormulario("equipamento");
  }
}

function mostrarFormulario(tipo) {
  const formEquipamento = document.getElementById("form-container-equipamento");
  const formAcessorio = document.getElementById("form-container-acessorio");
  const formCartucho = document.getElementById("form-container-cartucho");
  const btnEquipamento = document.getElementById("btn-toggle-equipamento");
  const btnAcessorio = document.getElementById("btn-toggle-acessorio");
  const btnCartucho = document.getElementById("btn-toggle-cartucho");

  formEquipamento.style.display = "none";
  formAcessorio.style.display = "none";
  formCartucho.style.display = "none";
  btnEquipamento.classList.remove("active");
  btnAcessorio.classList.remove("active");
  btnCartucho.classList.remove("active");

  if (tipo === "equipamento") {
    formEquipamento.style.display = "block";
    btnEquipamento.classList.add("active");
    acessoriosSelecionadosTemporariamente = [];
    inicializarBuscaAcessorios();
    renderizarAcessoriosSelecionados();
    handleTipoEquipamentoChange(document.getElementById("tipoEquipamento"));
  } else if (tipo === "acessorio") {
    formAcessorio.style.display = "block";
    btnAcessorio.classList.add("active");
  } else if (tipo === "cartucho") {
    formCartucho.style.display = "block";
    btnCartucho.classList.add("active");
    popularImpressorasNoCadastroCartucho();
  }
}

function handleTipoAcessorioChange(prefix = "") {
  const idPrefix = prefix ? `${prefix}-` : "acessorio-";
  const tipoSelect = document.getElementById(`${idPrefix}tipo`);
  if (!tipoSelect) return;

  const tipo = tipoSelect.value;
  const campoFornecedorId = prefix
    ? `campo-${prefix}fornecedor`
    : "campo-fornecedor";
  const campoValorMensalId = prefix
    ? `campo-${prefix}valor-mensal`
    : "campo-valor-mensal";

  const campoFornecedor = document.getElementById(campoFornecedorId);
  const campoValorMensal = document.getElementById(campoValorMensalId);
  const inputFornecedor = document.getElementById(`${idPrefix}fornecedor`);

  if (!campoFornecedor || !campoValorMensal || !inputFornecedor) return;

  if (tipo === "Locação") {
    campoFornecedor.style.display = "block";
    campoValorMensal.style.display = "block";
    inputFornecedor.value = "Apnetworks";
  } else {
    campoFornecedor.style.display = "none";
    campoValorMensal.style.display = "none";
    inputFornecedor.value = "";
  }
}

function handleCategoriaAcessorioChange(prefix = "") {
  const idPrefix = prefix ? `${prefix}-` : "acessorio-";
  const categoriaSelect = document.getElementById(`${idPrefix}categoria`);
  if (!categoriaSelect) return;

  const categoria = categoriaSelect.value;
  const campoPolegadasId = prefix
    ? `campo-${prefix}polegadas`
    : "campo-acessorio-polegadas";

  const campoPolegadas = document.getElementById(campoPolegadasId);
  if (!campoPolegadas) return;

  if (categoria === "Monitores") {
    campoPolegadas.style.display = "grid"; // 'grid' pois é uma 'form-row'
  } else {
    campoPolegadas.style.display = "none";
    // Limpar o valor se a categoria mudar
    const inputPolegadas = document.getElementById(`${idPrefix}polegadas`);
    if (inputPolegadas) inputPolegadas.value = "";
  }
}

// ===============================================
// LÓGICA DE VISIBILIDADE DOS CAMPOS DO FORMULÁRIO
// ===============================================
/**
 * Alterna a visibilidade dos campos de CPF e CNPJ com base no nome do usuário.
 * @param {Event} event - O evento de input do campo de nome de usuário.
 */
function handleNomeUsuarioChange(event) {
  const input = event.target;
  const form = input.closest("form");
  if (!form) return;

  const nomeUsuario = input.value.trim().toLowerCase();
  // Usa seletores de "ends-with" para funcionar tanto no formulário principal quanto no de edição
  const cpfGroup = form.querySelector('[id$="cpf-group"]');
  const cnpjGroup = form.querySelector('[id$="cnpj-group"]');
  const cpfInput = form.querySelector('[id$="cpf"]');

  if (!cpfGroup || !cnpjGroup) return;

  if (nomeUsuario === "cebri") {
    cpfGroup.style.display = "none";
    if (cpfInput) cpfInput.value = ""; // Limpa o CPF para não ser salvo por engano
    cnpjGroup.style.display = "block";
  } else {
    cpfGroup.style.display = "block";
    cnpjGroup.style.display = "none";
  }
}

function handleTipoEquipamentoChange(selectElement) {
  const form = selectElement.closest("form");
  if (!form) return;

  const fieldsetUsuario = form.querySelector('[id^="fieldset-usuario"]');
  const fieldsetComercial = form.querySelector('[id^="fieldset-comercial"]');
  const fieldsetAcessorios = form.querySelector('[id^="fieldset-acessorios"]');
  const fieldsetDocumentos = form.querySelector('[id^="fieldset-documentos"]');
  const fieldsetSpecs = form.querySelector('[id^="fieldset-specs"]');
  const polegadasGroup = form.querySelector('[id$="specs-polegadas-group"]');
  const formActionsContainer = form.querySelector("#form-actions-container");
  const modalActions = form.querySelector(".modal-actions");

  // Grupos de visibilidade específicos
  const departamentoGroup = form.querySelector('[id$="departamento-group"]');
  const salaIpGroup = form.querySelector('[id$="sala-ip-group"]');
  const outroTipoGroup = form.querySelector('[id="outroTipoEquipamentoGroup"]');

  // Seleciona o container do IP para ocultá-lo individualmente
  const ipInput = form.querySelector('[name="ip"]');
  const ipGroup = ipInput ? ipInput.closest(".form-group") : null;

  const tipo = selectElement.value;

  // --- ALTERAÇÃO: Adicionei "Outro" nesta lista ---
  // Esses tipos acionam: Mostrar Sala (sem IP) e Auto-preenchimento CEBRI
  const tiposComAutomacao = ["Servidor", "Roteador", "Switch", "Outro"];

  // Funções auxiliares
  const show = (el) => el && (el.style.display = "block");
  const hide = (el) => el && (el.style.display = "none");
  const showFlex = (el) => el && (el.style.display = "flex");
  const showGrid = (el) => el && (el.style.display = "grid");

  // 1. Controle do campo "Especifique o Tipo" (Exclusivo do Outro)
  if (outroTipoGroup) {
    if (tipo === "Outro") {
      show(outroTipoGroup);
    } else {
      hide(outroTipoGroup);
      const outroInput = outroTipoGroup.querySelector("input");
      if (outroInput) outroInput.value = "";
    }
  }

  // 2. Controle Geral dos Fieldsets
  if (!tipo) {
    hide(fieldsetUsuario);
    hide(fieldsetComercial);
    hide(fieldsetAcessorios);
    hide(fieldsetDocumentos);
    hide(fieldsetSpecs);
    if (formActionsContainer) hide(formActionsContainer);
  } else {
    show(fieldsetUsuario);

    const nomeUsuarioInput = form.querySelector('[name="nomeUsuario"]');
    if (nomeUsuarioInput) {
      handleNomeUsuarioChange({ target: nomeUsuarioInput });
    }

    show(fieldsetComercial);

    if (["Notebook", "Desktop"].includes(tipo)) {
      show(fieldsetAcessorios);
      show(fieldsetSpecs);
    } else {
      hide(fieldsetAcessorios);
      hide(fieldsetSpecs);
    }

    if (tipo === "Notebook") {
      show(fieldsetDocumentos);
      if (polegadasGroup) showGrid(polegadasGroup);
    } else {
      hide(fieldsetDocumentos);
      if (polegadasGroup) hide(polegadasGroup);
    }

    if (formActionsContainer) showFlex(formActionsContainer);
    if (modalActions) showFlex(modalActions);
  }

  // 3. Lógica de Visibilidade: Sala, IP e Departamento
  if (departamentoGroup && salaIpGroup) {
    // Reset: garante que o IP apareça por padrão antes de testar
    if (ipGroup) show(ipGroup);

    if (tipo === "Impressora") {
      // Impressora: Sem Dept, Com Sala, Com IP
      hide(departamentoGroup);
      showGrid(salaIpGroup);
    } else if (tiposComAutomacao.includes(tipo)) {
      // Infra + Outro: Com Dept, Com Sala, SEM IP
      showGrid(departamentoGroup);
      showGrid(salaIpGroup);
      if (ipGroup) hide(ipGroup); // Oculta o IP
    } else {
      // Padrão: Com Dept, Sem Sala/IP
      showGrid(departamentoGroup);
      hide(salaIpGroup);
    }
  }

  // 4. Automação de Preenchimento (Infra + Outro)
  if (tiposComAutomacao.includes(tipo)) {
    const nomeInput = form.querySelector('[name="nomeUsuario"]');
    const emailInput = form.querySelector('[name="email"]');

    // Define Usuário CEBRI (o que aciona o CNPJ automaticamente)
    if (nomeInput) {
      nomeInput.value = "CEBRI";
      handleNomeUsuarioChange({ target: nomeInput });
    }
    // Define E-mail
    if (emailInput) {
      emailInput.value = "ti@cebri.org.br";
    }

    // Define Departamento como TI (Padrão para equipamentos CEBRI/Infra)
    const deptSelect = form.querySelector('[name="departamento"]');
    if (deptSelect) {
      deptSelect.value = "TI";
    }

    // Define Aquisição como Patrimonial
    const radioPatrimonial = form.querySelector(
      'input[name="tipoAquisicao"][value="Patrimonial"]'
    );
    if (radioPatrimonial) {
      radioPatrimonial.checked = true;
      handleTipoAquisicaoChange(radioPatrimonial);
    }
  }
}

function handleSalaChange(selectElement) {
  const form = selectElement.closest("form");
  // Tenta achar o campo "outraSala" pelo ID (cadastro) ou pelo nome (edição)
  let inputOutra =
    form.querySelector("#outraSala") ||
    form.querySelector('[name="outraSala"]');

  if (selectElement.value === "Outra") {
    inputOutra.style.display = "block";
    inputOutra.setAttribute("required", "true"); // Torna obrigatório se selecionou "Outra"
  } else {
    inputOutra.style.display = "none";
    inputOutra.removeAttribute("required");
    inputOutra.value = ""; // Limpa o valor se mudar de ideia
  }
}

function handleTipoAquisicaoChange(radioElement) {
  const form = radioElement.closest("form");
  if (!form) return;

  const fornecedorInput = form.querySelector('[name="fornecedor"]');
  const valorGroup = form.querySelector('[id$="valor-group"]');

  if (!fornecedorInput || !valorGroup) return;

  const tipoAquisicao = radioElement.value;

  if (tipoAquisicao === "Alugado") {
    fornecedorInput.value = "Apnetworks";
    valorGroup.style.display = "block";
  } else if (tipoAquisicao === "Patrimonial") {
    fornecedorInput.value = "Propriedade CEBRI";
    valorGroup.style.display = "none";
  } else {
    fornecedorInput.value = "";
    valorGroup.style.display = "block";
  }
}

function preencherPresetsFabricante(event) {
  const fabricanteInput = event.target;
  const form = fabricanteInput.closest("form"); // #equipamento-form

  if (!form) return;

  const tipoEquipamento = form.querySelector("#tipoEquipamento").value;
  const fabricante = fabricanteInput.value.trim().toLowerCase();

  if (tipoEquipamento === "Notebook") {
    const modelo = form.querySelector("#modelo");
    const polegadas = form.querySelector("#polegadas");
    const memoriaRam = form.querySelector("#memoriaRam");
    const armazenamento = form.querySelector("#armazenamento");
    const processador = form.querySelector("#processador");
    const versaoWindows = form.querySelector("#versaoWindows");
    const radioAlugado = form.querySelector(
      'input[name="tipoAquisicao"][value="Alugado"]'
    );
    const radioPatrimonial = form.querySelector(
      'input[name="tipoAquisicao"][value="Patrimonial"]'
    );
    const valor = form.querySelector("#valor");

    if (fabricante === "hp") {
      modelo.value = "ProBook 445 G9";
      polegadas.value = "14'";
      memoriaRam.value = "16GB";
      armazenamento.value = "256";
      processador.value = "AMD Ryzen 5 5625U";
      versaoWindows.value = "Windows 11 Pro";

      if (radioAlugado) {
        radioAlugado.checked = true;
        handleTipoAquisicaoChange(radioAlugado);
      }
      valor.value = "314,45";
    } else {
      modelo.value = "";
      polegadas.value = "";
      memoriaRam.value = "";
      armazenamento.value = "";
      processador.value = "";
      versaoWindows.value = "";
      valor.value = "";

      if (radioPatrimonial) {
        radioPatrimonial.checked = true;
        handleTipoAquisicaoChange(radioPatrimonial);
      } else if (radioAlugado) {
        radioAlugado.checked = false;
        handleTipoAquisicaoChange(radioAlugado);
      }
    }
  } else if (tipoEquipamento === "Impressora") {
    const modelo = form.querySelector("#modelo");
    const radioAlugado = form.querySelector(
      'input[name="tipoAquisicao"][value="Alugado"]'
    );
    const radioPatrimonial = form.querySelector(
      'input[name="tipoAquisicao"][value="Patrimonial"]'
    );
    const valor = form.querySelector("#valor");
    const observacoes = form.querySelector("#observacoes");

    if (fabricante === "epson") {
      modelo.value = "WF-C5890";
      if (radioAlugado) {
        radioAlugado.checked = true;
        handleTipoAquisicaoChange(radioAlugado);
      }
      valor.value = "288,75";
      observacoes.value = "Produção: R$ 0,08";
    } else {
      modelo.value = "";
      valor.value = "";
      observacoes.value = "";

      if (radioPatrimonial) {
        radioPatrimonial.checked = true;
        handleTipoAquisicaoChange(radioPatrimonial);
      } else if (radioAlugado) {
        radioAlugado.checked = false;
        handleTipoAquisicaoChange(radioAlugado);
      }
    }
  }
}

// ===========================================
// GERENCIAMENTO DE ACESSÓRIOS
// ===========================================

function gerarIdUnicoAcessorio() {
  let novoId;
  do {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    novoId = `#A${randomNum}`;
  } while (acessorios.some((ac) => ac.id == novoId));
  return novoId;
}

function salvarAcessorio(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  const categoria = form.get("categoria");

  // --- INÍCIO DA VERIFICAÇÃO DE DUPLICIDADE ---
  const novoPatrimonio = form.get("patrimonio").trim();
  const novoNumeroSerie = form.get("numeroSerie").trim();

  // 1. Verificar Patrimônio
  if (novoPatrimonio) {
    // Acessórios não têm 'isArchived', apenas 'isDeleted' (Lixeira)
    const matchPatrimonio = acessorios.find(
      (ac) => ac.patrimonio === novoPatrimonio && !ac.isDeleted
    );

    if (matchPatrimonio) {
      mostrarMensagem(
        `Acessório já cadastrado com o Patrimônio: ${novoPatrimonio}.`,
        "error"
      );
      return;
    }
  }

  // 2. Verificar Número de Série (só se não achou por patrimônio)
  if (novoNumeroSerie) {
    const matchSerie = acessorios.find(
      (ac) => ac.numeroSerie === novoNumeroSerie && !ac.isDeleted
    );

    if (matchSerie) {
      mostrarMensagem(
        `Acessório já cadastrado com o Número de Série: ${novoNumeroSerie}.`,
        "error"
      );
      return;
    }
  }
  // --- FIM DA VERIFICAÇÃO DE DUPLICIDADE ---

  const novoAcessorio = {
    id: gerarIdUnicoAcessorio(),
    categoria: categoria,
    modelo: form.get("modelo"),
    polegadas: categoria === "Monitores" ? form.get("polegadas") : "",
    patrimonio: form.get("patrimonio") || "",
    numeroSerie: form.get("numeroSerie") || "",
    tipo: form.get("tipo"),
    fornecedor: form.get("tipo") === "Locação" ? "Apnetworks" : "",
    fabricante: form.get("fabricante") || "",
    valorMensal:
      form.get("tipo") === "Locação" ? parseMoeda(form.get("valorMensal")) : 0,
    disponivel: true,
    isDeleted: false,
  };
  acessorios.push(novoAcessorio);
  salvarAcessoriosParaLocalStorage();
  setEstadoAlteracao(true);
  aplicarFiltrosAcessorios();
  mostrarMensagem("Acessório cadastrado com sucesso!", "success");
  limparFormularioAcessorio();
}

function atualizarListaAcessorios(
  categoriaFiltro = "todos",
  termoBusca = "",
  resetarPagina = true
) {
  atualizarContagemAcessoriosDisponiveis();

  // Se for uma nova busca/filtro, volta para página 1
  if (resetarPagina) {
    paginasAtuais.acessorios = 1;
  }

  const tbody = document.getElementById("acessorios-list");
  const emptyState = document.getElementById("acessorios-empty-state");

  // 1. Filtragem e Ordenação
  let acessoriosFiltrados = acessorios.filter((a) => !a.isDeleted);

  if (categoriaFiltro !== "todos") {
    acessoriosFiltrados = acessoriosFiltrados.filter(
      (a) => a.categoria === categoriaFiltro
    );
  }
  if (termoBusca) {
    const termo = termoBusca.toLowerCase();
    acessoriosFiltrados = acessoriosFiltrados.filter((a) =>
      Object.values(a).some((val) => String(val).toLowerCase().includes(termo))
    );
  }

  // --- TRECHO DE ORDENAÇÃO DENTRO DE atualizarListaAcessorios ---

  acessoriosFiltrados.sort((a, b) => {
    // 1. PRIMEIRO CRITÉRIO: Categoria (Agrupa por Tipo: Headsets com Headsets, etc.)
    const catA = a.categoria || "";
    const catB = b.categoria || "";
    const categoriaCompare = catA.localeCompare(catB);

    // Se as categorias forem diferentes, respeita a ordem alfabética das categorias
    if (categoriaCompare !== 0) {
      return categoriaCompare;
    }

    // --- AGORA ESTAMOS DENTRO DA MESMA CATEGORIA ---

    // 2. SEGUNDO CRITÉRIO: Disponibilidade (Disponível vem antes de Indisponível)
    if (a.disponivel && !b.disponivel) return -1;
    if (!a.disponivel && b.disponivel) return 1;

    // 3. TERCEIRO CRITÉRIO: Patrimônio e Modelo (Desempate padrão)
    const pA = a.patrimonio;
    const pB = b.patrimonio;
    const pA_valido = pA && pA !== "N/A";
    const pB_valido = pB && pB !== "N/A";

    if (pA_valido && !pB_valido) return -1;
    if (!pA_valido && pB_valido) return 1;
    if (!pA_valido && !pB_valido)
      return (a.modelo || "").localeCompare(b.modelo || "");

    return pA.localeCompare(pB, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  // 2. Lógica de Paginação (Igual à de Equipamentos)
  const itensPorPagina = window.innerWidth <= 768 ? 5 : 20;
  const totalPaginas =
    Math.ceil(acessoriosFiltrados.length / itensPorPagina) || 1;

  // Segurança
  if (paginasAtuais.acessorios > totalPaginas) paginasAtuais.acessorios = 1;

  const inicio = (paginasAtuais.acessorios - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const itensPagina = acessoriosFiltrados.slice(inicio, fim);

  // 3. Renderização da Tabela
  tbody.innerHTML =
    itensPagina.length > 0
      ? itensPagina
          .map((acessorio) => {
            // --- NOVA LINHA (Lógica diferente para Acessórios) ---
            const dotHtml = acessorio.disponivel
              ? '<div class="status-dot"></div>'
              : "";

            const classeDisponivel = acessorio.disponivel
              ? "row-disponivel"
              : "";
            const dispClass = acessorio.disponivel ? "sim" : "nao";
            const dispText = acessorio.disponivel ? "Sim" : "Não";
            return `
        <tr class="${classeDisponivel}" onclick="toggleCard(this)"> 
          ${dotHtml}
          <td class="checkbox-cell" onclick="event.stopPropagation()">
            <input type="checkbox" class="checkbox-acessorios" value="${
              acessorio.id
            }" onclick="verificarSelecao('acessorios')">
          </td>
          <td>${acessorio.id}</td>
          <td>${acessorio.categoria}</td>
          <td>${acessorio.modelo}</td>
          <td>${acessorio.tipo}</td>
          <td>${acessorio.patrimonio || "N/A"}</td>
          <td>${acessorio.numeroSerie || "N/A"}</td>
          <td><span class="disponibilidade-${dispClass}" ${
              !acessorio.disponivel
                ? `onclick="event.stopPropagation(); mostrarTooltipUsuario(event, '${acessorio.id}')"`
                : ""
            }>${dispText}</span></td>
          <td onclick="event.stopPropagation()"> <div class="action-buttons">
              <button class="btn-action btn-edit" onclick="editarAcessorio('${
                acessorio.id
              }')" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="btn-action btn-delete" onclick="excluirAcessorio('${
                acessorio.id
              }')" title="Excluir"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
          })
          .join("")
      : "";

  // Controle de Visibilidade (Empty State vs Tabela)
  const temItens = acessoriosFiltrados.length > 0;
  emptyState.style.display = temItens ? "none" : "block";
  tbody.closest(".table-container").style.display = temItens ? "block" : "none";

  // 4. Renderização dos Botões de Paginação
  const tabContent = document.getElementById("acessorios");
  let divPag = tabContent.querySelector(".pagination-controls");

  // Se tem itens, mostra/cria paginação. Se não, remove.
  if (temItens) {
    if (!divPag) {
      divPag = document.createElement("div");
      divPag.className = "pagination-controls";
      // Insere logo após a tabela
      tbody.closest(".table-container").after(divPag);
    }

    divPag.innerHTML = `
      <span>Pág ${paginasAtuais.acessorios} de ${totalPaginas}</span>
      <div style="display:flex; gap:5px;">
        <button class="btn-page" onclick="mudarPagina('acessorios', -1)" ${
          paginasAtuais.acessorios === 1 ? "disabled" : ""
        }>
          <i class="fas fa-chevron-left"></i>
        </button>
        <button class="btn-page" onclick="mudarPagina('acessorios', 1)" ${
          paginasAtuais.acessorios >= totalPaginas ? "disabled" : ""
        }>
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `;
    divPag.style.display = "flex"; // Garante que apareça
  } else {
    if (divPag) divPag.style.display = "none";
  }

  popularFiltroCategorias();
  verificarSelecao("acessorios");
}

function atualizarContagemAcessoriosDisponiveis() {
  const summaryElement = document.getElementById(
    "acessorios-disponiveis-summary"
  );
  if (!summaryElement) return;

  // 1. Filtra apenas o que está disponível e não excluído
  const disponiveis = acessorios.filter((a) => a.disponivel && !a.isDeleted);

  // 2. Conta por categoria
  const contagem = disponiveis.reduce((acc, item) => {
    acc[item.categoria] = (acc[item.categoria] || 0) + 1;
    return acc;
  }, {});

  // 3. Mapeamento de Categoria (Nome longo) para Classe CSS e Label Curto
  const mapaEstilo = {
    "Kit (teclado + mouse sem fio)": { css: "kit", label: "Kits" },
    Headsets: { css: "headsets", label: "Headsets" },
    Monitores: { css: "monitores", label: "Monitores" },
    Mouses: { css: "mouses", label: "Mouses" },
    "Suportes com Cooler": { css: "suportes", label: "Suportes" },
    Outros: { css: "outros", label: "Outros" },
  };

  // 4. Gera o HTML colorido
  // Transforma o objeto contagem em array, ordena alfabeticamente e mapeia para HTML
  const summaryHtml = Object.entries(contagem)
    .sort((a, b) => a[0].localeCompare(b[0])) // Ordena por nome da categoria
    .map(([cat, qtd]) => {
      // Pega a config do mapa ou usa o padrão "Outros"
      const config = mapaEstilo[cat] || { css: "outros", label: cat };
      return `<span class="summary-color summary-${config.css}">${qtd} ${config.label}</span>`;
    })
    .join(", ");

  // 5. Atualiza o elemento na tela
  summaryElement.innerHTML = summaryHtml
    ? `Disponíveis: ${summaryHtml}`
    : "Nenhum acessório disponível";
}

function excluirAcessorio(id) {
  // MODIFICAÇÃO (Goal 1): Adiciona modal de confirmação
  abrirModalConfirmacao(
    "Tem certeza que deseja mover este acessório para a lixeira?",
    () => {
      // Lógica original movida para o callback
      const acessorio = acessorios.find((a) => String(a.id) === String(id));
      if (acessorio) {
        acessorio.isDeleted = true;
        acessorio.deletionDate = new Date().toISOString();
        salvarAcessoriosParaLocalStorage();
        setEstadoAlteracao(true);
        aplicarFiltrosAcessorios(); // Atualiza a lista de acessórios
        mostrarMensagem("Acessório movido para a lixeira.", "success");
      }
    }
  );
}

function editarAcessorio(id) {
  const acessorio = acessorios.find((a) => String(a.id) === String(id));
  if (!acessorio) return;
  const container = document.getElementById("edit-acessorio-form-container");
  container.innerHTML = criarFormularioEdicaoAcessorio(acessorio);
  const valorInput = document.getElementById("edit-acessorio-valor-mensal");
  if (valorInput) valorInput.addEventListener("input", aplicarMascaraValor);
  handleTipoAcessorioChange("edit");
  handleCategoriaAcessorioChange("edit");
  document.getElementById("edit-acessorio-modal").classList.add("active");
}

function criarFormularioEdicaoAcessorio(acessorio) {
  const safe = (val) => String(val || "").replace(/"/g, "&quot;");
  const isLocacao = acessorio.tipo === "Locação";
  const categorias = [
    "Kit (teclado + mouse sem fio)",
    "Headsets",
    "Monitores",
    "Mouses",
    "Suportes com Cooler",
    "Outros",
  ];
  const tipos = ["Propriedade CEBRI", "Locação"];
  const opts = (arr, sel) =>
    arr
      .map(
        (i) =>
          `<option value="${i}" ${sel === i ? "selected" : ""}>${i}</option>`
      )
      .join("");
  return `
    <form id="edit-acessorio-form" class="equipment-form" onsubmit="salvarEdicaoAcessorio(event, '${
      acessorio.id
    }')">
      <fieldset class="form-section">
        <legend>Detalhes do Acessório</legend>
        <div class="form-row">
          <div class="form-group"><label>Categoria</label><select id="edit-categoria" name="categoria" class="form-control" onchange="handleCategoriaAcessorioChange('edit')">${opts(
            categorias,
            acessorio.categoria
          )}</select></div>
          <div class="form-group"><label>Modelo</label><input type="text" name="modelo" class="form-control" value="${safe(
            acessorio.modelo
          )}"></div>
        </div>

        <div class="form-row" id="campo-edit-polegadas" style="display: ${
          acessorio.categoria === "Monitores" ? "grid" : "none"
        };">
          <div class="form-group full-width">
            <label>Polegadas</label>
            <input type="text" id="edit-acessorio-polegadas" name="polegadas" class="form-control" value="${safe(
              acessorio.polegadas || ""
            )}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Fabricante</label><input type="text" name="fabricante" class="form-control" value="${safe(
            acessorio.fabricante
          )}"></div>
          <div class="form-group"><label>Patrimônio</label><input type="text" name="patrimonio" class="form-control" value="${safe(
            acessorio.patrimonio
          )}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Número de Série</label><input type="text" name="numeroSerie" class="form-control" value="${safe(
            acessorio.numeroSerie
          )}"></div>
          <div class="form-group"><label>Tipo</label><select id="edit-tipo" name="tipo" class="form-control" onchange="handleTipoAcessorioChange('edit')">${opts(
            tipos,
            acessorio.tipo
          )}</select></div>
        </div>
        <div class="form-row">
          <div id="campo-edit-fornecedor" class="form-group" style="display:${
            isLocacao ? "block" : "none"
          };"><label>Fornecedor</label><input type="text" id="edit-fornecedor" name="fornecedor" class="form-control" readonly value="${safe(
    acessorio.fornecedor
  )}"></div>
          <div id="campo-edit-valor-mensal" class="form-group" style="display:${
            isLocacao ? "block" : "none"
          };"><label>Valor Mensal (R$)</label><input type="text" id="edit-acessorio-valor-mensal" name="valorMensal" class="form-control" value="${(
    acessorio.valorMensal || 0
  )
    .toFixed(2)
    .replace(".", ",")}"></div>
        </div>
      </fieldset>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" onclick="fecharModalAcessorio()">Cancelar</button>
        <button type="submit" class="btn btn--primary"><i class="fas fa-save"></i> Salvar</button>
      </div>
    </form>`;
}

function salvarEdicaoAcessorio(event, id) {
  event.preventDefault();
  const index = acessorios.findIndex((a) => String(a.id) === String(id));
  if (index === -1) return;
  const form = new FormData(event.target);
  const tipo = form.get("tipo");
  const categoria = form.get("categoria");
  acessorios[index] = {
    ...acessorios[index],
    categoria: categoria,
    modelo: form.get("modelo"),
    polegadas: categoria === "Monitores" ? form.get("polegadas") : "",
    fabricante: form.get("fabricante"),
    patrimonio: form.get("patrimonio"),
    numeroSerie: form.get("numeroSerie"),
    tipo: tipo,
    fornecedor: tipo === "Locação" ? "Apnetworks" : "",
    valorMensal: tipo === "Locação" ? parseMoeda(form.get("valorMensal")) : 0,
  };
  salvarAcessoriosParaLocalStorage();
  setEstadoAlteracao(true);
  aplicarFiltrosAcessorios();
  fecharModalAcessorio();
  mostrarMensagem("Acessório atualizado com sucesso!", "success");
}

// ===========================================
// GERENCIAMENTO DE CARTUCHOS
// ===========================================

function popularImpressorasNoCadastroCartucho() {
  const select = document.getElementById("cartucho-impressora-vinculo");
  const impressoras = equipamentos.filter(
    (eq) =>
      eq.tipoEquipamento === "Impressora" && !eq.isArchived && !eq.isDeleted
  );

  while (select.options.length > 1) {
    select.remove(1);
  }

  impressoras.forEach((imp) => {
    const textoOpcao = `${imp.sala} (${imp.ip || "Sem IP"})`;
    const option = new Option(textoOpcao, imp.sala);
    select.add(option);
  });
}

function gerarIdUnicoCartucho() {
  let id;
  do {
    id = `#C${Math.floor(1000 + Math.random() * 9000)}`;
  } while (cartuchos.some((c) => c.id === id));
  return id;
}

function salvarCartucho(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  const numeroSerie = form.get("numeroSerie");
  const patrimonio = form.get("patrimonio"); // Adicionado para pegar patrimonio
  const cor = form.get("cor");
  const impressoraVinculada = form.get("impressoraVinculada");

  if (!numeroSerie || !cor) {
    mostrarMensagem("Número de Série e Cor são obrigatórios.", "error");
    return;
  }

  // --- INÍCIO DA VERIFICAÇÃO DE DUPLICIDADE ---
  // 1. Verificar Patrimônio
  if (patrimonio) {
    // Verifica se patrimonio não é nulo ou vazio
    const matchPatrimonio = cartuchos.find(
      (c) => c.patrimonio === patrimonio && !c.isArchived && !c.isDeleted
    );

    if (matchPatrimonio) {
      mostrarMensagem(
        `Cartucho já cadastrado com o Patrimônio: ${patrimonio}.`,
        "error"
      );
      return;
    }
  }

  // 2. Verificar Número de Série (só se não achou por patrimônio)
  if (numeroSerie) {
    const matchSerie = cartuchos.find(
      (c) => c.numeroSerie === numeroSerie && !c.isArchived && !c.isDeleted
    );

    if (matchSerie) {
      mostrarMensagem(
        `Cartucho já cadastrado com o Número de Série: ${numeroSerie}.`,
        "error"
      );
      return;
    }
  }
  // --- FIM DA VERIFICAÇÃO DE DUPLICIDADE ---

  const novoCartucho = {
    id: gerarIdUnicoCartucho(),
    numeroSerie: numeroSerie,
    patrimonio: form.get("patrimonio") || "N/A",
    cor: cor,
    status: impressoraVinculada ? "Em uso" : "Disponível",
    impressoraVinculada: impressoraVinculada || null,
    isArchived: false,
    isDeleted: false,
  };

  cartuchos.push(novoCartucho);
  salvarCartuchosParaLocalStorage();
  setEstadoAlteracao(true);
  mostrarMensagem("Cartucho cadastrado com sucesso!", "success");
  limparFormularioCartucho();
  atualizarListaCartuchos();
}

function limparFormularioCartucho() {
  document.getElementById("cartucho-form").reset();
}

function atualizarContagemCartuchosDisponiveis() {
  const summaryElement = document.getElementById(
    "cartuchos-disponiveis-summary"
  );
  if (!summaryElement) return;

  const disponiveis = cartuchos.filter(
    (c) => c.status === "Disponível" && !c.isArchived && !c.isDeleted
  );

  const contagemPorCor = disponiveis.reduce((acc, cartucho) => {
    acc[cartucho.cor] = (acc[cartucho.cor] || 0) + 1;
    return acc;
  }, {});

  // Define a ordem desejada das cores
  const colorOrder = ["Ciano (C)", "Amarelo (Y)", "Magenta (M)", "Preto (BK)"];

  // Filtra e ordena as cores que têm contagem maior que 0
  const orderedEntries = colorOrder
    .map((cor) => [cor, contagemPorCor[cor]]) // Mapeia para [cor, quantidade]
    .filter(([_, quantidade]) => quantidade > 0); // Filtra cores com quantidade > 0

  // Gera o HTML com spans coloridos
  const summaryHtml = orderedEntries
    .map(([cor, quantidade]) => {
      // Extrai o nome base da cor para usar como classe CSS (ex: 'ciano', 'amarelo')
      const baseColor = cor.split(" ")[0].toLowerCase().replace(/[()]/g, "");
      // Cria o span com a classe base e a classe específica da cor
      return `<span class="summary-color summary-${baseColor}">${quantidade} ${cor}</span>`;
    })
    .join(", "); // Junta as partes com vírgula e espaço

  // Define o conteúdo do elemento, usando innerHTML pois agora temos HTML
  summaryElement.innerHTML = summaryHtml
    ? `Disponíveis: ${summaryHtml}` // Adiciona o prefixo se houver cartuchos
    : "Nenhum cartucho disponível"; // Mensagem se não houver nenhum
}

function atualizarListaCartuchos() {
  atualizarContagemCartuchosDisponiveis();
  const termo = document
    .getElementById("search-input-cartuchos")
    .value.toLowerCase();
  const tbody = document.getElementById("cartuchos-list");
  const emptyState = document.getElementById("cartuchos-empty-state");

  let cartuchosFiltrados = cartuchos.filter(
    (c) =>
      !c.isArchived &&
      !c.isDeleted &&
      Object.values(c).some((val) => String(val).toLowerCase().includes(termo))
  );

  const colorOrder = {
    "Ciano (C)": 1,
    "Magenta (M)": 2,
    "Amarelo (Y)": 3,
    "Preto (BK)": 4,
  };

  cartuchosFiltrados.sort((a, b) => {
    // 1. PRIMEIRO CRITÉRIO: Cor (Agrupa por cor)
    const orderA = colorOrder[a.cor] || 99;
    const orderB = colorOrder[b.cor] || 99;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // --- AGORA DENTRO DA MESMA COR ---

    // 2. SEGUNDO CRITÉRIO: Disponibilidade (Disponível vem antes)
    const isDispA = a.status === "Disponível";
    const isDispB = b.status === "Disponível";

    if (isDispA && !isDispB) return -1; // A sobe (vem antes)
    if (!isDispA && isDispB) return 1; // B sobe

    // 3. TERCEIRO CRITÉRIO: Patrimônio (Desempate)
    const patA = a.patrimonio === "N/A" ? "ZZZ" : a.patrimonio;
    const patB = b.patrimonio === "N/A" ? "ZZZ" : b.patrimonio;
    return patA.localeCompare(patB, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  if (cartuchosFiltrados.length === 0) {
    tbody.innerHTML = "";
    tbody.closest(".table-container").style.display = "none";
    emptyState.style.display = "block";
  } else {
    tbody.closest(".table-container").style.display = "block";
    emptyState.style.display = "none";

    tbody.innerHTML = cartuchosFiltrados
      .map((cartucho) => {
        // Classes para estilo visual (Bolinha azul e Badge de Status)
        const classeDisponivel =
          cartucho.status === "Disponível" ? "row-disponivel" : "";
        const statusClasse =
          cartucho.status === "Disponível" ? "disponivel" : "ativo";
        const corClasse = cartucho.cor
          .split(" ")[0]
          .toLowerCase()
          .replace(/[()]/g, "");

        return `
      <tr class="${classeDisponivel}" onclick="toggleCard(this)">
        <td class="checkbox-cell" onclick="event.stopPropagation()">
            <input type="checkbox" class="checkbox-cartuchos" value="${
              cartucho.id
            }" onclick="verificarSelecao('cartuchos')">
        </td>
        <td>${cartucho.id}</td>
        <td>${cartucho.numeroSerie}</td>
        <td>${cartucho.patrimonio}</td>
        <td><span class="cor-badge ${corClasse}">${cartucho.cor}</span></td>
        <td><span class="status-badge ${statusClasse}">${
          cartucho.status
        }</span></td>
        <td>${cartucho.impressoraVinculada || "Nenhum"}</td>
        <td onclick="event.stopPropagation()"> 
            <div class="action-buttons">
              <button class="btn-action btn-archive" onclick="arquivarCartucho('${
                cartucho.id
              }')" title="Arquivar"><i class="fas fa-archive"></i></button>
              <button class="btn-action btn-edit" onclick="editarCartucho('${
                cartucho.id
              }')" title="Editar/Vincular"><i class="fas fa-edit"></i></button>
              <button class="btn-action btn-delete" onclick="excluirCartucho('${
                cartucho.id
              }')" title="Excluir"><i class="fas fa-trash"></i></button>
            </div>
        </td>
      </tr>`;
      })
      .join("");
  }
  verificarSelecao("cartuchos");
}

function editarCartucho(id) {
  const cartucho = cartuchos.find((c) => c.id === id);
  if (!cartucho) return;

  const container = document.getElementById("edit-cartucho-form-container");
  container.innerHTML = criarFormularioEdicaoCartucho(cartucho);

  if (!cartucho.isArchived) {
    document
      .getElementById("edit-cartucho-status")
      .addEventListener("change", (e) => {
        const select = document.getElementById("edit-cartucho-impressora");
        select.disabled = e.target.value !== "Em uso";
        if (select.disabled) {
          select.value = "";
        }
      });
  }

  document.getElementById("edit-cartucho-modal").classList.add("active");
}

function criarFormularioEdicaoCartucho(cartucho) {
  const impressoras = equipamentos.filter(
    (eq) =>
      eq.tipoEquipamento === "Impressora" && !eq.isArchived && !eq.isDeleted
  );
  const impressoraOptions = impressoras
    .map((imp) => {
      const textoOpcao = `${imp.sala} (${imp.ip || "Sem IP"})`;
      const isSelected =
        cartucho.impressoraVinculada === imp.sala ? "selected" : "";
      return `<option value="${imp.sala}" ${isSelected}>${textoOpcao}</option>`;
    })
    .join("");

  const cores = ["Preto (BK)", "Ciano (C)", "Magenta (M)", "Amarelo (Y)"];
  const corOptions = cores
    .map(
      (cor) =>
        `<option value="${cor}" ${
          cartucho.cor === cor ? "selected" : ""
        }>${cor}</option>`
    )
    .join("");

  const isArchived = cartucho.isArchived;
  const isEmUso = cartucho.status === "Em uso";

  let statusFieldHtml;
  if (isArchived) {
    statusFieldHtml = `
      <label>Status</label>
      <input type="text" class="form-control" value="${
        cartucho.status || "Trocado"
      }" readonly>
    `;
  } else {
    statusFieldHtml = `
      <label>Status</label>
      <select id="edit-cartucho-status" name="status" class="form-control">
        <option value="Disponível" ${
          !isEmUso ? "selected" : ""
        }>Disponível</option>
        <option value="Em uso" ${isEmUso ? "selected" : ""}>Em uso</option>
      </select>
    `;
  }

  let impressoraFieldHtml;
  if (isArchived) {
    impressoraFieldHtml = `
      <label>Esteve Vinculado a</label>
      <input type="text" class="form-control" value="${
        cartucho.impressoraVinculada || "Nenhum"
      }" readonly>
    `;
  } else {
    impressoraFieldHtml = `
      <label>Vincular à Impressora</label>
      <select id="edit-cartucho-impressora" name="impressoraVinculada" class="form-control" ${
        !isEmUso ? "disabled" : ""
      }>
        <option value="">Nenhuma</option>
        ${impressoraOptions}
      </select>
    `;
  }

  return `
    <form id="edit-cartucho-form" class="equipment-form" onsubmit="salvarEdicaoCartucho(event, '${cartucho.id}')">
      <fieldset class="form-section">
        <legend>Editar Cartucho</legend>
        <div class="form-row">
          <div class="form-group"><label>Número de Série</label><input type="text" name="numeroSerie" class="form-control" value="${cartucho.numeroSerie}"></div>
          <div class="form-group"><label>Patrimônio</label><input type="text" name="patrimonio" class="form-control" value="${cartucho.patrimonio}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Cor</label><select name="cor" class="form-control">${corOptions}</select></div>
          <div class="form-group">${statusFieldHtml}</div>
        </div>
        <div class="form-row">
          <div class="form-group full-width">${impressoraFieldHtml}</div>
        </div>
      </fieldset>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" onclick="fecharModalCartucho()">Cancelar</button>
        <button type="submit" class="btn btn--primary">Salvar</button>
      </div>
    </form>`;
}

function salvarEdicaoCartucho(event, id) {
  event.preventDefault();
  const index = cartuchos.findIndex((c) => c.id === id);
  if (index === -1) return;

  const form = new FormData(event.target);
  const originalCartucho = cartuchos[index];

  const updatedData = {
    numeroSerie: form.get("numeroSerie"),
    patrimonio: form.get("patrimonio"),
    cor: form.get("cor"),
  };

  if (!originalCartucho.isArchived) {
    const status = form.get("status");
    const impressoraVinculada = form.get("impressoraVinculada");
    updatedData.status = status;
    updatedData.impressoraVinculada =
      status === "Em uso" ? impressoraVinculada : null;
  }

  cartuchos[index] = { ...originalCartucho, ...updatedData };

  salvarCartuchosParaLocalStorage();
  setEstadoAlteracao(true);

  if (cartuchos[index].isArchived) {
    atualizarListaCartuchosArquivados();
  } else {
    atualizarListaCartuchos();
  }

  fecharModalCartucho();
  mostrarMensagem("Cartucho atualizado com sucesso!", "success");
}

function excluirCartucho(id) {
  // MODIFICAÇÃO (Goal 1): Adiciona modal de confirmação
  abrirModalConfirmacao(
    "Tem certeza que deseja mover este cartucho para a lixeira?",
    () => {
      // Lógica original movida para o callback
      const cartucho = cartuchos.find((c) => c.id === id);
      if (cartucho) {
        cartucho.isDeleted = true;
        cartucho.deletionDate = new Date().toISOString();
        salvarCartuchosParaLocalStorage();
        setEstadoAlteracao(true);

        // Atualiza a lista correta de onde o item saiu
        if (cartucho.isArchived) {
          atualizarListaCartuchosArquivados();
        } else {
          atualizarListaCartuchos();
        }

        mostrarMensagem("Cartucho movido para a lixeira.", "success");
      }
    }
  );
}

function fecharModalCartucho() {
  document.getElementById("edit-cartucho-modal").classList.remove("active");
}

function arquivarCartucho(id) {
  abrirModalConfirmacao(
    "Tem certeza que deseja arquivar este cartucho?",
    () => {
      const cartucho = cartuchos.find((c) => c.id === id);
      if (cartucho) {
        cartucho.isArchived = true;
        cartucho.status = "Trocado";
        cartucho.archiveDate = new Date().toISOString();
        salvarCartuchosParaLocalStorage();
        setEstadoAlteracao(true);
        atualizarListaCartuchos();
        atualizarListaCartuchosArquivados();
        mostrarMensagem("Cartucho arquivado com sucesso!", "success");
      }
    }
  );
}

function desarquivarCartucho(id) {
  const cartucho = cartuchos.find((c) => c.id === id);
  if (cartucho) {
    cartucho.isArchived = false;
    cartucho.status = "Disponível";
    cartucho.impressoraVinculada = null;
    salvarCartuchosParaLocalStorage();
    setEstadoAlteracao(true);
    atualizarListaCartuchosArquivados();
    atualizarListaCartuchos();
    mostrarMensagem("Cartucho restaurado com sucesso!", "success");
  }
}

function atualizarListaCartuchosArquivados() {
  const termo = document
    .getElementById("search-input-arquivados")
    .value.toLowerCase();
  const tbody = document.getElementById("archived-cartridges-list");
  const emptyState = document.getElementById("archived-cartridges-empty-state");
  const cartuchosFiltrados = cartuchos.filter(
    (c) =>
      c.isArchived &&
      !c.isDeleted &&
      (c.numeroSerie.toLowerCase().includes(termo) ||
        c.patrimonio.toLowerCase().includes(termo))
  );

  if (cartuchos.filter((c) => c.isArchived && !c.isDeleted).length === 0) {
    tbody.innerHTML = "";
    tbody.closest(".table-container").style.display = "none";
    emptyState.style.display = "block";
  } else {
    tbody.closest(".table-container").style.display = "block";
    emptyState.style.display = "none";
    tbody.innerHTML = cartuchosFiltrados
      .map((cartucho) => {
        const corClasse = cartucho.cor
          .split(" ")[0]
          .toLowerCase()
          .replace(/[()]/g, "");
        const statusClasse = "arquivado";
        return `
        <tr>
          <td>${cartucho.id}</td>
          <td>${cartucho.numeroSerie}</td>
          <td><span class="cor-badge ${corClasse}">${cartucho.cor}</span></td>
          <td><span class="status-badge ${statusClasse}">${
          cartucho.status
        }</span></td>
          <td>${formatarData(cartucho.archiveDate)}</td>
          <td>${cartucho.impressoraVinculada || "Nenhum"}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-restore" onclick="desarquivarCartucho('${
                cartucho.id
              }')" title="Restaurar"><i class="fas fa-box-open"></i></button>
              <button class="btn-action btn-edit" onclick="editarCartucho('${
                cartucho.id
              }')" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="btn-action btn-delete" onclick="excluirCartucho('${
                cartucho.id
              }')" title="Excluir"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
      })
      .join("");
  }
}

// ===========================================
// FILTROS, BUSCA E SELETORES
// ===========================================

// --- FUNÇÃO PRINCIPAL: FILTRO, DIVISÃO, ORDENAÇÃO E PAGINAÇÃO ---
function aplicarFiltrosEquipamentos(resetarPagina = true) {
  const termo = document.getElementById("search-input").value.toLowerCase();
  const filtroTipo = document.getElementById("filtro-tipo-equipamento").value;

  // Se for uma nova busca (digitação ou filtro), volta para a página 1
  if (resetarPagina) {
    paginasAtuais = { computing: 1, infra: 1, others: 1 };
  }

  // 1. Filtra a lista completa de equipamentos
  const filtrados = equipamentos.filter((eq) => {
    // BUSCA GLOBAL: Verifica se O TERMO existe em QUALQUER valor do objeto equipamento
    const matchTermo = Object.values(eq).some((valor) =>
      String(valor).toLowerCase().includes(termo)
    );

    const matchTipo =
      filtroTipo === "todos" || eq.tipoEquipamento === filtroTipo;

    // CORREÇÃO 2: Adicionado '&& eq.tipoEquipamento !== "Impressora"'
    // Isso impede que impressoras apareçam na aba Equipamentos (nem em Outros)
    return (
      matchTermo &&
      matchTipo &&
      !eq.isDeleted &&
      !eq.isArchived &&
      eq.tipoEquipamento !== "Impressora"
    );
  });

  // 2. Separa os itens filtrados nas 3 categorias
  const grupos = {
    computing: [], // Notebook, Desktop, Tablet
    infra: [], // Servidor, Roteador, Switch
    others: [], // Outros (Teclado, Mouse, etc)
  };

  filtrados.forEach((eq) => {
    if (["Notebook", "Desktop", "Tablet"].includes(eq.tipoEquipamento)) {
      grupos.computing.push(eq);
    } else if (
      ["Servidor", "Roteador", "Switch"].includes(eq.tipoEquipamento)
    ) {
      grupos.infra.push(eq);
    } else {
      grupos.others.push(eq);
    }
  });

  // --- CORREÇÃO 1: ORDENAÇÃO COMPUTADORES ---
  // Lógica: 1º "Disponível" no topo. 2º Ordem Alfabética de Usuário.
  grupos.computing.sort((a, b) => {
    // Prioridade para Status "Disponível"
    const isDispA = a.statusOperacional === "Disponível";
    const isDispB = b.statusOperacional === "Disponível";

    if (isDispA && !isDispB) return -1; // A sobe
    if (!isDispA && isDispB) return 1; // B sobe

    // Se ambos forem iguais (ambos disponíveis ou ambos indisponíveis), ordena por Nome
    const nomeA = a.nomeUsuario || "";
    const nomeB = b.nomeUsuario || "";
    return nomeA.localeCompare(nomeB);
  });

  // --- CORREÇÃO 2: ORDENAÇÃO OUTROS ---
  // Lógica: Ordem Alfabética por TIPO
  grupos.others.sort((a, b) => {
    const tipoA = a.tipoEquipamento || "";
    const tipoB = b.tipoEquipamento || "";
    return tipoA.localeCompare(tipoB);
  });

  // (Opcional) Ordenação para Infra: Por Tipo também
  grupos.infra.sort((a, b) =>
    (a.tipoEquipamento || "").localeCompare(b.tipoEquipamento || "")
  );

  // 3. Renderiza cada seção separadamente com sua paginação
  renderizarSecaoPaginada(
    grupos.computing,
    "list-computing",
    "section-computing",
    "computing"
  );
  renderizarSecaoPaginada(grupos.infra, "list-infra", "section-infra", "infra");
  renderizarSecaoPaginada(
    grupos.others,
    "list-others",
    "section-others",
    "others"
  );

  // 4. Se não sobrou nada, mostra o desenho de "Vazio"
  const emptyState = document.getElementById("empty-state");
  const temItens = filtrados.length > 0;
  if (emptyState) emptyState.style.display = temItens ? "none" : "block"; // Corrigido para 'block' para centralizar melhor se usar flex no CSS

  // Atualiza o contador de texto no topo
  const resumo = document.getElementById("equipamentos-summary");
  if (resumo)
    resumo.innerHTML = `Quantidade: <span class="summary-color">${filtrados.length} Itens Listados</span>`;
}

// --- FUNÇÃO AUXILIAR 1: DESENHA A TABELA E OS BOTÕES ---
function renderizarSecaoPaginada(lista, tbodyId, sectionId, categoriaKey) {
  const tbody = document.getElementById(tbodyId);
  const section = document.getElementById(sectionId);

  if (!tbody || !section) return;

  // Se a lista está vazia, esconde a seção
  if (lista.length === 0) {
    section.style.display = "none";
    return;
  }

  // Se tem itens, mostra a seção e limpa o tbody
  section.style.display = "block";
  tbody.innerHTML = "";

  // --- MUDANÇA AQUI: Define limite baseado na largura da tela ---
  // Se largura <= 768px (celular), usa 5. Senão (PC), usa 20.
  const itensPorPagina = window.innerWidth <= 768 ? 5 : 20;

  // Cálculos matemáticos da paginação usando o novo limite
  const totalPaginas = Math.ceil(lista.length / itensPorPagina);

  // Segurança: se a página atual estourar o limite (ex: mudou de 5 pra 20 itens), volta pra 1
  if (paginasAtuais[categoriaKey] > totalPaginas)
    paginasAtuais[categoriaKey] = 1;

  const inicio = (paginasAtuais[categoriaKey] - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const itensPagina = lista.slice(inicio, fim);

  // Renderiza as Linhas
  itensPagina.forEach((eq) => {
    const tipoTabela = categoriaKey === "computing" ? "computing" : "infra";
    tbody.innerHTML += criarLinhaEquipamento(
      eq,
      `checkbox-${categoriaKey}`,
      tipoTabela
    );
  });

  // --- CONTROLES DE PAGINAÇÃO ---
  let divPag = section.querySelector(".pagination-controls");

  if (!divPag) {
    divPag = document.createElement("div");
    divPag.className = "pagination-controls";
    const tableContainer = section.querySelector(".table-container");
    if (tableContainer) tableContainer.after(divPag);
  }

  // Preenche o HTML dos botões
  divPag.innerHTML = `
    <span>Pág ${paginasAtuais[categoriaKey]} de ${totalPaginas}</span>
    <div style="display:flex; gap:5px;">
      <button class="btn-page" onclick="mudarPagina('${categoriaKey}', -1)" ${
    paginasAtuais[categoriaKey] === 1 ? "disabled" : ""
  }>
        <i class="fas fa-chevron-left"></i>
      </button>
      <button class="btn-page" onclick="mudarPagina('${categoriaKey}', 1)" ${
    paginasAtuais[categoriaKey] >= totalPaginas ? "disabled" : ""
  }>
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;
}

// --- FUNÇÃO AUXILIAR 2: CLIQUE NOS BOTÕES ---
function mudarPagina(categoria, delta) {
  // Atualiza a página (Soma +1 ou Subtrai -1)
  paginasAtuais[categoria] += delta;

  // Se for acessórios, chama o filtro de acessórios
  if (categoria === "acessorios") {
    aplicarFiltrosAcessorios(false); // false para NÃO resetar para página 1
  } else {
    // Senão, chama o de equipamentos
    aplicarFiltrosEquipamentos(false);
  }
}

function aplicarFiltrosAcessorios(resetarPagina = true) {
  const categoria = document.getElementById("filtro-categoria-acessorio").value;
  const termo = document.getElementById("search-input-acessorios").value;

  // Passamos o parâmetro resetarPagina adiante
  atualizarListaAcessorios(categoria, termo, resetarPagina);
}

function popularFiltroCategorias() {
  const filtro = document.getElementById("filtro-categoria-acessorio");
  const valorAtual = filtro.value;
  const categoriasUnicas = [
    ...new Set(acessorios.filter((a) => !a.isDeleted).map((a) => a.categoria)),
  ].sort();
  filtro.innerHTML =
    '<option value="todos">Todas as Categorias</option>' +
    categoriasUnicas.map((c) => `<option value="${c}">${c}</option>`).join("");
  filtro.value = valorAtual;
}

function inicializarBuscaAcessorios(prefix = "") {
  const input = document.getElementById(`${prefix}acessorio-search-input`);
  if (!input) return;
  input.addEventListener("input", (e) =>
    renderizarResultadosBuscaAcessorios(
      e.target.value.toLowerCase().trim(),
      prefix
    )
  );
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".acessorio-search-component")) {
      document.querySelectorAll(".search-results-container").forEach((c) => {
        c.innerHTML = "";
        c.classList.remove("active");
      });
    }
  });
}

function renderizarResultadosBuscaAcessorios(termo, prefix = "") {
  const results = document.getElementById(`${prefix}acessorio-search-results`);
  results.innerHTML = "";
  if (termo.length < 2) {
    results.classList.remove("active");
    return;
  }
  const disponiveis = acessorios.filter(
    (a) =>
      a.disponivel &&
      !a.isDeleted &&
      !acessoriosSelecionadosTemporariamente.includes(String(a.id)) &&
      (a.categoria.toLowerCase().includes(termo) ||
        a.modelo.toLowerCase().includes(termo) ||
        (a.patrimonio && a.patrimonio.toLowerCase().includes(termo)))
  );
  if (disponiveis.length) {
    disponiveis.forEach((acessorio) => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      item.textContent = `${acessorio.categoria} - ${acessorio.modelo} (Pat: ${
        acessorio.patrimonio || "N/A"
      })`;
      item.onclick = () => selecionarAcessorio(acessorio.id, prefix);
      results.appendChild(item);
    });
    results.classList.add("active");
  } else {
    results.classList.remove("active");
  }
}

function selecionarAcessorio(id, prefix = "") {
  acessoriosSelecionadosTemporariamente.push(String(id));
  const input = document.getElementById(`${prefix}acessorio-search-input`);
  const results = document.getElementById(`${prefix}acessorio-search-results`);
  input.value = "";
  input.focus();
  results.innerHTML = "";
  results.classList.remove("active");
  renderizarAcessoriosSelecionados(prefix);
}

function deselecionarAcessorio(id, prefix = "") {
  acessoriosSelecionadosTemporariamente =
    acessoriosSelecionadosTemporariamente.filter((i) => i !== String(id));
  renderizarAcessoriosSelecionados(prefix);
}

function renderizarAcessoriosSelecionados(prefix = "") {
  const container = document.getElementById(
    `${prefix}acessorios-selecionados-container`
  );
  if (!container) return;
  const emptyText = container.querySelector(".empty-selection-text");
  container.querySelectorAll(".selected-item-pill").forEach((p) => p.remove());
  if (acessoriosSelecionadosTemporariamente.length === 0) {
    emptyText.style.display = "block";
  } else {
    emptyText.style.display = "none";
    acessoriosSelecionadosTemporariamente.forEach((id) => {
      const acessorio = acessorios.find((a) => String(a.id) === id);
      if (acessorio) {
        const pill = document.createElement("div");
        pill.className = "selected-item-pill";
        pill.innerHTML = `<span>${acessorio.modelo}</span><button type="button" class="remove-pill-btn">&times;</button>`;
        pill.querySelector("button").onclick = () =>
          deselecionarAcessorio(id, prefix);
        container.appendChild(pill);
      }
    });
  }
}

// ===========================================
// GERENCIAMENTO DE EQUIPAMENTOS
// ===========================================

function gerarIdUnico() {
  let id;
  do {
    id = `#E${Math.floor(100000 + Math.random() * 900000)}`;
  } while (equipamentos.some((eq) => eq.registro === id));
  return id;
}

function salvarEquipamento(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  const camposObrigatorios = [
    "tipoEquipamento",
    "numeroSerie",
    "numeroPatrimonio",
    "statusOperacional",
  ];
  if (!camposObrigatorios.every((c) => validarCampo(c))) {
    mostrarMensagem("Preencha todos os campos obrigatórios.", "error");
    return;
  }

  // --- INÍCIO DA VERIFICAÇÃO DE PATRIMÔNIO (Série já foi checada por validarCampo) ---
  const novoPatrimonio = form.get("numeroPatrimonio").trim();

  if (novoPatrimonio) {
    const matchPatrimonio = equipamentos.find(
      (eq) =>
        eq.numeroPatrimonio === novoPatrimonio &&
        !eq.isArchived &&
        !eq.isDeleted
    );

    if (matchPatrimonio) {
      mostrarMensagem(
        `Equipamento já cadastrado com o Patrimônio: ${novoPatrimonio}.`,
        "error"
      );
      mostrarErro(
        "numeroPatrimonio",
        "Patrimônio já cadastrado em um item ativo."
      );
      return; // Para a execução
    }
  }
  const equipamento = Object.fromEntries(form.entries());

  // --- LÓGICA PARA SALA "OUTRA" ---
  if (equipamento.sala === "Outra") {
    const outraSalaValor = form.get("outraSala").trim();
    if (!outraSalaValor) {
      mostrarMensagem("Por favor, digite o nome da sala.", "error");
      return;
    }
    equipamento.sala = outraSalaValor; // Substitui "Outra" pelo que foi digitado
  }
  // Remove o campo auxiliar do objeto final para não sujar o banco
  delete equipamento.outraSala;
  // ---------------------------------------

  // *** CORREÇÃO DASHBOARD ***
  if (
    equipamento.statusOperacional === "Disponível" &&
    !equipamento.nomeUsuario
  ) {
    equipamento.departamento = "";
  }

  if (equipamento.tipoEquipamento === "Outro") {
    const tipoCustomizado = form.get("outroTipoEquipamento").trim();
    if (!tipoCustomizado) {
      mostrarMensagem("Por favor, especifique o tipo de equipamento.", "error");
      mostrarErro("outroTipoEquipamento", "Campo obrigatório");
      return;
    }
    equipamento.tipoEquipamento = tipoCustomizado;
  }
  delete equipamento.outroTipoEquipamento;

  equipamento.registro = gerarIdUnico();
  equipamento.acessorios = [...acessoriosSelecionadosTemporariamente];
  equipamento.valor = parseMoeda(equipamento.valor);
  equipamento.termoResponsabilidade = form.has("termoResponsabilidade");
  equipamento.fotoNotebook = form.has("fotoNotebook");
  // *** INÍCIO DA MODIFICAÇÃO ***
  equipamento.mochila = form.has("mochila");
  equipamento.case = form.has("case");
  // Nova lógica para Office (Checkboxes)
  equipamento.officeStandard = form.has("officeStandard");
  equipamento.officePremium = form.has("officePremium");
  delete equipamento.pacoteOffice;
  // O campo 'pacoteOffice' (radio) já é pego pelo Object.fromEntries
  // *** FIM DA MODIFICAÇÃO ***
  equipamento.isArchived = false;
  equipamento.isDeleted = false;

  equipamentos.push(equipamento);
  salvarParaLocalStorage();

  equipamento.acessorios.forEach((id) => {
    const acc = acessorios.find((a) => a.id == id);
    if (acc) acc.disponivel = false;
  });
  salvarAcessoriosParaLocalStorage();

  setEstadoAlteracao(true);
  mostrarMensagem("Equipamento cadastrado com sucesso!", "success");
  limparFormularioEquipamento();
  if (document.getElementById("acessorios").classList.contains("active"))
    aplicarFiltrosAcessorios();
  if (document.getElementById("impressoras").classList.contains("active"))
    atualizarListaImpressoras();
}

function editarEquipamento(registro) {
  const equipamento = equipamentos.find((eq) => eq.registro === registro);
  if (!equipamento) return;
  const container = document.getElementById("edit-form-container");
  container.innerHTML = criarFormularioEdicao(equipamento);
  if (container.querySelector("#edit-cpf"))
    container
      .querySelector("#edit-cpf")
      .addEventListener("input", aplicarMascaraCPF);
  if (container.querySelector("#edit-valor"))
    container
      .querySelector("#edit-valor")
      .addEventListener("input", aplicarMascaraValor);
  acessoriosSelecionadosTemporariamente = [...(equipamento.acessorios || [])];
  inicializarBuscaAcessorios("edit-");
  renderizarAcessoriosSelecionados("edit-");
  handleTipoEquipamentoChange(container.querySelector("#edit-tipoEquipamento"));
  document.getElementById("edit-modal").classList.add("active");
}

function criarFormularioEdicao(equipamento) {
  const safe = (val) => String(val || "").replace(/"/g, "&quot;");
  const opts = (arr, sel) =>
    arr
      .map(
        (i) =>
          `<option value="${i}" ${sel === i ? "selected" : ""}>${i}</option>`
      )
      .join("");
  const radios = (name, opts, sel, fn) =>
    opts
      .map(
        (o) =>
          `<label class="radio-label"><input type="radio" name="${name}" value="${o}" ${
            sel === o ? "checked" : ""
          } onchange="${
            fn || ""
          }"><span class="radio-custom"></span>${o}</label>`
      )
      .join("");

  const departamentos = [
    "Administrativo",
    "Comunicação",
    "Cursos",
    "Diretoria",
    "Eventos",
    "Financeiro",
    "Projetos",
    "Relações Corporativas",
    "Relações Externas",
    "Relações Institucionais",
    "Revista",
    "RH",
    "Serviços Gerais",
    "TI",
  ];

  // --- ALTERAÇÃO SALA (1/2): Define as salas padrão para comparar ---
  const salasPadrao = [
    "Casa COP",
    "COPA",
    "EVENTOS",
    "FINANCEIRO",
    "PRESIDENCIA",
    "PROJETOS",
  ];

  // Verifica se a sala atual é personalizada (não está na lista padrão e não é vazia)
  const isSalaPersonalizada =
    equipamento.sala && !salasPadrao.includes(equipamento.sala);

  // Se for personalizada, o select deve mostrar "Outra". Se não, mostra o valor salvo.
  const salaSelecionada = isSalaPersonalizada
    ? "Outra"
    : equipamento.sala || "";

  // O valor do input de texto será a sala salva (se for personalizada)
  const valorOutraSala = isSalaPersonalizada ? equipamento.sala : "";
  // ------------------------------------------------------------------

  const tiposPadrao = [
    "Desktop",
    "Notebook",
    "Tablet",
    "Impressora",
    "Servidor",
    "Roteador",
    "Switch",
  ];
  const isTipoOutro = !tiposPadrao.includes(equipamento.tipoEquipamento);
  const tipoSelecionado = isTipoOutro ? "Outro" : equipamento.tipoEquipamento;
  const valorOutro = isTipoOutro ? equipamento.tipoEquipamento : "";

  const isImpressora = equipamento.tipoEquipamento === "Impressora";
  const isNotebookOrDesktop = ["Notebook", "Desktop"].includes(tipoSelecionado);

  const isCebriUser =
    (equipamento.nomeUsuario || "").trim().toLowerCase() === "cebri";

  return `
    <form id="edit-form" class="equipment-form" onsubmit="salvarEdicao(event, '${
      equipamento.registro
    }')">
      <fieldset class="form-section"><legend>Detalhes</legend>
        <div class="form-row">
          <div class="form-group"><label>Tipo</label><select id="edit-tipoEquipamento" name="tipoEquipamento" class="form-control" onchange="handleTipoEquipamentoChange(this)">${opts(
            [...tiposPadrao, "Outro"],
            tipoSelecionado
          )}</select></div>
          <div class="form-group"><label>Nº Série</label><input type="text" name="numeroSerie" class="form-control" value="${safe(
            equipamento.numeroSerie
          )}"></div>
        </div>
        <div class="form-row" id="outroTipoEquipamentoGroup" style="display: ${
          isTipoOutro ? "grid" : "none"
        };">
            <div class="form-group full-width">
                <label class="form-label" for="edit-outroTipoEquipamento">Especifique o Tipo</label>
                <input type="text" id="edit-outroTipoEquipamento" name="outroTipoEquipamento" class="form-control" placeholder="Ex: Scanner, Projetor..." value="${safe(
                  valorOutro
                )}">
            </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Fabricante</label><input type="text" name="fabricante" class="form-control" value="${safe(
            equipamento.fabricante
          )}"></div>
          <div class="form-group"><label>Modelo</label><input type="text" name="modelo" class="form-control" value="${safe(
            equipamento.modelo
          )}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Patrimônio</label><input type="text" name="numeroPatrimonio" class="form-control" value="${safe(
            equipamento.numeroPatrimonio
          )}"></div>
          <div class="form-group"><label>Status</label><select name="statusOperacional" class="form-control">${opts(
            ["Disponível", "Ativo", "Inativo", "Em manutenção", "Arquivado"],
            equipamento.statusOperacional
          )}</select></div>
        </div>
      </fieldset>
      <fieldset id="fieldset-specs-edit"><legend>Especificações</legend>
        <div class="form-row" id="specs-polegadas-group-edit"><div class="form-group"><label>Polegadas</label><input type="text" name="polegadas" class="form-control" value="${safe(
          equipamento.polegadas
        )}"></div></div>
        <div class="form-row">
          <div class="form-group"><label>RAM</label><input type="text" name="memoriaRam" class="form-control" value="${safe(
            equipamento.memoriaRam
          )}"></div>
          <div class="form-group"><label>HD/SSD (GB)</label><input type="text" name="armazenamento" class="form-control" value="${safe(
            equipamento.armazenamento
          )}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Processador</label><input type="text" name="processador" class="form-control" value="${safe(
            equipamento.processador
          )}"></div>
          <div class="form-group"><label>Windows</label><input type="text" name="versaoWindows" class="form-control" value="${safe(
            equipamento.versaoWindows
          )}"></div>
        </div>
        <div class="form-group"><label>Placa de Vídeo dedicada?</label><div class="radio-group">${radios(
          "placaVideoDedicada",
          ["Sim", "Não"],
          equipamento.placaVideoDedicada || "Não"
        )}</div></div>
      </fieldset>
      <fieldset id="fieldset-usuario-edit"><legend>Usuário</legend>
        <div class="form-row">
          <div class="form-group"><label>Nome</label><input type="text" name="nomeUsuario" class="form-control" oninput="handleNomeUsuarioChange(event)" value="${safe(
            equipamento.nomeUsuario
          )}"></div>
          <div class="form-group"><label>Email</label><input type="email" name="email" class="form-control" value="${safe(
            equipamento.email
          )}"></div>
        </div>
         <div class="form-row">
            <div class="form-group" id="edit-cpf-group" style="display: ${
              isCebriUser ? "none" : "block"
            }">
                <label class="form-label" for="edit-cpf">CPF</label>
                <input type="text" id="edit-cpf" name="cpf" class="form-control" value="${safe(
                  equipamento.cpf
                )}" placeholder="000.000.000-00" maxlength="14" />
            </div>
            <div class="form-group" id="edit-cnpj-group" style="display: ${
              isCebriUser ? "block" : "none"
            }">
                <label class="form-label" for="edit-cnpj">CNPJ</label>
                <input type="text" id="edit-cnpj" name="cnpj" class="form-control" value="02.673.153/0001-25" readonly />
            </div>
        </div>
      </fieldset>
      <fieldset id="fieldset-comercial-edit"><legend>Comercial</legend>
        <div class="form-row">
          <div class="form-group"><label>Aquisição / Instalação / Entrega</label><input type="date" name="dataAquisicao" class="form-control" value="${safe(
            equipamento.dataAquisicao
          )}"></div>
          <div class="form-group"><label>Tipo</label><div class="radio-group">${radios(
            "tipoAquisicao",
            ["Patrimonial", "Alugado"],
            equipamento.tipoAquisicao,
            "handleTipoAquisicaoChange(this)"
          )}</div></div>
        </div>
        <div class="form-row">
          <div class="form-group" id="edit-valor-group" style="display:${
            equipamento.tipoAquisicao === "Patrimonial" ? "none" : "block"
          }"><label>Valor (R$)</label><input type="text" id="edit-valor" name="valor" class="form-control" value="${(
    equipamento.valor || 0
  )
    .toFixed(2)
    .replace(".", ",")}"></div>
          <div class="form-group"><label>Fornecedor</label><input type="text" name="fornecedor" class="form-control" value="${safe(
            equipamento.fornecedor
          )}"></div>
        </div>
        
        <div class="form-row" id="edit-departamento-group" style="display:${
          isImpressora ? "none" : "grid"
        }"><div class="form-group"><label>Departamento</label><select name="departamento" class="form-control"><option value="" ${
    equipamento.departamento === "" ? "selected" : ""
  }>Nenhum</option>${opts(
    departamentos,
    equipamento.departamento
  )}</select></div></div>
        
        <div class="form-row" id="edit-sala-ip-group" style="display:${
          isImpressora ? "grid" : "none"
        }">
          
          <div class="form-group">
            <label>Sala</label>
            <select name="sala" class="form-control" onchange="handleSalaChange(this)">
                <option value="">Selecione</option>
                ${opts(salasPadrao, salaSelecionada)}
                <option value="Outra" ${
                  isSalaPersonalizada ? "selected" : ""
                }>Outra</option>
            </select>
            <input 
                type="text" 
                id="edit-outraSala" 
                name="outraSala" 
                class="form-control" 
                placeholder="Especifique a sala"
                value="${safe(valorOutraSala)}"
                style="display: ${
                  isSalaPersonalizada ? "block" : "none"
                }; margin-top: 8px;"
            >
          </div>
          <div class="form-group"><label>IP</label><input type="text" name="ip" class="form-control" value="${safe(
            equipamento.ip
          )}"></div>
        </div>
      </fieldset>
      
      <fieldset id="fieldset-acessorios-edit" style="display:${
        isNotebookOrDesktop ? "block" : "none"
      }"><legend>Acessórios</legend>
        <div class="acessorio-search-component">
          <div class="form-group"><label>Buscar</label><input type="text" id="edit-acessorio-search-input" class="form-control" placeholder="Digite para buscar..." autocomplete="off"/>
            <div id="edit-acessorio-search-results" class="search-results-container"></div>
          </div>
          <div id="edit-acessorios-selecionados-container" class="selected-items-container">
            <p class="empty-selection-text">Nenhum acessório.</p>
          </div>
        </div>
        
        <div class="form-row" style="margin-top: 16px">
            <div class="form-group">
                <label class="form-label">Mochila / Case</label>
                <div class="checkbox-item" style="margin-top: 8px">
                    <input type="checkbox" id="edit-mochila" name="mochila" ${
                      equipamento.mochila ? "checked" : ""
                    } />
                    <label for="edit-mochila">Mochila</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="edit-case" name="case" ${
                      equipamento.case ? "checked" : ""
                    } />
                    <label for="edit-case">Case</label>
                </div>
            </div>
            <div class="form-group">
    <label class="form-label">Pacote Office - 365</label>
    <div class="checkbox-item" style="margin-top: 8px">
        <input type="checkbox" id="edit-officeStandard" name="officeStandard" ${
          equipamento.officeStandard ? "checked" : ""
        } />
        <label for="edit-officeStandard">Standard</label>
    </div>
    <div class="checkbox-item">
        <input type="checkbox" id="edit-officePremium" name="officePremium" ${
          equipamento.officePremium ? "checked" : ""
        } />
        <label for="edit-officePremium">Premium</label>
    </div>
</div>
        </div>
        </fieldset>
      <fieldset id="fieldset-documentos-edit"><legend>Documentos</legend><div class="checkbox-item"><input type="checkbox" id="edit-termo-responsabilidade" name="termoResponsabilidade" ${
        equipamento.termoResponsabilidade ? "checked" : ""
      }><label for="edit-termo-responsabilidade">Termo Assinado</label></div><div class="checkbox-item"><input type="checkbox" id="edit-foto-notebook" name="fotoNotebook" ${
    equipamento.fotoNotebook ? "checked" : ""
  }><label for="edit-foto-notebook">Foto do Notebook</label></div></fieldset>
      <fieldset><legend>Observações</legend><div class="form-group"><textarea name="observacoes" class="form-control" rows="3">${safe(
        equipamento.observacoes
      )}</textarea></div></fieldset>
      <div class="modal-actions"><button type="button" class="btn btn--secondary" onclick="fecharModal()">Cancelar</button><button type="submit" class="btn btn--primary">Salvar</button></div>
    </form>`;
}

function salvarEdicao(event, registro) {
  event.preventDefault();
  const index = equipamentos.findIndex((eq) => eq.registro === registro);
  if (index === -1) return;

  const form = new FormData(event.target);
  const equipamentoAntigo = equipamentos[index];
  const acessoriosAntigos = new Set(equipamentoAntigo.acessorios || []);
  const novosAcessorios = new Set(
    acessoriosSelecionadosTemporariamente.map(String)
  );

  acessoriosAntigos.forEach((id) => {
    if (!novosAcessorios.has(id)) {
      const acc = acessorios.find((a) => String(a.id) === id);
      if (acc) acc.disponivel = true;
    }
  });
  novosAcessorios.forEach((id) => {
    if (!acessoriosAntigos.has(id)) {
      const acc = acessorios.find((a) => String(a.id) === id);
      if (acc) acc.disponivel = false;
    }
  });

  const updatedData = Object.fromEntries(form.entries());

  // *** CORREÇÃO DASHBOARD ***
  if (
    updatedData.statusOperacional === "Disponível" &&
    !updatedData.nomeUsuario
  ) {
    updatedData.departamento = "";
  }

  if (updatedData.tipoEquipamento === "Outro") {
    const tipoCustomizado = form.get("outroTipoEquipamento").trim();
    if (!tipoCustomizado) {
      mostrarMensagem("Por favor, especifique o tipo de equipamento.", "error");
      return;
    }
    updatedData.tipoEquipamento = tipoCustomizado;
  }
  delete updatedData.outroTipoEquipamento;

  equipamentos[index] = {
    ...equipamentoAntigo,
    ...updatedData,
    valor: parseMoeda(updatedData.valor),
    acessorios: [...novosAcessorios],
    termoResponsabilidade: form.has("termoResponsabilidade"),
    fotoNotebook: form.has("fotoNotebook"),
    // *** INÍCIO DA MODIFICAÇÃO ***
    mochila: form.has("mochila"),
    case: form.has("case"),
    // *** ALTERAÇÃO ***
    mochila: form.has("mochila"),
    case: form.has("case"),
    officeStandard: form.has("officeStandard"),
    officePremium: form.has("officePremium")
    // *** FIM DA MODIFICAÇÃO ***
  };

  salvarParaLocalStorage();
  salvarAcessoriosParaLocalStorage();
  setEstadoAlteracao(true);

  if (equipamentos[index].isArchived) {
    atualizarListaArquivados();
  } else {
    aplicarFiltrosEquipamentos();
    atualizarListaImpressoras();
  }

  if (document.getElementById("acessorios").classList.contains("active"))
    aplicarFiltrosAcessorios();

  fecharModal();
  mostrarMensagem("Equipamento atualizado com sucesso!", "success");
}

function excluirEquipamento(registro) {
  // MODIFICAÇÃO (Goal 1): Adiciona modal de confirmação
  abrirModalConfirmacao(
    "Tem certeza que deseja mover este item para a lixeira?",
    () => {
      // Esta é a função de callback que executa a exclusão
      const eq = equipamentos.find((e) => e.registro === registro);
      if (eq) {
        // --- INÍCIO DA MODIFICAÇÃO (Goal 2) ---
        // Se for um equipamento que pode ter acessórios, liberar os acessórios
        if (
          ["Notebook", "Desktop"].includes(eq.tipoEquipamento) &&
          eq.acessorios &&
          eq.acessorios.length > 0
        ) {
          eq.acessorios.forEach((acessorioId) => {
            const acessorio = acessorios.find(
              (a) => String(a.id) === String(acessorioId)
            );
            // Verifica se o acessório existe e não está, ele mesmo, na lixeira
            if (acessorio && !acessorio.isDeleted) {
              acessorio.disponivel = true;
            }
          });
          salvarAcessoriosParaLocalStorage(); // Salva o novo estado dos acessórios
          // Atualiza a lista de acessórios se o usuário estiver nela
          if (
            document.getElementById("acessorios").classList.contains("active")
          ) {
            aplicarFiltrosAcessorios();
          }
        }
        // --- FIM DA MODIFICAÇÃO (Goal 2) ---

        eq.isDeleted = true;
        eq.deletionDate = new Date().toISOString();
        salvarParaLocalStorage();
        setEstadoAlteracao(true);

        // Atualiza a lista correta de onde o item saiu
        if (eq.isArchived) {
          atualizarListaArquivados();
        } else if (eq.tipoEquipamento === "Impressora") {
          atualizarListaImpressoras();
        } else {
          aplicarFiltrosEquipamentos();
        }

        mostrarMensagem("Equipamento movido para a lixeira.", "success");
      }
    }
  );
}

// ===========================================
// EVENT LISTENERS
// ===========================================

// No arquivo app.js, substitua a função configurarEventListeners por esta:

function configurarEventListeners() {
  // Navegação entre abas
  document
    .querySelectorAll(".tab-btn")
    .forEach(
      (btn) => (btn.onclick = (e) => mostrarTab(e.currentTarget.dataset.tab))
    );

  // Submissão de Formulários
  document.getElementById("equipamento-form").onsubmit = salvarEquipamento;
  document.getElementById("acessorio-form").onsubmit = salvarAcessorio;
  document.getElementById("cartucho-form").onsubmit = salvarCartucho;

  // --- BUSCAS (CORRIGIDO) ---
  // Usamos () => para garantir que a função só rode quando você digitar

  // 1. Equipamentos
  document.getElementById("search-input").oninput = () =>
    aplicarFiltrosEquipamentos(true);

  // 2. Impressoras
  document.getElementById("search-input-impressoras").oninput =
    filtrarImpressoras;

  // 3. Acessórios
  document.getElementById("search-input-acessorios").oninput = () =>
    aplicarFiltrosAcessorios(true);

  // 4. Cartuchos
  document.getElementById("search-input-cartuchos").oninput =
    atualizarListaCartuchos;

  // Busca Arquivados (UNIFICADA - Um campo atualiza tudo)
  document.getElementById("search-input-arquivados").oninput = () => {
    atualizarListaArquivados();
    atualizarListaCartuchosArquivados();
  };

  // Eventos de mudança nos selects
  document.getElementById("tipoEquipamento").onchange = (e) =>
    handleTipoEquipamentoChange(e.target);

  document.getElementById("acessorio-categoria").onchange = () =>
    handleCategoriaAcessorioChange();

  document
    .getElementById("fabricante")
    .addEventListener("input", preencherPresetsFabricante);

  document.getElementById("acessorio-tipo").onchange = () =>
    handleTipoAcessorioChange();

  configurarValidacaoTempoReal();

  // Fecha tooltip ao clicar fora
  document.addEventListener("click", (e) => {
    const tooltip = document.getElementById("acessorio-tooltip");
    if (tooltip.classList.contains("active")) {
      const clicouNoIcone = e.target.closest(
        ".acessorio-badge, .disponibilidade-nao, .icon-doc-pending, .clickable-sala, .icon-kit, .icon-headsets, .icon-monitores, .icon-mouses, .icon-suportes, .icon-outros"
      );
      const clicouDentroDoTooltip = e.target.closest("#acessorio-tooltip");

      if (!clicouNoIcone && !clicouDentroDoTooltip) {
        esconderTooltip();
      }
    }
  });

  // --- FUNCIONALIDADE DE BUSCA: MANUTENÇÃO (Mantido pois usa lógica diferente) ---
  const searchManutencao = document.getElementById("search-input-manutencao");
  if (searchManutencao) {
    searchManutencao.addEventListener("keyup", function () {
      const termo = this.value.toLowerCase();
      const linhas = document.querySelectorAll("#manutencao-list tr");
      linhas.forEach((linha) => {
        const texto = linha.innerText.toLowerCase();
        linha.style.display = texto.includes(termo) ? "" : "none";
      });
    });
  }

  // --- FUNCIONALIDADE DE BUSCA: LIXEIRA (GLOBAL) ---
  const searchLixeira = document.getElementById("search-input-lixeira");
  if (searchLixeira) {
    searchLixeira.addEventListener("keyup", function () {
      const termo = this.value.toLowerCase();
      // Seleciona as linhas de TODAS as tabelas da lixeira
      const linhasEquip = document.querySelectorAll(
        "#lixeira-equipment-list tr"
      );
      const linhasAcess = document.querySelectorAll(
        "#lixeira-acessorios-list tr"
      );
      const linhasCart = document.querySelectorAll(
        "#lixeira-cartuchos-list tr"
      );

      const filtrar = (lista) => {
        lista.forEach((linha) => {
          const texto = linha.innerText.toLowerCase();
          linha.style.display = texto.includes(termo) ? "" : "none";
        });
      };
      filtrar(linhasEquip);
      filtrar(linhasAcess);
      filtrar(linhasCart);
    });
  }

  // Alternador de Tema
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) themeBtn.onclick = toggleTheme;
}

// window.onresize = () => aplicarFiltrosEquipamentos(false);

// ===========================================
// CSV, ESTADO E PERSISTÊNCIA
// ===========================================

function atualizarEstadoBotaoSalvar() {
  const btn = document.getElementById("btn-exportar-csv");
  if (!btn) return;
  btn.disabled =
    equipamentos.length === 0 &&
    acessorios.length === 0 &&
    cartuchos.length === 0;
  setEstadoAlteracao(dadosForamAlterados);
}

function setEstadoAlteracao(alterado) {
  dadosForamAlterados = alterado;
  const btn = document.getElementById("btn-exportar-csv");
  if (!btn) return;
  btn.classList.toggle("btn--warning", alterado && !btn.disabled);
  btn.classList.toggle("btn--primary", !alterado || btn.disabled);
  btn.innerHTML =
    alterado && !btn.disabled
      ? `<i class="fas fa-exclamation-triangle"></i> Exportar CSV`
      : `<i class="fas fa-download"></i> Exportar CSV`;
}

// *** INÍCIO DA MODIFICAÇÃO ***
const cabecalhoEquipamentosCSV = [
  "registro",
  "nomeUsuario",
  "email",
  "cpf",
  "departamento",
  "sala",
  "ip",
  "tipoEquipamento",
  "fabricante",
  "modelo",
  "numeroSerie",
  "numeroPatrimonio",
  "statusOperacional",
  "dataAquisicao",
  "fornecedor",
  "valor",
  "tipoAquisicao",
  "acessorios",
  "observacoes",
  "termoResponsabilidade",
  "fotoNotebook",
  "mochila", // NOVO
  "case", // NOVO
  "officeStandard", // NOVO
  "officePremium",  // NOVO
  "isArchived",
  "archiveDate",
  "motivoArquivamento",
  "isDeleted",
  "deletionDate",
  "polegadas",
  "memoriaRam",
  "armazenamento",
  "processador",
  "versaoWindows",
  "placaVideoDedicada",
  "dataEntradaManutencao",
  "motivoManutencao",
];
// *** FIM DA MODIFICAÇÃO ***

const cabecalhoAcessoriosCSV = [
  "id",
  "categoria",
  "modelo",
  "polegadas",
  "patrimonio",
  "numeroSerie",
  "tipo",
  "fornecedor",
  "fabricante",
  "valorMensal",
  "disponivel",
  "isDeleted",
  "deletionDate",
];
const cabecalhoCartuchosCSV = [
  "id",
  "numeroSerie",
  "patrimonio",
  "cor",
  "status",
  "impressoraVinculada",
  "isArchived",
  "isDeleted",
  "deletionDate",
  "archiveDate",
];

function gerarCsv(dados, cabecalho) {
  if (!dados || dados.length === 0) return "";
  const linhas = dados.map((item) =>
    cabecalho.map((key) => {
      const valor = item[key];
      if (Array.isArray(valor)) return valor.join(";");
      return valor !== undefined && valor !== null ? valor : "";
    })
  );
  return [
    cabecalho.join(","),
    ...linhas.map((l) =>
      l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
}

function salvarDadosCompletos() {
  if (
    equipamentos.length === 0 &&
    acessorios.length === 0 &&
    cartuchos.length === 0
  ) {
    mostrarMensagem("Não há dados para salvar.", "error");
    return;
  }

  const equipamentosGerais = equipamentos.filter(
    (eq) => eq.tipoEquipamento !== "Impressora"
  );
  const impressoras = equipamentos.filter(
    (eq) => eq.tipoEquipamento === "Impressora"
  );

  const csvEquipamentos = gerarCsv(
    equipamentosGerais,
    cabecalhoEquipamentosCSV
  );
  const csvImpressoras = gerarCsv(impressoras, cabecalhoEquipamentosCSV);
  const csvAcessorios = gerarCsv(acessorios, cabecalhoAcessoriosCSV);
  const csvCartuchos = gerarCsv(cartuchos, cabecalhoCartuchosCSV);

  const finalContent = `###EQUIPAMENTOS###\n${csvEquipamentos}\n\n###IMPRESSORAS###\n${csvImpressoras}\n\n###ACESSORIOS###\n${csvAcessorios}\n\n###CARTUCHOS###\n${csvCartuchos}`;

  const blob = new Blob(["\uFEFF" + finalContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "inventario_completo.csv";
  link.click();
  URL.revokeObjectURL(link.href);
  setEstadoAlteracao(false);
  mostrarMensagem("Arquivo de inventário completo salvo!", "success");
}

/**
 * [CORRIGIDO] Analisa o texto CSV em um array de objetos, lidando
 * corretamente com quebras de linha e aspas escapadas (RFC 4180).
 */
function parseCsvData(csv, cabecalho) {
  if (!csv || !csv.trim()) return [];

  const linhas = [];
  let inQuotes = false;
  let currentLine = "";
  let start = 0;

  // 1. Limpa o marcador de seção (se existir no início)
  const csvData = csv.trim().replace(/^###[A-Z]+###\n/, "");

  // 2. Separa o CSV em linhas, respeitando as quebras de linha dentro das aspas
  for (let i = 0; i < csvData.length; i++) {
    const char = csvData[i];

    if (char === '"') {
      if (csvData[i + 1] === '"') {
        // É uma aspa escapada (""), pular
        i++;
      } else {
        // É uma aspa de abertura/fechamento
        inQuotes = !inQuotes;
      }
    }

    // Se o caractere for um newline E não estivermos dentro de aspas,
    // encontramos o fim de uma linha de dados.
    if (char === "\n" && !inQuotes) {
      currentLine = csvData.substring(start, i).trim();
      if (currentLine && !currentLine.startsWith("###")) {
        linhas.push(currentLine);
      }
      start = i + 1; // Próxima linha começa depois do \n
    }
  }
  // Adicionar a última linha
  currentLine = csvData.substring(start).trim();
  if (currentLine && !currentLine.startsWith("###")) {
    linhas.push(currentLine);
  }

  // 3. Processar cada linha para extrair colunas
  if (linhas.length > 0 && linhas[0].includes(cabecalho[0])) {
    linhas.shift(); // Remove o cabeçalho do CSV
  }

  return linhas.map((linha) => {
    const valores = [];
    // Regex CORRIGIDA que lida com:
    // 1. Campos com aspas (e aspas escapadas dentro: "")
    // 2. Newlines DENTRO de campos com aspas
    // 3. Campos sem aspas
    const regex = /(?:(?:"((?:[^"]|"")*)")|([^,]*))(?:,|$)/g;
    let match;

    while ((match = regex.exec(linha))) {
      if (match[1] !== undefined) {
        // Campo com aspas (grupo 1)
        // Desescapa as aspas ("" -> ")
        valores.push(match[1].replace(/""/g, '"'));
      } else if (match[2] !== undefined) {
        // Campo sem aspas (grupo 2)
        valores.push(match[2]);
      }
      // Se a correspondência não terminar com uma vírgula, é o fim da linha
      if (match[0].slice(-1) !== ",") {
        break;
      }
    }

    const item = {};
    cabecalho.forEach((key, index) => {
      item[key] = valores[index] || "";
    });

    // O resto da sua lógica de parsing (booleans, floats, etc.)
    [
      "isArchived",
      "isDeleted",
      "termoResponsabilidade",
      "fotoNotebook",
      "disponivel",
      "mochila",
      "case",
      "officeStandard",
      "officePremium"
    ].forEach((key) => {
      if (item[key] !== undefined) item[key] = item[key] === "true";
    });

    ["valor", "valorMensal"].forEach((key) => {
      if (item[key] !== undefined)
        item[key] = parseFloat(String(item[key]).replace(",", ".")) || 0;
    });

    if (item.acessorios) {
      item.acessorios = String(item.acessorios)
        .split(";")
        .filter((id) => id);
    } else {
      item.acessorios = [];
    }

    return item;
  });
}

function carregarDadosCompletos() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;

        const sections = text.split(
          /###IMPRESSORAS###|###ACESSORIOS###|###CARTUCHOS###/
        );

        const eqCsv = sections[0]
          ? sections[0].replace("###EQUIPAMENTOS###", "").trim()
          : "";
        const impCsv = sections[1] ? sections[1].trim() : "";
        const accCsv = sections[2] ? sections[2].trim() : "";
        const cartCsv = sections[3] ? sections[3].trim() : "";

        const equipamentosGerais = parseCsvData(
          eqCsv,
          cabecalhoEquipamentosCSV
        );
        const impressoras = parseCsvData(impCsv, cabecalhoEquipamentosCSV);

        equipamentos = [...equipamentosGerais, ...impressoras];
        acessorios = parseCsvData(accCsv, cabecalhoAcessoriosCSV);
        cartuchos = parseCsvData(cartCsv, cabecalhoCartuchosCSV);

        salvarParaLocalStorage();
        salvarAcessoriosParaLocalStorage();
        salvarCartuchosParaLocalStorage();
        setEstadoAlteracao(false);

        const activeTab = document.querySelector(".tab-btn.active").dataset.tab;
        mostrarTab(activeTab);

        mostrarMensagem("Dados carregados com sucesso!", "success");
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        mostrarMensagem("Erro ao ler o arquivo. Verifique o formato.", "error");
      }
    };
    reader.readAsText(file, "UTF-8");
  };
  input.click();
}

// ===========================================
// VALIDAÇÕES E MÁSCARAS
// ===========================================

function configurarMascaras() {
  document.getElementById("cpf").oninput = aplicarMascaraCPF;
  document.getElementById("valor").oninput = aplicarMascaraValor;
  document.getElementById("acessorio-valor-mensal").oninput =
    aplicarMascaraValor;
}
function aplicarMascaraCPF(e) {
  let v = e.target.value.replace(/\D/g, "");
  v = v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  e.target.value = v;
}
function aplicarMascaraValor(e) {
  let v = e.target.value.replace(/\D/g, "");
  v = (v / 100)
    .toFixed(2)
    .replace(".", ",")
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  e.target.value = v;
}
function parseMoeda(valor) {
  return (
    parseFloat(
      String(valor || "")
        .replace(/\./g, "")
        .replace(",", ".")
    ) || 0
  );
}
function configurarValidacaoTempoReal() {
  [
    "tipoEquipamento",
    "numeroSerie",
    "numeroPatrimonio",
    "statusOperacional",
    "email",
    "cpf",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.onblur = () => validarCampo(id);
      el.oninput = () => limparErro(id);
    }
  });
}
function validarCampo(id, registroExcluido = null) {
  const el = document.getElementById(id);
  const valor = el ? el.value.trim() : "";
  let erroMsg = "";
  switch (id) {
    case "email":
      if (valor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor))
        erroMsg = "E-mail inválido";
      break;
    case "cpf":
      if (valor && !validarCPF(valor)) erroMsg = "CPF inválido";
      break;
    case "tipoEquipamento":
    case "statusOperacional":
    case "numeroPatrimonio":
      if (!valor) erroMsg = "Campo obrigatório";
      break;
    case "numeroSerie":
      if (!valor) erroMsg = "Número de série é obrigatório";
      else if (
        equipamentos.some(
          (eq) =>
            !eq.isDeleted &&
            !eq.isArchived && // <-- ADICIONE ESTA LINHA
            eq.numeroSerie.toLowerCase() === valor.toLowerCase() &&
            eq.registro !== registroExcluido
        )
      )
        erroMsg = "Número de série já cadastrado";
      break;
  }
  mostrarErro(id, erroMsg);
  return !erroMsg;
}
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0,
    resto;
  for (let i = 1; i <= 9; i++)
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++)
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf.substring(10, 11));
}

// ===========================================
// FUNÇÕES UTILITÁRIAS DE DATA
// ===========================================
function formatarData(isoString) {
  if (!isoString) return "N/A";
  try {
    const data = new Date(isoString);
    if (isNaN(data)) return "Data inválida";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(data);
  } catch {
    return "Data inválida";
  }
}

// ===========================================
// DASHBOARD E GRÁFICOS
// ===========================================
function atualizarDashboard() {
  calcularMetricas();
  criarGraficos();
}
function calcularMetricas() {
  // --- ALTERAÇÃO PEDIDO 1: Contar Total da Lista de Equipamentos ---
  // Filtra: Não arquivado, Não deletado e NÃO Impressora (pois impressora tem lista separada)
  const totalEquipamentos = equipamentos.filter(
    (e) => !e.isArchived && !e.isDeleted && e.tipoEquipamento !== "Impressora"
  ).length;

  document.getElementById("equipamentos-ativos").textContent =
    totalEquipamentos;
  // ----------------------------------------------------------------

  const eqAtivos = equipamentos.filter((e) => !e.isArchived && !e.isDeleted);

  document.getElementById("notebooks-disponiveis").textContent =
    eqAtivos.filter(
      (e) =>
        e.tipoEquipamento === "Notebook" && e.statusOperacional === "Disponível"
    ).length;

  document.getElementById("equipamentos-manutencao").textContent =
    eqAtivos.filter((e) => e.statusOperacional === "Em manutenção").length;

  document.getElementById("equipamentos-arquivados").textContent =
    equipamentos.filter((e) => e.isArchived && !e.isDeleted).length;
}

function criarGraficos() {
  criarGrafico(
    tipoChart,
    "tipoChart",
    "doughnut",
    equipamentos.filter((e) => !e.isArchived && !e.isDeleted),
    "tipoEquipamento",
    "Distribuição por Tipo"
  );
  criarGrafico(
    statusChart,
    "statusChart",
    "bar",
    equipamentos.filter((e) => !e.isDeleted),
    "statusOperacional",
    "Status Operacional",
    ["Ativo", "Disponível", "Inativo", "Em manutenção", "Arquivado"]
  );
  criarGrafico(
    departamentoChart,
    "departamentoChart",
    "line",
    // *** CORREÇÃO DASHBOARD ***
    equipamentos.filter(
      (e) => !e.isArchived && !e.isDeleted && e.tipoEquipamento !== "Impressora"
    ),
    "departamento",
    "Equipamentos por Departamento"
  );
}

function criarGrafico(
  chartInstance,
  canvasId,
  type,
  data,
  groupBy,
  label,
  order
) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (chartInstance) chartInstance.destroy();

  const counts = data.reduce((acc, item) => {
    // *** CORREÇÃO DASHBOARD ***
    const key = item[groupBy] || "Nenhum";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const labels = order
    ? order.filter((key) => counts[key])
    : Object.keys(counts);
  const chartData = labels.map((key) => counts[key]);

  // Cores baseadas nas variáveis CSS para consistência
  const themeColors = {
    disponivel: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      .trim(),
    ativo: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-success")
      .trim(),
    inativo: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-error")
      .trim(),
    manutencao: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-warning")
      .trim(),
    arquivado: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-info")
      .trim(),
  };

  // --- PALETA DE CORES TECH (Tons de Azul e Ciano) ---
  // --- PALETA DE CORES TECH (Azul Profundo + Verde Tech) ---
  const colors = {
    bar: {
      Disponível: "#0d6efd", // Azul Vibrante
      Ativo: "#024624", // SEU VERDE (rgb 2, 70, 36 hex)
      Inativo: "#dc3545", // Vermelho (Erro)
      "Em manutenção": "#ffc107", // Amarelo (Atenção)
      Arquivado: "#6c757d", // Cinza
    },
    // Paleta mista para o gráfico de rosca
    doughnut: [
      "#065ebb", // Azul
      "#ffc107", // Amarelo (Contraste alto)
      "#dc3545", // Vermelho
      "#28a745", // Verde
      "#6610f2", // Roxo
      "#fd7e14", // Laranja
      "#0dcaf0", // Ciano
      "#e83e8c", // Rosa
      "#20c997", // Verde Água
      "#6c757d", // Cinza
    ],
    line: "rgb(2, 70, 36)", // Linha do gráfico agora será Verde para destacar
  };

  chartInstance = new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [
        {
          label: "Quantidade",
          data: chartData,
          backgroundColor:
            type === "bar"
              ? labels.map((l) => colors.bar[l] || "#cccccc")
              : type === "doughnut"
              ? colors.doughnut
              : "transparent", // Sem fundo para linha
          borderColor:
            type === "line"
              ? colors.line
              : type === "bar"
              ? labels.map((l) => colors.bar[l] || "#cccccc") // Borda da mesma cor da barra
              : "#ffffff", // Borda branca para doughnut
          borderWidth: type === "doughnut" ? 2 : 1,
          fill:
            type === "line"
              ? { target: "origin", above: "rgba(13, 110, 253, 0.1)" }
              : false, // Preenchimento suave para linha
          tension: 0.1, // Suaviza a linha
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: type !== "bar", position: "bottom" } },
      scales:
        type === "bar" || type === "line"
          ? { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
          : {}, // Eixos apenas para bar/line
    },
  });
}

// ===========================================
// UTILITÁRIOS (MODAIS, MENSAGENS, ETC.)
// ===========================================

function abrirModalConfirmacao(mensagem, callback, dynamicHtml = "") {
  const modal = document.getElementById("confirm-modal");
  document.getElementById("confirm-message").textContent = mensagem;
  document.getElementById("confirm-dynamic-content").innerHTML = dynamicHtml;
  const btn = document.getElementById("confirm-delete-btn");
  const novoBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(novoBtn, btn);

  novoBtn.onclick = () => {
    const motivoArquivamentoInput = document.getElementById(
      "motivo-arquivamento"
    );
    const motivoManutencaoInput = document.getElementById("motivo-manutencao");

    const motivo =
      motivoArquivamentoInput?.value.trim() ??
      motivoManutencaoInput?.value.trim() ??
      null;

    try {
      // Tenta executar a ação principal (excluir, arquivar, etc.)
      callback(motivo);
    } catch (e) {
      // Se der erro, registra no console para depuração
      console.error("Erro ao executar a ação de confirmação:", e);
    } finally {
      // Garante que o modal SEMPRE feche, mesmo se o callback falhar.
      fecharModalConfirm();
    }
  };

  modal.classList.add("active");
}

function limparFormularioEquipamento() {
  document.getElementById("equipamento-form").reset();
  acessoriosSelecionadosTemporariamente = [];
  renderizarAcessoriosSelecionados();
  limparTodosErros();
  handleTipoEquipamentoChange(document.getElementById("tipoEquipamento"));
}
function limparFormularioAcessorio() {
  document.getElementById("acessorio-form").reset();
  handleTipoAcessorioChange();
  handleCategoriaAcessorioChange();
}
function limparTodosErros() {
  document
    .querySelectorAll(".error-message")
    .forEach((el) => (el.textContent = ""));
  document
    .querySelectorAll(".form-control.error")
    .forEach((el) => el.classList.remove("error"));
}
function mostrarErro(id, msg) {
  const elErro = document.getElementById(`error-${id}`);
  if (elErro) elErro.textContent = msg;
  document.getElementById(id)?.classList.toggle("error", !!msg);
}
function limparErro(id) {
  mostrarErro(id, "");
}
function fecharModal() {
  document.getElementById("edit-modal").classList.remove("active");
}
function fecharModalAcessorio() {
  document.getElementById("edit-acessorio-modal").classList.remove("active");
}
function fecharModalConfirm() {
  document.getElementById("confirm-modal").classList.remove("active");
  document.getElementById("confirm-dynamic-content").innerHTML = "";
}

function mostrarMensagem(msg, tipo) {
  const container =
    document.getElementById("form-messages") ||
    document.querySelector(".container");
  const div = document.createElement("div");
  div.className = `message ${tipo}`;
  div.innerHTML = `<i class="fas ${
    tipo === "success" ? "fa-check-circle" : "fa-exclamation-circle"
  }"></i> ${msg}`;
  container.insertBefore(div, container.firstChild);
  setTimeout(() => {
    div.style.opacity = "0";
    setTimeout(() => div.remove(), 500);
  }, 5000);
}

function atualizarLista(tipoFiltro = "todos", termoBusca = "") {
  // Elementos das seções e tbodys
  const sectionComp = document.getElementById("section-computing");
  const sectionInfra = document.getElementById("section-infra");
  const sectionOthers = document.getElementById("section-others");

  const tbodyComp = document.getElementById("list-computing");
  const tbodyInfra = document.getElementById("list-infra");
  const tbodyOthers = document.getElementById("list-others");

  const emptyState = document.getElementById("empty-state");

  // 1. Filtra os dados gerais
  let dadosFiltrados = equipamentos.filter(
    (eq) =>
      !eq.isDeleted &&
      eq.tipoEquipamento !== "Impressora" &&
      !eq.isArchived &&
      eq.statusOperacional !== "Em manutenção"
  );

  // Filtro de Tipo
  if (tipoFiltro !== "todos") {
    const tiposPadrao = [
      "Desktop",
      "Notebook",
      "Tablet",
      "Servidor",
      "Roteador",
      "Switch",
    ];
    if (tipoFiltro === "Outro") {
      dadosFiltrados = dadosFiltrados.filter(
        (eq) => !tiposPadrao.includes(eq.tipoEquipamento)
      );
    } else {
      dadosFiltrados = dadosFiltrados.filter(
        (eq) => eq.tipoEquipamento === tipoFiltro
      );
    }
  }

  // Filtro de Busca
  if (termoBusca) {
    const termo = termoBusca.toLowerCase();
    dadosFiltrados = dadosFiltrados.filter((eq) =>
      Object.values(eq).some((val) => String(val).toLowerCase().includes(termo))
    );
  }

  // Atualiza contador no header
  const summaryElement = document.getElementById("equipamentos-summary");
  if (summaryElement) {
    const qtde = dadosFiltrados.length;
    let label = tipoFiltro === "todos" ? "Itens Listados" : tipoFiltro;
    if (qtde !== 1 && tipoFiltro !== "todos") {
      if (!label.endsWith("s") && !label.endsWith("r")) label += "s";
    }
    summaryElement.innerHTML = `Quantidade: <span class="summary-color">${qtde} ${label}</span>`;
  }

  // Ordenação
  const ordenar = (lista) => {
    return lista.sort((a, b) => {
      if (
        a.statusOperacional === "Disponível" &&
        b.statusOperacional !== "Disponível"
      )
        return -1;
      if (
        a.statusOperacional !== "Disponível" &&
        b.statusOperacional === "Disponível"
      )
        return 1;
      const tipoCompare = (a.tipoEquipamento || "").localeCompare(
        b.tipoEquipamento || ""
      );
      if (tipoCompare !== 0) return tipoCompare;
      return (a.nomeUsuario || "").localeCompare(b.nomeUsuario || "");
    });
  };

  // 2. Separação em 3 Grupos
  const tiposComputing = ["Desktop", "Notebook", "Tablet"];
  const tiposInfra = ["Servidor", "Roteador", "Switch"];

  let listComp = dadosFiltrados.filter((eq) =>
    tiposComputing.includes(eq.tipoEquipamento)
  );
  let listInfra = dadosFiltrados.filter((eq) =>
    tiposInfra.includes(eq.tipoEquipamento)
  );
  let listOthers = dadosFiltrados.filter(
    (eq) =>
      !tiposComputing.includes(eq.tipoEquipamento) &&
      !tiposInfra.includes(eq.tipoEquipamento)
  );

  ordenar(listComp);
  ordenar(listInfra);
  ordenar(listOthers);

  // 3. Renderização
  // ALTERAÇÃO: Agora passamos 'tipoTabela' para saber quais colunas desenhar
  const renderTabela = (lista, tbody, section, checkboxClass, tipoTabela) => {
    if (lista.length > 0) {
      section.style.display = "block";
      tbody.innerHTML = lista
        .map((eq) => criarLinhaEquipamento(eq, checkboxClass, tipoTabela))
        .join("");
    } else {
      section.style.display = "none";
      tbody.innerHTML = "";
    }
  };

  renderTabela(
    listComp,
    tbodyComp,
    sectionComp,
    "checkbox-computing",
    "computing"
  );
  renderTabela(listInfra, tbodyInfra, sectionInfra, "checkbox-infra", "infra");
  renderTabela(
    listOthers,
    tbodyOthers,
    sectionOthers,
    "checkbox-others",
    "others"
  );

  const totalVisivel = listComp.length + listInfra.length + listOthers.length;
  emptyState.style.display = totalVisivel === 0 ? "block" : "none";

  document.getElementById("select-all-computing").checked = false;
  document.getElementById("select-all-infra").checked = false;
  document.getElementById("select-all-others").checked = false;
  document.getElementById("btn-apagar-equipamentos").style.display = "none";
}

function criarLinhaEquipamento(
  eq,
  checkboxClass = "checkbox-equipamentos",
  tipoTabela = "computing"
) {
  const statusClasses = {
    Ativo: "ativo",
    Inativo: "inativo",
    "Em manutenção": "manutencao",
    Arquivado: "arquivado",
    Disponível: "disponivel",
  };

  // --- NOVA LÓGICA: Bolinha Azul para Disponíveis ---
  const dotHtml =
    eq.statusOperacional === "Disponível"
      ? '<div class="status-dot"></div>'
      : "";

  let colunasVariaveis = "";

  if (tipoTabela === "computing") {
    // 1. Acessórios
    let acessoriosHtml = '<div class="acessorios-container">Nenhum</div>';
    if (eq.acessorios && eq.acessorios.length) {
      const accessoryInfoMap = {
        "Kit (teclado + mouse sem fio)": {
          icon: "fas fa-keyboard",
          styleClass: "icon-kit",
        },
        Headsets: { icon: "fas fa-headphones", styleClass: "icon-headsets" },
        Monitores: { icon: "fas fa-desktop", styleClass: "icon-monitores" },
        Mouses: { icon: "fas fa-computer-mouse", styleClass: "icon-mouses" },
        "Suportes com Cooler": {
          icon: "fas fa-fan",
          styleClass: "icon-suportes",
        },
        Outros: { icon: "fas fa-puzzle-piece", styleClass: "icon-outros" },
      };
      acessoriosHtml = `<div class="acessorios-container">${eq.acessorios
        .map((id) => {
          const acc = acessorios.find((a) => String(a.id) === String(id));
          if (!acc) return "";
          const info = accessoryInfoMap[acc.categoria] || {
            icon: "fas fa-question-circle",
            styleClass: "icon-outros",
          };
          const tooltipText = `${acc.categoria} (${
            acc.modelo || "Sem modelo"
          })`;
          // Adicionado stopPropagation para o tooltip não abrir o card
          return `<i class="${info.icon} ${info.styleClass}" title="${tooltipText}" onclick="mostrarTooltipAcessorio(event, '${acc.id}'); event.stopPropagation();"></i>`;
        })
        .join("")}</div>`;
    }

    // 2. Documentos
    let documentosHtml = '<div class="documentos-container">N/A</div>';
    if (eq.tipoEquipamento === "Notebook") {
      const termoIcon = `<i class="fas ${
        eq.termoResponsabilidade
          ? "fa-check-circle icon-doc-ok"
          : "fa-exclamation-triangle icon-doc-pending"
      }" 
        title="Termo ${eq.termoResponsabilidade ? "OK" : "Pendente"}" 
        ${
          !eq.termoResponsabilidade
            ? "onclick=\"mostrarTooltipDocumento(event, 'Termo Pendente'); event.stopPropagation();\""
            : ""
        }></i>`;

      const fotoIcon = `<i class="fas ${
        eq.fotoNotebook
          ? "fa-check-circle icon-doc-ok"
          : "fa-exclamation-triangle icon-doc-pending"
      }" 
        title="Foto ${eq.fotoNotebook ? "OK" : "Pendente"}" 
        ${
          !eq.fotoNotebook
            ? "onclick=\"mostrarTooltipDocumento(event, 'Foto Pendente'); event.stopPropagation();\""
            : ""
        }></i>`;
      documentosHtml = `<div class="documentos-container">${termoIcon} ${fotoIcon}</div>`;
    }
    colunasVariaveis = `<td>${acessoriosHtml}</td><td>${documentosHtml}</td>`;
  } else {
    colunasVariaveis = `<td>${eq.sala || "N/A"}</td>`;
  }

  const isManutencaoTarget = ["Notebook", "Desktop"].includes(
    eq.tipoEquipamento
  );
  const manutencaoBtn = isManutencaoTarget
    ? `<button class="btn-action" onclick="event.stopPropagation(); enviarParaManutencao('${eq.registro}')" title="Enviar para Manutenção"><i class="fas fa-tools"></i></button>`
    : "";

  // === Renderização da Linha (COM A BOLINHA INSERIDA) ===
  const classeDisponivel =
    eq.statusOperacional === "Disponível" ? "row-disponivel" : "";
  return `
    <tr class="${classeDisponivel}" onclick="toggleCard(this)">
      ${dotHtml} <td class="checkbox-cell" onclick="event.stopPropagation()">
        <input type="checkbox" class="checkbox-equipamentos ${checkboxClass}" value="${
    eq.registro
  }" onclick="verificarSelecao('equipamentos')">
      </td>
      <td>${eq.registro}</td>
      <td>${eq.nomeUsuario || "Nenhum"}</td>
      <td>${eq.tipoEquipamento || ""}</td>
      <td>${eq.numeroSerie || ""}</td>
      <td>${eq.numeroPatrimonio || "N/A"}</td>
      <td><span class="status-badge ${
        statusClasses[eq.statusOperacional] || ""
      }">${eq.statusOperacional || ""}</span></td>
      <td>${eq.departamento || "Nenhum"}</td>
      
      ${colunasVariaveis} 
      
      <td onclick="event.stopPropagation()">
        <div class="action-buttons">
          ${manutencaoBtn}
          <button class="btn-action btn-archive" onclick="event.stopPropagation(); arquivarEquipamento('${
            eq.registro
          }')" title="Arquivar"><i class="fas fa-archive"></i></button>
          <button class="btn-action btn-edit" onclick="event.stopPropagation(); editarEquipamento('${
            eq.registro
          }')" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="btn-action btn-delete" onclick="event.stopPropagation(); excluirEquipamento('${
            eq.registro
          }')" title="Mover para Lixeira"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
}

// ===========================================
// SEÇÃO DE IMPRESSORAS
// ===========================================

function atualizarListaImpressoras() {
  // 1. Filtra as impressoras ativas
  const impressoras = equipamentos.filter(
    (eq) =>
      eq.tipoEquipamento === "Impressora" && !eq.isArchived && !eq.isDeleted
  );

  // 2. ORDENAÇÃO POR IP (Nova lógica)
  impressoras.sort((a, b) => {
    // Garante que não quebre se o IP estiver vazio
    const ipA = a.ip || "";
    const ipB = b.ip || "";

    // Usa 'numeric: true' para que 10 venha depois de 2 (ordenação natural de IPs)
    return ipA.localeCompare(ipB, undefined, { numeric: true });
  });

  const tbody = document.getElementById("impressoras-list");
  const emptyState = document.getElementById("impressoras-empty-state");

  if (impressoras.length === 0) {
    tbody.innerHTML = "";
    tbody.closest(".table-container").style.display = "none";
    emptyState.style.display = "block";
  } else {
    tbody.closest(".table-container").style.display = "block";
    emptyState.style.display = "none";
    tbody.innerHTML = impressoras
      .map((imp) => {
        // --- NOVA LINHA ---
        const dotHtml =
          imp.status === "Disponível" ? '<div class="status-dot"></div>' : "";

        const classeDisponivel =
          imp.statusOperacional === "Disponível" ? "row-disponivel" : "";

        return `
      <tr class="${classeDisponivel}" onclick="toggleCard(this)">
        ${dotHtml}
        <td class="checkbox-cell" onclick="event.stopPropagation()">
            <input type="checkbox" class="checkbox-impressoras" value="${
              imp.registro
            }" onclick="verificarSelecao('impressoras')">
        </td>
        <td>${imp.registro}</td>
        <td>${imp.numeroSerie || ""}</td>
        <td>${imp.numeroPatrimonio || "N/A"}</td>
        <td><span class="clickable-sala" onclick="event.stopPropagation(); mostrarTooltipCartuchos(event, '${
          imp.sala
        }')">${imp.sala || "N/A"}</span></td>
        <td>${imp.ip || "N/A"}</td>
        <td>${imp.observacoes || ""}</td>
        <td onclick="event.stopPropagation()"> <div class="action-buttons">
            <button class="btn-action btn-archive" onclick="arquivarEquipamento('${
              imp.registro
            }')" title="Arquivar"><i class="fas fa-archive"></i></button>
            <button class="btn-action btn-edit" onclick="editarEquipamento('${
              imp.registro
            }')" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn-action btn-delete" onclick="excluirEquipamento('${
              imp.registro
            }')" title="Mover para Lixeira"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
      })
      .join("");
  }
  verificarSelecao("impressoras");
}

function filtrarImpressoras() {
  const termo = document
    .getElementById("search-input-impressoras")
    .value.toLowerCase();
  document.querySelectorAll("#impressoras-list tr").forEach((row) => {
    row.style.display = row.textContent.toLowerCase().includes(termo)
      ? ""
      : "none";
  });
}

// ===========================================
// SEÇÃO DE MANUTENÇÃO
// ===========================================
function enviarParaManutencao(registro) {
  const eq = equipamentos.find((e) => e.registro === registro);
  if (!eq) return;

  const motivoHtml = `<div class="form-group" style="margin-top: 16px; text-align: left;"><label class="form-label">Motivo da Manutenção:</label><textarea id="motivo-manutencao" class="form-control" rows="3" placeholder="Ex: Tela quebrada, não liga, etc."></textarea></div>`;

  abrirModalConfirmacao(
    "Enviar este equipamento para manutenção?",
    (motivo) => {
      if (motivo !== null && motivo.trim() !== "") {
        // Verifica se motivo não é nulo e não está vazio
        eq.motivoManutencao = motivo;
        eq.statusOperacional = "Em manutenção";
        eq.dataEntradaManutencao = new Date().toISOString();

        salvarParaLocalStorage();
        setEstadoAlteracao(true);

        aplicarFiltrosEquipamentos();
        atualizarListaManutencao(); // Adicionado para atualizar a lista de manutenção
        atualizarDashboard();
        mostrarMensagem(
          "Equipamento enviado para manutenção com sucesso.",
          "success"
        );
      } else {
        mostrarMensagem("O motivo da manutenção é obrigatório.", "error"); // Mensagem de erro se motivo estiver vazio
      }
    },
    motivoHtml
  );
}

function concluirManutencao(registro) {
  abrirModalConfirmacao(
    "Marcar a manutenção deste equipamento como concluída?",
    () => {
      const eq = equipamentos.find((e) => e.registro === registro);
      if (eq) {
        eq.statusOperacional = "Disponível";
        delete eq.dataEntradaManutencao;
        delete eq.motivoManutencao;

        salvarParaLocalStorage();
        setEstadoAlteracao(true);

        atualizarListaManutencao();
        atualizarDashboard();
        mostrarMensagem("Manutenção concluída com sucesso.", "success");
      }
    }
  );
}

function atualizarListaManutencao() {
  const tbody = document.getElementById("manutencao-list");
  const emptyState = document.getElementById("manutencao-empty-state");
  const emManutencao = equipamentos.filter(
    (eq) => eq.statusOperacional === "Em manutenção" && !eq.isDeleted
  );

  emptyState.style.display = emManutencao.length === 0 ? "block" : "none";
  tbody.closest(".table-container").style.display =
    emManutencao.length > 0 ? "block" : "none";

  tbody.innerHTML = emManutencao
    .map(
      (eq) => `
    <tr onclick="toggleCard(this)"> <td>${eq.registro}</td>
      <td>${eq.nomeUsuario || "Nenhum"}</td>
      <td>${eq.tipoEquipamento || ""}</td>
      <td>${eq.numeroSerie || ""}</td>
      <td>${eq.numeroPatrimonio || "N/A"}</td>
      <td>${formatarData(eq.dataEntradaManutencao)}</td>
      <td>${eq.motivoManutencao || "N/A"}</td>
      <td onclick="event.stopPropagation()"> <div class="action-buttons">
          <button class="btn-action btn-restore" onclick="concluirManutencao('${
            eq.registro
          }')" title="Concluir Manutenção"><i class="fas fa-check-circle"></i></button>
          <button class="btn-action btn-edit" onclick="editarEquipamento('${
            eq.registro
          }')" title="Editar"><i class="fas fa-edit"></i></button>
        </div>
      </td>
    </tr>`
    )
    .join("");
}

// ===========================================
// SEÇÃO DE ARQUIVADOS
// ===========================================

function arquivarEquipamento(registro) {
  const eq = equipamentos.find((e) => e.registro === registro);
  if (!eq) return;

  const motivoHtml = `<div class="form-group" style="margin-top: 16px; text-align: left;"><label class="form-label">Motivo do Arquivamento (Opcional):</label><textarea id="motivo-arquivamento" class="form-control" rows="3" placeholder="Ex: Equipamento obsoleto, devolução, etc."></textarea></div>`;

  abrirModalConfirmacao(
    "Tem certeza que deseja arquivar este equipamento?",
    (motivo) => {
      // O callback agora recebe o motivo (pode ser null se o campo não existir ou vazio)
      eq.motivoArquivamento = motivo || ""; // Define como string vazia se for null

      if (
        ["Notebook", "Desktop"].includes(eq.tipoEquipamento) &&
        eq.acessorios &&
        eq.acessorios.length > 0
      ) {
        eq.acessorios.forEach((acessorioId) => {
          const acessorio = acessorios.find(
            (a) => String(a.id) === String(acessorioId)
          );
          if (acessorio) {
            acessorio.disponivel = true;
          }
        });
        eq.acessorios = [];
        salvarAcessoriosParaLocalStorage();
      }

      eq.isArchived = true;
      eq.archiveDate = new Date().toISOString();
      eq.statusOperacional = "Arquivado"; // Garante que o status seja Arquivado

      salvarParaLocalStorage();
      setEstadoAlteracao(true);

      // Atualiza as listas relevantes
      if (eq.tipoEquipamento === "Impressora") {
        atualizarListaImpressoras();
      } else {
        aplicarFiltrosEquipamentos();
      }
      aplicarFiltrosAcessorios(); // Atualiza acessórios caso tenham sido desvinculados
      atualizarListaArquivados();
      atualizarDashboard();

      mostrarMensagem("Equipamento arquivado com sucesso.", "success");
    },
    motivoHtml // Passa o HTML do campo de motivo para o modal
  );
}

function desarquivarEquipamento(registro) {
  const eq = equipamentos.find((e) => e.registro === registro);
  if (eq) {
    eq.isArchived = false;
    delete eq.archiveDate;
    eq.motivoArquivamento = "";
    eq.statusOperacional = "Disponível"; // Volta para disponível
    salvarParaLocalStorage();
    setEstadoAlteracao(true);
    atualizarListaArquivados();

    // Atualiza a lista correta dependendo do tipo
    if (eq.tipoEquipamento === "Impressora") {
      atualizarListaImpressoras();
    } else {
      aplicarFiltrosEquipamentos();
    }
    atualizarDashboard();
    mostrarMensagem("Equipamento restaurado!", "success");
  }
}

function confirmarExclusaoEquipamento(registro) {
  abrirModalConfirmacao(
    "Tem certeza que deseja mover este item para a lixeira?",
    () => excluirEquipamento(registro)
  );
}

// --- FUNÇÃO MESTRE: Chama as atualizações das 4 tabelas ---
function atualizarListaArquivados() {
  atualizarListaGeralArquivados();
  atualizarListaImpressorasArquivadas();
  atualizarListaAcessoriosArquivados();
  atualizarListaCartuchosArquivados();
}

// 1. COMPUTADORES E INFRA (Exclui Impressoras)
function atualizarListaGeralArquivados() {
  const termo = document
    .getElementById("search-input-arquivados")
    .value.toLowerCase();
  const tbody = document.getElementById("archived-general-list");
  const emptyState = document.getElementById("archived-general-empty-state");

  const lista = equipamentos.filter(
    (eq) =>
      eq.isArchived &&
      !eq.isDeleted &&
      eq.tipoEquipamento !== "Impressora" &&
      Object.values(eq).some((val) => String(val).toLowerCase().includes(termo))
  );

  tratarExibicaoTabelaArquivados(
    tbody,
    emptyState,
    lista,
    (eq) => `
    <tr onclick="toggleCard(this)"> <td>${eq.registro}</td>
      <td>${eq.nomeUsuario || "Nenhum"}</td>
      <td>${eq.tipoEquipamento}</td>
      <td>${eq.numeroSerie}</td>
      <td>${eq.numeroPatrimonio || "N/A"}</td>
      <td><span class="status-badge arquivado">${
        eq.statusOperacional
      }</span></td>
      <td>${formatarData(eq.archiveDate)}</td>
      <td>${eq.motivoArquivamento || "N/A"}</td>
      <td onclick="event.stopPropagation()"> <div class="action-buttons">
          <button class="btn-action btn-restore" onclick="desarquivarEquipamento('${
            eq.registro
          }')" title="Restaurar"><i class="fas fa-box-open"></i></button>
          <button class="btn-action btn-edit" onclick="editarEquipamento('${
            eq.registro
          }')" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="btn-action btn-delete" onclick="excluirEquipamento('${
            eq.registro
          }')" title="Excluir Definitivamente"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `
  );
}

// 2. IMPRESSORAS ARQUIVADAS
function atualizarListaImpressorasArquivadas() {
  const termo = document
    .getElementById("search-input-arquivados")
    .value.toLowerCase();
  const tbody = document.getElementById("archived-printers-list");
  const emptyState = document.getElementById("archived-printers-empty-state");

  const lista = equipamentos.filter(
    (eq) =>
      eq.isArchived &&
      !eq.isDeleted &&
      eq.tipoEquipamento === "Impressora" &&
      Object.values(eq).some((val) => String(val).toLowerCase().includes(termo))
  );

  tratarExibicaoTabelaArquivados(
    tbody,
    emptyState,
    lista,
    (eq) => `
    <tr onclick="toggleCard(this)"> <td>${eq.registro}</td>
      <td>${eq.modelo || eq.tipoEquipamento}</td>
      <td>${eq.numeroSerie}</td>
      <td>${eq.numeroPatrimonio || "N/A"}</td>
      <td>${eq.sala || "N/A"}</td>
      <td>${eq.ip || "N/A"}</td>
      <td>${formatarData(eq.archiveDate)}</td>
      <td onclick="event.stopPropagation()"> <div class="action-buttons">
          <button class="btn-action btn-restore" onclick="desarquivarEquipamento('${
            eq.registro
          }')" title="Restaurar"><i class="fas fa-box-open"></i></button>
          <button class="btn-action btn-delete" onclick="excluirEquipamento('${
            eq.registro
          }')" title="Excluir Definitivamente"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `
  );
}

// 3. ACESSÓRIOS ARQUIVADOS
function atualizarListaAcessoriosArquivados() {
  const termo = document
    .getElementById("search-input-arquivados")
    .value.toLowerCase();
  const tbody = document.getElementById("archived-accessories-list");
  const emptyState = document.getElementById(
    "archived-accessories-empty-state"
  );

  // Nota: Verifique se seus objetos acessórios possuem o campo 'isArchived'
  const lista = acessorios.filter(
    (a) =>
      a.isArchived &&
      !a.isDeleted &&
      Object.values(a).some((val) => String(val).toLowerCase().includes(termo))
  );

  tratarExibicaoTabelaArquivados(
    tbody,
    emptyState,
    lista,
    (a) => `
    <tr onclick="toggleCard(this)"> <td>${a.id}</td>
      <td>${a.categoria}</td>
      <td>${a.modelo}</td>
      <td>${a.patrimonio || "N/A"}</td>
      <td>${a.numeroSerie || "N/A"}</td>
      <td>${formatarData(a.archiveDate)}</td>
      <td onclick="event.stopPropagation()"> <div class="action-buttons">
          <button class="btn-action btn-restore" onclick="desarquivarAcessorio('${
            a.id
          }')" title="Restaurar"><i class="fas fa-box-open"></i></button>
           <button class="btn-action btn-delete" onclick="excluirAcessorio('${
             a.id
           }')" title="Excluir Definitivamente"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `
  );
}

// 4. CARTUCHOS ARQUIVADOS
function atualizarListaCartuchosArquivados() {
  const termo = document
    .getElementById("search-input-arquivados")
    .value.toLowerCase();
  const tbody = document.getElementById("archived-cartridges-list");
  const emptyState = document.getElementById("archived-cartridges-empty-state");

  const lista = cartuchos.filter(
    (c) =>
      c.isArchived &&
      !c.isDeleted &&
      Object.values(c).some((val) => String(val).toLowerCase().includes(termo))
  );

  tratarExibicaoTabelaArquivados(
    tbody,
    emptyState,
    lista,
    (c) => `
    <tr onclick="toggleCard(this)"> <td>${c.id}</td>
      <td>${c.numeroSerie}</td>
      <td>${c.cor}</td>
      <td>${c.patrimonio}</td>
      <td><span class="status-badge arquivado">${c.status}</span></td>
      <td>${formatarData(c.archiveDate)}</td>
      <td>${c.impressoraVinculada || "Nenhum"}</td>
      <td onclick="event.stopPropagation()"> <div class="action-buttons">
          <button class="btn-action btn-restore" onclick="desarquivarCartucho('${
            c.id
          }')" title="Restaurar"><i class="fas fa-box-open"></i></button>
          <button class="btn-action btn-delete" onclick="excluirCartucho('${
            c.id
          }')" title="Excluir Definitivamente"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `
  );
}

// --- FUNÇÃO AUXILIAR PARA EVITAR REPETIÇÃO DE CÓDIGO ---
function tratarExibicaoTabelaArquivados(
  tbody,
  emptyState,
  lista,
  renderRowFunction
) {
  if (lista.length === 0) {
    tbody.innerHTML = "";
    tbody.closest(".table-container").style.display = "none"; // Esconde a tabela vazia
    emptyState.style.display = "block"; // Mostra o ícone de vazio
  } else {
    tbody.closest(".table-container").style.display = "block";
    emptyState.style.display = "none";
    tbody.innerHTML = lista.map(renderRowFunction).join("");
  }
}

// ===========================================
// LIXEIRA
// ===========================================

function atualizarLixeira() {
  atualizarLixeiraEquipamentos();
  atualizarLixeiraAcessorios();
  atualizarLixeiraCartuchos();
}

function atualizarLixeiraEquipamentos() {
  const tbody = document.getElementById("lixeira-equipment-list");
  const emptyState = document.getElementById(
    "lixeira-equipamentos-empty-state"
  );
  const deletados = equipamentos.filter((eq) => eq.isDeleted);

  if (deletados.length === 0) {
    tbody.innerHTML = "";
    tbody.closest(".table-container").style.display = "none";
    emptyState.style.display = "block";
  } else {
    tbody.innerHTML = deletados
      .map(
        (eq) => `
            <tr onclick="toggleCard(this)">
                <td class="checkbox-cell" onclick="event.stopPropagation()">
                    <input type="checkbox" class="checkbox-lixeira-equipamentos" value="${
                      eq.registro
                    }" onclick="verificarSelecao('lixeira-equipamentos')">
                </td>
                <td>${eq.registro}</td>
                <td>${eq.tipoEquipamento}</td>
                <td>${eq.numeroSerie}</td>
                <td>${eq.numeroPatrimonio}</td>
                <td>${formatarData(eq.deletionDate)}</td>
                <td onclick="event.stopPropagation()">
                    <div class="action-buttons">
                        <button class="btn-action btn-restore" onclick="restaurarEquipamento('${
                          eq.registro
                        }')" title="Restaurar"><i class="fas fa-undo"></i></button>
                        <button class="btn-action btn-delete" onclick="excluirPermanenteEquipamento('${
                          eq.registro
                        }')" title="Excluir Permanentemente"><i class="fas fa-times-circle"></i></button>
                    </div>
                </td>
            </tr>
        `
      )
      .join("");
    tbody.closest(".table-container").style.display = "block";
    emptyState.style.display = "none";
  }
  verificarSelecao("lixeira-equipamentos");
}

function restaurarEquipamento(registro) {
  // MODIFICAÇÃO (Goal 1): Adiciona modal de confirmação
  abrirModalConfirmacao(
    "Tem certeza que deseja restaurar este equipamento?",
    () => {
      // Esta é a função de callback que executa a restauração
      const eq = equipamentos.find((e) => e.registro === registro);
      if (eq) {
        eq.isDeleted = false;
        delete eq.deletionDate;

        // --- INÍCIO DA MODIFICAÇÃO (Goal 2) ---
        // Se o equipamento restaurado tiver acessórios, marcar os acessórios como "Não disponíveis"
        if (eq.acessorios && eq.acessorios.length > 0) {
          eq.acessorios.forEach((acessorioId) => {
            const acessorio = acessorios.find(
              (a) => String(a.id) === String(acessorioId)
            );
            // Só marca como 'Não disponível' se o acessório ainda existir E não estiver na lixeira
            if (acessorio && !acessorio.isDeleted) {
              acessorio.disponivel = false; // Define como "Não"
            }
          });
          salvarAcessoriosParaLocalStorage(); // Salva o novo estado dos acessórios
          // Atualiza a lista de acessórios se o usuário estiver nela
          if (
            document.getElementById("acessorios").classList.contains("active")
          ) {
            aplicarFiltrosAcessorios();
          }
        }
        // --- FIM DA MODIFICAÇÃO (Goal 2) ---

        salvarParaLocalStorage();
        setEstadoAlteracao(true);
        atualizarLixeira(); // Atualiza a lixeira (item some de lá)

        // Atualiza a lista correta para onde o item foi restaurado
        if (eq.isArchived) {
          atualizarListaArquivados();
        } else if (eq.tipoEquipamento === "Impressora") {
          atualizarListaImpressoras();
        } else {
          aplicarFiltrosEquipamentos();
        }
        if (eq.statusOperacional === "Em manutenção") {
          atualizarListaManutencao();
        }

        atualizarDashboard();
        mostrarMensagem("Equipamento restaurado.", "success");
      }
    }
  );
}

function excluirPermanenteEquipamento(registro) {
  abrirModalConfirmacao(
    "Esta ação é irreversível. Deseja excluir permanentemente este equipamento?",
    () => {
      const eq = equipamentos.find((e) => e.registro === registro);
      if (eq && eq.acessorios) {
        eq.acessorios.forEach((id) => {
          const acc = acessorios.find((a) => String(a.id) === String(id));
          // Só marca como disponível se o acessório ainda existir e não estiver na lixeira
          if (acc && !acc.isDeleted) {
            acc.disponivel = true;
          }
        });
        salvarAcessoriosParaLocalStorage();
        // Atualiza a lista de acessórios se estiver visível
        if (
          document.getElementById("acessorios").classList.contains("active")
        ) {
          aplicarFiltrosAcessorios();
        }
      }

      equipamentos = equipamentos.filter((e) => e.registro !== registro);
      salvarParaLocalStorage();
      setEstadoAlteracao(true);
      atualizarLixeira();
      atualizarDashboard(); // Atualiza contagens do dashboard
      mostrarMensagem("Equipamento excluído permanentemente.", "success");
    }
  );
}

function atualizarLixeiraAcessorios() {
  const tbody = document.getElementById("lixeira-acessorios-list");
  const emptyState = document.getElementById("lixeira-acessorios-empty-state");
  const deletados = acessorios.filter((a) => a.isDeleted);

  if (deletados.length === 0) {
    tbody.innerHTML = "";
    tbody.closest(".table-container").style.display = "none";
    emptyState.style.display = "block";
  } else {
    tbody.innerHTML = deletados
      .map(
        (ac) => `
            <tr onclick="toggleCard(this)">
                <td class="checkbox-cell" onclick="event.stopPropagation()">
                    <input type="checkbox" class="checkbox-lixeira-acessorios" value="${
                      ac.id
                    }" onclick="verificarSelecao('lixeira-acessorios')">
                </td>
                <td>${ac.id}</td>
                <td>${ac.categoria}</td>
                <td>${ac.modelo}</td>
                <td>${formatarData(ac.deletionDate)}</td>
                <td onclick="event.stopPropagation()">
                    <div class="action-buttons">
                        <button class="btn-action btn-restore" onclick="restaurarAcessorio('${
                          ac.id
                        }')" title="Restaurar"><i class="fas fa-undo"></i></button>
                        <button class="btn-action btn-delete" onclick="excluirPermanenteAcessorio('${
                          ac.id
                        }')" title="Excluir Permanentemente"><i class="fas fa-times-circle"></i></button>
                    </div>
                </td>
            </tr>
        `
      )
      .join("");
    tbody.closest(".table-container").style.display = "block";
    emptyState.style.display = "none";
  }
  verificarSelecao("lixeira-acessorios");
}

function restaurarAcessorio(id) {
  // MODIFICAÇÃO (Goal 1): Adiciona modal de confirmação
  abrirModalConfirmacao(
    "Tem certeza que deseja restaurar este acessório?",
    () => {
      // Lógica de restauração movida para o callback
      const acc = acessorios.find((a) => String(a.id) === String(id));
      if (acc) {
        acc.isDeleted = false;
        delete acc.deletionDate;

        // MODIFICAÇÃO (Goal 2): Verifica se o acessório deve voltar como 'Disponível' ou 'Não'
        // Ele estará 'Não disponível' (disponivel = false) se estiver vinculado a um equipamento ATIVO (não-deletado e não-arquivado)
        const vinculadoEquipamentoAtivo = equipamentos.some(
          (eq) =>
            !eq.isDeleted && // Não está na lixeira
            !eq.isArchived && // Não está no arquivo
            eq.acessorios?.includes(String(id)) // E está vinculado a este acessório
        );

        // Se estiver vinculado a um equipamento ativo, 'disponivel' é false (Não)
        // Se não estiver vinculado, 'disponivel' é true (Sim)
        acc.disponivel = !vinculadoEquipamentoAtivo;

        salvarAcessoriosParaLocalStorage();
        setEstadoAlteracao(true);
        atualizarLixeira();
        aplicarFiltrosAcessorios(); // Atualiza a lista principal de acessórios

        // Atualiza a lista de equipamentos também, pois o ícone de acessório pode ter mudado
        if (document.getElementById("lista").classList.contains("active")) {
          aplicarFiltrosEquipamentos();
        }

        mostrarMensagem("Acessório restaurado.", "success");
      }
    }
  );
}

function excluirPermanenteAcessorio(id) {
  abrirModalConfirmacao(
    "Esta ação é irreversível. Deseja excluir permanentemente este acessório? Ele será desvinculado de qualquer equipamento.",
    () => {
      // Desvincular de equipamentos antes de excluir
      equipamentos.forEach((eq) => {
        if (eq.acessorios?.includes(id)) {
          eq.acessorios = eq.acessorios.filter((accId) => accId !== id);
        }
      });
      salvarParaLocalStorage(); // Salva equipamentos sem o acessório

      acessorios = acessorios.filter((a) => String(a.id) !== String(id));
      salvarAcessoriosParaLocalStorage();
      setEstadoAlteracao(true);
      atualizarLixeira();
      // Atualizar lista principal de equipamentos se estiver visível (para mostrar desvinculação)
      if (document.getElementById("lista").classList.contains("active")) {
        aplicarFiltrosEquipamentos();
      }
      mostrarMensagem("Acessório excluído permanentemente.", "success");
    }
  );
}

function atualizarLixeiraCartuchos() {
  const tbody = document.getElementById("lixeira-cartuchos-list");
  const emptyState = document.getElementById("lixeira-cartuchos-empty-state");
  const deletados = cartuchos.filter((c) => c.isDeleted);

  if (deletados.length === 0) {
    tbody.innerHTML = "";
    tbody.closest(".table-container").style.display = "none";
    emptyState.style.display = "block";
  } else {
    tbody.innerHTML = deletados
      .map(
        (ca) => `
            <tr onclick="toggleCard(this)">
                <td class="checkbox-cell" onclick="event.stopPropagation()">
                    <input type="checkbox" class="checkbox-lixeira-cartuchos" value="${
                      ca.id
                    }" onclick="verificarSelecao('lixeira-cartuchos')">
                </td>
                <td>${ca.id}</td>
                <td>${ca.numeroSerie}</td>
                <td>${ca.cor}</td>
                <td>${formatarData(ca.deletionDate)}</td>
                <td onclick="event.stopPropagation()">
                    <div class="action-buttons">
                        <button class="btn-action btn-restore" onclick="restaurarCartucho('${
                          ca.id
                        }')" title="Restaurar"><i class="fas fa-undo"></i></button>
                        <button class="btn-action btn-delete" onclick="excluirPermanenteCartucho('${
                          ca.id
                        }')" title="Excluir Permanentemente"><i class="fas fa-times-circle"></i></button>
                    </div>
                </td>
            </tr>
        `
      )
      .join("");
    tbody.closest(".table-container").style.display = "block";
    emptyState.style.display = "none";
  }
  verificarSelecao("lixeira-cartuchos");
}

function restaurarCartucho(id) {
  // MODIFICAÇÃO (Goal 1): Adiciona modal de confirmação
  abrirModalConfirmacao(
    "Tem certeza que deseja restaurar este cartucho?",
    () => {
      // Lógica de restauração movida para o callback
      const cartucho = cartuchos.find((c) => c.id === id);
      if (cartucho) {
        cartucho.isDeleted = false;
        delete cartucho.deletionDate;
        salvarCartuchosParaLocalStorage();
        setEstadoAlteracao(true);
        atualizarLixeira();

        // Restaura para a lista correta
        if (cartucho.isArchived) {
          atualizarListaCartuchosArquivados();
        } else {
          atualizarListaCartuchos();
        }
        mostrarMensagem("Cartucho restaurado.", "success");
      }
    }
  );
}

function excluirPermanenteCartucho(id) {
  abrirModalConfirmacao(
    "Esta ação é irreversível. Deseja excluir permanentemente este cartucho?",
    () => {
      cartuchos = cartuchos.filter((c) => c.id !== id);
      salvarCartuchosParaLocalStorage();
      setEstadoAlteracao(true);
      atualizarLixeira();
      // Atualiza contagem no header da lista principal se estiver visível
      if (document.getElementById("cartuchos").classList.contains("active")) {
        atualizarContagemCartuchosDisponiveis();
      }
      mostrarMensagem("Cartucho excluído permanentemente.", "success");
    }
  );
}

// ===========================================
// LIXEIRA - EXCLUSÃO PERMANENTE EM MASSA
// ===========================================

function excluirEquipamentosSelecionadosLixeira() {
  const idsParaExcluir = Array.from(
    document.querySelectorAll(".checkbox-lixeira-equipamentos:checked")
  ).map((cb) => cb.value);

  if (idsParaExcluir.length === 0) return;

  abrirModalConfirmacao(
    `Esta ação é irreversível. Deseja excluir permanentemente ${idsParaExcluir.length} equipamento(s)?`,
    () => {
      // Lógica de desvinculação de acessórios
      idsParaExcluir.forEach((registro) => {
        const eq = equipamentos.find((e) => e.registro === registro);
        if (eq && eq.acessorios) {
          eq.acessorios.forEach((id) => {
            const acc = acessorios.find((a) => String(a.id) === String(id));
            if (acc && !acc.isDeleted) {
              acc.disponivel = true;
            }
          });
        }
      });
      salvarAcessoriosParaLocalStorage(); // Salva acessórios desvinculados

      // Filtra e remove os equipamentos
      equipamentos = equipamentos.filter(
        (e) => !idsParaExcluir.includes(e.registro)
      );
      salvarParaLocalStorage();
      setEstadoAlteracao(true);
      atualizarLixeira(); // Atualiza a lixeira
      atualizarDashboard();
      mostrarMensagem(
        `${idsParaExcluir.length} equipamento(s) excluído(s) permanentemente.`,
        "success"
      );
    }
  );
}

function excluirAcessoriosSelecionadosLixeira() {
  const idsParaExcluir = Array.from(
    document.querySelectorAll(".checkbox-lixeira-acessorios:checked")
  ).map((cb) => cb.value);

  if (idsParaExcluir.length === 0) return;

  abrirModalConfirmacao(
    `Esta ação é irreversível. Deseja excluir permanentemente ${idsParaExcluir.length} acessório(s)? Eles serão desvinculados de qualquer equipamento.`,
    () => {
      // Desvincular de equipamentos antes de excluir
      equipamentos.forEach((eq) => {
        if (eq.acessorios?.length) {
          eq.acessorios = eq.acessorios.filter(
            (accId) => !idsParaExcluir.includes(String(accId))
          );
        }
      });
      salvarParaLocalStorage(); // Salva equipamentos

      // Filtra e remove os acessórios
      acessorios = acessorios.filter(
        (a) => !idsParaExcluir.includes(String(a.id))
      );
      salvarAcessoriosParaLocalStorage();
      setEstadoAlteracao(true);
      atualizarLixeira();
      mostrarMensagem(
        `${idsParaExcluir.length} acessório(s) excluído(s) permanentemente.`,
        "success"
      );
    }
  );
}

function excluirCartuchosSelecionadosLixeira() {
  const idsParaExcluir = Array.from(
    document.querySelectorAll(".checkbox-lixeira-cartuchos:checked")
  ).map((cb) => cb.value);

  if (idsParaExcluir.length === 0) return;

  abrirModalConfirmacao(
    `Esta ação é irreversível. Deseja excluir permanentemente ${idsParaExcluir.length} cartucho(s)?`,
    () => {
      // Filtra e remove os cartuchos
      cartuchos = cartuchos.filter((c) => !idsParaExcluir.includes(c.id));
      salvarCartuchosParaLocalStorage();
      setEstadoAlteracao(true);
      atualizarLixeira();
      mostrarMensagem(
        `${idsParaExcluir.length} cartucho(s) excluído(s) permanentemente.`,
        "success"
      );
    }
  );
}

// ===========================================
// TOOLTIPS
// ===========================================

function mostrarTooltipAcessorio(event, id) {
  event.stopPropagation();
  const tooltip = document.getElementById("acessorio-tooltip");
  const acc = acessorios.find((a) => String(a.id) === String(id));
  if (!acc) return;
  tooltip.innerHTML = `<h4>Detalhes do Acessório</h4><p><strong>Modelo:</strong> ${
    acc.modelo
  }</p><p><strong>Patrimônio:</strong> ${
    acc.patrimonio || "N/A"
  }</p><p><strong>Série:</strong> ${acc.numeroSerie || "N/A"}</p>`;
  posicionarTooltip(event, tooltip);
}

function mostrarTooltipUsuario(event, acessorioId) {
  event.stopPropagation();
  const tooltip = document.getElementById("acessorio-tooltip");
  // Procura em equipamentos não deletados e não arquivados
  const eq = equipamentos.find(
    (e) =>
      !e.isDeleted &&
      !e.isArchived &&
      e.acessorios &&
      e.acessorios.includes(String(acessorioId))
  );
  tooltip.innerHTML = eq
    ? `<h4>Vinculado a</h4><p><strong>Usuário:</strong> ${
        eq.nomeUsuario || "N/A"
      }</p><p><strong>Equipamento (Pat):</strong> ${
        eq.numeroPatrimonio || "N/A"
      }</p>`
    : `<h4>Acessório Disponível</h4><p>Não vinculado a um equipamento ativo.</p>`;
  posicionarTooltip(event, tooltip);
}

function mostrarTooltipDocumento(event, texto) {
  event.stopPropagation();
  const tooltip = document.getElementById("acessorio-tooltip");
  tooltip.innerHTML = `<h4>Documento Pendente</h4><p>${texto}</p>`;
  posicionarTooltip(event, tooltip);
}

function mostrarTooltipCartuchos(event, sala) {
  event.stopPropagation();
  const tooltip = document.getElementById("acessorio-tooltip");

  // Busca cartuchos não deletados, não arquivados, em uso e vinculados à sala específica
  const cartuchosNaImpressora = cartuchos.filter(
    (c) =>
      !c.isDeleted &&
      !c.isArchived &&
      c.impressoraVinculada === sala &&
      c.status === "Em uso"
  );

  let tooltipContent;
  if (cartuchosNaImpressora.length > 0) {
    tooltipContent = "<h4>Cartuchos Instalados</h4>";
    const colorOrder = {
      "Ciano (C)": 1,
      "Magenta (M)": 2,
      "Amarelo (Y)": 3,
      "Preto (BK)": 4,
    };
    cartuchosNaImpressora.sort(
      (a, b) => (colorOrder[a.cor] || 99) - (colorOrder[b.cor] || 99)
    );

    tooltipContent += cartuchosNaImpressora
      .map((cartucho) => {
        const corBase = cartucho.cor.split(" ")[0];
        const corClasse = corBase.toLowerCase().replace(/[()]/g, "");
        // Mostra ID ou Patrimônio se disponível
        const identificador =
          cartucho.patrimonio && cartucho.patrimonio !== "N/A"
            ? cartucho.patrimonio
            : cartucho.id;
        return `<p><span class="tooltip-cor ${corClasse}">${corBase}</span> (${identificador})</p>`;
      })
      .join("");
  } else {
    tooltipContent =
      "<h4>Cartuchos Instalados</h4><p>Nenhum cartucho ativo vinculado.</p>";
  }

  tooltip.innerHTML = tooltipContent;
  posicionarTooltip(event, tooltip);
}

function posicionarTooltip(event, tooltip) {
  // 1. Torna visível primeiro para o navegador calcular a largura real
  tooltip.classList.add("active");

  // 2. Pega as medidas
  const rect = tooltip.getBoundingClientRect();
  const larguraTooltip = rect.width;
  const alturaTooltip = rect.height;

  // 3. Pega o tamanho da janela do navegador
  const larguraJanela = window.innerWidth;
  const alturaJanela = window.innerHeight;

  // 4. Define a posição inicial (Direita e Abaixo do mouse)
  let left = event.pageX + 15;
  let top = event.pageY + 15;

  // 5. CORREÇÃO HORIZONTAL: Se passar da borda direita, joga para a esquerda
  // (event.clientX é a posição do mouse relativa à janela visível)
  if (event.clientX + 15 + larguraTooltip > larguraJanela) {
    left = event.pageX - larguraTooltip - 15;
  }

  // 6. CORREÇÃO VERTICAL: Se passar da borda inferior, joga para cima
  if (event.clientY + 15 + alturaTooltip > alturaJanela) {
    top = event.pageY - alturaTooltip - 15;
  }

  // 7. Aplica as coordenadas finais
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function esconderTooltip() {
  document.getElementById("acessorio-tooltip").classList.remove("active");
}

// ===========================================
// LÓGICA DE EXCLUSÃO EM MASSA
// ===========================================

function toggleAllCheckboxes(tipo) {
  const master = document.getElementById(`select-all-${tipo}`);
  document
    .querySelectorAll(`.checkbox-${tipo}`)
    .forEach((cb) => (cb.checked = master.checked));
  verificarSelecao(tipo);
}

function verificarSelecao(tipo) {
  const checked = document.querySelectorAll(`.checkbox-${tipo}:checked`);
  const btn = document.getElementById(`btn-apagar-${tipo}`);
  if (btn) btn.style.display = checked.length >= 2 ? "inline-flex" : "none";

  const all = document.querySelectorAll(`.checkbox-${tipo}`);
  const master = document.getElementById(`select-all-${tipo}`);
  if (master) {
    master.indeterminate = checked.length > 0 && checked.length < all.length;
    // Marca o checkbox principal apenas se TODOS estiverem marcados e houver pelo menos um item
    master.checked = all.length > 0 && checked.length === all.length;
  }
}

function excluirEquipamentosSelecionados() {
  const idsParaExcluir = Array.from(
    document.querySelectorAll(".checkbox-equipamentos:checked")
  ).map((cb) => cb.value);
  if (idsParaExcluir.length === 0) return;
  abrirModalConfirmacao(
    `Mover ${idsParaExcluir.length} equipamentos para a lixeira?`,
    () => {
      idsParaExcluir.forEach((id) => {
        const eq = equipamentos.find((e) => e.registro === id);
        if (eq) {
          eq.isDeleted = true;
          eq.deletionDate = new Date().toISOString();
        }
      });
      salvarParaLocalStorage();
      setEstadoAlteracao(true);
      aplicarFiltrosEquipamentos();
      mostrarMensagem(
        `${idsParaExcluir.length} equipamentos movidos para a lixeira.`,
        "success"
      );
    }
  );
}

function excluirImpressorasSelecionadas() {
  const idsParaExcluir = Array.from(
    document.querySelectorAll(".checkbox-impressoras:checked")
  ).map((cb) => cb.value);
  if (idsParaExcluir.length === 0) return;
  abrirModalConfirmacao(
    `Mover ${idsParaExcluir.length} impressoras para a lixeira?`,
    () => {
      idsParaExcluir.forEach((id) => {
        const eq = equipamentos.find((e) => e.registro === id);
        if (eq) {
          eq.isDeleted = true;
          eq.deletionDate = new Date().toISOString();
        }
      });
      salvarParaLocalStorage();
      setEstadoAlteracao(true);
      atualizarListaImpressoras();
      mostrarMensagem(
        `${idsParaExcluir.length} impressoras movidas para a lixeira.`,
        "success"
      );
    }
  );
}

function excluirAcessoriosSelecionados() {
  const idsParaExcluir = Array.from(
    document.querySelectorAll(".checkbox-acessorios:checked")
  ).map((cb) => cb.value);
  if (idsParaExcluir.length === 0) return;
  abrirModalConfirmacao(
    `Mover ${idsParaExcluir.length} acessórios para a lixeira?`,
    () => {
      idsParaExcluir.forEach((id) => {
        const acc = acessorios.find((a) => String(a.id) === String(id));
        if (acc) {
          acc.isDeleted = true;
          acc.deletionDate = new Date().toISOString();
        }
      });
      salvarAcessoriosParaLocalStorage();
      setEstadoAlteracao(true);
      aplicarFiltrosAcessorios();
      mostrarMensagem(
        `${idsParaExcluir.length} acessórios movidos para a lixeira.`,
        "success"
      );
    }
  );
}

// === NOVA FUNÇÃO ===
function excluirCartuchosSelecionados() {
  const idsParaExcluir = Array.from(
    document.querySelectorAll(".checkbox-cartuchos:checked")
  ).map((cb) => cb.value);

  if (idsParaExcluir.length === 0) return;

  abrirModalConfirmacao(
    `Mover ${idsParaExcluir.length} cartuchos para a lixeira?`,
    () => {
      idsParaExcluir.forEach((id) => {
        const cartucho = cartuchos.find((c) => c.id === id);
        if (cartucho) {
          cartucho.isDeleted = true;
          cartucho.deletionDate = new Date().toISOString();
        }
      });
      salvarCartuchosParaLocalStorage();
      setEstadoAlteracao(true);
      atualizarListaCartuchos(); // Atualiza a lista visível
      mostrarMensagem(
        `${idsParaExcluir.length} cartuchos movidos para a lixeira.`,
        "success"
      );
    }
  );
}

// ===========================================
// GERENCIAMENTO DE TEMA (DARK/LIGHT)
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

// --- ALTERAÇÃO PEDIDO 2: Função para Limpar Dados ---
function confirmarLimpezaDados() {
  abrirModalConfirmacao(
    "ATENÇÃO: Isso apagará TODOS os dados do LocalStorage. Deseja continuar?",
    () => {
      // Remove apenas as chaves de dados, mantendo a preferência de tema
      localStorage.removeItem("inventarioEquipamentos");
      localStorage.removeItem("inventarioAcessorios");
      localStorage.removeItem("inventarioCartuchos");

      // Recarrega a página para limpar a memória e o estado da aplicação
      location.reload();
    }
  );
}

// ===========================================
// LÓGICA DE RELATÓRIOS (NOVO)
// ===========================================

function toggleFiltroRelatorio(tipo) {
  const checkPrincipal = document.getElementById(`rep-check-${tipo}`);
  const divSub = document.getElementById(`rep-sub-${tipo}`);

  if (checkPrincipal && divSub) {
    divSub.style.display = checkPrincipal.checked ? "block" : "none";

    // Se for acessórios e estiver abrindo, popula as categorias dinamicamente
    if (tipo === "acessorios" && checkPrincipal.checked) {
      popularFiltrosAcessoriosRelatorio();
    }
  }
  verificarEstadoBotaoRelatorio();
}

function popularFiltrosAcessoriosRelatorio() {
  const container = document.getElementById(
    "container-filtros-acessorios-dinamico"
  );
  // Pega categorias únicas dos acessórios existentes
  const categorias = [
    ...new Set(acessorios.filter((a) => !a.isDeleted).map((a) => a.categoria)),
  ].sort();

  // Categorias padrão caso não tenha nada cadastrado ainda
  const padrao = [
    "Headsets",
    "Kit (teclado + mouse sem fio)",
    "Monitores",
    "Mouses",
    "Suportes com Cooler",
    "Outros",
  ];
  const listaFinal = categorias.length > 0 ? categorias : padrao;

  container.innerHTML = listaFinal
    .map(
      (cat) => `
    <label>
      <input type="checkbox" class="sub-check-acc" value="${cat}" checked onchange="verificarEstadoBotaoRelatorio()"> 
      ${cat}
    </label>
  `
    )
    .join("");

  // Adiciona listeners aos novos checkboxes criados para atualizar o botão
  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", verificarEstadoBotaoRelatorio);
  });
}

function verificarEstadoBotaoRelatorio() {
  const btn = document.getElementById("btn-gerar-excel");
  const equipCheck = document.getElementById("rep-check-equipamentos").checked;
  const printCheck = document.getElementById("rep-check-impressoras").checked;
  const cartCheck = document.getElementById("rep-check-cartuchos").checked;
  const accCheck = document.getElementById("rep-check-acessorios").checked;

  // Verifica se pelo menos um principal está marcado
  let ativo = equipCheck || printCheck || cartCheck || accCheck;

  // Se equipamentos estiver marcado, verifica se tem sub-tipo marcado
  if (equipCheck) {
    const subs = document.querySelectorAll(".sub-check-equip:checked");
    if (subs.length === 0) ativo = false;
  }

  // Se acessórios estiver marcado, verifica se tem sub-categoria marcada
  if (accCheck) {
    const subs = document.querySelectorAll(".sub-check-acc:checked");
    if (subs.length === 0) ativo = false;
  }

  btn.disabled = !ativo;
  // Atualiza também os listeners dos sub-checkboxes de equipamentos
  document.querySelectorAll(".sub-check-equip").forEach((input) => {
    input.onchange = verificarEstadoBotaoRelatorio;
  });
}

function gerarRelatorioExcel() {
  let csvContent = "";

  // 1. PROCESSAR EQUIPAMENTOS
  if (document.getElementById("rep-check-equipamentos").checked) {
    const tiposSelecionados = Array.from(
      document.querySelectorAll(".sub-check-equip:checked")
    ).map((cb) => cb.value);

    // Filtra equipamentos (excluindo impressoras que tem seção própria)
    const listaEquip = equipamentos.filter(
      (eq) =>
        !eq.isDeleted &&
        !eq.isArchived &&
        eq.tipoEquipamento !== "Impressora" &&
        (tiposSelecionados.includes(eq.tipoEquipamento) ||
          (tiposSelecionados.includes("Outro") &&
            ![
              "Desktop",
              "Notebook",
              "Tablet",
              "Servidor",
              "Roteador",
              "Switch",
            ].includes(eq.tipoEquipamento)))
    );

    if (listaEquip.length > 0) {
      csvContent += "=== RELATÓRIO DE EQUIPAMENTOS ===\n";
      // Colunas: ID, Usuário, Tipo, Nº de Série, Patrimônio, Status, Departamento, Acessórios, Documentos
      csvContent +=
        "ID,Usuário,Tipo,Nº de Série,Patrimônio,Status,Departamento,Acessórios Vinculados,Documentos\n";

      listaEquip.forEach((eq) => {
        // Formata Acessórios (nomes em vez de IDs)
        let accNomes = "Nenhum";
        if (eq.acessorios && eq.acessorios.length > 0) {
          accNomes = eq.acessorios
            .map((id) => {
              const acc = acessorios.find((a) => String(a.id) === String(id));
              return acc ? `${acc.categoria} (${acc.modelo})` : id;
            })
            .join("; ");
        }

        // Formata Documentos
        let docs = [];
        if (eq.termoResponsabilidade) docs.push("Termo OK");
        if (eq.fotoNotebook) docs.push("Foto OK");
        const docsStr = docs.length > 0 ? docs.join(" + ") : "Pendente";

        const linha = [
          eq.registro,
          eq.nomeUsuario || "",
          eq.tipoEquipamento,
          eq.numeroSerie,
          eq.numeroPatrimonio,
          eq.statusOperacional,
          eq.departamento,
          accNomes,
          docsStr,
        ]
          .map((campo) => `"${String(campo || "").replace(/"/g, '""')}"`)
          .join(","); // Escape aspas CSV

        csvContent += linha + "\n";
      });
      csvContent += "\n\n";
    }
  }

  // 2. PROCESSAR IMPRESSORAS
  if (document.getElementById("rep-check-impressoras").checked) {
    const listaPrint = equipamentos.filter(
      (eq) =>
        !eq.isDeleted && !eq.isArchived && eq.tipoEquipamento === "Impressora"
    );

    if (listaPrint.length > 0) {
      csvContent += "=== RELATÓRIO DE IMPRESSORAS ===\n";
      // Colunas: ID, Nº de Série, Patrimônio, Sala, IP, Observações
      csvContent += "ID,Nº de Série,Patrimônio,Sala,IP,Observações\n";

      listaPrint.forEach((imp) => {
        const linha = [
          imp.registro,
          imp.numeroSerie,
          imp.numeroPatrimonio,
          imp.sala,
          imp.ip,
          imp.observacoes,
        ]
          .map((campo) => `"${String(campo || "").replace(/"/g, '""')}"`)
          .join(",");

        csvContent += linha + "\n";
      });
      csvContent += "\n\n";
    }
  }

  // 3. PROCESSAR CARTUCHOS
  if (document.getElementById("rep-check-cartuchos").checked) {
    const listaCart = cartuchos.filter((c) => !c.isDeleted && !c.isArchived);

    if (listaCart.length > 0) {
      csvContent += "=== RELATÓRIO DE CARTUCHOS ===\n";
      // Colunas: ID, Nº de Série, Patrimônio, Cor, Status, Vinculado à (Impressora)
      csvContent +=
        "ID,Nº de Série,Patrimônio,Cor,Status,Vinculado à (Impressora)\n";

      listaCart.forEach((c) => {
        const linha = [
          c.id,
          c.numeroSerie,
          c.patrimonio,
          c.cor,
          c.status,
          c.impressoraVinculada,
        ]
          .map((campo) => `"${String(campo || "").replace(/"/g, '""')}"`)
          .join(",");

        csvContent += linha + "\n";
      });
      csvContent += "\n\n";
    }
  }

  // 4. PROCESSAR ACESSÓRIOS
  if (document.getElementById("rep-check-acessorios").checked) {
    const catsSelecionadas = Array.from(
      document.querySelectorAll(".sub-check-acc:checked")
    ).map((cb) => cb.value);

    const listaAcc = acessorios.filter(
      (a) => !a.isDeleted && catsSelecionadas.includes(a.categoria)
    );

    if (listaAcc.length > 0) {
      csvContent += "=== RELATÓRIO DE ACESSÓRIOS ===\n";
      // Colunas: ID, Categoria, Modelo, Tipo, Patrimônio, Número de Série
      csvContent += "ID,Categoria,Modelo,Tipo,Patrimônio,Número de Série\n";

      listaAcc.forEach((a) => {
        const linha = [
          a.id,
          a.categoria,
          a.modelo,
          a.tipo,
          a.patrimonio,
          a.numeroSerie,
        ]
          .map((campo) => `"${String(campo || "").replace(/"/g, '""')}"`)
          .join(",");

        csvContent += linha + "\n";
      });
      csvContent += "\n\n";
    }
  }

  if (csvContent === "") {
    mostrarMensagem(
      "Nenhum dado encontrado para os filtros selecionados.",
      "error"
    );
    return;
  }

  // Download do Arquivo
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const dataHoje = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  link.href = URL.createObjectURL(blob);
  link.download = `Relatorio_TI_${dataHoje}.csv`;
  link.click();
}

// --- MENU MOBILE ---
function toggleMobileMenu() {
  const nav = document.getElementById("main-nav");
  const overlay = document.getElementById("mobile-menu-overlay");

  // Alterna a classe 'active' para mostrar/esconder
  nav.classList.toggle("active");
  overlay.classList.toggle("active");
}

// Fecha o menu automaticamente ao clicar em um item (opcional, mas recomendado)
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    // Só fecha se estiver em modo mobile (verificando se o menu tem a classe active)
    const nav = document.getElementById("main-nav");
    if (window.innerWidth <= 768 && nav.classList.contains("active")) {
      toggleMobileMenu();
    }
  });
});

// --- FUNÇÃO PARA ABRIR/FECHAR GRÁFICOS NO MOBILE ---
function toggleCharts() {
  const chartsDiv = document.getElementById("dashboard-charts");
  const icon = document.getElementById("charts-icon");

  if (chartsDiv.classList.contains("open")) {
    // Fechar
    chartsDiv.classList.remove("open");
    icon.classList.remove("fa-chevron-up");
    icon.classList.add("fa-chevron-down");
  } else {
    // Abrir
    chartsDiv.classList.add("open");
    icon.classList.remove("fa-chevron-down");
    icon.classList.add("fa-chevron-up");

    // Força o redimensionamento dos gráficos para não ficarem "achatados" ao abrir
    if (window.tipoChart) window.tipoChart.resize();
    if (window.statusChart) window.statusChart.resize();
    if (window.departamentoChart) window.departamentoChart.resize();
  }
}

// --- FUNÇÃO DE CARD EXPANSÍVEL (MOBILE) ---
function toggleCard(row) {
  // Verifica se é mobile (se não for, ignora o clique na linha)
  if (window.innerWidth > 768) return;

  // Se já estiver expandido, apenas fecha (remove a classe)
  if (row.classList.contains("mobile-expanded")) {
    fecharCard(row);
    return;
  }

  // --- Lógica de Abrir ---

  // 1. Fecha todos os outros cards abertos (opcional, para manter organizado)
  document.querySelectorAll("tr.mobile-expanded").forEach((otherRow) => {
    fecharCard(otherRow);
  });

  // 2. Expande o atual
  row.classList.add("mobile-expanded");

  // 3. Cria e adiciona o botão "X"
  if (!row.querySelector(".card-close-btn")) {
    const closeBtn = document.createElement("div");
    closeBtn.className = "card-close-btn";
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';

    // Evento para fechar ao clicar no X
    closeBtn.onclick = (e) => {
      e.stopPropagation(); // Impede que o clique no X re-abra o card
      fecharCard(row);
    };

    row.appendChild(closeBtn);
  }
}

function fecharCard(row) {
  row.classList.remove("mobile-expanded");
  const btn = row.querySelector(".card-close-btn");
  if (btn) btn.remove();
}
