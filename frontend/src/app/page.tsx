'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './page.module.css';

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
        responseType: 'blob',
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
    return <div className={styles.loading}>Verificando autenticação...</div>;
  }

  return (
    <div className={styles.container}>
      {error && <p className={styles.error}>{error}</p>}
      {successMessage && <p className={styles.success}>{successMessage}</p>}
      {uploadError && <p className={styles.uploadError}>{uploadError}</p>}
      {uploadSuccessMessage && (
        <p className={styles.uploadSuccess}>{uploadSuccessMessage}</p>
      )}

      {!isAuthenticated ? (
        <div className={styles.authContainer}>
          <h1 className={styles.authTitle}>{isSignUp ? 'Cadastro' : 'Login'}</h1>
          <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Email:
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                Senha:
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.input}
              />
            </div>
            {isSignUp && (
              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Confirmar Senha:
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>
            )}
            <button type="submit" className={styles.authButton}>
              {isSignUp ? 'Cadastrar' : 'Login'}
            </button>
          </form>
          <div className={styles.authSwitch}>
            {isSignUp ? (
              <p>
                Já tem uma conta?{' '}
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    clearMessages();
                  }}
                  className={styles.switchButton}
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
                  className={styles.switchButton}
                >
                  Cadastre-se
                </button>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className={styles.header}>
            <h1 className={styles.title}>Meus Documentos</h1>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Sair
            </button>
          </div>

          {/* Seção de Upload */}
          <div className={styles.uploadSection}>
            <h3 className={styles.sectionTitle}>Upload de Novo Documento</h3>
            <input
              type="file"
              onChange={handleFileChange}
              className={styles.fileInput}
            />
            <button
              onClick={handleFileUpload}
              disabled={isUploading}
              className={styles.uploadButton}
            >
              {isUploading ? 'Enviando...' : 'Enviar Arquivo'}
            </button>
          </div>

          {/* Lista de Documentos */}
          <h2 className={styles.sectionSubtitle}>Selecione um Documento</h2>
          {isLoadingDocs ? (
            <p className={styles.loading}>Carregando documentos...</p>
          ) : (
            <select
              value={selectedDocumentId === null ? undefined : selectedDocumentId}
              onChange={(e) => {
                setSelectedDocumentId(e.target.value);
                setConversationHistory([]);
                setAnswer('');
              }}
              className={styles.select}
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
            <div className={styles.geminiSection}>
              <h3 className={styles.sectionTitle}>Perguntar ao Gemini</h3>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Digite sua pergunta sobre o documento selecionado"
                className={styles.textarea}
              />
              <button
                onClick={handleAskGemini}
                disabled={isAskingQuestion}
                className={styles.askButton}
              >
                {isAskingQuestion ? 'Perguntando...' : 'Perguntar'}
              </button>

              {answer && (
                <div className={styles.answerContainer}>
                  <h4 className={styles.answerTitle}>Resposta do Gemini:</h4>
                  <p className={styles.answerText}>{answer}</p>
                </div>
              )}

              {/* Histórico de Conversa */}
              {conversationHistory.length > 0 && (
                <div className={styles.historyContainer}>
                  <h4 className={styles.historyTitle}>Histórico de Interações:</h4>
                  {conversationHistory.map((item, index) => (
                    <div key={index} className={styles.historyItem}>
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
            <div className={styles.downloadSection}>
              <h3 className={styles.sectionTitle}>Baixar Documento</h3>
              <button
                onClick={() => downloadDocumentWithContext(selectedDocumentId)}
                disabled={!selectedDocumentId}
                className={styles.downloadButton}
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