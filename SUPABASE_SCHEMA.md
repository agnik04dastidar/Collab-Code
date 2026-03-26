# Supabase Database Schema

This document describes the database schema needed for the Collab Code application.

## Tables

### 1. users
Table for storing user information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| username | text | User's display name |
| email | text | User's email |
| created_at | timestamp | Creation timestamp |

### 2. profiles
Table for storing user profile information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (references auth.users) |
| user_name | text | User's display name |
| email | text | User's email |
| avatar_url | text | URL to avatar image |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### 3. rooms
Table for storing room information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Room name |
| host_name | text | Host user's name |
| created_at | timestamp | Creation timestamp |

### 4. room_participants
Table for tracking users in rooms.

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key (auto-generated) |
| room_id | uuid | References rooms.id |
| user_name | text | Participant's name |
| socket_id | text | Socket ID for real-time |
| joined_at | timestamp | Join timestamp |

### 5. chat_messages
Table for storing chat messages.

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key (auto-generated) |
| room_id | uuid | References rooms.id |
| sender | text | Message sender's name |
| message | text | Message content |
| timestamp | timestamp | Message timestamp |

### 6. code_sessions
Table for storing code session data.

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key (auto-generated) |
| room_id | uuid | References rooms.id (unique) |
| code | text | Code content |
| language | text | Programming language |
| updated_at | timestamp | Last update timestamp |

## SQL to Create Tables

Run the following SQL in your Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  host_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room participants table
CREATE TABLE IF NOT EXISTS room_participants (
  id BIGSERIAL PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_name TEXT,
  socket_id TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_name)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender TEXT,
  message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Code sessions table
CREATE TABLE IF NOT EXISTS code_sessions (
  id BIGSERIAL PRIMARY KEY,
  room_id UUID UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
  code TEXT,
  language TEXT DEFAULT 'javascript',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed)
CREATE POLICY "Enable all access for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for room_participants" ON room_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for code_sessions" ON code_sessions FOR ALL USING (true) WITH CHECK (true);
```

## API Endpoints

The backend provides the following REST API endpoints:

### Rooms
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create a room
- `GET /api/rooms/:roomId` - Get a specific room

### Room Participants
- `POST /api/room-participants` - Add a participant
- `DELETE /api/room-participants` - Remove a participant
- `GET /api/room-participants/:roomId` - Get participants for a room

### Chat Messages
- `POST /api/chat-messages` - Save a chat message
- `GET /api/chat-messages/:roomId` - Get chat history for a room

### Code Sessions
- `POST /api/code-sessions` - Save code session
- `GET /api/code-sessions/:roomId` - Get code session for a room

### Profiles
- `POST /api/profiles` - Create or update profile
- `GET /api/profiles/:userId` - Get a user's profile

