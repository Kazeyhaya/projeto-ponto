// public/js/relatorios.js

const urlParams = new URLSearchParams(window.location.search);
const colaboradorId = urlParams.get('id');

if (!colaboradorId) window.location.replace('/admin');

let todosRegistros = [];
let listaFiltrada = [];
let paginaAtual = 1;
let itensPorPagina = 10;

const elements = {
    inicio: document.querySelector('#dataInicio'),
    fim: document.querySelector('#dataFim'),
    situacao: document.querySelector('#filtroSituacao'),
    btnGerar: document.querySelector('#btnGerar'),
    tabelaBody: document.querySelector('#tabelaPontosRelatorio'),
    nomeColaborador: document.querySelector('#infoColaborador'),
    totalHoras: document.querySelector('#resumoHoras'),
    infoPaginacao: document.querySelector('#infoPaginacaoRelatorio'),
    containerPaginacao: document.querySelector('#containerPaginacao'),
    selectQuantidade: document.querySelector('#selectItensPorPagina'),
    modalEntrada: document.querySelector('#modalEditEntrada'),
    modalAlmoco: document.querySelector('#modalEditAlmoco'),
    modalRetorno: document.querySelector('#modalEditRetorno'),
    modalSaida: document.querySelector('#modalEditSaida'),
    modalDataOculta: document.querySelector('#modalEditDataPonto'),
    btnSalvar: document.querySelector('#btnSalvarEdicaoPonto')
};

// --- Formatacao e Feedback ---

const formatarHora = (iso) => {
    if (!iso || iso === 'null') return '-';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '-' : d.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
    });
};

