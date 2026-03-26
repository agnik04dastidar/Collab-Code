import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import multer from "multer";
import fs from "fs";

import dotenv from "dotenv";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

dotenv.config();

// Supabase configuration
// Skip Supabase initialization to prevent errors - enable when needed
let supabase = null;
try {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    console.log('Supabase disabled - missing env vars');
  }
} catch (error) {
  console.log('Supabase not available:', error.message);
}

const app = express();
const server = http.createServer(app);

// Parse JSON and URL-encoded bodies for proper FormData handling
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: ["http://localhost:5173", "https://real-time-code-editor-7n13.onrender.com"],
  methods: ["GET", "POST"],
  credentials: true,
}));

const io = new Server(server, {
  cors: {
    origin: ["https://real-time-code-editor-7n13.onrender.com", "https://collab-code-apeu.onrender.com"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Enhanced room state management
const rooms = new Map();
const roomData = new Map();
const roomWhiteboardState = new Map();
const roomVideoCallState = new Map();
const roomWhiteboardData = new Map();
const roomVideoCallData = new Map();
const roomUsers = new Map();
const roomChatMessages = new Map();

// User call state
const activeCalls = new Map();
const userCallStatus = new Map();

// Helper function to get user list as objects with avatar URLs for a specific room
const getUserList = (roomId) => {
  if (!rooms.has(roomId) || !rooms.get(roomId).usersMap) {
    return [];
  }
  const userList = [];
  rooms.get(roomId).usersMap.forEach((userData) => {
    userList.push({
      name: userData.name,
      avatarUrl: userData.avatarUrl
    });
  });
  return userList;
};

// Helper function to remove user from room
const removeUserFromRoom = (roomId, socketId) => {
  if (rooms.has(roomId) && rooms.get(roomId).usersMap) {
    const userData = rooms.get(roomId).usersMap.get(socketId);
    if (userData) {
      rooms.get(roomId).users.delete(userData.name);
      rooms.get(roomId).usersMap.delete(socketId);
    }
  }
};

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  let currentRoom = null;
  let currentUser = null;
  let currentUserId = null; // Firebase UID for authenticated users

  socket.on("join", async ({ roomId, userName, userId }) => {
    if (!roomId || !userName) return;

    // Store the Firebase user ID if provided
    if (userId) {
      currentUserId = userId;
      // Associate socket with Firebase user ID
      socket.data.userId = userId;
    }
    socket.data.userName = userName;

    // Leave previous room (if any)
    if (currentRoom) {
      socket.leave(currentRoom);
      if (rooms.has(currentRoom)) {
        removeUserFromRoom(currentRoom, socket.id);
        io.to(currentRoom).emit("userJoined", getUserList(currentRoom));
        io.to(currentRoom).emit("userLeft", { userName: currentUser, reason: "left" });
      }
    }

    currentRoom = roomId;
    currentUser = userName;
    socket.join(roomId);

    // Initialize room structures
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { 
        users: new Set(), 
        usersMap: new Map(),
        code: "// write code here",
        whiteboard: {
          shapes: [],
          drawings: [],
          users: []
        },
        videoCall: {
          active: false,
          participants: []
        }
      });
    }

    if (!roomData.has(roomId)) {
      roomData.set(roomId, {
        code: "// write code here",
        language: "javascript",
      });
    }

    // Initialize whiteboard state
    if (!roomWhiteboardState.has(roomId)) {
      roomWhiteboardState.set(roomId, false);
      roomWhiteboardData.set(roomId, {
        shapes: [],
        drawings: [],
        textBoxes: [],
        users: []
      });
    }

    // Initialize video call state
    if (!roomVideoCallState.has(roomId)) {
      roomVideoCallState.set(roomId, false);
      roomVideoCallData.set(roomId, {
        active: false,
        participants: []
      });
    }

    // Initialize chat messages
    if (!roomChatMessages.has(roomId)) {
      roomChatMessages.set(roomId, []);
    }

    // Add user to room with profile info - use Map for proper object handling
    if (!rooms.get(roomId).usersMap) {
      rooms.get(roomId).usersMap = new Map();
    }

    // Fetch user profile from Supabase to get avatar URL
    let avatarUrl = null;
    if (userId) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', userId)
          .single();
        
        if (profile && profile.avatar_url) {
          avatarUrl = profile.avatar_url;
        }
      } catch (err) {
        console.log("Profile fetch error:", err.message);
      }
    }

    rooms.get(roomId).usersMap.set(socket.id, { 
      name: userName,
      avatarUrl: avatarUrl,
      socketId: socket.id
    });
    
    // Update the Set for backward compatibility (stores user names)
    rooms.get(roomId).users.add(userName);
    
    // Save room to Supabase
    try {
      await supabase
        .from('rooms')
        .upsert([{ 
          room_code: roomId, 
          created_by: userName,
          is_active: true
        }], { onConflict: 'room_code' });
      
      // Save participant to Supabase
      await supabase
        .from('room_participants')
        .insert([{ 
          room_code: roomId, 
          user_name: userName
        }]);

      // Save user profile to Supabase - use userId (Firebase UID) if available
      if (userId) {
        await supabase
          .from('profiles')
          .upsert([{ 
            id: userId,
            display_name: userName
          }], { onConflict: 'id' });
      }

      // Save user to users table
      await supabase
        .from('users')
        .upsert([{ 
          id: socket.id,
          username: userName
        }], { onConflict: 'id' });
    } catch (err) {
      console.log("Supabase save error (join):", err.message);
    }
    
    // Sync all states to the newly joined client
    const room = rooms.get(roomId);
    const data = roomData.get(roomId);
    
    // Sync code
    socket.emit("codeUpdate", data.code);
    socket.emit("languageUpdate", data.language);

    
    // Sync whiteboard state
    socket.emit("toggledWhiteboard", { 
      visible: roomWhiteboardState.get(roomId),
      shapes: roomWhiteboardData.get(roomId).shapes,
      drawings: roomWhiteboardData.get(roomId).drawings,
      textBoxes: roomWhiteboardData.get(roomId).textBoxes || []
    });
    
    // Sync video call state
    socket.emit("toggleVideoCall", { 
      visible: roomVideoCallState.get(roomId),
      participants: roomVideoCallData.get(roomId).participants
    });

    // Send chat history
    socket.emit("chatHistory", roomChatMessages.get(roomId) || []);

    // Send user list with avatar URLs
    socket.emit("userJoined", getUserList(roomId));
    
    // Broadcast to others
    io.to(roomId).emit("userJoined", getUserList(roomId));
    io.to(roomId).emit("userListUpdated", {
      users: getUserList(roomId),
      count: rooms.get(roomId).users.size
    });
  });

  // Chat message handling
  socket.on("sendMessage", async ({ roomId, message }) => {
    if (!roomId || !message || !currentUser) return;
    if (!roomChatMessages.has(roomId)) roomChatMessages.set(roomId, []);

    const timestamp = new Date().toISOString();
    
    const chatMessage = { 
      id: Date.now(), 
      sender: currentUser, 
      message, 
      timestamp: timestamp 
    };
    const messages = roomChatMessages.get(roomId);
    messages.push(chatMessage);
    if (messages.length > 100) messages.shift();
    roomChatMessages.set(roomId, messages);
    
    // Save to Supabase
    try {
      await supabase
        .from('chat_messages')
        .insert([{ 
          room_code: roomId, 
          sender: currentUser, 
          message: message,
          created_at: timestamp
        }]);
    } catch (err) {
      console.log("Supabase save error (chat):", err.message);
    }
    
    // Emit to all users in room
    io.to(roomId).emit("newMessage", chatMessage);
  });

  // Enhanced whiteboard synchronization
  socket.on("whiteboardJoin", (roomId) => {
    if (!roomId) return;
    
    socket.join(roomId);
    
    // Send current whiteboard state to new user
    const whiteboardData = roomWhiteboardData.get(roomId) || { shapes: [], drawings: [], textBoxes: [], users: [] };
    socket.emit("whiteboardStateSync", whiteboardData);
    
    // Add user to whiteboard users
    if (!whiteboardData.users) {
      whiteboardData.users = [];
    }
    if (!whiteboardData.users.find(u => u.id === socket.id)) {
      whiteboardData.users.push({
        id: socket.id,
        name: currentUser || `User ${socket.id.slice(-4)}`,
        cursor: { x: 0, y: 0 }
      });
      roomWhiteboardData.set(roomId, whiteboardData);
    }
    
    socket.to(roomId).emit("userJoinedWhiteboard", {
      id: socket.id,
      name: currentUser || `User ${socket.id.slice(-4)}`
    });
  });

  // Get whiteboard state on demand
  socket.on("getWhiteboardState", (roomId) => {
    if (!roomId) return;
    
    // Initialize if not exists
    if (!roomWhiteboardData.has(roomId)) {
      roomWhiteboardData.set(roomId, {
        shapes: [],
        drawings: [],
        textBoxes: [],
        users: []
      });
    }
    
    const whiteboardData = roomWhiteboardData.get(roomId);
    socket.emit("whiteboardStateSync", whiteboardData);
  });

  // Enhanced whiteboard drawing
  socket.on("draw", (data) => {
    const roomId = data.roomId;
    console.log('Draw received in room:', roomId, 'data:', data);
    if (!roomId || !roomWhiteboardData.has(roomId)) {
      console.log('Room not found:', roomId);
      return;
    }
    
    const drawing = {
      id: data.id || Date.now() + Math.random(),
      x0: data.x0, y0: data.y0, x1: data.x1, y1: data.y1, 
      color: data.color, tool: data.tool, width: data.width,
      userId: socket.id,
      timestamp: Date.now()
    };
    
    const whiteboardData = roomWhiteboardData.get(roomId);
    whiteboardData.drawings.push(drawing);
    roomWhiteboardData.set(roomId, whiteboardData);
    
    console.log('Broadcasting draw to room:', roomId);
    socket.to(roomId).emit("draw", drawing);
    console.log('Broadcast sent');
  });

  // Enhanced shape drawing
  socket.on("shapeDraw", ({ roomId, ...shapeData }) => {
    if (!roomId || !roomWhiteboardData.has(roomId)) return;
    
    const shape = {
      ...shapeData,
      id: Date.now() + Math.random(),
      userId: socket.id,
      timestamp: Date.now()
    };
    
    const whiteboardData = roomWhiteboardData.get(roomId);
    whiteboardData.shapes.push(shape);
    roomWhiteboardData.set(roomId, whiteboardData);
    
    socket.to(roomId).emit("shapeDraw", shape);
  });

  // Enhanced whiteboard state management
  socket.on("toggleWhiteboard", ({ roomId, visible }) => {
    if (typeof visible === "boolean") {
      roomWhiteboardState.set(roomId, visible);
      roomWhiteboardData.set(roomId, {
        shapes: [],
        drawings: [],
        textBoxes: [],
        users: roomWhiteboardData.get(roomId)?.users || []
      });
      
      io.to(roomId).emit("toggledWhiteboard", { 
        visible,
        shapes: roomWhiteboardData.get(roomId).shapes,
        drawings: roomWhiteboardData.get(roomId).drawings,
        textBoxes: roomWhiteboardData.get(roomId).textBoxes || []
      });
    }
  });

  // Shape update - when a shape is modified (resized, moved)
  socket.on("shapeUpdate", ({ roomId, shapeId, updates }) => {
    if (!roomId || !roomWhiteboardData.has(roomId)) return;
    
    const whiteboardData = roomWhiteboardData.get(roomId);
    const shapeIndex = whiteboardData.shapes.findIndex(s => s.id === shapeId);
    
    if (shapeIndex !== -1) {
      whiteboardData.shapes[shapeIndex] = { 
        ...whiteboardData.shapes[shapeIndex], 
        ...updates 
      };
      roomWhiteboardData.set(roomId, whiteboardData);
      
      socket.to(roomId).emit("shapeUpdated", { shapeId, updates });
    }
  });

  // Shape deletion
  socket.on("shapeDelete", ({ roomId, shapeId }) => {
    if (!roomId || !roomWhiteboardData.has(roomId)) return;
    
    const whiteboardData = roomWhiteboardData.get(roomId);
    whiteboardData.shapes = whiteboardData.shapes.filter(s => s.id !== shapeId);
    roomWhiteboardData.set(roomId, whiteboardData);
    
    socket.to(roomId).emit("shapeDeleted", { shapeId });
  });

  // Text box synchronization
  socket.on("textBoxAdd", ({ roomId, textBox }) => {
    if (!roomId || !roomWhiteboardData.has(roomId)) return;
    
    const whiteboardData = roomWhiteboardData.get(roomId);
    if (!whiteboardData.textBoxes) {
      whiteboardData.textBoxes = [];
    }
    whiteboardData.textBoxes.push(textBox);
    roomWhiteboardData.set(roomId, whiteboardData);
    
    socket.to(roomId).emit("textBoxAdded", textBox);
  });

  socket.on("textBoxUpdate", ({ roomId, textBoxId, updates }) => {
    if (!roomId || !roomWhiteboardData.has(roomId)) return;
    
    const whiteboardData = roomWhiteboardData.get(roomId);
    if (whiteboardData.textBoxes) {
      const textBoxIndex = whiteboardData.textBoxes.findIndex(t => t.id === textBoxId);
      if (textBoxIndex !== -1) {
        whiteboardData.textBoxes[textBoxIndex] = { 
          ...whiteboardData.textBoxes[textBoxIndex], 
          ...updates 
        };
        roomWhiteboardData.set(roomId, whiteboardData);
        
        socket.to(roomId).emit("textBoxUpdated", { textBoxId, updates });
      }
    }
  });

  socket.on("textBoxDelete", ({ roomId, textBoxId }) => {
    if (!roomId || !roomWhiteboardData.has(roomId)) return;
    
    const whiteboardData = roomWhiteboardData.get(roomId);
    if (whiteboardData.textBoxes) {
      whiteboardData.textBoxes = whiteboardData.textBoxes.filter(t => t.id !== textBoxId);
      roomWhiteboardData.set(roomId, whiteboardData);
      
      socket.to(roomId).emit("textBoxDeleted", { textBoxId });
    }
  });

  // Clear canvas - synced across all users
  socket.on("clearCanvas", ({ roomId }) => {
    if (!roomId || !roomWhiteboardData.has(roomId)) return;
    
    const whiteboardData = roomWhiteboardData.get(roomId);
    whiteboardData.shapes = [];
    whiteboardData.drawings = [];
    whiteboardData.textBoxes = [];
    roomWhiteboardData.set(roomId, whiteboardData);
    
    io.to(roomId).emit("canvasCleared");
  });

  // Undo operation - remove last drawing/shape
  socket.on("undoWhiteboard", ({ roomId }) => {
    if (!roomId || !roomWhiteboardData.has(roomId)) return;
    
    const whiteboardData = roomWhiteboardData.get(roomId);
    let removed = null;
    
    // Try to remove last shape
    if (whiteboardData.shapes.length > 0) {
      removed = whiteboardData.shapes.pop();
    } 
    // Try to remove last drawing
    else if (whiteboardData.drawings.length > 0) {
      removed = whiteboardData.drawings.pop();
    }
    
    roomWhiteboardData.set(roomId, whiteboardData);
    
    // Broadcast the undo to all users in the room
    io.to(roomId).emit("whiteboardUndone", { removed });
  });

  // Video call start - notify all users in room (WhatsApp style)
  socket.on("startVideoCall", ({ roomId, userName }) => {
    if (!roomId || !userName) return;
    
    // Update video call state
    roomVideoCallState.set(roomId, true);
    roomVideoCallData.set(roomId, {
      active: true,
      participants: roomVideoCallData.get(roomId)?.participants || []
    });
    
    // Generate a call ID
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get all sockets in the room
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    
    if (roomSockets) {
      roomSockets.forEach((socketId) => {
        const socketInfo = io.sockets.sockets.get(socketId);
        if (socketInfo && socketInfo.data.userName !== userName) {
          // This is another user - send them incomingCall notification
          socketInfo.emit("incomingCall", {
            callId,
            callerName: userName,
            callerId: socket.id,
            roomId,
            targetUser: socketInfo.data.userName,
            timestamp: Date.now()
          });
        } else if (socketInfo && socketInfo.data.userName === userName) {
          // This is the initiator - notify them that call started
          socketInfo.emit("videoCallStarted", { 
            roomId,
            initiator: userName,
            callId: callId,
            visible: true
          });
        }
      });
    }
  });

  // Send call invite to specific users in room
  socket.on("sendCallInvite", ({ roomId, targetUsers, callerName, callerId }) => {
    if (!roomId || !callerName || !targetUsers || !Array.isArray(targetUsers)) return;
    
    // Store the pending call
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    activeCalls.set(callId, {
      id: callId,
      roomId,
      callerId: socket.id,
      callerName,
      targetUsers,
      status: 'pending',
      createdAt: Date.now()
    });
    
    // Store caller socket mapping
    userCallStatus.set(socket.id, {
      callId,
      status: 'calling',
      roomId
    });
    
    // Send invite to specific users in the room
    targetUsers.forEach(targetUser => {
      io.to(roomId).emit("incomingCall", {
        callId,
        callerName,
        callerId: socket.id,
        roomId,
        targetUser,
        timestamp: Date.now()
      });
    });
    
    // Notify caller that invites were sent
    socket.emit("callInviteSent", {
      callId,
      targetUsers,
      roomId
    });
  });

  // Accept incoming call
  socket.on("acceptCall", ({ callId, userName }) => {
    if (!callId || !userName) return;
    
    const call = activeCalls.get(callId);
    if (!call) {
      socket.emit("callError", { message: "Call not found or already ended" });
      return;
    }
    
    // Update call status
    call.status = 'accepted';
    call.acceptedBy = socket.id;
    call.acceptedByName = userName;
    activeCalls.set(callId, call);
    
    // Notify the caller
    io.to(call.callerId).emit("callAccepted", {
      callId,
      acceptedBy: userName,
      roomId: call.roomId,
      socketId: socket.id
    });
    
    // Notify other users in the room that call started
    io.to(call.roomId).emit("videoCallStarted", {
      roomId: call.roomId,
      initiator: call.callerName,
      callId
    });
    
    // Update video call state
    roomVideoCallState.set(call.roomId, true);
    roomVideoCallData.set(call.roomId, {
      active: true,
      participants: []
    });
  });

  // Decline incoming call
  socket.on("declineCall", ({ callId, userName, reason }) => {
    if (!callId || !userName) return;
    
    const call = activeCalls.get(callId);
    if (!call) return;
    
    // Update call status
    call.status = 'declined';
    call.declinedBy = socket.id;
    call.declinedByName = userName;
    call.declineReason = reason || 'declined';
    activeCalls.set(callId, call);
    
    // Notify the caller
    io.to(call.callerId).emit("callDeclined", {
      callId,
      declinedBy: userName,
      reason: call.declineReason,
      roomId: call.roomId
    });
  });

  // Handle call ended notification
  socket.on("callEnded", ({ callId, roomId, userName }) => {
    if (!callId || !roomId || !userName) return;
    
    // Clear the call
    activeCalls.delete(callId);
    
    // Update video call state
    roomVideoCallState.set(roomId, false);
    roomVideoCallData.set(roomId, {
      active: false,
      participants: []
    });
    
    // Notify all users in room
    io.to(roomId).emit("videoCallEnded", {
      roomId,
      endedBy: userName,
      callId
    });
  });

  // Video call end - notify all users in room
  socket.on("endVideoCall", ({ roomId, userName }) => {
    if (!roomId || !userName) return;
    
    // Clear any pending calls for this room
    activeCalls.forEach((call, callId) => {
      if (call.roomId === roomId) {
        io.to(call.callerId).emit("callEnded", {
          callId,
          roomId,
          endedBy: userName
        });
        activeCalls.delete(callId);
      }
    });
    
    // Update video call state
    roomVideoCallState.set(roomId, false);
    roomVideoCallData.set(roomId, {
      active: false,
      participants: []
    });
    
    // Broadcast to all users in the room
    io.to(roomId).emit("videoCallEnded", { 
      roomId,
      endedBy: userName
    });
  });

  // Enhanced video call synchronization (legacy support)
  socket.on("toggleVideoCall", ({ roomId, visible }) => {
    if (typeof visible === "boolean") {
      roomVideoCallState.set(roomId, visible);
      roomVideoCallData.set(roomId, {
        active: visible,
        participants: roomVideoCallData.get(roomId)?.participants || []
      });
      
      io.to(roomId).emit("toggleVideoCall", { 
        visible,
        participants: roomVideoCallData.get(roomId).participants
      });
    }
  });

  // Video call participant management
  socket.on("joinVideoCall", ({ roomId, userName }) => {
    if (!roomId || !userName) return;
    
    const videoCallData = roomVideoCallData.get(roomId);
    if (videoCallData && !videoCallData.participants.find(p => p.id === socket.id)) {
      videoCallData.participants.push({
        id: socket.id,
        name: userName,
        joinedAt: Date.now()
      });
      roomVideoCallData.set(roomId, videoCallData);
      
      io.to(roomId).emit("videoCallParticipantsUpdated", {
        participants: videoCallData.participants
      });
    }
  });

  socket.on("leaveVideoCall", ({ roomId }) => {
    if (!roomId) return;
    
    const videoCallData = roomVideoCallData.get(roomId);
    if (videoCallData) {
      videoCallData.participants = videoCallData.participants.filter(p => p.id !== socket.id);
      roomVideoCallData.set(roomId, videoCallData);
      
      io.to(roomId).emit("videoCallParticipantsUpdated", {
        participants: videoCallData.participants
      });
    }
  });

  // Typing indicator - broadcast to other users in the room
  socket.on("typing", ({ roomId, userName }) => {
    if (!roomId || !userName) return;
    
    // Broadcast to all OTHER users in the room (not to sender)
    socket.to(roomId).emit("userTyping", { userName });
  });

