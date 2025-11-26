const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// File-based storage for persistence
const DATA_FILE = path.join(__dirname, 'data.json');

// Load data from file or initialize empty
const loadData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
  return {};
};

// Save data to file
const saveData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving data:', err);
  }
};

// Load options from file on startup
let options = loadData();

// Get all options
app.get('/api/options', (req, res) => {
  const optionsList = Object.keys(options).map(key => ({
    id: key,
    name: options[key].name,
    persons: options[key].persons,
    currentIndex: options[key].currentIndex
  }));
  res.json(optionsList);
});

// Add new option (like tea, paneer, etc.)
app.post('/api/options', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Option name is required' });
  }
  
  const id = Date.now().toString();
  options[id] = {
    name,
    persons: [],
    currentIndex: 0
  };
  
  saveData(options);
  res.status(201).json({ id, name, persons: [], currentIndex: 0 });
});

// Delete an option
app.delete('/api/options/:id', (req, res) => {
  const { id } = req.params;
  if (!options[id]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  delete options[id];
  saveData(options);
  res.json({ message: 'Option deleted successfully' });
});

// Add person to an option's queue
app.post('/api/options/:id/persons', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  if (!options[id]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  if (!name) {
    return res.status(400).json({ error: 'Person name is required' });
  }
  
  const personId = Date.now().toString();
  options[id].persons.push({ id: personId, name });
  
  saveData(options);
  res.status(201).json({ id, ...options[id] });
});

// Remove person from an option's queue
app.delete('/api/options/:optionId/persons/:personId', (req, res) => {
  const { optionId, personId } = req.params;
  
  if (!options[optionId]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  const personIndex = options[optionId].persons.findIndex(p => p.id === personId);
  if (personIndex === -1) {
    return res.status(404).json({ error: 'Person not found' });
  }
  
  options[optionId].persons.splice(personIndex, 1);
  
  // Adjust currentIndex if needed
  if (options[optionId].persons.length === 0) {
    options[optionId].currentIndex = 0;
  } else if (options[optionId].currentIndex >= options[optionId].persons.length) {
    options[optionId].currentIndex = 0;
  }
  
  saveData(options);
  res.json({ id: optionId, ...options[optionId] });
});

// Mark current person as completed and move to next (circular queue)
app.post('/api/options/:id/next', (req, res) => {
  const { id } = req.params;
  
  if (!options[id]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  if (options[id].persons.length === 0) {
    return res.status(400).json({ error: 'No persons in queue' });
  }
  
  // Move to next person in circular manner
  options[id].currentIndex = (options[id].currentIndex + 1) % options[id].persons.length;
  
  saveData(options);
  res.json({ id, ...options[id] });
});

// Get current person for an option
app.get('/api/options/:id/current', (req, res) => {
  const { id } = req.params;
  
  if (!options[id]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  if (options[id].persons.length === 0) {
    return res.json({ currentPerson: null, currentIndex: 0 });
  }
  
  const currentPerson = options[id].persons[options[id].currentIndex];
  res.json({ 
    currentPerson, 
    currentIndex: options[id].currentIndex,
    totalPersons: options[id].persons.length 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