const formatarHoraInput = (iso) => {
    if (!iso || iso === 'null') return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

function mostrarNotificacao(mensagem, tipo = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-custom toast-${tipo}`;
    const icone = tipo === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    
    toast.innerHTML = `<i class="fa-solid ${icone}"></i> <span>${mensagem}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function calcularTotalHoras(registros) {
    let totalMs = 0;
    registros.forEach(d => {
        if (d.entrada && d.almoco) totalMs += (new Date(d.almoco) - new Date(d.entrada));
        if (d.retorno && d.saida) totalMs += (new Date(d.saida) - new Date(d.retorno));
    });
    const totalSegundos = Math.floor(totalMs / 1000);
    const h = Math.floor(totalSegundos / 3600);
    const m = Math.floor((totalSegundos % 3600) / 60);
    const s = totalSegundos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// --- Dados e Persistencia ---

async function init() {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    elements.inicio.value = primeiroDia.toISOString().split('T')[0];
    elements.fim.value = hoje.toISOString().split('T')[0];

    elements.btnGerar.onclick = carregarRelatorio;
    
    elements.selectQuantidade?.addEventListener('change', (e) => {
        itensPorPagina = parseInt(e.target.value);
        paginaAtual = 1;
        atualizarInterface();
    });

    elements.btnSalvar?.addEventListener('click', salvarAlteracoes);
    
    await carregarDadosColaborador();
    carregarRelatorio();
}

async function carregarDadosColaborador() {
    try {
        const resp = await fetchAutenticado(`/api/admin/colaborador/${colaboradorId}`);
        if (resp.ok) {
            const c = await resp.json();
            elements.nomeColaborador.innerHTML = `Colaborador: <strong>${c.nome}</strong>`;
        }
    } catch (e) { console.error("Erro perfil:", e); }
}

async function carregarRelatorio() {
    const inicio = elements.inicio.value;
    const fim = elements.fim.value;
    const status = elements.situacao.value;
    elements.tabelaBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Sincronizando...</td></tr>';

    try {
        const url = `/api/admin/relatorio/batidas?colaborador_id=${colaboradorId}&inicio=${inicio}&fim=${fim}`;
        const resp = await fetchAutenticado(url);
        const dados = await resp.json();
        todosRegistros = Array.isArray(dados) ? dados : [];
        listaFiltrada = status === 'incompleto' ? todosRegistros.filter(d => !d.entrada || !d.almoco || !d.retorno || !d.saida) : [...todosRegistros];
        paginaAtual = 1; 
        atualizarInterface();
    } catch (e) { elements.tabelaBody.innerHTML = '<tr><td colspan="6" class="text-danger text-center py-4">Erro de conexao.</td></tr>'; }
}

async function salvarAlteracoes() {
    const dataOculta = elements.modalDataOculta.value;
    const dataDia = dataOculta.split('T')[0]; 

    const montarISO = (hora) => {
        if (!hora || hora === "") return null;
        return `${dataDia}T${hora}`;
    };

    const payload = {
        colaborador_id: colaboradorId,
        data_dia: dataDia,
        entrada: montarISO(elements.modalEntrada.value),
        almoco: montarISO(elements.modalAlmoco.value),
        retorno: montarISO(elements.modalRetorno.value),
        saida: montarISO(elements.modalSaida.value)
    };

    try {
        const resp = await fetchAutenticado('/api/admin/relatorio/atualizar', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (resp.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalEditarPonto')).hide();
            await carregarRelatorio();
            mostrarNotificacao("Registro atualizado com sucesso.");
        } else {
            const err = await resp.json();
            mostrarNotificacao(err.mensagem || "Erro ao atualizar.", "error");
        }
    } catch (e) { 
        mostrarNotificacao("Falha na comunicacao com o servidor.", "error");
    }
}

// --- Interface e Paginacao ---

function atualizarInterface() {
    const totalRegistros = listaFiltrada.length;
    const totalPaginas = Math.ceil(totalRegistros / itensPorPagina) || 1;
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const itensExibidos = listaFiltrada.slice(inicio, fim);

    renderizarTabela(itensExibidos);
    renderizarControlesPaginacao(totalPaginas);
    
    if (elements.totalHoras) elements.totalHoras.textContent = `Total: ${calcularTotalHoras(listaFiltrada)}`;
    if (elements.infoPaginacao) {
        const de = totalRegistros === 0 ? 0 : inicio + 1;
        const ate = Math.min(fim, totalRegistros);
        elements.infoPaginacao.textContent = `${de} - ${ate} de ${totalRegistros}`;
    }
}

function renderizarTabela(dias) {
    elements.tabelaBody.innerHTML = dias.length === 0 ? '<tr><td colspan="6" class="text-muted text-center py-4">Nenhum registro.</td></tr>' : '';

    dias.forEach(d => {
        const incompleto = !d.entrada || !d.almoco || !d.retorno || !d.saida;
        const dataFmt = new Date(d.data_dia).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

        const tr = document.createElement('tr');
        if (incompleto) tr.classList.add('linha-incompleta');

        tr.innerHTML = `
            <td class="text-start fw-bold text-secondary ps-4">${dataFmt}</td>
            <td><span class="${d.entrada ? 'badge-entrada' : ''}">${formatarHora(d.entrada)}</span></td>
            <td><span class="${d.almoco ? 'badge-almoco' : ''}">${formatarHora(d.almoco)}</span></td>
            <td><span class="${d.retorno ? 'badge-retorno' : ''}">${formatarHora(d.retorno)}</span></td>
            <td><span class="${d.saida ? 'badge-saida' : ''}">${formatarHora(d.saida)}</span></td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-primary" 
                    onclick="abrirModalEdicao('${d.data_dia}', '${d.entrada}', '${d.almoco}', '${d.retorno}', '${d.saida}')">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </td>
        `;
        elements.tabelaBody.appendChild(tr);
    });
}

function renderizarControlesPaginacao(total) {
    if (!elements.containerPaginacao) return;
    elements.containerPaginacao.innerHTML = '';

    criarBotaoPaginacao('<i class="fa-solid fa-backward-step"></i>', 1, paginaAtual === 1);
    criarBotaoPaginacao('<i class="fa-solid fa-chevron-left"></i>', paginaAtual - 1, paginaAtual === 1);

    const span = document.createElement('span');
    span.className = 'px-3 py-1 bg-light border-start border-end d-flex align-items-center fw-bold small text-dark';
    span.style.minWidth = '100px';
    span.style.justifyContent = 'center';
    span.textContent = `Pág. ${paginaAtual} / ${total}`;
    elements.containerPaginacao.appendChild(span);

    criarBotaoPaginacao('<i class="fa-solid fa-chevron-right"></i>', paginaAtual + 1, paginaAtual === total || total === 0);
    criarBotaoPaginacao('<i class="fa-solid fa-forward-step"></i>', total, paginaAtual === total || total === 0);
}

function criarBotaoPaginacao(html, destino, desativado) {
    const btn = document.createElement('button');
    btn.className = 'btn-pagina-icone';
    btn.innerHTML = html;
    btn.disabled = desativado;
    if (!desativado) btn.onclick = () => { paginaAtual = destino; atualizarInterface(); };
    elements.containerPaginacao.appendChild(btn);
}

window.abrirModalEdicao = (data, e, a, r, s) => {
    const dataFmt = new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    document.querySelector('#modalDisplayData').textContent = `Editando: ${dataFmt}`;
    elements.modalDataOculta.value = data;
    elements.modalEntrada.value = formatarHoraInput(e);
    elements.modalAlmoco.value = formatarHoraInput(a);
    elements.modalRetorno.value = formatarHoraInput(r);
    elements.modalSaida.value = formatarHoraInput(s);
    new bootstrap.Modal(document.getElementById('modalEditarPonto')).show();
};

init();