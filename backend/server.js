const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// File-based storage for persistence
const DATA_FILE = path.join(__dirname, 'data.json');

// Load data from file or initialize empty
const loadData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(fileData);
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
  return { options: {}, users: {} };
};

// Save data to file
const saveData = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving data:', err);
  }
};

// Load data on startup
let data = loadData();
if (!data.options) data.options = {};
if (!data.users) data.users = {};

// ==================== AUTH ROUTES ====================

// Register new user
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }
  
  const oderId = username.toLowerCase().replace(/\s+/g, '_');
  
  if (data.users[oderId]) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  data.users[oderId] = {
    id: oderId,
    username,
    password,
    pendingInvites: [],
    createdAt: new Date().toISOString()
  };
  saveData();
  
  res.status(201).json({ 
    userId: oderId, 
    username,
    message: 'Registration successful' 
  });
});

// Login user
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const oderId = username.toLowerCase().replace(/\s+/g, '_');
  
  if (!data.users[oderId]) {
    return res.status(401).json({ error: 'User not found. Please register first.' });
  }
  
  if (data.users[oderId].password !== password) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  res.json({ 
    userId: oderId, 
    username: data.users[oderId].username,
    message: 'Login successful' 
  });
});

// Get all users (for invite dropdown)
app.get('/api/users', (req, res) => {
  const usersList = Object.keys(data.users).map(key => ({
    userId: key,
    username: data.users[key].username
  }));
  res.json(usersList);
});

// Get user's pending invites
app.get('/api/auth/invites/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!data.users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const invites = data.users[userId].pendingInvites || [];
  res.json(invites);
});

// ==================== OPTIONS ROUTES ====================

// Get all options
app.get('/api/options', (req, res) => {
  const optionsList = Object.keys(data.options).map(key => ({
    id: key,
    ...data.options[key]
  }));
  res.json(optionsList);
});

// Add new option
app.post('/api/options', (req, res) => {
  const { name, userId } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Option name is required' });
  }
  
  if (!userId || !data.users[userId]) {
    return res.status(401).json({ error: 'Valid user required' });
  }
  
  const id = Date.now().toString();
  data.options[id] = {
    name,
    persons: [],
    currentIndex: 0,
    createdBy: userId,
    pendingActions: {
      completeTurn: null,
      joinPerson: null,
      leavePerson: null,
      deletePerson: null,
      deleteOption: null
    }
  };
  
  saveData();
  res.status(201).json({ id, ...data.options[id] });
});

// Delete an option (only if empty)
app.delete('/api/options/:id', (req, res) => {
  const { id } = req.params;
  
  if (!data.options[id]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  if (data.options[id].persons.length > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete option with persons. Use approval system.',
      requiresApproval: true 
    });
  }
  
  delete data.options[id];
  saveData();
  res.json({ message: 'Option deleted successfully' });
});

// ==================== INVITE SYSTEM ====================