// Enhanced code synchronization
  socket.on("codeChange", async ({ roomId, code, language }) => {
    if (!roomId || typeof code !== "string") return;

    if (rooms.has(roomId)) {
      rooms.get(roomId).code = code;
    }
    if (roomData.has(roomId)) {
      roomData.get(roomId).code = code;
      if (language) {
        roomData.get(roomId).language = language;
      }
    }

    socket.to(roomId).emit("codeUpdate", code);
  });
  
  // Socket compileCode handler
  socket.on("compileCode", async ({ code, roomId, language, version, input }) => {
    console.log("Socket compile request from room:", roomId, "language:", language);
    
    try {
      const languageMap = {
        'javascript': 'node18',
        'python': 'python3.12',
        'cpp': 'gcc12',
        'c': 'gcc12',
        'java': 'java23'
      };
      
      const runtime = languageMap[language] || 'node18';
      
      const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
        language: runtime,
        version: version || "1.0.0",
        files: [{ name: `main.${language}`, content: code }],
        stdin: input || ""
      }, { timeout: 10000 });

      io.to(roomId).emit("codeResponse", response.data);
    } catch (error) {
      console.error("Socket Piston error:", error.response?.data || error.message);
      io.to(roomId).emit("codeResponse", { 
        run: { 
          stdout: "", 
          stderr: `Error: ${error.response?.data?.message || error.message}`,
          output: `Error: ${error.response?.data?.message || error.message}`
        } 
      });
    }
  });

  // User presence management
  socket.on("leaveRoom", async () => {
    if (currentRoom && currentUser) {
      if (rooms.has(currentRoom)) {
        removeUserFromRoom(currentRoom, socket.id);
        io.to(currentRoom).emit("userJoined", getUserList(currentRoom));
        io.to(currentRoom).emit("userLeft", { userName: currentUser, reason: "left" });
        io.to(currentRoom).emit("userListUpdated", {
          users: getUserList(currentRoom),
          count: rooms.get(currentRoom)?.users?.size || 0
        });
      }
      socket.leave(currentRoom);
      
      currentRoom = null;
      currentUser = null;
    }
  });

  socket.on("disconnect", async () => {
    if (currentRoom && currentUser) {
      if (rooms.has(currentRoom)) {
        removeUserFromRoom(currentRoom, socket.id);
        io.to(currentRoom).emit("userJoined", getUserList(currentRoom));
        io.to(currentRoom).emit("userLeft", { userName: currentUser, reason: "disconnected" });
        io.to(currentRoom).emit("userListUpdated", {
          users: getUserList(currentRoom),
          count: rooms.get(currentRoom)?.users?.size || 0
        });
      }
    }
    console.log("🔌 User Disconnected:", socket.id);
  });
});

