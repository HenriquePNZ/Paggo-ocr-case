// frontend/src/app/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const HomePage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Estados para o Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');

  //Estados para interação com o documento selecionado e o Gemini
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    { question: string; answer: string }[]
  >([]);

  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
    setUploadError('');
    setUploadSuccessMessage('');
  };

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
        setIsAuthenticated(true);
      } else {
        setError(response.data.message || 'Falha ao fazer login.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email ou senha incorretos.');
    }
  };

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
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(response.data.message || 'Erro ao cadastrar.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cadastrar. Tente novamente.');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadError('Por favor, selecione um arquivo.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Sessão expirada. Faça login novamente.');
        setIsAuthenticated(false);
        return;
      }

      const response = await axios.post('http://localhost:3000/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 201) {
        setUploadSuccessMessage('Arquivo enviado com sucesso!');
        setSelectedFile(null);
        fetchDocuments();
      } else {
        setUploadError(response.data.message || 'Erro ao enviar o arquivo.');
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Erro ao enviar o arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const fetchDocuments = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    setIsLoadingDocs(true);
    clearMessages();
    try {
      const response = await axios.get('http://localhost:3000/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(response.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setError('Sessão expirada. Faça login novamente.');
      } else {
        if (!uploadError) setError('Erro ao buscar documentos.');
      }
      setDocuments([]);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleAskGemini = async () => {
    if (!selectedDocumentId) {
      setError('Por favor, selecione um documento.');
      return;
    }
    if (!question.trim()) {
      setError('Por favor, digite sua pergunta.');
      return;
    }

    setIsAskingQuestion(true);
    clearMessages();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Sessão expirada. Faça login novamente.');
        setIsAuthenticated(false);
        return;
      }

      const response = await axios.post(
        `http://localhost:3000/documents/llm/query/${selectedDocumentId}`,
        { question },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAnswer(response.data.answer);
      setConversationHistory([
        ...conversationHistory,
        { question, answer: response.data.answer },
      ]);
      setQuestion('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao perguntar ao Gemini.');
      setAnswer('');
    } finally {
      setIsAskingQuestion(false);
    }
  };

  const handleLogout = () => {
    clearMessages();
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setSelectedDocumentId(null);
    setQuestion('');
    setAnswer('');
    setConversationHistory([]);
  };

  const downloadDocumentWithContext = async (documentId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Sessão expirada. Faça login novamente.');
      setIsAuthenticated(false);
      return;
    }

    let url = `http://localhost:3000/documents/download/${documentId}`;
    if (conversationHistory.length > 0) {
      const queries = encodeURIComponent(JSON.stringify(conversationHistory));
      url += `?queries=${queries}`;
    }

    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob', // Important for handling binary data
      });

      const filename = response.headers['content-disposition']?.split('filename=')?.[1] || `document_${documentId}.txt`;
      const urlCreator = window.URL || window.webkitURL;
      const fileURL = urlCreator.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = fileURL;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(fileURL);

    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao baixar o documento.');
    }
  };


  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoadingAuth(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDocuments();
    } else {
      setDocuments([]);
    }
  }, [isAuthenticated]);

  if (isLoadingAuth) {
    return <div style={{ padding: '20px' }}>Verificando autenticação...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      {successMessage && (
        <p style={{ color: 'green', textAlign: 'center' }}>{successMessage}</p>
      )}
      {uploadError && <p style={{ color: 'red', marginTop: '10px' }}>{uploadError}</p>}
      {uploadSuccessMessage && (
        <p style={{ color: 'green', marginTop: '10px' }}>
          {uploadSuccessMessage}
        </p>
      )}

      {!isAuthenticated ? (
        <div>
          <h1>{isSignUp ? 'Cadastro' : 'Login'}</h1>
          <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
            <div style={{ marginBottom: '10px' }}>
              <label
                htmlFor="email"
                style={{ display: 'block', marginBottom: '5px' }}
              >
                Email:
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label
                htmlFor="password"
                style={{ display: 'block', marginBottom: '5px' }}
              >
                Senha:
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {isSignUp && (
              <div style={{ marginBottom: '15px' }}>
                <label
                  htmlFor="confirmPassword"
                  style={{ display: 'block', marginBottom: '5px' }}
                >
                  Confirmar Senha:
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              {isSignUp ? 'Cadastrar' : 'Login'}
            </button>
          </form>
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            {isSignUp ? (
              <p>
                Já tem uma conta?{' '}
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    clearMessages();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Faça login
                </button>
              </p>
            ) : (
              <p>
                Não tem uma conta?{' '}
                <button
                  onClick={() => {
                    setIsSignUp(true);
                    clearMessages();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Cadastre-se
                </button>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h1>Meus Documentos</h1>
            <button
              onClick={handleLogout}
              style={{ padding: '8px 15px', cursor: 'pointer' }}
            >
              Sair
            </button>
          </div>

          {/* Seção de Upload */}
          <div
            style={{
              marginBottom: '20px',
              border: '1px solid #ccc',
              padding: '15px',
              borderRadius: '5px',
            }}
          >
            <h3>Upload de Novo Documento</h3>
            <input
              type="file"
              onChange={handleFileChange}
              style={{ marginBottom: '10px' }}
            />
            <button
              onClick={handleFileUpload}
              disabled={isUploading}
              style={{
                padding: '8px 15px',
                cursor: 'pointer',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              {isUploading ? 'Enviando...' : 'Enviar Arquivo'}
            </button>
          </div>

          {/* Lista de Documentos */}
          <h2>Selecione um Documento</h2>
          {isLoadingDocs ? (
            <p>Carregando documentos...</p>
          ) : (
            <select
              value={selectedDocumentId === null ? undefined : selectedDocumentId}
              onChange={(e) => {
                setSelectedDocumentId(e.target.value);
                setConversationHistory([]); // Clear history when document changes
                setAnswer(''); // Clear previous answer
              }}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                border: '1px solid #ccc',
                borderRadius: '5px',
              }}
            >
              <option value="">Selecione um documento</option>
              {documents.map((document: any) => (
                <option key={document.id} value={document.id}>
                  {document.filename}
                </option>
              ))}
            </select>
          )}

          {/* Área de Pergunta ao Gemini */}
          {selectedDocumentId && (
            <div
              style={{
                border: '1px solid #ccc',
                padding: '15px',
                borderRadius: '5px',
                marginBottom: '20px',
              }}
            >
              <h3>Perguntar ao Gemini</h3>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Digite sua pergunta sobre o documento selecionado"
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  minHeight: '100px',
                }}
              />
              <button
                onClick={handleAskGemini}
                disabled={isAskingQuestion}
                style={{
                  padding: '10px 15px',
                  cursor: 'pointer',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                {isAskingQuestion ? 'Perguntando...' : 'Perguntar'}
              </button>

              {answer && (
                <div
                  style={{
                    marginTop: '20px',
                    borderTop: '1px solid #eee',
                    paddingTop: '15px',
                  }}
                >
                  <h4>Resposta do Gemini:</h4>
                  <p>{answer}</p>
                </div>
              )}

               {/* Histórico de Conversa */}
               {conversationHistory.length > 0 && (
                <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                    <h4>Histórico de Interações:</h4>
                    {conversationHistory.map((item, index) => (
                        <div key={index} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
                            <p><strong>Você:</strong> {item.question}</p>
                            <p><strong>Gemini:</strong> {item.answer}</p>
                        </div>
                    ))}
                </div>
            )}
            </div>
          )}

          {/* Área de Download */}
          {selectedDocumentId && (
            <div
              style={{
                border: '1px solid #ccc',
                padding: '15px',
                borderRadius: '5px',
              }}
            >
              <h3>Baixar Documento</h3>
              <button
                onClick={() => downloadDocumentWithContext(selectedDocumentId)}
                disabled={!selectedDocumentId}
                style={{
                  marginRight: '10px',
                  padding: '10px 15px',
                  cursor: 'pointer',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                }}
              >
                Baixar Documento (Texto {conversationHistory.length > 0 ? '+ Interações' : ''})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePage;