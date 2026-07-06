// Configurações Globais
let usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
if (!usuario.nome) window.location.replace('/login'); 

const API_URL = window.location.origin;
let isLoggingOut = false;

// 🛡️ O ESTADO EM MEMÓRIA (A Pulseira VIP)
let accessToken = null; 

// Seletores do DOM
const elements = {
    nome: document.querySelector('#usuarioNome'),
    relogio: document.querySelector('#relogio'),
    btnSair: document.querySelector('#btnSair'),
    btnRefresh: document.querySelector('#btnRefresh'),
    adminBtn: document.querySelector('#adminBtn'),
    horasTrabalhadas: document.querySelector('#horasTrabalhadas'),
    ultimaBatida: document.querySelector('#ultimaBatida'),
    horaEntrada: document.querySelector('#horaEntrada'),
    horaSaida: document.querySelector('#horaSaida'),
    timeline: document.querySelector('#timelineList'),
    statusBadge: document.querySelector('#statusBadge')
};

// --- Inicialização ---
elements.nome.textContent = usuario.nome || 'Usuário';
if (usuario.role === 'admin') {
    elements.adminBtn.style.display = 'block';
}

// --- Função Auxiliar de Formatação (CORRIGIDA) ---
const formatarHora = (dataISO) => {
    if (!dataISO || dataISO === 'null') return '--:--:--';
    
    const d = new Date(dataISO);
    if (isNaN(d.getTime())) return '--:--:--';
    
    // BLINDAGEM: Lê o horário local do PC sem forçar fuso
    return d.toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
};

// --- Relógio em Tempo Real (CORRIGIDO) ---
function atualizarRelogio() {
    const now = new Date();
    // BLINDAGEM: Sem forçar fuso, acompanha o relógio do Windows/Android
    elements.relogio.textContent = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', 
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(now);
}

setInterval(atualizarRelogio, 1000);

// ==========================================
// 🛡️ O GUARDA-COSTAS (SISTEMA DE RENOVAÇÃO)
// ==========================================

async function renovarToken() {
    try {
        const resp = await fetch(`${API_URL}/api/auth/refresh`, { 
            method: 'POST', 
            credentials: 'same-origin' 
        });
        if (!resp.ok) throw new Error('Falha no Refresh');
        const data = await resp.json();
        accessToken = data.accessToken;
        return accessToken;
    } catch (err) {
        console.error("Sessão finalizada.");
        logout();
        return null;
    }
}

async function fetchAutenticado(endpoint, options = {}) {
    if (!accessToken) {
        await renovarToken();
    }

    options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };

    let response = await fetch(`${API_URL}${endpoint}`, options);

    if (response.status === 401) {
        console.warn('⚠️ Token expirado no Dashboard! Renovando...');
        const novoToken = await renovarToken();
        if (novoToken) {
            options.headers['Authorization'] = `Bearer ${novoToken}`;
            response = await fetch(`${API_URL}${endpoint}`, options);
        }
    }
    return response;
}

// ==========================================
// LÓGICA DE NEGÓCIO E INTERFACE (MANTIDA INTACTA)
// ==========================================