// Static Frontend Serving
const port = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Profile picture upload endpoint (requires authentication)
app.post('/api/upload-profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get user ID from request body (sent by authenticated user)
    const userId = req.body.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the file path - serve from backend URL
    const profilePictureUrl = `https://real-time-code-editor-7n13.onrender.com/uploads/${req.file.filename}`;

    console.log('Saving profile for userId:', userId, 'avatar_url:', profilePictureUrl);
    
    // Use upsert to create or update the profile
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId,
        avatar_url: profilePictureUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    console.log('Upsert result:', { data, error });

    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).json({ error: 'Failed to save profile', details: error.message });
    }

    res.json({ 
      success: true, 
      profilePictureUrl: profilePictureUrl 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Server error during upload', details: error.message });
  }
});

// Remove profile picture endpoint
app.delete('/api/remove-profile-picture', async (req, res) => {
  try {
    // Get user ID from request body
    const userId = req.body.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('Removing profile picture for userId:', userId);
    
    // Update profile to remove avatar_url
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to remove profile picture', details: error.message });
    }

    console.log('Profile picture removed successfully');
    res.json({ 
      success: true, 
      message: 'Profile picture removed' 
    });
  } catch (error) {
    console.error('Remove profile picture error:', error);
    res.status(500).json({ error: 'Server error during removal', details: error.message });
  }
});

