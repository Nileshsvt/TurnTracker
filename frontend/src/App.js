import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ==================== THEMES ====================
const THEMES = {
  light: {
    name: 'Light',
    icon: '☀️',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    cardBg: '#ffffff',
    cardText: '#333333',
    headerBg: 'rgba(255, 255, 255, 0.1)',
    headerText: '#ffffff'
  },
  dark: {
    name: 'Dark',
    icon: '🌙',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    cardBg: '#1e1e2e',
    cardText: '#e0e0e0',
    headerBg: 'rgba(0, 0, 0, 0.3)',
    headerText: '#ffffff'
  },
  ocean: {
    name: 'Ocean',
    icon: '🌊',
    background: 'linear-gradient(135deg, #0077b6 0%, #00b4d8 100%)',
    cardBg: '#caf0f8',
    cardText: '#03045e',
    headerBg: 'rgba(255, 255, 255, 0.15)',
    headerText: '#ffffff'
  },
  forest: {
    name: 'Forest',
    icon: '🌲',
    background: 'linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)',
    cardBg: '#d8f3dc',
    cardText: '#1b4332',
    headerBg: 'rgba(255, 255, 255, 0.15)',
    headerText: '#ffffff'
  },
  sunset: {
    name: 'Sunset',
    icon: '🌅',
    background: 'linear-gradient(135deg, #f72585 0%, #ff8c00 100%)',
    cardBg: '#fff0f3',
    cardText: '#590d22',
    headerBg: 'rgba(255, 255, 255, 0.15)',
    headerText: '#ffffff'
  },
  midnight: {
    name: 'Midnight',
    icon: '🌌',
    background: 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 100%)',
    cardBg: '#415a77',
    cardText: '#e0e1dd',
    headerBg: 'rgba(0, 0, 0, 0.3)',
    headerText: '#ffffff'
  }
};

