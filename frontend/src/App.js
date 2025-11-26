import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [options, setOptions] = useState([]);
  const [newOptionName, setNewOptionName] = useState('');
  const [newPersonNames, setNewPersonNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all options on component mount
  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/options`);
      setOptions(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch options. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Add new option
  const handleAddOption = async (e) => {
    e.preventDefault();
    if (!newOptionName.trim()) return;

    try {
      const response = await axios.post(`${API_URL}/options`, {
        name: newOptionName.trim()
      });
      setOptions([...options, response.data]);
      setNewOptionName('');
    } catch (err) {
      setError('Failed to add option');
    }
  };

  // Delete option
  const handleDeleteOption = async (optionId) => {
    if (!window.confirm('Are you sure you want to delete this option?')) return;

    try {
      await axios.delete(`${API_URL}/options/${optionId}`);
      setOptions(options.filter(opt => opt.id !== optionId));
    } catch (err) {
      setError('Failed to delete option');
    }
  };

  // Add person to option
  const handleAddPerson = async (e, optionId) => {
    e.preventDefault();
    const personName = newPersonNames[optionId];
    if (!personName?.trim()) return;

    try {
      const response = await axios.post(`${API_URL}/options/${optionId}/persons`, {
        name: personName.trim()
      });
      setOptions(options.map(opt => 
        opt.id === optionId ? response.data : opt
      ));
      setNewPersonNames({ ...newPersonNames, [optionId]: '' });
    } catch (err) {
      setError('Failed to add person');
    }
  };

  // Remove person from option
  const handleRemovePerson = async (optionId, personId) => {
    try {
      const response = await axios.delete(`${API_URL}/options/${optionId}/persons/${personId}`);
      setOptions(options.map(opt => 
        opt.id === optionId ? response.data : opt
      ));
    } catch (err) {
      setError('Failed to remove person');
    }
  };

  // Mark current person as completed and move to next
  const handleMarkCompleted = async (optionId) => {
    try {
      const response = await axios.post(`${API_URL}/options/${optionId}/next`);
      setOptions(options.map(opt => 
        opt.id === optionId ? response.data : opt
      ));
    } catch (err) {
      setError('Failed to mark as completed');
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔄 TurnTracker</h1>
        <p>Smart Turn Management System</p>
      </header>

      {error && (
        <div className="error">
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '10px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Add New Option Section */}
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

      {/* Options Grid */}
      {options.length === 0 ? (
        <div className="no-options">
          <h3>No options yet!</h3>
          <p>Add your first option above to get started.</p>
        </div>
      ) : (
        <div className="options-grid">
          {options.map(option => (
            <div key={option.id} className="option-card">
              {/* Option Header */}
              <div className="option-header">
                <h3>
                  <span>{getOptionIcon(option.name)}</span>
                  {option.name}
                </h3>
                <button 
                  className="delete-option-btn"
                  onClick={() => handleDeleteOption(option.id)}
                >
                  🗑️ Delete
                </button>
              </div>

              {/* Current Person Display */}
              <div className="current-person-section">
                <h4>CURRENT TURN</h4>
                {option.persons.length > 0 ? (
                  <>
                    <div className="current-person-name">
                      {option.persons[option.currentIndex]?.name}
                    </div>
                    <button 
                      className="complete-btn"
                      onClick={() => handleMarkCompleted(option.id)}
                    >
                      ✓ Mark Completed & Next
                    </button>
                    <div className="queue-info">
                      Position: {option.currentIndex + 1} of {option.persons.length}
                    </div>
                  </>
                ) : (
                  <div className="current-person-name no-person">
                    No persons added yet
                  </div>
                )}
              </div>

              {/* Add Person Form */}
              <div className="add-person-section">
                <h4>Add Person to Queue</h4>
                <form className="add-person-form" onSubmit={(e) => handleAddPerson(e, option.id)}>
                  <input
                    type="text"
                    placeholder="Enter person name"
                    value={newPersonNames[option.id] || ''}
                    onChange={(e) => setNewPersonNames({ 
                      ...newPersonNames, 
                      [option.id]: e.target.value 
                    })}
                  />
                  <button type="submit">Add</button>
                </form>
              </div>

              {/* Persons List */}
              <div className="persons-list">
                <h4>👥 Queue ({option.persons.length} persons)</h4>
                {option.persons.length === 0 ? (
                  <p className="empty-message">No persons in queue</p>
                ) : (
                  <ul>
                    {option.persons.map((person, index) => (
                      <li 
                        key={person.id} 
                        className={`person-item ${index === option.currentIndex ? 'current' : ''}`}
                      >
                        <span>
                          {index + 1}. {person.name}
                          {index === option.currentIndex && (
                            <span className="current-indicator">Current</span>
                          )}
                        </span>
                        <button 
                          className="remove-person-btn"
                          onClick={() => handleRemovePerson(option.id, person.id)}
                          title="Remove person"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
