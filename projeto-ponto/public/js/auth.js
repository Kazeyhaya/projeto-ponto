// ==========================================
// 1. VERIFICAÇÃO INICIAL (AUTO-LOGIN)
// ==========================================
// Se o usuário já possui uma sessão válida para o dia de hoje,
// ele é poupado da tela de login e levado direto ao dashboard.
const sessaoSalva = localStorage.getItem('data_sessao');
const hoje = new Date().toISOString().split('T')[0];
const usuarioSalvo = JSON.parse(localStorage.getItem('usuario') || 'null');
const tokenSalvo = localStorage.getItem('token');

if (sessaoSalva === hoje && usuarioSalvo && tokenSalvo) {
    // Redirecionamento convergente: Todos os perfis vão para a mesma página
    window.location.replace('/dashboard.html');
}

// ==========================================
// 2. MAPEAMENTO DE ELEMENTOS DO DOM
// ==========================================
const formLogin = document.querySelector('#formLogin');
const formRegister = document.querySelector('#formRegister');
const linkToRegister = document.querySelector('#linkToRegister');
const linkToLogin = document.querySelector('#linkToLogin');
const loginSection = document.querySelector('#loginSection');
const registerSection = document.querySelector('#registerSection');
const alertArea = document.querySelector('#alertArea');

/**
 * Exibe alertas visuais utilizando classes do Bootstrap
 */
function showAlert(message, type = 'success') {
    alertArea.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
}

// ==========================================
// 3. ALTERNÂNCIA DE TELAS (LOGIN / REGISTRO)
// ==========================================
if (linkToRegister && linkToLogin) {
    linkToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.style.display = 'none';
        registerSection.style.display = 'block';
        alertArea.innerHTML = '';
    });

    linkToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.style.display = 'none';
        loginSection.style.display = 'block';
        alertArea.innerHTML = '';
    });
}

// ==========================================
// 4. LÓGICA DE LOGIN (AUTENTICAÇÃO)
// ==========================================
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault(); // Bloqueia o recarregamento nativo do formulário
        
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        const email = document.querySelector('#loginEmail').value;
        const senha = document.querySelector('#loginSenha').value;

        // Feedback visual de carregamento
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Entrando...';

        try {
            const resposta = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const dados = await resposta.json();
            
            if (!resposta.ok) throw new Error(dados.erro || 'Falha na autenticação');
            
            // --- PERSISTÊNCIA DE SESSÃO ---
            // Salva o Token para as requisições futuras do auth-utils.js
            localStorage.setItem('token', dados.token); 
            
            // Salva o objeto do usuário (nome, role, etc) para a interface do dashboard
            localStorage.setItem('usuario', JSON.stringify(dados.usuario));
            
            // Salva o carimbo temporal ISO para o Gatekeeper (Validade: hoje)
            localStorage.setItem('data_sessao', new Date().toISOString().split('T')[0]);
            
            // Redireciona todos os perfis para a página unificada
            window.location.replace('/dashboard.html');

        } catch (err) {
            showAlert(err.message, 'danger');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Entrar';
        }
    });
}

// ==========================================
// 5. LÓGICA DE CADASTRO (REGISTRO)
// ==========================================
if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        const nome = document.querySelector('#registerNome').value;
        const email = document.querySelector('#registerEmail').value;
        const senha = document.querySelector('#registerSenha').value;

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = 'Criando...';

        try {
            const resposta = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha })
            });
            
            const dados = await resposta.json();
            
            if (!resposta.ok) throw new Error(dados.erro || 'Erro ao criar conta');

            showAlert('Conta criada com sucesso! Realize o login.', 'success');
            
            // Facilita o login preenchendo o e-mail recém-cadastrado
            document.querySelector('#loginEmail').value = email;
            linkToLogin.click();

        } catch (err) {
            showAlert(err.message, 'danger');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Criar Conta';
        }
    });
}