import { useState, useEffect } from 'react'

export default function AuthForm({ onLogin, onRegister, error, loading }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setLocalError('')
  }, [mode])

  const handleSubmit = (e) => {
    e.preventDefault()
    setLocalError('')
    if (!username.trim() || !password) {
      setLocalError('Заполните имя пользователя и пароль')
      return
    }
    if (mode === 'register' && password.length < 6) {
      setLocalError('Пароль должен быть не менее 6 символов')
      return
    }
    if (mode === 'register') {
      onRegister(username.trim(), password, email.trim())
    } else {
      onLogin(username.trim(), password)
    }
  }

  const displayError = localError || error

  return (
    <div className="auth-overlay" onClick={(e) => { if (e.target === e.currentTarget) { /* don't close */ } }}>
      <div className="auth-modal">
        <h2 className="auth-title">
          {mode === 'login' ? '🔑 Вход' : '📝 Регистрация'}
        </h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Имя пользователя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="auth-input"
            autoComplete="username"
            autoFocus
            disabled={loading}
          />
          {mode === 'register' && (
            <input
              type="email"
              placeholder="Email (необязательно)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              autoComplete="email"
              disabled={loading}
            />
          )}
          <input
            type="password"
            placeholder="Пароль (мин. 6 символов)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={loading}
          />
          {displayError && <div className="auth-error">{displayError}</div>}
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? '⏳ Подождите...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
        <button
          className="auth-switch"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setLocalError('')
          }}
          disabled={loading}
        >
          {mode === 'login'
            ? 'Нет аккаунта? Зарегистрироваться'
            : 'Уже есть аккаунт? Войти'}
        </button>
      </div>
    </div>
  )
}
