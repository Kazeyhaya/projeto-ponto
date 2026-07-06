// public/js/admin.js

const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || '{}');

// Proteção básica de interface
if (!usuarioLocal.role || usuarioLocal.role !== 'admin') {
    window.location.replace('/login');
}

// --- Estado Global da Página ---
let todosColaboradores = []; 
let listaFiltrada = [];      
let paginaAtual = 1;
let itensPorPagina = 10;

const elements = {
    inputBusca: document.querySelector('#inputBuscaColaborador'),
    tabelaBody: document.querySelector('#tabelaColaboradoresBody'),
    infoPaginacao: document.querySelector('#infoPaginacaoColab'),
    containerPaginacao: document.querySelector('#containerPaginacao'),
    selectQuantidade: document.querySelector('#selectItensPorPagina')
};

// --- Inicialização ---

async function initAdmin() {
    elements.tabelaBody.innerHTML = `<tr><td colspan="3" class="text-center py-4">Sincronizando base de dados...</td></tr>`;
    
    try {
        const resp = await fetchAutenticado('/api/admin/colaboradores');
        if (!resp.ok) throw new Error(`Erro na API: ${resp.status}`);
        
        const dados = await resp.json();
        
        todosColaboradores = Array.isArray(dados) ? dados : [];
        listaFiltrada = [...todosColaboradores];
        
        configurarEventos();
        atualizarInterface();
        
    } catch (e) {
        console.error("Falha no carregamento:", e);
        elements.tabelaBody.innerHTML = `<tr><td colspan="3" class="text-danger text-center py-4">Falha ao conectar com o servidor.</td></tr>`;
    }
}

function configurarEventos() {
    elements.inputBusca?.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        listaFiltrada = todosColaboradores.filter(c => 
            (c.nome && c.nome.toLowerCase().includes(termo)) || 
            (c.email && c.email.toLowerCase().includes(termo))
        );
        paginaAtual = 1; 
        atualizarInterface();
    });

    elements.selectQuantidade?.addEventListener('change', (e) => {
        itensPorPagina = parseInt(e.target.value);
        paginaAtual = 1;
        atualizarInterface();
    });
}

// --- Motor de Renderização e Paginação ---

function atualizarInterface() {
    const totalRegistros = listaFiltrada.length;
    const totalPaginas = Math.ceil(totalRegistros / itensPorPagina) || 1;

    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const itensExibidos = listaFiltrada.slice(inicio, fim);

    renderizarTabela(itensExibidos);
    renderizarControlesPaginacao(totalPaginas);
    
    if (elements.infoPaginacao) {
        if (totalRegistros === 0) {
            elements.infoPaginacao.textContent = `0 de 0`;
        } else {
            const mostrandoDe = inicio + 1;
            const mostrandoAte = Math.min(fim, totalRegistros);
            elements.infoPaginacao.textContent = `${mostrandoDe} - ${mostrandoAte} de ${totalRegistros}`;
        }
    }
}

function renderizarTabela(lista) {
    elements.tabelaBody.innerHTML = '';

    if (lista.length === 0) {
        elements.tabelaBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">Nenhum colaborador encontrado.</td></tr>`;
        return;
    }

    lista.forEach(c => {
        const nomeSeguro = c.nome || "Usuário sem nome";
        const iniciais = nomeSeguro.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4">
                <div class="d-flex align-items-center">
                    <div class="avatar-circle me-3">${iniciais}</div>
                    <div class="fw-bold">${nomeSeguro}</div>
                </div>
            </td>
            <td>${c.email || 'Sem email'}</td>
            <td class="text-end pe-4">
                <button class="btn btn-primary btn-sm" onclick="irParaRelatorio(${c.id})">
                    Selecionar <i class="fa-solid fa-chevron-right ms-1"></i>
                </button>
            </td>
        `;
        elements.tabelaBody.appendChild(tr);
    });
}

function renderizarControlesPaginacao(total) {
    if (!elements.containerPaginacao) return;
    elements.containerPaginacao.innerHTML = '';

    // 1. Botão Início (|<)
    criarBotaoPaginacao('<i class="fa-solid fa-backward-step"></i>', 1, paginaAtual === 1);

    // 2. Botão Anterior (<)
    criarBotaoPaginacao('<i class="fa-solid fa-chevron-left"></i>', paginaAtual - 1, paginaAtual === 1);

    // 3. Indicador Central (Pág. X / Y)
    const spanInfo = document.createElement('span');
    spanInfo.className = 'px-3 py-1 bg-light border-start border-end d-flex align-items-center fw-bold small text-dark';
    spanInfo.style.minWidth = '100px';
    spanInfo.style.justifyContent = 'center';
    spanInfo.textContent = `Pág. ${paginaAtual} / ${total}`;
    elements.containerPaginacao.appendChild(spanInfo);

    // 4. Botão Próximo (>)
    criarBotaoPaginacao('<i class="fa-solid fa-chevron-right"></i>', paginaAtual + 1, paginaAtual === total || total === 0);

    // 5. Botão Final (>|)
    criarBotaoPaginacao('<i class="fa-solid fa-forward-step"></i>', total, paginaAtual === total || total === 0);
}

function criarBotaoPaginacao(iconeHtml, destino, desativado) {
    const btn = document.createElement('button');
    btn.className = 'btn-pagina-icone';
    btn.innerHTML = iconeHtml;
    btn.disabled = desativado;
    
    if (!desativado) {
        btn.onclick = (e) => {
            e.preventDefault();
            paginaAtual = destino;
            atualizarInterface();
        };
    }

    elements.containerPaginacao.appendChild(btn);
}

window.irParaRelatorio = (id) => {
    if (id) {
        window.location.href = `/relatorios?id=${id}`;
    }
};

initAdmin();