function calcularTotalHoras(batidas) {
    if (!batidas || batidas.length === 0) return "00:00:00";

    const cronologico = [...batidas].sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
    let msTrabalhados = 0;
    let inicioPeriodo = null;

    cronologico.forEach(batida => {
        const horaBatida = new Date(batida.data_hora);
        const tipo = batida.tipo_batida.trim().toLowerCase(); 

        if (tipo === 'entrada' || tipo === 'retorno') {
            inicioPeriodo = horaBatida;
        } 
        else if (tipo === 'almoco' || tipo === 'saida') {
            if (inicioPeriodo) {
                msTrabalhados += (horaBatida - inicioPeriodo);
                inicioPeriodo = null;
            }
        }
    });

    if (inicioPeriodo) msTrabalhados += (new Date() - inicioPeriodo);

    const totalSegundos = Math.floor(msTrabalhados / 1000);
    const h = Math.floor(totalSegundos / 3600);
    const m = Math.floor((totalSegundos % 3600) / 60);
    const s = totalSegundos % 60;

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function renderizarTimeline(dados) {
    elements.timeline.innerHTML = '';
    if (dados.length === 0) {
        elements.timeline.innerHTML = '<div class="text-center text-muted">Nenhum registro hoje.</div>';
        return;
    }

    const config = {
        entrada: { classe: 'badge-entrada', icone: 'fa-arrow-right-to-bracket', txt: 'ENTRADA' },
        almoco:  { classe: 'badge-almoco',  icone: 'fa-utensils',               txt: 'ALMOÇO' },
        retorno: { classe: 'badge-retorno', icone: 'fa-arrow-left',             txt: 'RETORNO' },
        saida:   { classe: 'badge-saida',   icone: 'fa-arrow-right-from-bracket', txt: 'SAÍDA' }
    };

    dados.forEach(b => {
        const hora = formatarHora(b.data_hora);
        const tipoKey = b.tipo_batida.trim().toLowerCase();
        const estilo = config[tipoKey] || config.saida;
        
        const div = document.createElement('div');
        div.className = 'timeline-item';
        div.innerHTML = `<div class="time">${hora}</div><div class="mt-1"><span class="${estilo.classe}"><i class="fa-solid ${estilo.icone} me-1"></i> ${estilo.txt}</span></div>`;
        elements.timeline.appendChild(div);
    });
}

function atualizarResumo(dados) {
    const entrada = dados.find(b => b.tipo_batida.trim().toLowerCase() === 'entrada');
    const saida = dados.find(b => b.tipo_batida.trim().toLowerCase() === 'saida');
    const ultima = dados[0]; 

    if (elements.horasTrabalhadas) elements.horasTrabalhadas.textContent = calcularTotalHoras(dados);
    if (elements.horaEntrada) elements.horaEntrada.textContent = formatarHora(entrada?.data_hora);
    if (elements.horaSaida) elements.horaSaida.textContent = formatarHora(saida?.data_hora);
    
    if (elements.ultimaBatida) {
        elements.ultimaBatida.textContent = ultima 
            ? `${ultima.tipo_batida.toUpperCase()} às ${formatarHora(ultima.data_hora)}` 
            : 'Sem registros';
    }
}

async function atualizarProximoBotao() {
    try {
        const resp = await fetchAutenticado('/api/ponto/proximo-tipo'); 
        const { proximo_tipo } = await resp.json();
        ['Entrada', 'Almoco', 'Retorno', 'Saida'].forEach(tipo => {
            const btn = document.querySelector(`#btn${tipo}`);
            if (btn) btn.disabled = (tipo.toLowerCase() !== proximo_tipo);
        });
    } catch (e) { console.error("Erro botões:", e); }
}

async function carregarDados() {
    if (isLoggingOut) return;
    try {
        const resp = await fetchAutenticado('/api/ponto/pontos-hoje'); 
        const dados = await resp.json();
        renderizarTimeline(dados);
        atualizarResumo(dados);
        await atualizarProximoBotao();
        elements.statusBadge.innerHTML = '<i class="fa-solid fa-circle-check text-success"></i> <span class="text-success">API ONLINE</span>';
    } catch (err) {
        elements.statusBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation text-danger"></i> <span class="text-danger">Erro de Conexão</span>';
    }
}

async function baterPonto(tipo) {
    const btnId = `#btn${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
    const btn = document.querySelector(btnId);
    if (btn) btn.disabled = true;
    
    try {
        const resp = await fetchAutenticado('/api/ponto/bater-ponto', {  
            method: 'POST',
            body: JSON.stringify({ tipo_batida: tipo }) 
        });
        if (resp.ok) await carregarDados();
    } catch (e) { 
        if (btn) btn.disabled = false; 
    }
}

async function logout() {
    isLoggingOut = true;
    try {
        await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'same-origin' });
    } catch (e) {
        console.error("Erro logout");
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/login');
}

// Event listeners
elements.btnSair.addEventListener('click', logout);
elements.btnRefresh.addEventListener('click', carregarDados);

['Entrada', 'Almoco', 'Retorno', 'Saida'].forEach(tipo => {
    const btn = document.querySelector(`#btn${tipo}`);
    if (btn) {
        btn.addEventListener('click', () => baterPonto(tipo.toLowerCase()));
    }
});

carregarDados();