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
  const [editConfig, setEditConfig] = useState({ name: '', role: '', tone: 'Formal y profesional' })
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
    tone: 'Formal y profesional'
  })
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploySuccess, setDeploySuccess] = useState(false)

  // -- HANDLERS --

  const handleLogin = (e) => {
    e.preventDefault()
    if (username === 'admin' && password === 'admin') {
      setIsAuthenticated(true)
      setCurrentView('dashboard')
      setLoginError('')
    } else {
      setLoginError('Credenciales incorrectas (usa admin/admin)')
    }
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

  const handleUpdatePrompt = async (e) => {
    e.preventDefault()
    setIsUpdating(true)
    
    const generatedPrompt = `Eres un asistente llamado ${editConfig.name || 'Asistente IA'}. Tu rol principal en la empresa es: ${editConfig.role || 'Ayudar con tareas operativas'}. Debes comunicarte SIEMPRE con el siguiente tono: ${editConfig.tone}.`
    
    try {
      const res = await fetch(`${API_URL}/deploy/${editingBotId}/prompt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extra_prompt: generatedPrompt })
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
    
    const generatedPrompt = `Eres un asistente llamado ${botConfig.name || 'Asistente IA'}. Tu rol principal en la empresa es: ${botConfig.role || 'Ayudar con tareas operativas'}. Debes comunicarte SIEMPRE con el siguiente tono: ${botConfig.tone}.`
    
    const payload = {
      ...formData,
      extra_prompt: generatedPrompt
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
          setCurrentView('dashboard')
          setFormData({ admin_token: '', user_token: '', openai_api_key: '' })
          setBotConfig({ name: '', role: '', tone: 'Formal y profesional' })
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
        <button className="btn btn-outline" style={{width: 'auto', padding: '0.5rem 1.5rem'}} onClick={() => setCurrentView('login')}>Iniciar Sesión</button>
      </div>

      <div className="landing-hero">
        <h1>AIOPSORA</h1>
        <p className="hero-subtitle">
          Inteligencia Artificial para la Transformación Digital
        </p>
        <p className="hero-description">
          Soluciones cognitivas diseñadas para optimizar y automatizar la estructura operativa de su organización, garantizando un despliegue seguro, privado y altamente escalable.
        </p>

        <button className="btn" style={{width: 'auto', padding: '1rem 3rem'}} onClick={() => setCurrentView('login')}>
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
      <div className="glass-card" style={{ width: '100%', maxWidth: '450px' }}>
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
          <button type="submit" className="btn" style={{marginTop: '2rem'}}>Provisionar Instancia</button>
        </form>
        
        <p style={{textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem'}}>
          ¿Instancia ya provisionada? <span className="link" onClick={() => setCurrentView('login')}>Autenticarse</span>
        </p>
      </div>
    </div>
  )

  const renderLogin = () => (
    <div style={{minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2>Autenticación</h2>
        <p style={{marginBottom: '2rem'}}>Acceso seguro al panel de control.</p>
      
      <form onSubmit={handleLogin} style={{textAlign: 'left'}}>
        <div className="input-group">
          <label>Identificador de Usuario</label>
          <input 
            type="text" 
            placeholder="admin" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
          />
        </div>
        <div className="input-group">
          <label>Credencial de Acceso</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
        </div>
        {loginError && <p style={{color: 'var(--text-primary)', marginTop: '1rem', fontSize: '0.85rem'}}>{loginError}</p>}
        <button type="submit" className="btn" style={{marginTop: '2rem'}}>Ingresar</button>
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
    <div>
      <div className="nav-bar">
        <h2>Panel de Orquestación</h2>
        <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center'}}>
          <button className="btn" style={{width: 'auto'}} onClick={() => setCurrentView('create')}>
            Nuevo Despliegue
          </button>
          <span className="link" onClick={logout}>Finalizar Sesión</span>
        </div>
      </div>

      {loadingBots ? (
        <p>Sincronizando estado...</p>
      ) : bots.length === 0 ? (
        <div className="glass-card">
          <p>Instancia vacía. No existen despliegues activos en este entorno.</p>
        </div>
      ) : (
        <div className="grid">
          {bots.map((bot, idx) => (
            <div className="glass-card glass-card-interactive" key={idx}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <h3 style={{margin: 0}}>Clúster #{bot.deployment_id}</h3>
                <span style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>Operativo</span>
              </div>
              
              <div className="bot-card-flex" style={{display: 'flex', gap: '1rem', marginBottom: '2rem'}}>
                <div style={{flex: 1}}>
                  <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px'}}>Agente Admin</p>
                  <p style={{fontWeight: '400', margin: 0, fontSize: '0.95rem'}}>
                    <a href={`https://t.me/${bot.admin_bot}`} target="_blank" rel="noopener noreferrer" style={{color: 'var(--text-primary)', textDecoration: 'none'}}>
                      @{bot.admin_bot || 'admin_bot'}
                    </a>
                  </p>
                </div>
                <div style={{flex: 1}}>
                  <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px'}}>Agente RAG</p>
                  <p style={{fontWeight: '400', margin: 0, fontSize: '0.95rem'}}>
                    <a href={`https://t.me/${bot.user_bot}`} target="_blank" rel="noopener noreferrer" style={{color: 'var(--text-primary)', textDecoration: 'none'}}>
                      @{bot.user_bot || 'user_bot'}
                    </a>
                  </p>
                </div>
              </div>
              
              <div className="bot-card-flex" style={{display: 'flex', gap: '1rem'}}>
                <button 
                  className="btn" 
                  style={{flex: 2}}
                  onClick={() => {
                    setEditingBotId(bot.deployment_id)
                    setEditConfig({ name: '', role: '', tone: 'Formal y profesional' })
                  }}
                >
                  Configurar IA
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{flex: 1}}
                  onClick={() => handleDeleteBot(bot.deployment_id)}
                >
                  Desvincular
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CONFIGURACION */}
      {editingBotId !== null && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{marginBottom: '0.5rem'}}>Ajustes Cognitivos</h2>
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
    <div>
      <div className="nav-bar">
        <h2>Nuevo Despliegue</h2>
        <span className="link" onClick={() => setCurrentView('dashboard')}>Cancelar</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        {/* Formulario de Configuración */}
        <div className="glass-card">
          <h4 style={{marginBottom: '2rem'}}>Aprovisionamiento de Nodos</h4>
          <form onSubmit={handleCreateBot}>
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

            <div style={{height: '1px', background: 'var(--card-border)', margin: '3rem 0'}}></div>
            
            <h4 style={{marginBottom: '2rem'}}>Base Conductual</h4>

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
            
            <button type="submit" className="btn" disabled={isDeploying || deploySuccess} style={{marginTop: '3rem'}}>
              {isDeploying ? 'Sincronizando Infraestructura...' : deploySuccess ? 'Despliegue Confirmado' : 'Ejecutar Despliegue'}
            </button>
          </form>
        </div>

        {/* Panel de Pago Simulado */}
        <div className="glass-card" style={{alignSelf: 'start', padding: '2rem'}}>
          <h4 style={{marginBottom: '0.5rem'}}>Estimación de Costos</h4>
          <p style={{fontSize: '0.9rem', marginBottom: '2rem', color: 'var(--text-secondary)'}}>Suscripción Corporativa - Licencia Unificada</p>
          
          <div style={{background: '#050505', border: '1px solid var(--card-border)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem'}}>
            <h4 style={{margin: 0, color: 'var(--text-primary)'}}>AIOPSORA B2B</h4>
            <p style={{margin: '1.5rem 0', letterSpacing: '4px', fontSize: '1.1rem', color: 'var(--text-primary)'}}>**** **** **** 4242</p>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem'}}>
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
            <div style={{height: '1px', background: 'var(--card-border)', margin: '1.5rem 0'}}></div>
            <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: '400', fontSize: '1.1rem', color: 'var(--text-primary)'}}>
              <span>Total a facturar mensual</span>
              <span>$299.00 USD</span>
            </div>
          </div>
        </div>
      </div>
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
