import React, { useState, useEffect } from 'react'
import './index.css'

const API_URL = 'http://localhost:8000'

function App() {
  const [currentView, setCurrentView] = useState('home')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Login/Register State
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [loginError, setLoginError] = useState('')

  // Dashboard State
  const [bots, setBots] = useState([])
  const [loadingBots, setLoadingBots] = useState(false)

  // Edit Prompt State (Modal)
  const [editingBotId, setEditingBotId] = useState(null)
  const [editConfig, setEditConfig] = useState({ name: '', role: '', tone: 'Formal y profesional', strictness: 'strict' })
  const [isUpdating, setIsUpdating] = useState(false)

  // Create Bot State
  const [formData, setFormData] = useState({
    admin_token: '',
    user_token: '',
    openai_api_key: ''
  })
  
  const [botConfig, setBotConfig] = useState({
    name: '',
    role: '',
    tone: 'Formal y profesional',
    strictness: 'strict'
  })
  const [showDirectivesModal, setShowDirectivesModal] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploySuccess, setDeploySuccess] = useState(false)

  // -- HANDLERS --
  
  const handleNextStep = (e) => {
    e.preventDefault()
    setShowDirectivesModal(true)
  }

  const handleLogin = (e) => {
    e.preventDefault()
    setIsAuthenticated(true)
    setCurrentView('dashboard')
    setLoginError('')
  }

  const handleRegister = (e) => {
    e.preventDefault()
    alert(`Cuenta corporativa para ${company} provisionada exitosamente.`)
    setCurrentView('login')
  }

  const fetchBots = async () => {
    setLoadingBots(true)
    try {
      const res = await fetch(`${API_URL}/deploy`)
      if (res.ok) {
        const data = await res.json()
        setBots(data)
      }
    } catch (err) {
      console.error("Error fetching bots:", err)
    } finally {
      setLoadingBots(false)
    }
  }

  useEffect(() => {
    if (currentView === 'dashboard') {
      fetchBots()
    }
  }, [currentView])

  const handleDeleteBot = async (deploymentId) => {
    if (!window.confirm(`¿Confirmar desvinculación del clúster #${deploymentId}?`)) return
    try {
      const res = await fetch(`${API_URL}/deploy/${deploymentId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        alert("Clúster eliminado.")
        fetchBots()
      } else {
        alert("Error en desvinculación.")
      }
    } catch (err) {
      alert("Error de conexión.")
    }
  }

  const generatePromptWithRules = (config) => {
    let rules = ''
    if (config.strictness === 'strict') {
      rules = '=== NIVEL DE RESTRICCIÓN RAG: ESTRICTO ===\\nBajo ninguna circunstancia inventes información. Si el contexto proporcionado no contiene la respuesta exacta o está vacío, debes decir exactamente: "Lo siento, no pude encontrar esa información. ¿Podrías especificar o reformular tu pregunta?"'
    } else if (config.strictness === 'flexible') {
      rules = '=== NIVEL DE RESTRICCIÓN RAG: FLEXIBLE ===\\nPrioriza la información del contexto. Si el contexto no tiene la respuesta exacta, puedes hacer inferencias lógicas o dar consejos generales relacionados, pero siempre aclara amablemente que es una sugerencia general no incluida en el manual.'
    } else {
      rules = '=== NIVEL DE RESTRICCIÓN RAG: CREATIVO ===\\nPuedes usar libremente tu conocimiento general de IA para responder de forma creativa y amigable si el contexto de la base de datos no es suficiente para contestar la pregunta del usuario.'
    }

    return `Eres un asistente llamado ${config.name || 'Asistente IA'}. Tu rol principal en la empresa es: ${config.role || 'Ayudar con tareas operativas'}. Debes comunicarte SIEMPRE con el siguiente tono: ${config.tone}.\\n\\n${rules}`
  }

  const handleUpdatePrompt = async (e) => {
    e.preventDefault()
    setIsUpdating(true)
    
    const newPrompt = generatePromptWithRules(editConfig)
    
    try {
      const res = await fetch(`${API_URL}/deploy/${editingBotId}/prompt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extra_prompt: newPrompt })
      })
      
      if (res.ok) {
        alert("Configuración sincronizada con éxito.")
        setEditingBotId(null)
      } else {
        alert("Error de sincronización.")
      }
    } catch (err) {
      alert("Error de conexión.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateBot = async (e) => {
    e.preventDefault()
    setIsDeploying(true)
    
    const newPrompt = generatePromptWithRules(botConfig)
    
    const payload = {
      ...formData,
      extra_prompt: newPrompt
    }

    try {
      const res = await fetch(`${API_URL}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        setDeploySuccess(true)
        setTimeout(() => {
          setDeploySuccess(false)
          setShowDirectivesModal(false)
          setCurrentView('dashboard')
          setFormData({ admin_token: '', user_token: '', openai_api_key: '' })
          setBotConfig({ name: '', role: '', tone: 'Formal y profesional', strictness: 'strict' })
        }, 2000)
      } else {
        alert("Error de despliegue. Verifique tokens.")
      }
    } catch (err) {
      alert("Error de conexión.")
    } finally {
      setIsDeploying(false)
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setCurrentView('home')
    setUsername('')
    setPassword('')
  }

  // -- VIEWS --

  const renderHome = () => (
    <div>
      <div className="landing-nav">
        <span className="link" onClick={() => setCurrentView('login')} style={{fontSize: '0.9rem', fontWeight: 500}}>Iniciar Sesión</span>
      </div>

      <div className="landing-hero">
        <h1>AIOPSORA</h1>
        <p className="hero-subtitle">
          Inteligencia Artificial para la Transformación Digital
        </p>
        <p className="hero-description">
          Soluciones cognitivas diseñadas para optimizar y automatizar la estructura operativa de su organización, garantizando un despliegue seguro, privado y altamente escalable.
        </p>

        <button className="btn" style={{width: 'auto', padding: '1rem 3rem', border: 'none'}} onClick={() => setCurrentView('login')}>
          Ingresar al Portal
        </button>

        <div className="landing-features-grid">
          <div className="feature-card">
            <h3>Automatización Eficiente</h3>
            <p>Optimización de tiempo y recursos de manera ágil sin requerir infraestructura técnica compleja.</p>
          </div>
          <div className="feature-card">
            <h3>Intranet Inteligente (RAG)</h3>
            <p>Consultoría interna 24/7 basada estrictamente en los manuales y políticas de la organización.</p>
          </div>
          <div className="feature-card">
            <h3>Arquitectura Aislada</h3>
            <p>Garantía de privacidad total de los datos corporativos bajo una infraestructura multicliente segura.</p>
          </div>
        </div>
      </div>

      <footer className="elegant-footer">
        <div className="footer-grid">
          <div>
            <h4>AIOPSORA</h4>
            <p>Proveedor líder en soluciones tecnológicas B2B, especializado en automatización e integración de ecosistemas de Inteligencia Artificial para el mercado corporativo latinoamericano.</p>
          </div>
          <div>
            <h4>Misión</h4>
            <p>Optimizar y automatizar los procesos de negocio de manera eficiente, accesible y escalable, permitiendo a las empresas crecer mediante tecnologías avanzadas.</p>
          </div>
          <div>
            <h4>Visión</h4>
            <p>Ser la empresa líder en Latinoamérica en la implementación de IA para negocios, facilitando la transición digital sin requerir conocimientos técnicos especializados.</p>
          </div>
          <div>
            <h4>Nuestros Valores</h4>
            <p>Eficiencia y Responsabilidad<br/>Innovación Tecnológica<br/>Orientación Total al Cliente<br/>Seguridad y Confianza</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 AIOPSORA. Todos los derechos reservados. Infraestructura B2B protegida y distribuida.</p>
        </div>
      </footer>
    </div>
  )

  const renderRegister = () => (
    <div style={{minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '450px', border: 'none', background: 'transparent', padding: '0' }}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2rem'}}>
          <h2>Registro</h2>
          <span className="link" onClick={() => setCurrentView('home')}>Volver</span>
        </div>
        
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Razón Social</label>
            <input required type="text" placeholder="Ej: Empresa Consultora S.A." value={company} onChange={e => setCompany(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Correo Electrónico Corporativo</label>
            <input required type="email" placeholder="admin@empresa.com" />
          </div>
          <div className="input-group">
            <label>Clave de Acceso</label>
            <input required type="password" placeholder="••••••••" />
          </div>
          <button type="submit" className="btn" style={{marginTop: '2rem', border: 'none'}}>Provisionar Instancia</button>
        </form>
        
        <p style={{textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem'}}>
          ¿Instancia ya provisionada? <span className="link" onClick={() => setCurrentView('login')}>Autenticarse</span>
        </p>
      </div>
    </div>
  )

  const renderLogin = () => (
    <div style={{minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', border: 'none', background: 'transparent', padding: '0' }}>
        <h2>Autenticación</h2>
        <p style={{marginBottom: '2rem'}}>Acceso seguro al panel de control.</p>
      
      <form onSubmit={handleLogin} style={{textAlign: 'left'}}>
        <div className="input-group">
          <label>Email Administrador</label>
          <input required type="email" placeholder="admin@empresa.com" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Clave de Acceso</label>
          <input required type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {loginError && <p style={{color: 'var(--text-primary)', marginTop: '1rem', fontSize: '0.85rem'}}>{loginError}</p>}
        <button type="submit" className="btn" style={{marginTop: '2rem', border: 'none'}}>Ingresar</button>
      </form>
      <div style={{marginTop: '2rem', textAlign: 'center'}}>
        <p style={{fontSize: '0.85rem', marginBottom: '1rem'}}>
          ¿Aún no eres cliente? <span className="link" onClick={() => setCurrentView('register')}>Crear cuenta</span>
        </p>
        <span className="link" onClick={() => setCurrentView('home')}>Cancelar y Volver</span>
      </div>
      </div>
    </div>
  )

  const renderDashboard = () => (
    <div style={{paddingTop: '2rem'}}>
      <div className="nav-bar" style={{borderBottom: '1px solid var(--card-border)', paddingBottom: '2rem', marginBottom: '3rem'}}>
        <div>
          <h2 style={{margin: 0, fontSize: '2rem', fontWeight: 300, letterSpacing: '0.05em'}}>Panel de Orquestación</h2>
          <p style={{margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Gestión de despliegues cognitivos activos</p>
        </div>
        <div style={{display: 'flex', gap: '2rem', alignItems: 'center'}}>
          <button className="btn" style={{width: 'auto', padding: '0.75rem 2rem', border: 'none'}} onClick={() => setCurrentView('create')}>
            + Nuevo Despliegue
          </button>
          <span className="link" onClick={logout} style={{fontSize: '0.8rem'}}>Finalizar Sesión</span>
        </div>
      </div>

      {loadingBots ? (
        <div style={{textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)'}}>Sincronizando estado con el servidor...</div>
      ) : bots.length === 0 ? (
        <div style={{textAlign: 'center', padding: '6rem 2rem', border: 'none', background: 'transparent'}}>
          <p style={{marginBottom: '2rem', color: 'var(--text-secondary)'}}>Entorno vacío. No existen despliegues activos en este clúster.</p>
          <button className="btn" style={{width: 'auto', border: 'none'}} onClick={() => setCurrentView('create')}>
            Aprovisionar Primera Instancia
          </button>
        </div>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {bots.map((bot, idx) => (
            <div key={idx} style={{
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '1.5rem 0',
              background: 'transparent',
              border: 'none',
              borderBottom: idx !== bots.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
              transition: 'all 0.2s ease'
            }} className="cluster-row">
              
              <div style={{display: 'flex', alignItems: 'center', gap: '3rem'}}>
                <div>
                  <span style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)'}}>ID de Clúster</span>
                  <h3 style={{margin: '0.2rem 0 0 0', fontSize: '1.2rem', fontWeight: 400}}>#{bot.deployment_id}</h3>
                </div>
                
                <div style={{display: 'flex', gap: '2rem', paddingLeft: '2rem'}}>
                  <div>
                    <span style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)'}}>Agente Admin</span>
                    <p style={{margin: '0.2rem 0 0 0', fontSize: '0.9rem'}}>
                      <a href={`https://t.me/${bot.admin_bot}`} target="_blank" rel="noopener noreferrer" style={{color: 'var(--text-primary)', textDecoration: 'none'}}>@{bot.admin_bot || 'admin_bot'}</a>
                    </p>
                  </div>
                  <div>
                    <span style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)'}}>Agente RAG</span>
                    <p style={{margin: '0.2rem 0 0 0', fontSize: '0.9rem'}}>
                      <a href={`https://t.me/${bot.user_bot}`} target="_blank" rel="noopener noreferrer" style={{color: 'var(--text-primary)', textDecoration: 'none'}}>@{bot.user_bot || 'user_bot'}</a>
                    </p>
                  </div>
                </div>
              </div>

              <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center'}}>
                <span style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#4ade80',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block'}}></span>
                  Operativo
                </span>
                
                <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center'}}>
                  <span 
                    className="link" 
                    style={{fontSize: '0.8rem'}}
                    onClick={() => {
                      setEditingBotId(bot.deployment_id)
                      setEditConfig({ name: '', role: '', tone: 'Formal y profesional', strictness: 'strict' })
                    }}
                  >
                    AJUSTAR IA
                  </span>
                  <span 
                    className="link" 
                    style={{fontSize: '0.8rem', color: '#ff4444'}}
                    onClick={() => handleDeleteBot(bot.deployment_id)}
                  >
                    DESVINCULAR
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL CONFIGURACION */}
      {editingBotId !== null && (
        <div className="modal-overlay">
          <div className="modal-content" style={{background: '#050505', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3rem'}}>
            <h2 style={{marginBottom: '0.5rem', fontWeight: 300}}>Ajustes Cognitivos</h2>
            <p style={{fontSize: '0.85rem', marginBottom: '2.5rem'}}>Clúster destino: #{editingBotId}. Sincronización remota requerida.</p>
            
            <form onSubmit={handleUpdatePrompt}>
              <div className="input-group">
                <label>Identidad del Agente</label>
                <input required type="text" placeholder="Ej: Consultor Fiscal" 
                  value={editConfig.name} onChange={e => setEditConfig({...editConfig, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Función Empresarial</label>
                <input required type="text" placeholder="Ej: Resolver dudas sobre nómina" 
                  value={editConfig.role} onChange={e => setEditConfig({...editConfig, role: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Directiva de Tono</label>
                <select value={editConfig.tone} onChange={e => setEditConfig({...editConfig, tone: e.target.value})}>
                  <option value="Formal y profesional">Formal y Profesional</option>
                  <option value="Técnico y riguroso">Técnico y Riguroso</option>
                  <option value="Cortés e informativo">Cortés e Informativo</option>
                </select>
              </div>
              
              <div className="input-group">
                <label>Umbral de Alucinación (RAG)</label>
                <select value={editConfig.strictness} onChange={e => setEditConfig({...editConfig, strictness: e.target.value})}>
                  <option value="strict">Estricto (Cero Alucinaciones)</option>
                  <option value="flexible">Flexible (Inferencia y Sugerencias)</option>
                  <option value="creative">Creativo (Respuesta Abierta)</option>
                </select>
              </div>
              
              <div style={{display: 'flex', gap: '1rem', marginTop: '3rem'}}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingBotId(null)}>Cancelar</button>
                <button type="submit" className="btn" disabled={isUpdating}>
                  {isUpdating ? 'Aplicando...' : 'Aplicar Directivas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  const renderCreateBot = () => (
    <div style={{paddingTop: '2rem'}}>
      <div className="nav-bar" style={{borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2rem', marginBottom: '3rem'}}>
        <div>
          <h2 style={{margin: 0, fontSize: '2rem', fontWeight: 300, letterSpacing: '0.05em'}}>Aprovisionar Nodo</h2>
          <p style={{margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Configuración de entorno y agentes RAG</p>
        </div>
        <span className="link" onClick={() => setCurrentView('dashboard')}>Cancelar y Volver</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: '4rem' }}>
        {/* Formulario de Configuración */}
        <div style={{padding: '0'}}>
          <h4 style={{marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', fontWeight: 500}}>Credenciales de Conexión</h4>
          <form onSubmit={handleNextStep}>
            <div className="input-group">
              <label>API Token (Nodo Admin)</label>
              <input required type="text" placeholder="Formato: 123456:ABC-DEF" 
                value={formData.admin_token} onChange={e => setFormData({...formData, admin_token: e.target.value})} />
            </div>
            
            <div className="input-group">
              <label>API Token (Nodo RAG)</label>
              <input required type="text" placeholder="Formato: 987654:XYZ-UVW" 
                value={formData.user_token} onChange={e => setFormData({...formData, user_token: e.target.value})} />
            </div>

            <div className="input-group">
              <label>Clave OpenAI (Motor LLM)</label>
              <input required type="password" placeholder="sk-..." 
                value={formData.openai_api_key} onChange={e => setFormData({...formData, openai_api_key: e.target.value})} />
            </div>
            
            <div style={{marginTop: '3rem'}}>
              <button type="submit" className="btn" style={{border: 'none', padding: '1rem 3rem', width: 'auto'}}>
                Configurar Directivas IA →
              </button>
            </div>
          </form>
        </div>

        {/* Panel de Pago Simulado */}
        <div style={{alignSelf: 'start'}}>
          <h4 style={{marginBottom: '0.5rem', fontWeight: 500}}>Estimación de Costos</h4>
          <p style={{fontSize: '0.85rem', marginBottom: '2rem', color: 'var(--text-secondary)'}}>Suscripción Corporativa - Licencia Unificada</p>
          
          <div style={{background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '4px', marginBottom: '2rem'}}>
            <h4 style={{margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem'}}>AIOPSORA B2B</h4>
            <p style={{margin: '1.5rem 0', letterSpacing: '4px', fontSize: '1.1rem', color: 'var(--text-primary)'}}>**** **** **** 4242</p>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
              <span style={{textTransform: 'uppercase'}}>Autorizado</span>
              <span>12/28</span>
            </div>
          </div>
          
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem'}}>
              <span>Instancia de Clúster</span>
              <span style={{color: 'var(--text-primary)'}}>$299.00 USD</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem'}}>
              <span>Soporte SLA y Conector Seguro</span>
              <span style={{color: 'var(--text-primary)'}}>Incluido</span>
            </div>
            <div style={{height: '1px', background: 'rgba(255,255,255,0.05)', margin: '1.5rem 0'}}></div>
            <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: '400', fontSize: '1.1rem', color: 'var(--text-primary)'}}>
              <span>Total a facturar mensual</span>
              <span>$299.00 USD</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE DIRECTIVAS */}
      {showDirectivesModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{background: '#050505', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3rem'}}>
            <h2 style={{marginBottom: '0.5rem', fontWeight: 300, fontSize: '1.8rem'}}>Directivas Conductuales</h2>
            <p style={{fontSize: '0.85rem', marginBottom: '2.5rem', color: 'var(--text-secondary)'}}>Define la identidad y misión del motor cognitivo.</p>
            
            <form onSubmit={handleCreateBot}>
              <div className="input-group">
                <label>Identidad del Agente</label>
                <input required type="text" placeholder="Ej: Consultor Tributario" 
                  value={botConfig.name} onChange={e => setBotConfig({...botConfig, name: e.target.value})} />
              </div>

              <div className="input-group">
                <label>Misión Principal</label>
                <input required type="text" placeholder="Ej: Analizar documentación fiscal" 
                  value={botConfig.role} onChange={e => setBotConfig({...botConfig, role: e.target.value})} />
              </div>

              <div className="input-group">
                <label>Estilo de Comunicación</label>
                <select value={botConfig.tone} onChange={e => setBotConfig({...botConfig, tone: e.target.value})}>
                  <option value="Formal y profesional">Formal y Profesional</option>
                  <option value="Técnico y riguroso">Técnico y Riguroso</option>
                  <option value="Cortés e informativo">Cortés e Informativo</option>
                </select>
              </div>
              
              <div className="input-group">
                <label>Umbral de Alucinación (RAG)</label>
                <select value={botConfig.strictness} onChange={e => setBotConfig({...botConfig, strictness: e.target.value})}>
                  <option value="strict">Estricto (Cero Alucinaciones)</option>
                  <option value="flexible">Flexible (Inferencia y Sugerencias)</option>
                  <option value="creative">Creativo (Respuesta Abierta)</option>
                </select>
              </div>
              
              <div style={{display: 'flex', gap: '1.5rem', marginTop: '3rem', alignItems: 'center'}}>
                <span className="link" onClick={() => setShowDirectivesModal(false)} style={{fontSize: '0.85rem'}}>Cancelar y Volver</span>
                <button type="submit" className="btn" disabled={isDeploying || deploySuccess} style={{border: 'none', padding: '0.75rem 2rem'}}>
                  {isDeploying ? 'Desplegando...' : deploySuccess ? 'Aprovisionada ✓' : 'Confirmar y Desplegar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {currentView === 'home' && renderHome()}
      {currentView === 'register' && renderRegister()}
      {!isAuthenticated && currentView === 'login' && renderLogin()}
      {isAuthenticated && currentView === 'dashboard' && renderDashboard()}
      {isAuthenticated && currentView === 'create' && renderCreateBot()}
    </>
  )
}

export default App
