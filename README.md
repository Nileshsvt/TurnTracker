# Circular Queue Manager

A React and Node.js application for managing options (like Tea, Paneer, etc.) with persons in a circular queue.

## Features

- ➕ Add/Remove multiple options (Tea, Paneer, Coffee, etc.)
- 👥 Add/Remove persons to each option's queue
- 🔄 Circular queue rotation - when a person is marked as completed, the next person's turn starts
- 📊 Visual indication of current turn

## Project Structure

```
├── backend/
│   ├── package.json
│   └── server.js
└── frontend/
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        ├── index.css
        └── App.js
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```
   
   The server will run on http://localhost:5000

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React app:
   ```bash
   npm start
   ```
   
   The app will open on http://localhost:3000

## How to Use

1. **Add an Option**: Enter a name like "Tea", "Paneer", "Coffee" and click "Add Option"
2. **Add Persons**: Inside each option card, add person names to the queue
3. **Circular Rotation**: Click "Mark Completed & Next" to move to the next person in circular order
4. **Remove Items**: Click the delete button to remove options or the ✕ to remove persons

## API Endpoints

- `GET /api/options` - Get all options
- `POST /api/options` - Create a new option
- `DELETE /api/options/:id` - Delete an option
- `POST /api/options/:id/persons` - Add a person to an option
- `DELETE /api/options/:optionId/persons/:personId` - Remove a person
- `POST /api/options/:id/next` - Move to next person (circular)
- `GET /api/options/:id/current` - Get current person for an option