// Add a user to an option directly (no approval needed)
app.post('/api/options/:id/add-person', (req, res) => {
  const { id } = req.params;
  const { userId, targetUserId } = req.body;
  
  if (!data.options[id]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  if (!userId || !data.users[userId]) {
    return res.status(401).json({ error: 'Valid user required' });
  }
  
  if (!targetUserId || !data.users[targetUserId]) {
    return res.status(404).json({ error: 'Target user not found' });
  }
  
  // Check if sender is in option
  const senderInOption = data.options[id].persons.find(p => p.userId === userId);
  if (!senderInOption) {
    return res.status(403).json({ error: 'You must be in this option to add others' });
  }
  
  // Check if target already in option
  const alreadyInOption = data.options[id].persons.find(p => p.userId === targetUserId);
  if (alreadyInOption) {
    return res.status(400).json({ error: 'User already in this option' });
  }
  
  // Add person directly - no approval needed
  const personId = Date.now().toString();
  data.options[id].persons.push({
    id: personId,
    userId: targetUserId,
    name: data.users[targetUserId].username
  });
  
  saveData();
  res.json({ id, ...data.options[id], message: `${data.users[targetUserId].username} added successfully` });
});

// Accept invite
app.post('/api/auth/invites/:optionId/accept', (req, res) => {
  const { optionId } = req.params;
  const { userId } = req.body;
  
  if (!data.users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  if (!data.options[optionId]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  // Remove invite
  const inviteIndex = (data.users[userId].pendingInvites || []).findIndex(
    inv => inv.optionId === optionId
  );
  
  if (inviteIndex === -1) {
    return res.status(404).json({ error: 'Invite not found' });
  }
  
  data.users[userId].pendingInvites.splice(inviteIndex, 1);
  
  // Add user to option
  const personId = Date.now().toString();
  data.options[optionId].persons.push({
    id: personId,
    userId: userId,
    name: data.users[userId].username
  });
  
  saveData();
  res.json({ message: 'Joined option successfully', option: { id: optionId, ...data.options[optionId] } });
});

// Decline invite
app.post('/api/auth/invites/:optionId/decline', (req, res) => {
  const { optionId } = req.params;
  const { userId } = req.body;
  
  if (!data.users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Remove invite
  const inviteIndex = (data.users[userId].pendingInvites || []).findIndex(
    inv => inv.optionId === optionId
  );
  
  if (inviteIndex === -1) {
    return res.status(404).json({ error: 'Invite not found' });
  }
  
  data.users[userId].pendingInvites.splice(inviteIndex, 1);
  saveData();
  
  res.json({ message: 'Invite declined' });
});

// Join option directly (no approval needed)
app.post('/api/options/:id/join', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  if (!data.options[id]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  if (!userId || !data.users[userId]) {
    return res.status(401).json({ error: 'Valid user required' });
  }
  
  const alreadyExists = data.options[id].persons.find(p => p.userId === userId);
  if (alreadyExists) {
    return res.status(400).json({ error: 'You are already in this option' });
  }
  
  // Join directly - no approval needed
  const personId = Date.now().toString();
  data.options[id].persons.push({
    id: personId,
    userId: userId,
    name: data.users[userId].username
  });
  saveData();
  res.json({ id, ...data.options[id], message: 'Joined successfully' });
});

// ==================== APPROVAL SYSTEM ====================

// Request to complete turn (needs all approvals)
app.post('/api/options/:id/request-complete', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  if (!data.options[id]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  if (data.options[id].persons.length === 0) {
    return res.status(400).json({ error: 'No persons in queue' });
  }
  
  const currentPerson = data.options[id].persons[data.options[id].currentIndex];
  if (currentPerson.userId !== userId) {
    return res.status(403).json({ error: 'Only the current person can request to complete' });
  }
  
  // If only one person, complete directly
  if (data.options[id].persons.length === 1) {
    data.options[id].currentIndex = 0;
    saveData();
    return res.json({ id, ...data.options[id], message: 'Completed (you are the only person)' });
  }
  
  // Check for existing complete request
  if (data.options[id].pendingActions.completeTurn) {
    return res.status(400).json({ error: 'A complete request is already pending' });
  }
  
  // Create pending complete request
  const approvals = {};
  data.options[id].persons.forEach(p => {
    approvals[p.userId] = p.userId === userId ? true : null; // Requester auto-approves, others pending
  });
  
  data.options[id].pendingActions.completeTurn = {
    requestedBy: userId,
    requestedByName: data.users[userId].username,
    requestedAt: new Date().toISOString(),
    approvals
  };
  
  saveData();
  res.json({ id, ...data.options[id], message: 'Complete request created' });
});

// Request to leave option (needs all approvals)
app.post('/api/options/:id/request-leave', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  if (!data.options[id]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  const userInOption = data.options[id].persons.find(p => p.userId === userId);
  if (!userInOption) {
    return res.status(403).json({ error: 'You are not in this option' });
  }
  
  // If only one person, leave directly
  if (data.options[id].persons.length === 1) {
    data.options[id].persons = [];
    data.options[id].currentIndex = 0;
    saveData();
    return res.json({ id, ...data.options[id], message: 'Left successfully' });
  }
  
  // Check for existing leave request
  if (data.options[id].pendingActions.leavePerson) {
    return res.status(400).json({ error: 'A leave request is already pending' });
  }
  
  // Create pending leave request
  const approvals = {};
  data.options[id].persons.forEach(p => {
    approvals[p.userId] = p.userId === userId ? true : null; // Requester auto-approves, others pending
  });
  
  data.options[id].pendingActions.leavePerson = {
    targetUserId: userId,
    targetName: data.users[userId].username,
    requestedBy: userId,
    requestedByName: data.users[userId].username,
    requestedAt: new Date().toISOString(),
    approvals
  };
  
  saveData();
  res.json({ id, ...data.options[id], message: 'Leave request created' });
});

// Request to remove a person (needs all approvals)
app.post('/api/options/:optionId/request-delete-person/:targetUserId', (req, res) => {
  const { optionId, targetUserId } = req.params;
  const { userId } = req.body;
  
  if (!data.options[optionId]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  const requesterInOption = data.options[optionId].persons.find(p => p.userId === userId);
  if (!requesterInOption) {
    return res.status(403).json({ error: 'Only persons in this option can request' });
  }
  
  const targetPerson = data.options[optionId].persons.find(p => p.userId === targetUserId);
  if (!targetPerson) {
    return res.status(404).json({ error: 'Person not found' });
  }
  
  // Check for existing delete person request
  if (data.options[optionId].pendingActions.deletePerson) {
    return res.status(400).json({ error: 'A delete person request is already pending' });
  }
  
  const approvals = {};
  data.options[optionId].persons.forEach(p => {
    approvals[p.userId] = p.userId === userId ? true : null; // Requester auto-approves, others pending
  });
  
  data.options[optionId].pendingActions.deletePerson = {
    targetUserId,
    targetName: targetPerson.name,
    requestedBy: userId,
    requestedByName: data.users[userId].username,
    requestedAt: new Date().toISOString(),
    approvals
  };
  
  saveData();
  res.json({ id: optionId, ...data.options[optionId], message: 'Delete request created' });
});

// Request to delete option (needs all approvals)
app.post('/api/options/:id/request-delete', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  if (!data.options[id]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  const requesterInOption = data.options[id].persons.find(p => p.userId === userId);
  if (!requesterInOption) {
    return res.status(403).json({ error: 'Only persons in this option can request' });
  }
  
  // Check for existing delete option request
  if (data.options[id].pendingActions.deleteOption) {
    return res.status(400).json({ error: 'A delete option request is already pending' });
  }
  
  const approvals = {};
  data.options[id].persons.forEach(p => {
    approvals[p.userId] = p.userId === userId ? true : null; // Requester auto-approves, others pending
  });

  data.options[id].pendingActions.deleteOption = {
    requestedBy: userId,
    requestedByName: data.users[userId].username,
    requestedAt: new Date().toISOString(),
    approvals
  };
  
  saveData();
  res.json({ id, ...data.options[id], message: 'Delete option request created' });
});

// Approve or reject a pending action
app.post('/api/options/:id/approve', (req, res) => {
  const { id } = req.params;
  const { userId, actionType, approve } = req.body;
  
  if (!data.options[id]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  // For join requests, any member can approve
  const userInOption = data.options[id].persons.find(p => p.userId === userId);
  if (!userInOption) {
    return res.status(403).json({ error: 'Only persons in this option can approve' });
  }
  
  const pendingAction = data.options[id].pendingActions[actionType];
  if (!pendingAction) {
    return res.status(404).json({ error: 'No pending action found' });
  }
  
  pendingAction.approvals[userId] = approve ? true : 'rejected';
  
  const allApproved = Object.values(pendingAction.approvals).every(v => v === true);
  const anyRejected = Object.values(pendingAction.approvals).some(v => v === 'rejected');
  
  if (anyRejected) {
    data.options[id].pendingActions[actionType] = null;
    saveData();
    return res.json({ id, ...data.options[id], message: 'Action rejected' });
  }
  
  if (allApproved) {
    // Execute the approved action
    if (actionType === 'completeTurn') {
      data.options[id].currentIndex = (data.options[id].currentIndex + 1) % data.options[id].persons.length;
      data.options[id].pendingActions.completeTurn = null;
      saveData();
      return res.json({ id, ...data.options[id], message: 'Turn completed' });
    }
    
    if (actionType === 'joinPerson') {
      const newUserId = pendingAction.requestedBy;
      const personId = Date.now().toString();
      data.options[id].persons.push({
        id: personId,
        userId: newUserId,
        name: data.users[newUserId].username
      });
      data.options[id].pendingActions.joinPerson = null;
      saveData();
      return res.json({ id, ...data.options[id], message: 'Person joined' });
    }
    
    if (actionType === 'leavePerson') {
      const targetUserId = pendingAction.targetUserId;
      const personIndex = data.options[id].persons.findIndex(p => p.userId === targetUserId);
      if (personIndex !== -1) {
        data.options[id].persons.splice(personIndex, 1);
        if (data.options[id].persons.length === 0) {
          data.options[id].currentIndex = 0;
        } else if (data.options[id].currentIndex >= data.options[id].persons.length) {
          data.options[id].currentIndex = 0;
        }
      }
      data.options[id].pendingActions.leavePerson = null;
      saveData();
      return res.json({ id, ...data.options[id], message: 'Person left' });
    }
    
    if (actionType === 'deletePerson') {
      const targetUserId = pendingAction.targetUserId;
      const personIndex = data.options[id].persons.findIndex(p => p.userId === targetUserId);
      if (personIndex !== -1) {
        data.options[id].persons.splice(personIndex, 1);
        if (data.options[id].persons.length === 0) {
          data.options[id].currentIndex = 0;
        } else if (data.options[id].currentIndex >= data.options[id].persons.length) {
          data.options[id].currentIndex = 0;
        }
      }
      data.options[id].pendingActions.deletePerson = null;
      saveData();
      return res.json({ id, ...data.options[id], message: 'Person removed' });
    }
    
    if (actionType === 'deleteOption') {
      delete data.options[id];
      saveData();
      return res.json({ message: 'Option deleted', deleted: true });
    }
  }
  
  saveData();
  res.json({ id, ...data.options[id], message: 'Vote recorded' });
});

// Cancel a pending action
app.post('/api/options/:id/cancel-action', (req, res) => {
  const { id } = req.params;
  const { userId, actionType } = req.body;
  
  if (!data.options[id]) {
    return res.status(404).json({ error: 'Option not found' });
  }
  
  const pendingAction = data.options[id].pendingActions[actionType];
  if (!pendingAction) {
    return res.status(404).json({ error: 'No pending action found' });
  }
  
  if (pendingAction.requestedBy !== userId) {
    return res.status(403).json({ error: 'Only requester can cancel' });
  }
  
  data.options[id].pendingActions[actionType] = null;
  saveData();
  res.json({ id, ...data.options[id], message: 'Action cancelled' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
