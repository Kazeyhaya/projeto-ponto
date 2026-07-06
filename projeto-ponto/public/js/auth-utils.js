// public/js/auth-utils.js

const API_URL = window.location.origin;

// 1. AQUI ESTÁ A CURA DA AMNÉSIA: Já puxa do disco na largada!
let accessToken = localStorage.getItem('token'); 
let isLoggingOut = false;

/**
 * Verifica se mudou o dia para forçar logout automático (Reset 00:00)
 */
function verificarIntegridadeTemporal() {
    // 2. AQUI ESTÁ A CURA DA DATA: Padrão ISO universal
    const hoje = new Date().toISOString().split('T')[0]; 
    const dataSessao = localStorage.getItem('data_sessao');

    // Se não tem data, define a de hoje e segue
    if (!dataSessao) {
        localStorage.setItem('data_sessao', hoje);
        return true;
    }

    // Se a data gravada é diferente de hoje, o dia virou!
    if (dataSessao !== hoje) {
        console.error("Meia-noite detectada. Encerrando sessão por segurança...");
        logout();
        return false;
    }

    return true;
}

/**
 * Tenta obter um novo Access Token usando o Refresh Token (Cookie)
 */
async function renovarToken() {
    try {
        const resp = await fetch(`${API_URL}/api/auth/refresh`, { 
            method: 'POST', 
            credentials: 'same-origin' 
        });

        if (!resp.ok) throw new Error('Refresh Token expirado');

        const data = await resp.json();
        accessToken = data.accessToken || data.token; // Prevenção de erro de nomeclatura
        
        // Atualiza a data da sessão no sucesso da renovação
        localStorage.setItem('data_sessao', new Date().toISOString().split('T')[0]);
        
        return accessToken;
    } catch (err) {
        if (!isLoggingOut) logout();
        return null;
    }
}

/**
 * Wrapper de Fetch com reset automático de meia-noite
 */
async function fetchAutenticado(endpoint, options = {}) {
    if (!verificarIntegridadeTemporal()) return;

    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    
    if (!accessToken) {
        const tokenGerado = await renovarToken();
        if (!tokenGerado) return;
    }

    options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };

    let response = await fetch(url, options);

    if (response.status === 401) {
        console.warn('⚠️ Sessão inválida. Tentando renovar...');
        
        const novoToken = await renovarToken();
        
        if (novoToken) {
            options.headers['Authorization'] = `Bearer ${novoToken}`;
            response = await fetch(url, options);
        } else {
            return response; 
        }
    }

    return response;
}

/**
 * Limpa tudo e volta para o início
 */
async function logout() {
    if (isLoggingOut) return;
    isLoggingOut = true;

    try {
        await fetch(`${API_URL}/api/auth/logout`, { 
            method: 'POST', 
            credentials: 'same-origin' 
        });
    } catch (e) {
        console.error("Servidor indisponível no logout.");
    }

    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/login.html');
}