// SINGLE consolidated Piston API code execution endpoint
app.post('/api/compileCode', async (req, res) => {
  try {
    const { language, sourceCode, stdin = '' } = req.body;

    console.log('Compile request:', { language, hasSource: !!sourceCode, hasStdin: !!stdin });

    if (!language || !sourceCode) {
      return res.status(400).json({ error: 'Language and source code are required' });
    }

    // Language to Piston API runtime mapping - using verified correct runtimes
    const runtimeMap = {
      javascript: 'node18',
      python: 'python3.12',
      java: 'java23',
      cpp: 'gcc12',
      c: 'gcc12'
    };

    const runtime = runtimeMap[language];
    if (!runtime) {
      return res.status(400).json({ error: 'Unsupported language' });
    }

    const PISTON_URL = 'https://emkc.org/api/v2/piston/execute';
    
    const payload = {
      language: runtime,
      version: '1.0.0',
      files: [{ name: `main.${language}`, content: sourceCode }],
      stdin: stdin
    };

    console.log('Sending to Piston:', payload);

    const response = await axios.post(PISTON_URL, payload, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });

    const result = response.data;
    console.log('Piston response:', result);

    // Parse output according to Piston format
    let output = '';
    if (result.run && result.run.stdout) {
      output += result.run.stdout;
    }
    if (result.run && result.run.stderr) {
      output += '\n--- STDERR ---\n' + result.run.stderr;
    }
    if (!output.trim() && result.run?.output) {
      output = result.run.output;
    }
    if (!output.trim()) {
      output = 'No output produced';
    }

    res.json({ 
      success: true, 
      output: output.trim(),
      run: result.run,
      language: language
    });

  } catch (error) {
    console.error('Compile error:', error.response?.data || error.message);
    
    if (error.code === 'ECONNABORTED') {
      res.status(408).json({ error: 'Execution timeout (15s)' });
    } else if (error.response?.status === 429) {
      res.status(429).json({ error: 'Rate limited. Try again in a few seconds.' });
    } else {
      res.status(500).json({ error: 'Execution failed', details: error.message });
    }
  }
});

// Serve uploaded files statically (SINGLE instance)
app.use('/uploads', express.static(uploadsDir));

// Serve frontend build (SINGLE instance)
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

