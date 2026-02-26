import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  credentials: true,
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
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

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  let currentRoom = null;
  let currentUser = null;

  socket.on("join", async ({ roomId, userName }) => {
    if (!roomId || !userName) return;

    // Leave previous room (if any)
    if (currentRoom) {
      socket.leave(currentRoom);
      if (rooms.has(currentRoom)) {
        rooms.get(currentRoom).users.delete(currentUser);
        io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom).users));
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
        output: "",
      });
    }

    // Initialize whiteboard state
    if (!roomWhiteboardState.has(roomId)) {
      roomWhiteboardState.set(roomId, false);
      roomWhiteboardData.set(roomId, {
        shapes: [],
        drawings: [],
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

    // Add user to room
    rooms.get(roomId).users.add(userName);
    
    // Sync all states to the newly joined client
    const room = rooms.get(roomId);
    const data = roomData.get(roomId);
    
    // Sync code
    socket.emit("codeUpdate", data.code);
    socket.emit("languageUpdate", data.language);
    socket.emit("outputUpdate", data.output);
    
    // Sync whiteboard state
    socket.emit("toggledWhiteboard", { 
      visible: roomWhiteboardState.get(roomId),
      shapes: roomWhiteboardData.get(roomId).shapes,
      drawings: roomWhiteboardData.get(roomId).drawings
    });
    
    // Sync video call state
    socket.emit("toggleVideoCall", { 
      visible: roomVideoCallState.get(roomId),
      participants: roomVideoCallData.get(roomId).participants
    });

    // Send chat history
    socket.emit("chatHistory", roomChatMessages.get(roomId) || []);

    // Send user list
    socket.emit("userJoined", Array.from(room.users));
    
    // Broadcast to others
    io.to(roomId).emit("userJoined", Array.from(room.users));
    io.to(roomId).emit("userListUpdated", {
      users: Array.from(room.users),
      count: room.users.size
    });
  });

  // Chat message handling
  socket.on("sendMessage", ({ roomId, message }) => {
    if (!roomId || !message || !currentUser) return;
    if (!roomChatMessages.has(roomId)) roomChatMessages.set(roomId, []);

    const chatMessage = { 
      id: Date.now(), 
      sender: currentUser, 
      message, 
      timestamp: Date.now() 
    };
    const messages = roomChatMessages.get(roomId);
    messages.push(chatMessage);
    if (messages.length > 100) messages.shift();
    roomChatMessages.set(roomId, messages);
    io.to(roomId).emit("newMessage", chatMessage);
  });

  // Enhanced whiteboard synchronization
  socket.on("whiteboardJoin", (roomId) => {
    if (!roomId) return;
    
    socket.join(roomId);
    
    // Send current whiteboard state to new user
    const whiteboardData = roomWhiteboardData.get(roomId) || { shapes: [], drawings: [], users: [] };
    socket.emit("whiteboardStateSync", whiteboardData);
    
    // Add user to whiteboard users
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

  // Enhanced whiteboard drawing
  socket.on("draw", ({ roomId, x0, y0, x1, y1, color, tool, width }) => {
    if (!roomId || !roomWhiteboardData.has(roomId)) return;
    
    const drawing = {
      id: Date.now() + Math.random(),
      x0, y0, x1, y1, color, tool, width,
      userId: socket.id,
      timestamp: Date.now()
    };
    
    const whiteboardData = roomWhiteboardData.get(roomId);
    whiteboardData.drawings.push(drawing);
    roomWhiteboardData.set(roomId, whiteboardData);
    
    socket.to(roomId).emit("draw", drawing);
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
        users: roomWhiteboardData.get(roomId)?.users || []
      });
      
      io.to(roomId).emit("toggledWhiteboard", { 
        visible,
        shapes: roomWhiteboardData.get(roomId).shapes,
        drawings: roomWhiteboardData.get(roomId).drawings
      });
    }
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
    
    // Broadcast to all users in the room
    io.to(roomId).emit("videoCallStarted", { 
      roomId,
      initiator: userName,
      visible: true
    });
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
  socket.on("codeChange", async ({ roomId, code }) => {
    if (!roomId || typeof code !== "string") return;

    if (rooms.has(roomId)) {
      rooms.get(roomId).code = code;
    }
    if (roomData.has(roomId)) {
      roomData.get(roomId).code = code;
    }

    socket.to(roomId).emit("codeUpdate", code);
  });

  // Code output synchronization - broadcast output to all users in room
  socket.on("codeOutput", ({ roomId, output }) => {
    if (!roomId || typeof output !== "string") return;

    // Store output in room data
    if (roomData.has(roomId)) {
      roomData.get(roomId).output = output;
    }

    // Broadcast output to all OTHER users in the room (not the sender)
    socket.to(roomId).emit("codeOutput", { output });
  });

  // User presence management
  socket.on("leaveRoom", async () => {
    if (currentRoom && currentUser) {
      if (rooms.has(currentRoom)) {
        rooms.get(currentRoom).users.delete(currentUser);
        io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom).users));
        io.to(currentRoom).emit("userLeft", { userName: currentUser, reason: "left" });
        io.to(currentRoom).emit("userListUpdated", {
          users: Array.from(rooms.get(currentRoom).users),
          count: rooms.get(currentRoom).users.size
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
        rooms.get(currentRoom).users.delete(currentUser);
        io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom).users));
        io.to(currentRoom).emit("userLeft", { userName: currentUser, reason: "disconnected" });
        io.to(currentRoom).emit("userListUpdated", {
          users: Array.from(rooms.get(currentRoom).users),
          count: rooms.get(currentRoom).users.size
        });
      }
    }
    console.log("🔌 User Disconnected:", socket.id);
  });

  socket.on(
    "compileCode",
    async ({ code, roomId, language, version, input }) => {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        try {
          const response = await fetch("https://emkc.org/api/v2/piston/execute", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              language,
              version: version || "*",
              files: [
                {
                  content: code,
                },
              ],
              stdin: input || "",
            })
          });

          const result = await response.json();
          room.output = result?.run?.output || "";
          io.to(roomId).emit("codeResponse", result);
        } catch (error) {
          console.error("Compile error:", error);
          io.to(roomId).emit("codeResponse", { run: { output: "Error: " + error.message } });
        }
      }
    }
  );

});

// Static Frontend Serving
const port = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
