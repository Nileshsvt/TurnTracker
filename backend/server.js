const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const webpush = require('web-push');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==================== WEB PUSH SETUP ====================
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BFh1Hy2pJVzyj6ZZUsuq1_nO0OwZZbsiIO2o-7Pro-q44nfCQjIv9IrjAvSOPRe2p7LA-dQ0WNZPidEIiZdcYT0';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'wL3I1JOpjQeQ2yTYDU7WvgbjH3i3f65WI-TDTT0Z82M';

webpush.setVapidDetails(
  'mailto:turntracker@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// ==================== MONGODB SETUP ====================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb';

// User Schema
const userSchema = new mongoose.Schema({
  oderId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  pendingInvites: { type: Array, default: [] },
  pushSubscription: { type: Object, default: null }, // Store push subscription
  createdAt: { type: Date, default: Date.now }
});

// Option Schema
const optionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  persons: { type: Array, default: [] },
  currentIndex: { type: Number, default: 0 },
  createdBy: { type: String },
  pendingActions: {
    type: Object,
    default: {
      completeTurn: null,
      joinPerson: null,
      leavePerson: null,
      deletePerson: null,
      deleteOption: null
    }
  }
});

const User = mongoose.model('User', userSchema);
const Option = mongoose.model('Option', optionSchema);

// ==================== PUSH NOTIFICATION HELPER ====================
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const user = await User.findOne({ oderId: userId });
    if (!user || !user.pushSubscription) {
      console.log(`No push subscription for user ${userId}`);
      return false;
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: {
        ...data,
        url: '/' // URL to open when notification is clicked
      }
    });

    await webpush.sendNotification(user.pushSubscription, payload);
    console.log(`Push notification sent to user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error sending push to user ${userId}:`, error.message);
    // If subscription is invalid, remove it
    if (error.statusCode === 410 || error.statusCode === 404) {
      await User.updateOne({ oderId: userId }, { pushSubscription: null });
    }
    return false;
  }
}