// ==================== THEME SELECTOR ====================
function ThemeSelector({ currentTheme, onThemeChange }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="theme-selector">
      <button className="theme-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        {THEMES[currentTheme].icon} Theme
      </button>
      {isOpen && (
        <div className="theme-dropdown">
          {Object.entries(THEMES).map(([key, theme]) => (
            <button
              key={key}
              className={`theme-option ${currentTheme === key ? 'active' : ''}`}
              onClick={() => { onThemeChange(key); setIsOpen(false); }}
            >
              {theme.icon} {theme.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== LOGIN PAGE ====================
function LoginPage({ onLogin, onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username: username.trim(),
        password: password.trim()
      });
      localStorage.setItem('turntracker_user', JSON.stringify(response.data));
      onLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>🔄 TurnTracker</h1>
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-switch">
          Don't have an account?{' '}
          <button onClick={onSwitchToRegister} className="link-btn">
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}

// ==================== REGISTER PAGE ====================
function RegisterPage({ onRegister, onSwitchToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username: username.trim(),
        password: password.trim()
      });
      localStorage.setItem('turntracker_user', JSON.stringify(response.data));
      onRegister(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>🔄 TurnTracker</h1>
        <h2>Register</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
          />
          <input
            type="password"
            placeholder="Password (min 4 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="link-btn">
            Login here
          </button>
        </p>
      </div>
    </div>
  );
}

// ==================== ADD USER MODAL ====================
function InviteUserModal({ option, user, onClose, onAdd }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_URL}/users`);
        // Filter out users already in the option and current user
        const existingUserIds = option.persons.map(p => p.userId);
        const availableUsers = response.data.filter(
          u => u.userId !== user.userId && !existingUserIds.includes(u.userId)
        );
        setUsers(availableUsers);
      } catch (err) {
        console.error('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [option, user]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Add User to {option.name}</h3>
        {loading ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <p>No users available to add</p>
        ) : (
          <div className="user-list">
            {users.map((u) => (
              <div key={u.userId} className="user-invite-item">
                <span>{u.username}</span>
                <button onClick={() => { onAdd(option.id, u.userId); onClose(); }}>
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
        <button className="close-modal-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ==================== PENDING ACTION COMPONENT ====================
function PendingAction({ option, actionType, user, onApprove, onCancel }) {
  const action = option.pendingActions?.[actionType];
  if (!action) return null;

  const approvalCount = Object.values(action.approvals).filter(v => v === true).length;
  const totalCount = Object.keys(action.approvals).length;
  const userApproval = action.approvals[user.userId];
  const isRequester = action.requestedBy === user.userId;
  const userInOption = option.persons.some(p => p.userId === user.userId);

  let title = '';
  let icon = '⏳';
  if (actionType === 'completeTurn') {
    title = `${action.requestedByName} wants to complete turn & move to next`;
    icon = '✓';
  }
  if (actionType === 'joinPerson') {
    title = `${action.requestedByName} wants to join this option`;
    icon = '➕';
  }
  if (actionType === 'leavePerson') {
    title = `${action.requestedByName} wants to leave this option`;
    icon = '🚪';
  }
  if (actionType === 'deletePerson') {
    title = `${action.requestedByName} wants to remove ${action.targetName}`;
    icon = '🗑️';
  }
  if (actionType === 'deleteOption') {
    title = `${action.requestedByName} wants to delete this option`;
    icon = '🗑️';
  }

  return (
    <div className="pending-action">
      <div className="pending-action-title">{icon} {title}</div>
      <div className="pending-action-progress">
        Approvals: {approvalCount} / {totalCount}
      </div>
      {userInOption && (userApproval === undefined || userApproval === null) && (
        <div className="pending-action-buttons">
          <button className="approve-btn" onClick={() => onApprove(option.id, actionType, true)}>
            ✓ Approve
          </button>
          <button className="reject-btn" onClick={() => onApprove(option.id, actionType, false)}>
            ✗ Reject
          </button>
        </div>
      )}
      {userApproval === true && <div className="vote-status approved">You approved ✓</div>}
      {userApproval === 'rejected' && <div className="vote-status rejected">You rejected ✗</div>}
      {isRequester && (
        <button className="cancel-btn" onClick={() => onCancel(option.id, actionType)}>
          Cancel Request
        </button>
      )}
    </div>
  );
}

// ==================== MAIN APP COMPONENT ====================
function App() {
  const [user, setUser] = useState(null);
  const [authPage, setAuthPage] = useState('login'); // 'login' or 'register'
  const [options, setOptions] = useState([]);
  const [newOptionName, setNewOptionName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteModal, setInviteModal] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('turntracker_theme') || 'light');
  const [editingOption, setEditingOption] = useState(null);
  const [editOptionName, setEditOptionName] = useState('');

  // Apply theme to body
  useEffect(() => {
    const currentTheme = THEMES[theme];
    document.body.style.background = currentTheme.background;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('turntracker_theme', theme);
  }, [theme]);

  // PWA Install prompt handler
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Check for existing login
  useEffect(() => {
    const savedUser = localStorage.getItem('turntracker_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Fetch options
  const fetchOptions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/options`);
      setOptions(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch options');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchOptions();
      const interval = setInterval(fetchOptions, 5000);
      return () => clearInterval(interval);
    }
  }, [user, fetchOptions]);

  const handleLogout = () => {
    localStorage.removeItem('turntracker_user');
    setUser(null);
    setOptions([]);
  };

  // Add new option
  const handleAddOption = async (e) => {
    e.preventDefault();
    if (!newOptionName.trim()) return;

    try {
      const response = await axios.post(`${API_URL}/options`, {
        name: newOptionName.trim(),
        userId: user.userId
      });
      setOptions([...options, response.data]);
      setNewOptionName('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add option');
    }
  };

  // Edit option name
  const handleEditOption = async (optionId) => {
    if (!editOptionName.trim()) return;
    
    try {
      const response = await axios.put(`${API_URL}/options/${optionId}`, {
        name: editOptionName.trim(),
        userId: user.userId
      });
      setOptions(options.map(opt => opt.id === optionId ? response.data : opt));
      setEditingOption(null);
      setEditOptionName('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to edit option');
    }
  };

  const startEditingOption = (option) => {
    setEditingOption(option.id);
    setEditOptionName(option.name);
  };

  // Delete option (only if empty)
  const handleDeleteOption = async (optionId) => {
    const option = options.find(o => o.id === optionId);
    if (option.persons.length > 0) {
      setError('Use "Request Delete" for options with persons');
      return;
    }

    try {
      await axios.delete(`${API_URL}/options/${optionId}`);
      setOptions(options.filter(opt => opt.id !== optionId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  };

  // Join an option directly
  const handleJoinOption = async (optionId) => {
    try {
      const response = await axios.post(`${API_URL}/options/${optionId}/join`, {
        userId: user.userId
      });
      setOptions(options.map(opt => opt.id === optionId ? response.data : opt));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join');
    }
  };

  // Request to leave an option
  const handleRequestLeave = async (optionId) => {
    try {
      const response = await axios.post(`${API_URL}/options/${optionId}/request-leave`, {
        userId: user.userId
      });
      setOptions(options.map(opt => opt.id === optionId ? response.data : opt));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request leave');
    }
  };

  // Request to complete turn
  const handleRequestComplete = async (optionId) => {
    try {
      const response = await axios.post(`${API_URL}/options/${optionId}/request-complete`, {
        userId: user.userId
      });
      setOptions(options.map(opt => opt.id === optionId ? response.data : opt));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request complete');
    }
  };

  // Add user to option directly
  const handleAddPerson = async (optionId, targetUserId) => {
    try {
      const response = await axios.post(`${API_URL}/options/${optionId}/add-person`, {
        userId: user.userId,
        targetUserId
      });
      setOptions(options.map(opt => opt.id === optionId ? response.data : opt));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add person');
    }
  };

  // Request to delete person
  const handleRequestDeletePerson = async (optionId, targetUserId) => {
    try {
      const response = await axios.post(`${API_URL}/options/${optionId}/request-delete-person/${targetUserId}`, {
        userId: user.userId
      });
      setOptions(options.map(opt => opt.id === optionId ? response.data : opt));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request delete');
    }
  };

  // Request to delete option
  const handleRequestDeleteOption = async (optionId) => {
    try {
      const response = await axios.post(`${API_URL}/options/${optionId}/request-delete`, {
        userId: user.userId
      });
      setOptions(options.map(opt => opt.id === optionId ? response.data : opt));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request delete');
    }
  };

  // Approve or reject action
  const handleApprove = async (optionId, actionType, approve) => {
    try {
      const response = await axios.post(`${API_URL}/options/${optionId}/approve`, {
        userId: user.userId,
        actionType,
        approve
      });
      if (response.data.deleted) {
        setOptions(options.filter(opt => opt.id !== optionId));
      } else {
        setOptions(options.map(opt => opt.id === optionId ? response.data : opt));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process approval');
    }
  };

  // Cancel action
  const handleCancelAction = async (optionId, actionType) => {
    try {
      const response = await axios.post(`${API_URL}/options/${optionId}/cancel-action`, {
        userId: user.userId,
        actionType
      });
      setOptions(options.map(opt => opt.id === optionId ? response.data : opt));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel');
    }
  };

  // Get icon for option name
  const getOptionIcon = (name) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('tea') || nameLower.includes('chai')) return '🍵';
    if (nameLower.includes('coffee')) return '☕';
    if (nameLower.includes('paneer')) return '🧀';
    if (nameLower.includes('water')) return '💧';
    if (nameLower.includes('food') || nameLower.includes('lunch') || nameLower.includes('dinner')) return '🍽️';
    if (nameLower.includes('snack')) return '🍿';
    if (nameLower.includes('clean')) return '🧹';
    return '📋';
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Show auth pages if not logged in
  if (!user) {
    if (authPage === 'login') {
      return (
        <LoginPage 
          onLogin={setUser} 
          onSwitchToRegister={() => setAuthPage('register')} 
        />
      );
    } else {
      return (
        <RegisterPage 
          onRegister={setUser} 
          onSwitchToLogin={() => setAuthPage('login')} 
        />
      );
    }
  }

  return (
    <div className={`app theme-${theme}`}>
      <header className="app-header">
        <h1>🔄 TurnTracker</h1>
        <p>Smart Turn Management System</p>
        <div className="user-info">
          <ThemeSelector currentTheme={theme} onThemeChange={setTheme} />
          {installPrompt && !isInstalled && (
            <button onClick={handleInstallClick} className="install-btn">
              📲 Install
            </button>
          )}
          <span>👤 {user.username}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      {error && (
        <div className="error">
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '10px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <section className="add-option-section">
        <h2>➕ Add New Option</h2>
        <form className="add-option-form" onSubmit={handleAddOption}>
          <input
            type="text"
            placeholder="Enter option name (e.g., Tea, Paneer, Coffee...)"
            value={newOptionName}
            onChange={(e) => setNewOptionName(e.target.value)}
          />
          <button type="submit">Add Option</button>
        </form>
      </section>

      {options.length === 0 ? (
        <div className="no-options">
          <h3>No options yet!</h3>
          <p>Add your first option above to get started.</p>
        </div>
      ) : (
        <div className="options-grid">
          {options.map(option => {
            const userInOption = option.persons?.some(p => p.userId === user.userId);
            const isCurrentPerson = option.persons?.length > 0 && 
              option.persons[option.currentIndex]?.userId === user.userId;
            const isEditing = editingOption === option.id;

            return (
              <div key={option.id} className="option-card">
                <div className="option-header">
                  {isEditing ? (
                    <div className="edit-option-form">
                      <input
                        type="text"
                        value={editOptionName}
                        onChange={(e) => setEditOptionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditOption(option.id);
                          if (e.key === 'Escape') { setEditingOption(null); setEditOptionName(''); }
                        }}
                        autoFocus
                      />
                      <button className="save-edit-btn" onClick={() => handleEditOption(option.id)}>✓</button>
                      <button className="cancel-edit-btn" onClick={() => { setEditingOption(null); setEditOptionName(''); }}>✕</button>
                    </div>
                  ) : (
                    <h3 onClick={() => (userInOption || option.createdBy === user.userId) && startEditingOption(option)} 
                        className={userInOption || option.createdBy === user.userId ? 'editable' : ''}>
                      <span>{getOptionIcon(option.name)}</span>
                      {option.name}
                      {(userInOption || option.createdBy === user.userId) && <span className="edit-hint">✏️</span>}
                    </h3>
                  )}
                  {!isEditing && (
                    option.persons?.length === 0 ? (
                      <button 
                        className="delete-option-btn"
                        onClick={() => handleDeleteOption(option.id)}
                      >
                        🗑️ Delete
                      </button>
                    ) : userInOption && !option.pendingActions?.deleteOption && (
                      <button 
                        className="delete-option-btn"
                        onClick={() => handleRequestDeleteOption(option.id)}
                      >
                        🗑️ Request Delete
                      </button>
                    )
                  )}
                </div>

                {/* Pending Actions */}
                <PendingAction 
                  option={option} 
                  actionType="completeTurn" 
                  user={user}
                  onApprove={handleApprove}
                  onCancel={handleCancelAction}
                />
                <PendingAction 
                  option={option} 
                  actionType="leavePerson" 
                  user={user}
                  onApprove={handleApprove}
                  onCancel={handleCancelAction}
                />
                <PendingAction 
                  option={option} 
                  actionType="deletePerson" 
                  user={user}
                  onApprove={handleApprove}
                  onCancel={handleCancelAction}
                />
                <PendingAction 
                  option={option} 
                  actionType="deleteOption" 
                  user={user}
                  onApprove={handleApprove}
                  onCancel={handleCancelAction}
                />

                {/* Current Person Display */}
                <div className="current-person-section">
                  <h4>CURRENT TURN</h4>
                  {option.persons?.length > 0 ? (
                    <>
                      <div className="current-person-name">
                        {option.persons[option.currentIndex]?.name}
                        {isCurrentPerson && <span className="you-badge">(You)</span>}
                      </div>
                      {isCurrentPerson && !option.pendingActions?.completeTurn && (
                        <div className="current-person-actions">
                          <button 
                            className="complete-btn"
                            onClick={() => handleRequestComplete(option.id)}
                          >
                            ✓ Request Complete & Next
                          </button>
                        </div>
                      )}
                      <div className="queue-info">
                        Position: {option.currentIndex + 1} of {option.persons.length}
                      </div>
                    </>
                  ) : (
                    <div className="current-person-name no-person">
                      No persons joined yet
                    </div>
                  )}
                </div>

                {/* Join/Leave/Add Buttons */}
                <div className="join-section">
                  {userInOption ? (
                    <>
                      {!option.pendingActions?.leavePerson && (
                        <button className="leave-btn" onClick={() => handleRequestLeave(option.id)}>
                          🚪 Request Leave
                        </button>
                      )}
                      <button 
                        className="invite-btn" 
                        onClick={() => setInviteModal(option)}
                      >
                        ➕ Add Someone
                      </button>
                    </>
                  ) : (
                    <button className="join-btn" onClick={() => handleJoinOption(option.id)}>
                      ➕ Join this option
                    </button>
                  )}
                </div>

                {/* Persons List */}
                <div className="persons-list">
                  <h4>👥 Queue ({option.persons?.length || 0} persons)</h4>
                  {!option.persons || option.persons.length === 0 ? (
                    <p className="empty-message">No persons in queue</p>
                  ) : (
                    <ul>
                      {option.persons.map((person, index) => (
                        <li 
                          key={person.id} 
                          className={`person-item ${index === option.currentIndex ? 'current' : ''} ${person.userId === user.userId ? 'is-you' : ''}`}
                        >
                          <span>
                            {index + 1}. {person.name}
                            {person.userId === user.userId && <span className="you-tag">(You)</span>}
                            {index === option.currentIndex && (
                              <span className="current-indicator">Current</span>
                            )}
                          </span>
                          {userInOption && person.userId !== user.userId && !option.pendingActions?.deletePerson && (
                            <button 
                              className="remove-person-btn"
                              onClick={() => handleRequestDeletePerson(option.id, person.userId)}
                              title="Request to remove"
                            >
                              ✕
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Person Modal */}
      {inviteModal && (
        <InviteUserModal 
          option={inviteModal}
          user={user}
          onClose={() => setInviteModal(null)}
          onAdd={handleAddPerson}
        />
      )}
    </div>
  );
}

export default App;
