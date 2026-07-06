// Dentro da sua função de login, após o fetch:
const resp = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
});

const data = await resp.json();

if (resp.ok) {
    // 1. SÓ SALVAMOS O QUE É VISUAL (Não é segredo)
    localStorage.setItem('usuario', JSON.stringify(data.usuario));

    // 2. ESSENCIAL: Carimba a data de hoje para o Gatekeeper deixar entrar!
    localStorage.setItem('data_sessao', new Date().toLocaleDateString('pt-BR'));

    // 3. Manda o cara pra tela certa
    if (data.usuario.role === 'admin') {
        window.location.replace('/admin');
    } else {
        window.location.replace('/dashboard');
    }
} else {
    // Mostra o erro retornado pelo backend ou um erro genérico
    alert(data.erro || 'Falha no login');
}