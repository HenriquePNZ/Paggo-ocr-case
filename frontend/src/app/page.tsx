'use client';

import React, { useState, useEffect, useCallback } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import axios, { AxiosError } from 'axios';
import styles from './page.module.css';

// --- Interfaces para Tipagem ---
interface Document {
  id: string;
  filename: string;
  originalFilename?: string | null;
  extractedText?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsedJson?: { [key: string]: unknown } | null;
}

interface Conversation {
  question: string;
  answer: string;
}

interface AuthResponse {
  access_token?: string;
  message?: string;
}

interface RegisterResponse {
  message?: string;
}

interface DocumentUploadResponse {
  message?: string;
  documentId?: string;
  originalFilename?: string | null;
}

interface GeminiResponse {
  answer: string;
  message?: string;
}

interface DownloadErrorResponse {
  message?: string;
}

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

const HomePage = () => {
  // --- Estados de Autenticação ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // --- Estados de Documentos ---
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // --- Estados de Upload ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Estados de Interação com Gemini ---
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Conversation[]>([]);

  // --- Estados de Mensagens e Feedback ---
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);


  // Limpa todas as mensagens de feedback
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
    setUploadError(null);
    setUploadSuccessMessage(null);
  }, []);

  // --- Funções de Autenticação ---
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearMessages();
    try {
      // Corrigido: Usando crases para o template literal
      const response = await axios.post<AuthResponse>(`${BACKEND_BASE_URL}/auth/login`, {
        email,
        password,
      });
      if (response.status === 200 && response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        setIsAuthenticated(true);
        setSuccessMessage('Login realizado com sucesso!');
      } else {
        setError(response.data?.message || 'Falha ao fazer login.');
      }
    } catch (error: unknown) {
      if (axios.isAxiosError<AuthResponse>(error)) {
           setError(error.response?.data?.message || error.message || 'Email ou senha incorretos.');
      } else {
           setError('Ocorreu um erro desconhecido durante o login.');
           console.error('Erro inesperado durante o login:', error);
      }
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
      // Corrigido: Usando crases para o template literal
      const response = await axios.post<RegisterResponse>(`${BACKEND_BASE_URL}/auth/register`, {
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
        setError(response.data?.message || 'Erro ao cadastrar.');
      }
    } catch (error: unknown) {
      if (axios.isAxiosError<RegisterResponse>(error)) {
           setError(error.response?.data?.message || error.message || 'Erro ao cadastrar. Tente novamente.');
      } else {
           setError('Ocorreu um erro desconhecido durante o cadastro.');
           console.error('Erro inesperado durante o cadastro:', error);
      }
    }
  };

  const handleLogout = () => {
    clearMessages();
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    // Limpa todos os estados relacionados ao usuário e documentos ao sair
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setSelectedDocumentId(null);
    setDocuments([]);
    setQuestion('');
    setAnswer('');
    setConversationHistory([]);
    setIsUploading(false);
    setIsAskingQuestion(false);
    setIsDownloading(false);
    setSuccessMessage('Você saiu da sua conta.');
  };

  // --- Funções de Documentos ---
  const fetchDocuments = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    setIsLoadingDocs(true);
    clearMessages();
    try {
      // Corrigido: Usando crases para o template literal
      const response = await axios.get<Document[]>(`${BACKEND_BASE_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(response.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
           // Se for erro 401, a sessão expirou
           if (error.response?.status === 401) {
             localStorage.removeItem('token');
             setIsAuthenticated(false);
             setError('Sessão expirada. Faça login novamente.');
           } else {
             if (!uploadError) {
                  const backendErrorMessage = (error.response?.data as { message?: string })?.message || error.message;
                  setError(`Erro ao buscar documentos: ${backendErrorMessage}`);
             }
           }
      } else {
           setError('Ocorreu um erro desconhecido ao buscar documentos.');
           console.error('Erro inesperado ao buscar documentos:', error);
      }
      setDocuments([]);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [clearMessages, uploadError]);

  // --- Funções de Upload ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadError(null);
      setUploadSuccessMessage(null);
    } else {
        setSelectedFile(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadError('Por favor, selecione um arquivo para enviar.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Sessão expirada. Faça login novamente.');
        setIsAuthenticated(false);
        return;
      }

      // Corrigido: Usando crases para o template literal
      const response = await axios.post<DocumentUploadResponse>(`${BACKEND_BASE_URL}/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 201) {
        setUploadSuccessMessage('Arquivo enviado e processado com sucesso!');
        setSelectedFile(null);
        fetchDocuments();
      } else {
        setError(response.data?.message || 'Erro desconhecido ao enviar o arquivo.');
      }
    } catch (error: unknown) {
       console.error("Erro durante o upload:", error);
       if (axios.isAxiosError<DocumentUploadResponse>(error)) {
           const backendErrorMessage = (error.response?.data as { message?: string })?.message || error.message;
           setUploadError(`Erro no upload: ${backendErrorMessage}`);
       } else {
           setUploadError('Ocorreu um erro desconhecido durante o upload.');
           console.error('Erro inesperado durante o upload:', error);
       }
    } finally {
      setIsUploading(false);
    }
  };

  // --- Funções de Interação com Gemini ---
  const handleAskGemini = async () => {
    if (!selectedDocumentId) {
      setError('Por favor, selecione um documento para perguntar.');
      return;
    }
    if (!question.trim()) {
      setError('Por favor, digite sua pergunta antes de enviar.');
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

      // Esta URL já estava correta com crases
      const response = await axios.post<GeminiResponse>(
        `${BACKEND_BASE_URL}/documents/llm/query/${selectedDocumentId}`,
        { question },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const geminiAnswer = response.data.answer;
      setAnswer(geminiAnswer);

      setConversationHistory([
        ...conversationHistory,
        { question: question, answer: geminiAnswer },
      ]);
      setQuestion('');
      setSuccessMessage('Resposta do Gemini recebida.');
    } catch (error: unknown) {
       console.error("Erro ao perguntar ao Gemini:", error);
       if (axios.isAxiosError<GeminiResponse>(error)) {
           const backendErrorMessage = error.response?.data?.message || error.message;
           setError(`Erro ao perguntar ao Gemini: ${backendErrorMessage}`);
           setAnswer('');
       } else {
           setError('Ocorreu um erro desconhecido ao perguntar ao Gemini.');
           console.error('Erro inesperado ao perguntar ao Gemini:', error);
           setAnswer('');
       }
    } finally {
      setIsAskingQuestion(false);
    }
  };

  const handleDownload = async () => {
      if (!selectedDocumentId) {
          setError('Por favor, selecione um documento para baixar.');
          return;
      }

      setIsDownloading(true);
      clearMessages();
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Sessão expirada. Faça login novamente.');
        setIsAuthenticated(false);
        setIsDownloading(false);
        return;
      }

      // Esta URL já estava correta com crases
      let url = `${BACKEND_BASE_URL}/documents/download/${selectedDocumentId}`;

      if (conversationHistory.length > 0) {
          const queries = encodeURIComponent(JSON.stringify(conversationHistory));
          url += `?queries=${queries}`;
      }

      try {
          const response = await axios.get<string>(url, {
              headers: { Authorization: `Bearer ${token}` },
              responseType: 'text',
          });

          const textContent = response.data;

          const selectedDoc = documents.find(doc => doc.id === selectedDocumentId);
          const baseFilename = selectedDoc?.originalFilename?.replace(/\s/g, '_').replace(/[^\w.-]/g, '').split('.').slice(0, -1).join('.') || `document_${selectedDocumentId}`;
          const filename = `${baseFilename}_texto_interacoes.txt`;

          const blob = new Blob([textContent], { type: 'text/plain' });

          const urlCreator = window.URL || window.webkitURL;
          const fileURL = urlCreator.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = fileURL;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(fileURL);

          setSuccessMessage('Arquivo de texto baixado com sucesso!');

      } catch (error: unknown) {
          console.error("Erro no download do arquivo de texto:", error);
           if (axios.isAxiosError<DownloadErrorResponse | string>(error)) {
               const backendErrorMessage = (error.response?.data as DownloadErrorResponse)?.message || error.message;
               setError(backendErrorMessage || 'Erro ao baixar o arquivo de texto.');
           } else {
               setError('Ocorreu um erro desconhecido ao baixar o arquivo de texto.');
               console.error('Erro inesperado durante o download:', error);
           }
      } finally {
          setIsDownloading(false);
      }
  };

  useEffect(() => {
    // Verifica a autenticação inicial ao carregar a página
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoadingAuth(false);
  }, []);

  useEffect(() => {
    // Busca documentos quando o estado de autenticação muda para true
    if (isAuthenticated) {
      fetchDocuments();
    } else {
      // Limpa a lista de documentos e o documento selecionado se não estiver autenticado
      setDocuments([]);
      setSelectedDocumentId(null);
      setConversationHistory([]);
      setAnswer('');
    }
  }, [isAuthenticated, fetchDocuments]);

  // Exibe estado de carregamento inicial da autenticação
  if (isLoadingAuth) {
    return <div className={styles.loading}>Verificando autenticação...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Área de Mensagens de Feedback */}
      {error && <p className={styles.error}>{error}</p>}
      {successMessage && <p className={styles.success}>{successMessage}</p>}
      {uploadError && <p className={styles.uploadError}>{uploadError}</p>}
      {uploadSuccessMessage && (
        <p className={styles.uploadSuccess}>{uploadSuccessMessage}</p>
      )}

      {/* Formulário de Login/Cadastro */}
      {!isAuthenticated ? (
        <div className={styles.authContainer}>
          <h1 className={styles.authTitle}>{isSignUp ? 'Criar Conta' : 'Login'}</h1>
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
              {isSignUp ? 'Cadastrar' : 'Entrar'}
            </button>
          </form>
          <div className={styles.authSwitch}>
            {isSignUp ? (
              <p>
                Já tem uma conta?{' '}
                <button
                  onClick={() => { setIsSignUp(false); clearMessages(); }}
                  className={styles.switchButton}
                >
                  Faça login
                </button>
              </p>
            ) : (
              <p>
                Não tem uma conta?{' '}
                <button
                  onClick={() => { setIsSignUp(true); clearMessages(); }}
                  className={styles.switchButton}
                >
                  Cadastre-se
                </button>
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Área Autenticada */
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
               accept="image/*,application/pdf" //arquivos de imagem ou PDF
              onChange={handleFileChange}
              className={styles.fileInput}
            />
             {selectedFile && (
                <p className={styles.selectedFileInfo}>
                    Arquivo selecionado: <strong>{selectedFile.name}</strong> ({Math.round(selectedFile.size / 1024)} KB)
                </p>
            )}
            <button
              onClick={handleFileUpload}
              disabled={isUploading || !selectedFile}
              className={styles.uploadButton}
            >
              {isUploading ? 'Enviando...' : 'Enviar Arquivo'}
            </button>
          </div>

          {/* Lista de Documentos */}
          <div className={styles.documentListSection}>
             <h2 className={styles.sectionSubtitle}>Selecione um Documento</h2>
             {isLoadingDocs ? (
                 <p className={styles.loading}>Carregando documentos...</p>
             ) : documents.length === 0 ? (
                 <p className={styles.noDocuments}>Nenhum documento encontrado. Faça upload de um novo documento para começar.</p>
             ) : (
                 <select
                     value={selectedDocumentId === null ? "" : selectedDocumentId}
                     onChange={(e) => {
                         setSelectedDocumentId(e.target.value === "" ? null : e.target.value);
                         setConversationHistory([]);
                         setAnswer('');
                         clearMessages();
                     }}
                     className={styles.select}
                 >
                     <option value="">-- Selecione um documento --</option>
                     {documents.map((document) => (
                         <option key={document.id} value={document.id}>
                             {document.originalFilename || document.filename || `Documento sem nome (${document.id})`}
                         </option>
                     ))}
                 </select>
             )}
          </div>

          {/* Área de Interação com o Documento (Pergunta ao Gemini e Histórico) */}
          {selectedDocumentId && (
            <div className={styles.geminiSection}>
              <h3 className={styles.sectionTitle}>Interação com o Documento Selecionado</h3>

              {/* Pergunta ao Gemini */}
              <div className={styles.geminiQuestionArea}>
                <h4 className={styles.geminiSubtitle}>Perguntar ao Gemini:</h4>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Digite sua pergunta sobre o conteúdo do documento selecionado..."
                  className={styles.textarea}
                />
                <button
                  onClick={handleAskGemini}
                  disabled={isAskingQuestion || !question.trim() || !selectedDocumentId}
                  className={styles.askButton}
                >
                  {isAskingQuestion ? 'Enviando pergunta...' : 'Perguntar ao Gemini'}
                </button>
              </div>

              {/* Resposta mais recente do Gemini */}
              {answer && (
                <div className={styles.geminiAnswerArea}>
                  <h4 className={styles.geminiSubtitle}>Resposta do Gemini:</h4>
                  <p className={styles.answerText}>{answer}</p>
                </div>
              )}

               {/* Histórico de Conversa Completo */}
               {conversationHistory.length > 0 && (
                <div className={styles.geminiHistoryArea}>
                    <h4 className={styles.geminiSubtitle}>Histórico de Interações:</h4>
                    <div className={styles.historyList}>
                        {conversationHistory.map((item, index) => (
                            <div key={index} className={styles.historyItem}>
                                <p className={styles.historyQuestion}><strong>Você:</strong> {item.question}</p>
                                <p className={styles.historyAnswer}><strong>Gemini:</strong> {item.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </div>
          )}

          {/* Área de Download TXT */}
          {selectedDocumentId && (
            <div className={styles.downloadSection}>
              <h3 className={styles.sectionTitle}>Baixar Texto e Interações</h3>
              <p className={styles.downloadDescription}>Baixa um arquivo de texto (.txt) contendo o conteúdo extraído do documento e todas as suas interações com o Gemini sobre ele.</p>
              <button
                onClick={handleDownload}
                disabled={!selectedDocumentId || isDownloading}
                className={styles.downloadButton}
              >
                {isDownloading ? 'Preparando TXT...' : 'Baixar Texto e Interações'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePage;