// Send notification to multiple users
async function notifyUsersForApproval(userIds, requesterName, actionType, optionName) {
  const actionMessages = {
    completeTurn: `wants to complete turn`,
    joinPerson: `wants to join`,
    leavePerson: `wants to leave`,
    deletePerson: `wants to remove someone from`,
    deleteOption: `wants to delete`
  };

  const message = actionMessages[actionType] || 'needs your approval';
  const title = `🔔 Approval Needed - ${optionName}`;
  const body = `${requesterName} ${message}. Tap to vote.`;

  const results = await Promise.all(
    userIds.map(userId => sendPushNotification(userId, title, body, { optionName, actionType }))
  );

  return results.filter(r => r).length; // Return count of successful notifications
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// ==================== AUTH ROUTES ====================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    const oderId = username.toLowerCase().replace(/\s+/g, '_');
    
    const existingUser = await User.findOne({ oderId });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const newUser = new User({
      oderId,
      username,
      password,
      pendingInvites: []
    });
    await newUser.save();
    
    res.status(201).json({ 
      userId: oderId, 
      username,
      message: 'Registration successful' 
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const oderId = username.toLowerCase().replace(/\s+/g, '_');
    
    const user = await User.findOne({ oderId });
    if (!user) {
      return res.status(401).json({ error: 'User not found. Please register first.' });
    }
    
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    res.json({ 
      userId: oderId, 
      username: user.username,
      message: 'Login successful' 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (for invite dropdown)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'oderId username');
    const usersList = users.map(u => ({
      userId: u.oderId,
      username: u.username
    }));
    res.json(usersList);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's pending invites
app.get('/api/auth/invites/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findOne({ oderId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user.pendingInvites || []);
  } catch (err) {
    console.error('Get invites error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== OPTIONS ROUTES ====================

// Get all options
app.get('/api/options', async (req, res) => {
  try {
    const options = await Option.find({});
    const optionsList = options.map(opt => ({
      id: opt._id.toString(),
      name: opt.name,
      persons: opt.persons,
      currentIndex: opt.currentIndex,
      createdBy: opt.createdBy,
      pendingActions: opt.pendingActions
    }));
    res.json(optionsList);
  } catch (err) {
    console.error('Get options error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new option
app.post('/api/options', async (req, res) => {
  try {
    const { name, userId } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Option name is required' });
    }
    
    const user = await User.findOne({ oderId: userId });
    if (!userId || !user) {
      return res.status(401).json({ error: 'Valid user required' });
    }
    
    const newOption = new Option({
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
    });
    await newOption.save();
    
    res.status(201).json({ 
      id: newOption._id.toString(), 
      name: newOption.name,
      persons: newOption.persons,
      currentIndex: newOption.currentIndex,
      createdBy: newOption.createdBy,
      pendingActions: newOption.pendingActions
    });
  } catch (err) {
    console.error('Add option error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete an option (only if empty)
app.delete('/api/options/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const option = await Option.findById(id);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    if (option.persons.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete option with persons. Use approval system.',
        requiresApproval: true 
      });
    }
    
    await Option.findByIdAndDelete(id);
    res.json({ message: 'Option deleted successfully' });
  } catch (err) {
    console.error('Delete option error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit option name
app.put('/api/options/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, userId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Option name is required' });
    }
    
    const option = await Option.findById(id);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    // Check if user is in the option or is the creator
    const userInOption = option.persons.find(p => p.userId === userId);
    if (!userInOption && option.createdBy !== userId) {
      return res.status(403).json({ error: 'Only members can edit this option' });
    }
    
    option.name = name.trim();
    await option.save();
    
    res.json({
      id: option._id.toString(),
      name: option.name,
      persons: option.persons,
      currentIndex: option.currentIndex,
      createdBy: option.createdBy,
      pendingActions: option.pendingActions
    });
  } catch (err) {
    console.error('Edit option error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== INVITE SYSTEM ====================

// Add a user to an option directly (no approval needed)
app.post('/api/options/:id/add-person', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, targetUserId } = req.body;
    
    const option = await Option.findById(id);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    const user = await User.findOne({ oderId: userId });
    if (!userId || !user) {
      return res.status(401).json({ error: 'Valid user required' });
    }
    
    const targetUser = await User.findOne({ oderId: targetUserId });
    if (!targetUserId || !targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }
    
    // Check if sender is in option
    const senderInOption = option.persons.find(p => p.userId === userId);
    if (!senderInOption) {
      return res.status(403).json({ error: 'You must be in this option to add others' });
    }
    
    // Check if target already in option
    const alreadyInOption = option.persons.find(p => p.userId === targetUserId);
    if (alreadyInOption) {
      return res.status(400).json({ error: 'User already in this option' });
    }
    
    // Add person directly - no approval needed
    const personId = Date.now().toString();
    option.persons.push({
      id: personId,
      userId: targetUserId,
      name: targetUser.username
    });
    
    await option.save();
    res.json({ 
      id: option._id.toString(), 
      name: option.name,
      persons: option.persons,
      currentIndex: option.currentIndex,
      createdBy: option.createdBy,
      pendingActions: option.pendingActions,
      message: `${targetUser.username} added successfully` 
    });
  } catch (err) {
    console.error('Add person error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept invite
app.post('/api/auth/invites/:optionId/accept', async (req, res) => {
  try {
    const { optionId } = req.params;
    const { userId } = req.body;
    
    const user = await User.findOne({ oderId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const option = await Option.findById(optionId);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    // Remove invite
    const inviteIndex = (user.pendingInvites || []).findIndex(
      inv => inv.optionId === optionId
    );
    
    if (inviteIndex === -1) {
      return res.status(404).json({ error: 'Invite not found' });
    }
    
    user.pendingInvites.splice(inviteIndex, 1);
    await user.save();
    
    // Add user to option
    const personId = Date.now().toString();
    option.persons.push({
      id: personId,
      userId: userId,
      name: user.username
    });
    await option.save();
    
    res.json({ 
      message: 'Joined option successfully', 
      option: { 
        id: option._id.toString(), 
        name: option.name,
        persons: option.persons,
        currentIndex: option.currentIndex,
        createdBy: option.createdBy,
        pendingActions: option.pendingActions
      } 
    });
  } catch (err) {
    console.error('Accept invite error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Decline invite
app.post('/api/auth/invites/:optionId/decline', async (req, res) => {
  try {
    const { optionId } = req.params;
    const { userId } = req.body;
    
    const user = await User.findOne({ oderId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove invite
    const inviteIndex = (user.pendingInvites || []).findIndex(
      inv => inv.optionId === optionId
    );
    
    if (inviteIndex === -1) {
      return res.status(404).json({ error: 'Invite not found' });
    }
    
    user.pendingInvites.splice(inviteIndex, 1);
    await user.save();
    
    res.json({ message: 'Invite declined' });
  } catch (err) {
    console.error('Decline invite error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join option directly (no approval needed)
app.post('/api/options/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const option = await Option.findById(id);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    const user = await User.findOne({ oderId: userId });
    if (!userId || !user) {
      return res.status(401).json({ error: 'Valid user required' });
    }
    
    const alreadyExists = option.persons.find(p => p.userId === userId);
    if (alreadyExists) {
      return res.status(400).json({ error: 'You are already in this option' });
    }
    
    // Join directly - no approval needed
    const personId = Date.now().toString();
    option.persons.push({
      id: personId,
      userId: userId,
      name: user.username
    });
    await option.save();
    
    res.json({ 
      id: option._id.toString(), 
      name: option.name,
      persons: option.persons,
      currentIndex: option.currentIndex,
      createdBy: option.createdBy,
      pendingActions: option.pendingActions,
      message: 'Joined successfully' 
    });
  } catch (err) {
    console.error('Join option error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== APPROVAL SYSTEM ====================

// Helper to format option response
const formatOption = (option) => ({
  id: option._id.toString(),
  name: option.name,
  persons: option.persons,
  currentIndex: option.currentIndex,
  createdBy: option.createdBy,
  pendingActions: option.pendingActions
});

// Request to complete turn (needs all approvals)
app.post('/api/options/:id/request-complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const option = await Option.findById(id);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    const user = await User.findOne({ oderId: userId });
    if (!user) {
      return res.status(401).json({ error: 'Valid user required' });
    }
    
    if (option.persons.length === 0) {
      return res.status(400).json({ error: 'No persons in queue' });
    }
    
    const currentPerson = option.persons[option.currentIndex];
    if (currentPerson.userId !== userId) {
      return res.status(403).json({ error: 'Only the current person can request to complete' });
    }
    
    // If only one person, complete directly
    if (option.persons.length === 1) {
      option.currentIndex = 0;
      await option.save();
      return res.json({ ...formatOption(option), message: 'Completed (you are the only person)' });
    }
    
    // Check for existing complete request
    if (option.pendingActions.completeTurn) {
      return res.status(400).json({ error: 'A complete request is already pending' });
    }
    
    // Create pending complete request
    const approvals = {};
    option.persons.forEach(p => {
      approvals[p.userId] = p.userId === userId ? true : null;
    });
    
    option.pendingActions.completeTurn = {
      requestedBy: userId,
      requestedByName: user.username,
      requestedAt: new Date().toISOString(),
      approvals
    };
    option.markModified('pendingActions');
    
    await option.save();

    // Send push notifications to other members who need to approve
    const otherUserIds = option.persons
      .filter(p => p.userId !== userId)
      .map(p => p.userId);
    
    if (otherUserIds.length > 0) {
      notifyUsersForApproval(otherUserIds, user.username, 'completeTurn', option.name);
    }

    res.json({ ...formatOption(option), message: 'Complete request created' });
  } catch (err) {
    console.error('Request complete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request to leave option (needs all approvals)
app.post('/api/options/:id/request-leave', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const option = await Option.findById(id);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    const user = await User.findOne({ oderId: userId });
    if (!user) {
      return res.status(401).json({ error: 'Valid user required' });
    }
    
    const userInOption = option.persons.find(p => p.userId === userId);
    if (!userInOption) {
      return res.status(403).json({ error: 'You are not in this option' });
    }
    
    // If only one person, leave directly
    if (option.persons.length === 1) {
      option.persons = [];
      option.currentIndex = 0;
      await option.save();
      return res.json({ ...formatOption(option), message: 'Left successfully' });
    }
    
    // Check for existing leave request
    if (option.pendingActions.leavePerson) {
      return res.status(400).json({ error: 'A leave request is already pending' });
    }
    
    // Create pending leave request
    const approvals = {};
    option.persons.forEach(p => {
      approvals[p.userId] = p.userId === userId ? true : null;
    });
    
    option.pendingActions.leavePerson = {
      targetUserId: userId,
      targetName: user.username,
      requestedBy: userId,
      requestedByName: user.username,
      requestedAt: new Date().toISOString(),
      approvals
    };
    option.markModified('pendingActions');
    
    await option.save();

    // Send push notifications to other members who need to approve
    const otherUserIds = option.persons
      .filter(p => p.userId !== userId)
      .map(p => p.userId);
    
    if (otherUserIds.length > 0) {
      notifyUsersForApproval(otherUserIds, user.username, 'leavePerson', option.name);
    }

    res.json({ ...formatOption(option), message: 'Leave request created' });
  } catch (err) {
    console.error('Request leave error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request to remove a person (needs all approvals)
app.post('/api/options/:optionId/request-delete-person/:targetUserId', async (req, res) => {
  try {
    const { optionId, targetUserId } = req.params;
    const { userId } = req.body;
    
    const option = await Option.findById(optionId);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    const user = await User.findOne({ oderId: userId });
    if (!user) {
      return res.status(401).json({ error: 'Valid user required' });
    }
    
    const requesterInOption = option.persons.find(p => p.userId === userId);
    if (!requesterInOption) {
      return res.status(403).json({ error: 'Only persons in this option can request' });
    }
    
    const targetPerson = option.persons.find(p => p.userId === targetUserId);
    if (!targetPerson) {
      return res.status(404).json({ error: 'Person not found' });
    }
    
    // Check for existing delete person request
    if (option.pendingActions.deletePerson) {
      return res.status(400).json({ error: 'A delete person request is already pending' });
    }
    
    const approvals = {};
    option.persons.forEach(p => {
      approvals[p.userId] = p.userId === userId ? true : null;
    });
    
    option.pendingActions.deletePerson = {
      targetUserId,
      targetName: targetPerson.name,
      requestedBy: userId,
      requestedByName: user.username,
      requestedAt: new Date().toISOString(),
      approvals
    };
    option.markModified('pendingActions');
    
    await option.save();

    // Send push notifications to other members who need to approve
    const otherUserIds = option.persons
      .filter(p => p.userId !== userId)
      .map(p => p.userId);
    
    if (otherUserIds.length > 0) {
      notifyUsersForApproval(otherUserIds, user.username, 'deletePerson', option.name);
    }

    res.json({ ...formatOption(option), message: 'Delete request created' });
  } catch (err) {
    console.error('Request delete person error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request to delete option (needs all approvals)
app.post('/api/options/:id/request-delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const option = await Option.findById(id);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    const user = await User.findOne({ oderId: userId });
    if (!user) {
      return res.status(401).json({ error: 'Valid user required' });
    }
    
    const requesterInOption = option.persons.find(p => p.userId === userId);
    if (!requesterInOption) {
      return res.status(403).json({ error: 'Only persons in this option can request' });
    }
    
    // Check for existing delete option request
    if (option.pendingActions.deleteOption) {
      return res.status(400).json({ error: 'A delete option request is already pending' });
    }
    
    const approvals = {};
    option.persons.forEach(p => {
      approvals[p.userId] = p.userId === userId ? true : null;
    });

    option.pendingActions.deleteOption = {
      requestedBy: userId,
      requestedByName: user.username,
      requestedAt: new Date().toISOString(),
      approvals
    };
    option.markModified('pendingActions');
    
    await option.save();

    // Send push notifications to other members who need to approve
    const otherUserIds = option.persons
      .filter(p => p.userId !== userId)
      .map(p => p.userId);
    
    if (otherUserIds.length > 0) {
      notifyUsersForApproval(otherUserIds, user.username, 'deleteOption', option.name);
    }

    res.json({ ...formatOption(option), message: 'Delete option request created' });
  } catch (err) {
    console.error('Request delete option error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve or reject a pending action
app.post('/api/options/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, actionType, approve } = req.body;
    
    const option = await Option.findById(id);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    const user = await User.findOne({ oderId: userId });
    if (!user) {
      return res.status(401).json({ error: 'Valid user required' });
    }
    
    // For join requests, any member can approve
    const userInOption = option.persons.find(p => p.userId === userId);
    if (!userInOption) {
      return res.status(403).json({ error: 'Only persons in this option can approve' });
    }
    
    const pendingAction = option.pendingActions[actionType];
    if (!pendingAction) {
      return res.status(404).json({ error: 'No pending action found' });
    }
    
    pendingAction.approvals[userId] = approve ? true : 'rejected';
    
    const allApproved = Object.values(pendingAction.approvals).every(v => v === true);
    const anyRejected = Object.values(pendingAction.approvals).some(v => v === 'rejected');
    
    if (anyRejected) {
      option.pendingActions[actionType] = null;
      option.markModified('pendingActions');
      await option.save();
      return res.json({ ...formatOption(option), message: 'Action rejected' });
    }
    
    if (allApproved) {
      // Execute the approved action
      if (actionType === 'completeTurn') {
        option.currentIndex = (option.currentIndex + 1) % option.persons.length;
        option.pendingActions.completeTurn = null;
        option.markModified('pendingActions');
        await option.save();
        return res.json({ ...formatOption(option), message: 'Turn completed' });
      }
      
      if (actionType === 'joinPerson') {
        const newUserId = pendingAction.requestedBy;
        const newUser = await User.findOne({ oderId: newUserId });
        const personId = Date.now().toString();
        option.persons.push({
          id: personId,
          userId: newUserId,
          name: newUser.username
        });
        option.pendingActions.joinPerson = null;
        option.markModified('pendingActions');
        await option.save();
        return res.json({ ...formatOption(option), message: 'Person joined' });
      }
      
      if (actionType === 'leavePerson') {
        const targetUserId = pendingAction.targetUserId;
        const personIndex = option.persons.findIndex(p => p.userId === targetUserId);
        if (personIndex !== -1) {
          option.persons.splice(personIndex, 1);
          if (option.persons.length === 0) {
            option.currentIndex = 0;
          } else if (option.currentIndex >= option.persons.length) {
            option.currentIndex = 0;
          }
        }
        option.pendingActions.leavePerson = null;
        option.markModified('pendingActions');
        await option.save();
        return res.json({ ...formatOption(option), message: 'Person left' });
      }
      
      if (actionType === 'deletePerson') {
        const targetUserId = pendingAction.targetUserId;
        const personIndex = option.persons.findIndex(p => p.userId === targetUserId);
        if (personIndex !== -1) {
          option.persons.splice(personIndex, 1);
          if (option.persons.length === 0) {
            option.currentIndex = 0;
          } else if (option.currentIndex >= option.persons.length) {
            option.currentIndex = 0;
          }
        }
        option.pendingActions.deletePerson = null;
        option.markModified('pendingActions');
        await option.save();
        return res.json({ ...formatOption(option), message: 'Person removed' });
      }
      
      if (actionType === 'deleteOption') {
        await Option.findByIdAndDelete(id);
        return res.json({ message: 'Option deleted', deleted: true });
      }
    }
    
    option.markModified('pendingActions');
    await option.save();
    res.json({ ...formatOption(option), message: 'Vote recorded' });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel a pending action
app.post('/api/options/:id/cancel-action', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, actionType } = req.body;
    
    const option = await Option.findById(id);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }
    
    const pendingAction = option.pendingActions[actionType];
    if (!pendingAction) {
      return res.status(404).json({ error: 'No pending action found' });
    }
    
    if (pendingAction.requestedBy !== userId) {
      return res.status(403).json({ error: 'Only requester can cancel' });
    }
    
    option.pendingActions[actionType] = null;
    option.markModified('pendingActions');
    await option.save();
    
    res.json({ ...formatOption(option), message: 'Action cancelled' });
  } catch (err) {
    console.error('Cancel action error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== PUSH NOTIFICATION ROUTES ====================

// Get VAPID public key
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { userId, subscription } = req.body;

    if (!userId || !subscription) {
      return res.status(400).json({ error: 'userId and subscription are required' });
    }

    await User.updateOne(
      { oderId: userId },
      { pushSubscription: subscription }
    );

    console.log(`Push subscription saved for user ${userId}`);
    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Unsubscribe from push notifications
app.post('/api/push/unsubscribe', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await User.updateOne(
      { oderId: userId },
      { pushSubscription: null }
    );

    console.log(`Push subscription removed for user ${userId}`);
    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Test push notification (for debugging)
app.post('/api/push/test', async (req, res) => {
  try {
    const { userId } = req.body;
    const success = await sendPushNotification(
      userId,
      '🔔 Test Notification',
      'Push notifications are working!',
      { test: true }
    );
    res.json({ success, message: success ? 'Test notification sent' : 'Failed to send' });
  } catch (err) {
    console.error('Test push error:', err);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
