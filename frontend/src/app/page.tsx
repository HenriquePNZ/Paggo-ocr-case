// pages/index.tsx
'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
// useRouter não é estritamente necessário se você está ficando na mesma página (/)
// import { useRouter } from 'next/navigation';

const HomePage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(''); // Para feedback de cadastro
  const [isSignUp, setIsSignUp] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false); // Novo estado!
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Para o check inicial de auth
  const [isLoadingDocs, setIsLoadingDocs] = useState(false); // Para o loading dos documentos

  // const router = useRouter(); // Descomente se for usar para navegação

  // Limpar mensagens
  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  // Função de login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearMessages();
    try {
      const response = await axios.post('http://localhost:3000/auth/login', {
        email,
        password,
      });
      if (response.status === 200 && response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        setIsAuthenticated(true); // Atualiza o estado de autenticação
        // Não precisa de router.push('/') se já está na home e só quer re-renderizar
        // Se quiser forçar uma busca de documentos imediata, pode chamar a função aqui
        // ou deixar o useEffect dependente de `isAuthenticated` cuidar disso.
      } else {
        setError(response.data.message || 'Falha ao fazer login.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email ou senha incorretos.');
    }
  };

  // Função de cadastro
  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearMessages();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:3000/auth/register', {
        email,
        password,
      });
      if (response.status === 201) {
        setSuccessMessage('Cadastro realizado com sucesso! Você já pode fazer login.');
        setIsSignUp(false); // Volta para a tela de login
        // Limpar campos
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
         setError(response.data.message || 'Erro ao cadastrar.');
      }
    } catch (err: any)
     {
      setError(err.response?.data?.message || 'Erro ao cadastrar. Tente novamente.');
    }
  };

  // Efeito para verificar o token na montagem inicial
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Aqui você poderia adicionar uma chamada para validar o token no backend
      // Se o token for válido:
      setIsAuthenticated(true);
    }
    setIsLoadingAuth(false); // Finaliza o loading da autenticação inicial
  }, []);

  // Efeito para buscar documentos QUANDO isAuthenticated se torna true
  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('token');
      if (!token) { // Segurança extra, não deveria acontecer se isAuthenticated é true por token
        setIsAuthenticated(false);
        return;
      }
      setIsLoadingDocs(true);
      clearMessages(); // Limpa erros antigos antes de buscar
      axios
        .get('http://localhost:3000/documents', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          setDocuments(response.data);
        })
        .catch((err) => {
          if (err.response?.status === 401) {
            localStorage.removeItem('token');
            setIsAuthenticated(false); // Desloga se o token for inválido
            setError('Sessão expirada. Faça login novamente.');
          } else {
            setError('Erro ao buscar documentos.');
          }
          setDocuments([]); // Limpa documentos em caso de erro
        })
        .finally(() => setIsLoadingDocs(false));
    } else {
      // Se não está autenticado, garante que a lista de documentos esteja vazia
      setDocuments([]);
    }
  }, [isAuthenticated]); // Depende de isAuthenticated

  const handleLogout = () => {
    clearMessages();
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    // Limpa os campos de email/senha se desejar
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };


  if (isLoadingAuth) {
    return <div style={{ padding: '20px' }}>Verificando autenticação...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto' }}>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green', textAlign: 'center' }}>{successMessage}</p>}

      {!isAuthenticated ? (
        // FORMULÁRIO DE LOGIN/CADASTRO
        <div>
          <h1>{isSignUp ? 'Cadastro' : 'Login'}</h1>
          <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
            <div style={{ marginBottom: '10px' }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Senha:</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>

            {isSignUp && (
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '5px' }}>Confirmar Senha:</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
            )}

            <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
              {isSignUp ? 'Cadastrar' : 'Login'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            {isSignUp ? (
              <p>
                Já tem uma conta?{' '}
                <button onClick={() => { setIsSignUp(false); clearMessages(); }} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>
                  Faça login
                </button>
              </p>
            ) : (
              <p>
                Não tem uma conta?{' '}
                <button onClick={() => { setIsSignUp(true); clearMessages(); }} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>
                  Cadastre-se
                </button>
              </p>
            )}
          </div>
        </div>
      ) : (
        // SEÇÃO DE DOCUMENTOS (QUANDO AUTENTICADO)
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Meus Documentos</h1>
            <button onClick={handleLogout} style={{ padding: '8px 15px', cursor: 'pointer' }}>Sair</button>
          </div>
          {isLoadingDocs ? (
            <p>Carregando documentos...</p>
          ) : (
            <div>
              {documents.length === 0 ? (
                <p>Não há documentos disponíveis.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {documents.map((document: any) => (
                    <li key={document.id} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
                      <strong>Nome:</strong> {document.filename} <br />
                      <strong>Criado em:</strong> {new Date(document.createdAt).toLocaleDateString()}
                      {/* Adicione mais detalhes ou botões de ação aqui, como download */}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePage;