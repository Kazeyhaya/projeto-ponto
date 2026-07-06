// public/js/gatekeeper.js

(function () {
    function verificarAcesso() {
        const dataSessao = localStorage.getItem('data_sessao');
        const token = localStorage.getItem('token'); // ✅ A PEÇA CHAVE: Agora ele cobra o crachá!
        
        // Usa o formato ISO universal (Ex: "2026-04-14")
        const hoje = new Date().toISOString().split('T')[0];

        // Se não houver data salva, se o dia virou, OU se não tiver token
        if (!dataSessao || dataSessao !== hoje || !token) {
            console.warn("Acesso bloqueado: Sessão inexistente, expirada ou sem token.");
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace('/login.html');
        }
    }

    // 1. Executa no carregamento normal da página
    verificarAcesso();

    // 2. Executa quando o usuário tenta usar as setas do navegador (bfcache)
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            verificarAcesso();
        }
    });
})();