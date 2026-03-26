import React, { useEffect, useRef, useState, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";
import { FaCopy, FaUsers, FaBars, FaVideo, FaVideoSlash, FaCode, FaCompress, FaExpand, FaChevronLeft, FaChevronRight, FaChevronUp, FaChevronDown, FaMoon, FaSun, FaSignOutAlt, FaPaperPlane, FaComments, FaPhone, FaInstagram, FaLinkedin, FaUser, FaCamera} from "react-icons/fa";
import Whiteboard from "./components/Whiteboard";
import VideoCallSidebar from "./components/VideoCallSidebar";
import VideoCall from "./components/VideoCall";
import IncomingCallModal from "./components/IncomingCallModal";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import './index.css'
import { v4 as uuid } from "uuid";
import logo from "./assets/web-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import ProfilePictureUpload from "./components/ProfilePictureUpload";
import ResizableIO from "./components/ResizableIO";
import { supabase } from "./supabase/supabaseClient";

// Get socket URL from environment variable, default to localhost in development
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Initialize socket with connection handling
const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

// Main App component for the code editor
const CodeEditor = () => {
  const navigate = useNavigate();
  const { logout, currentUser: firebaseUser, userProfile, uploadProfilePicture } = useAuth();
  
  const [joined, setJoined] = useState(false);
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start code here");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [pageTheme, setPageTheme] = useState("vs-dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [videoSidebarOpen, setVideoSidebarOpen] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  
  // Video call state
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [videoCallRoomId, setVideoCallRoomId] = useState("");
  const [videoCallInitiator, setVideoCallInitiator] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Call state
  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [participantsList, setParticipantsList] = useState([]);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  
  // Track active call notification timers and call sessions
  const notificationTimersRef = useRef(new Map());
  const lastCallIdRef = useRef(null);
  
  // Ringtone audio ref
  const ringtoneRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);
  
  // Play ringtone function
  const playRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current.play().catch(err => console.log('Ringtone play error:', err));
    }
  }, []);
  
  // Stop ringtone function
  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(false);

  // Compile & Run state
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showOutputPanel, setShowOutputPanel] = useState(false);

  


  // Video sidebar width state - for resizable sidebar
  const [videoSidebarWidth, setVideoSidebarWidth] = useState(() => {
    // Responsive initial width based on screen size
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) return 280;
      if (window.innerWidth < 1024) return 320;
      return 400;
    }
    return 400;
  });

  const currentRoom = useRef("");
  const currentUserRef = useRef("");
  const chatEndRef = useRef(null);

  // Auto-fill userName from Firebase auth - always sync when firebaseUser changes
  useEffect(() => {
    if (firebaseUser) {
      const firebaseUserName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '';
      setUserName(prev => {
        // Only update if we have a valid Firebase user name and it's different
        if (firebaseUserName && firebaseUserName !== prev) {
          return firebaseUserName;
        }
        return prev;
      });
    }
    // Note: When firebaseUser is null (logged out), we DON'T reset userName
    // This allows guests to keep their entered name
  }, [firebaseUser]);

  // Reset state when user logs out (but not when just visiting as guest)
  useEffect(() => {
    if (!firebaseUser && joined) {
      // User was logged out while in a room - handle gracefully
      console.log('User logged out, maintaining session');
    }
  }, [firebaseUser, joined]);

  useEffect(() => {
    socket.on("userJoined", (updatedUsers) => {
      if (Array.isArray(updatedUsers)) {
        // Keep both string and object user formats for avatar support
        setUsers(updatedUsers);
      }
    });

    socket.on("userLeft", ({ userName, reason }) => {
      const message = reason === "left" ? `${userName} left the room` : `${userName} disconnected`;
      const id = Date.now();
      setNotifications(prev => [...prev, { id, message, type: "info" }]);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 3000);
    });

    socket.on("codeUpdate", (newCode) => {
      if (newCode !== code) setCode(newCode);
    });

    socket.on("userTyping", (data) => {
      const typingUser = typeof data === 'string' ? data : data.userName;
      if (!typingUser || typingUser === userName) return;
      
      setTypingUsers(prev => {
        if (prev.includes(typingUser)) return prev;
        return [...prev, typingUser];
      });
      
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u !== typingUser));
      }, 2000);
    });

    socket.on("toggledWhiteboard", ({visible}) => {
      setShowWhiteboard(visible);
    });

    socket.on("languageUpdate", (lang) => setLanguage(lang));
    socket.on("codeResponse", (res) => {
      // Handle different response formats from the Piston API
      let outputText = "";
      
      if (res?.run) {
        // Standard Piston API response format
        if (res.run.stdout) outputText += res.run.stdout;
        if (res.run.stderr) outputText += "\n[Error]: " + res.run.stderr;
        if (res.run.output && !res.run.stdout) outputText += res.run.output;
      } else if (res?.compile?.output) {
        // Compilation output
        outputText = res.compile.output;
      }
      
      if (!outputText.trim()) {
        setOutput("No output");
      } else {
        setOutput(outputText.trim());
      }
    });
    socket.on("outputUpdate", (out) => setOutput(out));
    socket.on("codeOutput", ({ output }) => {
      setOutput(output);
    });

    socket.on("videoCallStarted", ({ roomId: callRoomId, initiator, callId }) => {
      // Always show notification for every call, regardless of previous state
      // Skip notification only if we're the ones who started the call
      if (initiator !== userName) {
        // Check if this is a new call (different callId) or if no call is currently active
        const isNewCall = callId !== lastCallIdRef.current || !showVideoCall;
        
        // Update call tracking
        lastCallIdRef.current = callId;
        
        setVideoCallInitiator(initiator);
        setVideoCallRoomId(callRoomId);
        
        // Only set isInCall to true if this is truly a new call session
        if (isNewCall) {
          setIsInCall(true);
        }
        
        const id = Date.now();
        
        // Clear any existing video call notifications first to avoid duplicates
        setNotifications(prev => [
          ...prev.filter(n => n.type !== "videoCall"),
          { 
            id, 
            message: `${initiator} started a video call`, 
            type: "videoCall",
            callRoomId,
            initiator,
            callId
          }
        ]);
        
        // Store timer reference for cleanup
        const timerId = setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
        notificationTimersRef.current.set(id, timerId);
        
        // Open video call sidebar after a short delay
        setTimeout(() => {
          setShowVideoCall(true);
          setVideoSidebarOpen(true);
          setSidebarOpen(true);
        }, 1500);
      } else {
        // We're the initiator - still track the call
        lastCallIdRef.current = callId;
        setVideoCallInitiator(userName);
        setVideoCallRoomId(callRoomId);
        setShowVideoCall(true);
        setVideoSidebarOpen(true);
      }
    });

    socket.on("incomingCall", ({ callId, callerName, callerId, roomId, targetUser }) => {
      if (targetUser === userName || !targetUser) {
        setIncomingCall({ callId, callerName, callerId, roomId });
        
        // Play ringtone when incoming call is received
        playRingtone();
        
        const id = Date.now();
        setNotifications(prev => [...prev, { 
          id, 
          message: `${callerName} is calling you`, 
          type: "incomingCall",
          callId,
          callerName,
          callerId,
          roomId
        }]);
        
        // Auto-dismiss notification after 4 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
        
        // Don't auto-open sidebar for other users - they need to accept the call first
        // setTimeout(() => {
        //   setShowVideoCall(true);
        //   setSidebarOpen(true);
        // }, 1000);
      }
    });

    socket.on("callAccepted", ({ callId, acceptedBy, roomId }) => {
      const id = Date.now();
      setNotifications(prev => [...prev, { 
        id, 
        message: `${acceptedBy} joined the call`, 
        type: "info" 
      }]);
      
      setIsInCall(true);
      setParticipantsList(prev => [...prev, { name: acceptedBy, id: callId }]);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 3000);
    });

    socket.on("callDeclined", ({ callId, declinedBy, reason, roomId }) => {
      const id = Date.now();
      setNotifications(prev => [...prev, { 
        id, 
        message: `${declinedBy} declined the call`, 
        type: "info" 
      }]);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 3000);
    });

    socket.on("callError", ({ message }) => {
      const id = Date.now();
      setNotifications(prev => [...prev, { 
        id, 
        message: `Call error: ${message}`, 
        type: "error" 
      }]);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    });

    socket.on("videoCallEnded", ({ roomId: endedRoomId, endedBy }) => {
      // Stop ringtone if playing
      stopRingtone();
      
      if (endedRoomId === videoCallRoomId || endedRoomId === roomId) {
        setShowVideoCall(false);
        setVideoCallRoomId("");
        setVideoCallInitiator("");
        setIsInCall(false);
        setIncomingCall(null);
        setParticipantsList([]);
        
        // Reset call tracking for new calls
        lastCallIdRef.current = null;
        
        // Clear any pending notification timers
        notificationTimersRef.current.forEach((timer) => clearTimeout(timer));
        notificationTimersRef.current.clear();
        
        // Clear video call notifications
        setNotifications(prev => prev.filter(n => n.type !== "videoCall"));
        
        const id = Date.now();
        setNotifications(prev => [...prev, { 
          id, 
          message: endedBy === userName ? "Call ended" : `${endedBy} ended the call`, 
          type: "info" 
        }]);
        
        // Auto-dismiss notification after 3 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
      }
    });

    socket.on("videoCallParticipantsUpdated", ({ participants }) => {
      setParticipantsList(participants);
    });

    socket.on("toggleVideoCall", ({ visible, roomId: callRoomId, initiator }) => {
      setShowVideoCall(visible);
      if (callRoomId) setVideoCallRoomId(callRoomId);
    });

    socket.on("chatHistory", (messages) => {
      setChatMessages(messages || []);
    });

    socket.on("newMessage", (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off("userJoined");
      socket.off("userLeft");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeResponse");
      socket.off("outputUpdate");
      socket.off("codeOutput");
      socket.off("toggledWhiteboard");
      socket.off("videoCallStarted");
      socket.off("incomingCall");
      socket.off("callAccepted");
      socket.off("callDeclined");
      socket.off("callError");
      socket.off("videoCallEnded");
      socket.off("videoCallParticipantsUpdated");
      socket.off("toggleVideoCall");
      socket.off("chatHistory");
      socket.off("newMessage");
    };
  }, [code, videoCallRoomId, userName, playRingtone, stopRingtone, showVideoCall]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);



  useEffect(() => {
    const leave = () => socket.emit("leaveRoom");
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, []);

  const joinRoom = async () => {
    if (roomId && userName) {
      currentRoom.current = roomId;
      currentUserRef.current = userName;
      
      // Get Firebase UID if user is authenticated
      const userId = firebaseUser ? firebaseUser.uid : null;
      
      // Save room to Supabase
      await supabase
        .from('rooms')
        .upsert([{ 
          room_code: roomId, 
          created_by: userName,
          is_active: true
        }], { onConflict: 'room_code' })
      
      // Save participant to Supabase
      await supabase
        .from('room_participants')
        .insert([{ 
          room_code: roomId, 
          user_name: userName,
          user_id: userId // Save Firebase UID if available
        }])
      
      // Pass userId to backend for proper user tracking
      socket.emit("join", { roomId, userName, userId });
      socket.emit("getWhiteboardState", { roomId });
      setJoined(true);
    }
  };

  const leaveRoom = async () => {
    if (showVideoCall) {
      socket.emit("endVideoCall", { roomId: videoCallRoomId, userName });
    }
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// start code here");
    setLanguage("javascript");
    setVersion("18.15.0");
    setShowVideoCall(false);
    setVideoCallRoomId("");
    setVideoCallInitiator("");
    setIncomingCall(null);
    setIsInCall(false);
    setParticipantsList([]);
    setChatMessages([]);
    setShowChat(false);
  };

  const handleLogout = async () => {
    await leaveRoom();
    await logout();
    navigate('/');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied!");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode, language });
    socket.emit("typing", { roomId, userName });
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    socket.emit("languageChange", { roomId, language: newLang });
  };

  const toggleTheme = () => {
    setPageTheme((prev) => (prev === "vs-dark" ? "light" : "vs-dark"));
  };

  const generateRoomId = () => {
    const newId = uuid();
    setRoomId(newId);
  };

  const toggleWhiteboard = () => {
    if (roomId) {
      const newVisibility = !showWhiteboard;
      setShowWhiteboard(newVisibility);
      socket.emit("toggleWhiteboard", { roomId, visible: newVisibility });
    }
  };

  const toggleVideoCall = () => {
    if (roomId) {
      const newVisibility = !showVideoCall;
      setShowVideoCall(newVisibility);
      setVideoCallRoomId(roomId);
      setVideoCallInitiator(newVisibility ? userName : "");
      setVideoSidebarOpen(newVisibility);
      setSidebarOpen(true);
      
      if (newVisibility) {
        socket.emit("startVideoCall", { roomId: roomId, userName });
      } else {
        socket.emit("endVideoCall", { roomId: roomId, userName });
      }
    }
  };

  const handleEndVideoCall = () => {
    if (videoCallRoomId) {
      socket.emit("endVideoCall", { roomId: videoCallRoomId, userName });
      setShowVideoCall(false);
      setVideoCallRoomId("");
      setVideoCallInitiator("");
      setIsInCall(false);
      setIncomingCall(null);
      setParticipantsList([]);
    }
  };

  const handleAcceptCall = () => {
    if (incomingCall) {
      // Stop ringtone when accepting call
      stopRingtone();
      
      socket.emit("acceptCall", { callId: incomingCall.callId, userName });
      setShowVideoCall(true);
      setVideoSidebarOpen(true);
      setSidebarOpen(true);
      setIsInCall(true);
      setIncomingCall(null);
    }
  };

  const handleDeclineCall = () => {
    if (incomingCall) {
      // Stop ringtone when declining call
      stopRingtone();
      
      socket.emit("declineCall", { callId: incomingCall.callId, userName, reason: 'declined' });
      setIncomingCall(null);
      setNotifications(prev => prev.filter(n => n.type !== "incomingCall"));
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && roomId) {
      const messageText = newMessage.trim();
      
      // Send via socket (backend will save to Supabase)
      socket.emit("sendMessage", { roomId, message: messageText });
      
      setNewMessage("");
    }
  };

  const runCode = () => {
    socket.emit("compileCode", {
      code,
      roomId,
      language,
      version: "18.15.0",
      input
    });
  };

  const toggleOutputPanel = () => {
    setShowOutputPanel(!showOutputPanel);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const [displayText, setDisplayText] = useState("");
  const fullText = "Collaborative coding in real-time";
  
  useEffect(() => {
    let index = 0;
    let isDeleting = false;
    let timeout;
    
    const typeWriter = () => {
      if (!isDeleting) {
        setDisplayText(fullText.slice(0, index + 1));
        index++;
        if (index === fullText.length) {
          isDeleting = true;
          timeout = setTimeout(typeWriter, 2000);
          return;
        }
        timeout = setTimeout(typeWriter, 100);
      } else {
        setDisplayText(fullText.slice(0, index - 1));
        index--;
        if (index === 0) isDeleting = false;
        timeout = setTimeout(typeWriter, 50);
      }
    };
    
    typeWriter();
    return () => clearTimeout(timeout);
  }, []);

  const arcadeGreen = "#00ff00";
  const arcadeGreenDark = "#00cc00";
  const arcadeGreenLight = "#66ff66";
  const arcadeBg = "#0a0a0a";
  const arcadeBgLight = "#1a1a1a";
  const sapGreen = "#00FF7F";
  const blackColor = "#000000";

  // Get avatar URL helper
  const getAvatarUrl = () => {
    // Check userProfile from AuthContext first (this has the avatar from Supabase)
    if (userProfile?.avatar_url) return userProfile.avatar_url;
    // Check Firebase photoURL as fallback
    if (firebaseUser?.photoURL) return firebaseUser.photoURL;
    return null;
  };

  const userAvatarUrl = getAvatarUrl();
  
  // Debug log to check what's available
  console.log('User Profile:', userProfile);
  console.log('Firebase User:', firebaseUser);
  console.log('Avatar URL:', userAvatarUrl);

  // Login screen (when not joined)
  if (!joined) {
    return (
      <div style={{ backgroundColor: arcadeBg, fontFamily: '"Press Start 2P", cursive', minHeight: '100vh', overflowY: 'auto' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96" style={{ backgroundColor: `${arcadeGreen}10`, borderRadius: '50%', filter: 'blur(60px)' }}></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96" style={{ backgroundColor: `${arcadeGreen}10`, borderRadius: '50%', filter: 'blur(60px)' }}></div>
        </div>
        
        <header className="fixed top-0 left-0 right-0 z-50 w-full p-4 flex items-center justify-between" style={{ backgroundColor: arcadeBgLight, borderBottom: `3px solid ${arcadeGreen}` }}>
          <div className="flex items-center">
            <img src={logo} alt="Logo" className="w-16 h-16 rounded-xl" style={{ border: `2px solid ${arcadeGreen}`, boxShadow: `0 0 20px ${arcadeGreen}40` }} />
            <h1 className="ml-4 text-2xl" style={{ color: arcadeGreen, textShadow: `0 0 10px ${arcadeGreen}` }}>Collab Code</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Home Link */}
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs"
              style={{ border: `2px solid ${arcadeGreen}`, color: arcadeGreen }}
            >
              HOME
            </button>
            
            {/* User Icon with Hover Dropdown - Only icon, to the right of HOME */}
            {firebaseUser && (
              <div 
                className="relative"
                onMouseEnter={() => setShowLogoutDropdown(true)}
                onMouseLeave={() => setShowLogoutDropdown(false)}
              >
                {userAvatarUrl ? (
                  <img 
                    src={userAvatarUrl} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full object-cover cursor-pointer"
                    style={{ border: `2px solid ${arcadeGreen}` }}
                  />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer"
                    style={{ backgroundColor: arcadeGreen, color: arcadeBg }}
                  >
                    {(firebaseUser.displayName || firebaseUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Dropdown Menu - stays visible when hovering */}
                {showLogoutDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-70 rounded-xl overflow-hidden z-50"
                    style={{ backgroundColor: arcadeBgLight, border: `2px solid ${arcadeGreen}` }}
                    onMouseEnter={() => setShowLogoutDropdown(true)}
                    onMouseLeave={() => setShowLogoutDropdown(false)}
                  >
                    {/* User Name Display */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: arcadeGreenDark }}>
                      <p className="text-sm font-bold truncate" style={{ color: arcadeGreen }}>{firebaseUser.displayName || firebaseUser.email}</p>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-xs flex items-center gap-2 transition-colors hover:bg-red-500/20"
                      style={{ color: '#ff0000' }}
                    >
                      <FaSignOutAlt size={14} />
                      LOGOUT
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 pt-32">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
            <div className="text-center mb-8">
              <p className="text-sm h-6" style={{ color: arcadeGreenDark }}>
                {displayText}<span className="animate-pulse" style={{ color: arcadeGreen }}>|</span>
              </p>
            </div>

            <div className="p-10 rounded-2xl" style={{ backgroundColor: `${arcadeGreen}10`, border: `2px solid ${arcadeGreen}` }}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm mb-3" style={{ color: arcadeGreen }}>ROOM ID</label>
                  <div className="flex gap-3 items-stretch">
                    <input type="text" placeholder="Enter room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)}
                      className="flex-1 px-6 py-5 rounded-xl text-sm"
                      style={{ backgroundColor: arcadeBg, border: `2px solid ${arcadeGreenDark}`, color: arcadeGreen, fontFamily: '"VT323", monospace', fontSize: '24px', minWidth: '300px' }}
                    />
                    <button onClick={generateRoomId} className="px-10 py-5 rounded-xl text-sm font-bold whitespace-nowrap" style={{ backgroundColor: arcadeGreen, color: arcadeBg }}>
                      GENERATE
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-3" style={{ color: arcadeGreen }}>YOUR NAME</label>
                  <input type="text" placeholder="Enter your name" value={userName} onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-6 py-5 rounded-xl text-sm"
                    style={{ backgroundColor: arcadeBg, border: `2px solid ${arcadeGreenDark}`, color: arcadeGreen, fontFamily: '"VT323", monospace', fontSize: '24px' }}
                  />
                </div>

                <button onClick={joinRoom} disabled={!roomId || !userName} className="w-full py-6 text-sm font-bold rounded-xl" style={{ backgroundColor: arcadeGreen, color: arcadeBg, boxShadow: `0 0 20px ${arcadeGreen}50`, opacity: !roomId || !userName ? 0.5 : 1 }}>
                  JOIN ROOM
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="w-full py-8" style={{ backgroundColor: sapGreen, borderTop: `3px solid ${blackColor}` }}>
          <div className="flex items-center justify-between px-8">
            <div>
              <p className="text-sm" style={{ color: blackColor, fontFamily: '"Press Start 2P", cursive' }}>Engineered By: Agnik Dastidar</p>
              <p className="text-sm mt-2" style={{ color: blackColor, fontFamily: '"Press Start 2P", cursive' }}>Phone No.: (+91) 7980292497</p>
              <p className="text-sm mt-2" style={{ color: blackColor, fontFamily: '"Press Start 2P", cursive' }}>Email: agnikdastidar2004@gmail.com</p>
            </div>
            <div className="flex gap-6">
              <a href="https://www.linkedin.com/in/agnik-dastidar-13021525a" target="_blank" rel="noopener noreferrer" style={{ color: blackColor }}><FaLinkedin size={32} /></a>
              <a href="https://www.instagram.com/agnikdastidar/" target="_blank" rel="noopener noreferrer" style={{ color: blackColor }}><FaInstagram size={32} /></a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main editor view (when joined)
  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: arcadeBg, fontFamily: '"Press Start 2P", cursive' }}>
      {/* Ringtone audio element */}
      <audio ref={ringtoneRef} src="/ringtone.mp3" preload="auto" loop />
      
      <IncomingCallModal incomingCall={incomingCall} visible={!!incomingCall} onAccept={handleAcceptCall} onDecline={handleDeclineCall} />

      {!sidebarOpen && (
        <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onClick={() => setSidebarOpen(true)}
          className="absolute left-4 z-40 p-3 rounded-xl" style={{ backgroundColor: arcadeBgLight, border: `2px solid ${arcadeGreen}`, color: arcadeGreen, top: '80px' }}>
          <FaChevronRight />
        </motion.button>
      )}

      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div key={notification.id} initial={{ opacity: 0, x: 100, scale: 0.8 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 100, scale: 0.8 }}
              className="px-4 py-3 rounded-xl" style={{ backgroundColor: notification.type === "videoCall" || notification.type === "incomingCall" ? arcadeBg : arcadeBgLight, border: `2px solid ${notification.type === "error" ? "#ff0000" : arcadeGreen}`, boxShadow: `0 0 15px ${notification.type === "error" ? "#ff000030" : `${arcadeGreen}30`}` }}>
              {notification.type === "videoCall" || notification.type === "incomingCall" ? (
                <div className="flex items-center gap-3">
                  <div className="relative"><FaVideo style={{ color: arcadeGreen }} /><span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ backgroundColor: arcadeGreen, animation: 'pulse 1s infinite' }}></span></div>
                  <div className="flex-1">
                    <p className="text-xs" style={{ color: arcadeGreen }}>{notification.message}</p>
                    <button 
                      onClick={() => {
                        setShowVideoCall(true);
                        setVideoCallRoomId(notification.callRoomId || roomId);
                        setVideoSidebarOpen(true);
                        setSidebarOpen(true);
                        setNotifications(prev => prev.filter(n => n.id !== notification.id));
                      }}
                      className="mt-2 px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ backgroundColor: arcadeGreen, color: arcadeBg }}
                    >
                      JOIN CALL
                    </button>
                  </div>
                </div>
              ) : <p className="text-xs" style={{ color: notification.type === "error" ? "#ff0000" : arcadeGreen }}>{notification.message}</p>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onClick={() => setShowChat(!showChat)}
        className={`absolute bottom-4 right-4 z-40 p-3 rounded-xl transition-all ${showChat ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: showChat ? arcadeGreen : arcadeBgLight, border: `2px solid ${arcadeGreen}`, color: showChat ? arcadeBg : arcadeGreen }}>
        <FaComments size={20} />
        {chatMessages.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: arcadeGreen, color: arcadeBg }}>{chatMessages.length}</span>}
      </motion.button>

      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }}
            className="fixed bottom-20 right-4 w-96 h-[500px] rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden" style={{ backgroundColor: arcadeBg, border: `3px solid ${arcadeGreen}`, boxShadow: `0 0 30px ${arcadeGreen}30` }}>
            <div className="flex items-center p-4" style={{ backgroundColor: arcadeGreenDark, borderBottom: `3px solid ${arcadeGreen}` }}>
              <div className="flex items-center gap-3 h-2 ">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: arcadeBg }}><FaComments size={24} style={{ color: arcadeGreen }} /></div>
                <div><h3 className="text-sm" style={{ color: arcadeBg }}>CHAT ROOM</h3></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3" style={{ backgroundColor: arcadeBg }}>
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center pt-16">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${arcadeGreen}20`, border: `2px solid ${arcadeGreen}` }}><FaComments size={40} style={{ color: arcadeGreen }} /></div>
                  <p className="text-sm mb-2" style={{ color: arcadeGreen }}>NO MESSAGES</p>
                  <p className="text-xs" style={{ color: arcadeGreenDark }}>Send a message to start!</p>
                </div>
              ) : chatMessages.map((msg, index) => {
                const isOwnMessage = msg.sender === userName;
                return (
                  <motion.div key={msg.id || index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
                    <div className="max-w-[80%] px-3 py-2" style={{ backgroundColor: isOwnMessage ? `${arcadeGreen}30` : `${arcadeGreenDark}30`, border: `2px solid ${isOwnMessage ? arcadeGreen : arcadeGreenDark}`, borderRadius: '8px' }}>
                      <p className="text-xs mb-1" style={{ color: arcadeGreen, fontWeight: 'bold' }}>{isOwnMessage ? 'You' : msg.sender}</p>
                      <p className="text-sm break-words" style={{ color: isOwnMessage ? arcadeGreenLight : arcadeGreen }}>{msg.message}</p>
                      <p className="text-[10px] mt-1" style={{ color: arcadeGreenDark }}>{formatTime(msg.timestamp)}</p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendMessage} className="p-3" style={{ backgroundColor: arcadeGreenDark, borderTop: `3px solid ${arcadeGreen}` }}>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: arcadeBg, border: `2px solid ${arcadeGreen}` }}>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent text-sm" style={{ color: arcadeGreen, fontFamily: '"VT323", monospace', fontSize: '22px' }} />
                <button type="submit" disabled={!newMessage.trim()} className="p-2 rounded-lg transition-colors" style={{ backgroundColor: newMessage.trim() ? arcadeGreen : arcadeGreenDark, color: arcadeBg }}><FaPaperPlane size={16} /></button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div initial={{ x: -280, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -280, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-56 md:w-72 flex flex-col overflow-y-auto" style={{ backgroundColor: arcadeBgLight, borderRight: `3px solid ${arcadeGreen}`, marginTop: '64px', height: 'calc(100vh - 64px)' }}>
            <div className="flex justify-end p-2" style={{ borderBottom: `2px solid ${arcadeGreen}` }}>
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg" style={{ border: `2px solid ${arcadeGreen}`, color: arcadeGreen }} title="Collapse sidebar"><FaChevronLeft size={14} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="rounded-xl p-3" style={{ backgroundColor: `${arcadeGreen}10`, border: `2px solid ${arcadeGreen}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: arcadeGreen }}>ROOM ID</span>
                  <button onClick={copyRoomId} className="p-1.5 rounded-lg" style={{ border: `1px solid ${arcadeGreen}`, color: arcadeGreen }} title="Copy Room ID"><FaCopy size={12} /></button>
                </div>
                <p className="text-xs break-all" style={{ color: arcadeGreenDark, fontFamily: '"VT323", monospace', fontSize: '18px' }}>{roomId}</p>
                {copySuccess && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs mt-1" style={{ color: arcadeGreen }}>{copySuccess}</motion.p>}
              </div>

              <button onClick={toggleTheme} className="w-full flex items-center justify-between px-3 py-3 rounded-xl" style={{ backgroundColor: `${arcadeGreen}10`, border: `2px solid ${arcadeGreen}` }}>
                <span className="text-xs" style={{ color: arcadeGreen }}>THEME</span>
                <div className="flex items-center gap-2" style={{ color: arcadeGreen }}>
                  {pageTheme === "vs-dark" ? <FaMoon size={14} /> : <FaSun size={14} />}
                  <span className="text-xs">{pageTheme === "vs-dark" ? "DARK" : "LIGHT"}</span>
                </div>
              </button>

              <div>
                <div className="flex items-center gap-2 mb-3"><FaUsers size={12} style={{ color: arcadeGreen }} /><span className="text-xs" style={{ color: arcadeGreen }}>ONLINE ({users.length})</span></div>
                <div className="space-y-2">
                  {users.map((u, i) => {
                    // Handle both string (backward compatibility) and object formats
                    const userName = typeof u === 'string' ? u : (u.name || u);
                    const userAvatar = typeof u === 'object' ? u.avatarUrl : null;
                    
                    return (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: `${arcadeGreen}10`, border: `1px solid ${arcadeGreen}` }}>
                      {userAvatar ? (
                        <img 
                          src={userAvatar} 
                          alt={userName} 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: arcadeGreen, color: arcadeBg }}>{userName.charAt(0).toUpperCase()}</div>
                      )}
                      <div className="flex-1 min-w-0"><p className="text-xs truncate" style={{ color: arcadeGreen }}>{userName}</p></div>
                    </motion.div>
                    );
                  })}
                  {users.length === 0 && <p className="text-xs italic text-center py-4" style={{ color: arcadeGreenDark }}>No user online</p>}
                </div>
                {typingUsers.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ backgroundColor: `${arcadeGreen}20` }}>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: arcadeGreen, animation: 'bounce 1s infinite' }}></span>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: arcadeGreen, animation: 'bounce 1s infinite', animationDelay: '0.2s' }}></span>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: arcadeGreen, animation: 'bounce 1s infinite', animationDelay: '0.4s' }}></span>
                    </div>
                    <span className="text-xs" style={{ color: arcadeGreen }}>{typingUsers.length === 1 ? `${typingUsers[0]} is typing...` : typingUsers.length === 2 ? `${typingUsers[0]} and ${typingUsers[1]} are typing...` : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`}</span>
                  </motion.div>
                )}
              </div>
            </div>
            <div className="mt-5">
              <button onClick={leaveRoom} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl" style={{ backgroundColor: '#ff000030', border: `2px solid #ff0000`, color: '#ff0000' }}>
                <FaSignOutAlt size={14} /><span className="text-xs">LEAVE ROOM</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-0 left-0 right-0 z-30 h-12 md:h-16 flex items-center px-2 md:px-4 gap-2 md:gap-5" style={{ backgroundColor: arcadeBgLight, borderBottom: `3px solid ${arcadeGreen}` }}>
        <img src={logo} alt="Logo" className="h-8 md:h-10 w-auto rounded-lg" style={{ border: `2px solid ${arcadeGreen}`, boxShadow: `0 0 10px ${arcadeGreen}40` }} />
        <h2 className="text-sm md:text-lg hidden sm:block" style={{ color: arcadeGreen, textShadow: `0 0 10px ${arcadeGreen}` }}>Collab Code</h2>
        <div style={{ width: '4px', height: '35px', backgroundColor: arcadeGreen, margin: '0 23px', boxShadow: `0 0 10px ${arcadeGreen}` }}></div>
        
        <button 
          onClick={runCode} 
          disabled={!code.trim()}
          className="flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold"
          style={{ 
            backgroundColor: arcadeGreen, 
            color: arcadeBg, 
            border: `2px solid ${arcadeGreen}`,
            boxShadow: `0 0 10px ${arcadeGreen}40`
          }}
        >
          <FaCode size={20} />
          COMPILE & RUN
        </button>
        <button onClick={toggleWhiteboard} className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 text-xs rounded-xl" style={{ backgroundColor: showWhiteboard ? `${arcadeGreen}30` : 'transparent', border: `2px solid ${arcadeGreen}`, color: arcadeGreen }}><span className="hidden md:inline">{showWhiteboard ? "HIDE WHITEBOARD" : "WHITEBOARD"}</span><span className="md:hidden">{showWhiteboard ? "HIDE WB" : "WB"}</span></button>
        <button onClick={toggleVideoCall} className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 text-xs rounded-xl" style={{ backgroundColor: showVideoCall ? `${arcadeGreen}30` : 'transparent', border: `2px solid ${arcadeGreen}`, color: arcadeGreen, animation: showVideoCall ? 'pulse 1s infinite' : 'none' }}>{showVideoCall ? <FaVideoSlash size={15} /> : <FaVideo size={15} />}<span className="hidden md:inline">{showVideoCall ? "END CALL" : "VIDEO CALL"}</span></button>
        <div className="flex-1"></div>
        

        
        <select value={language} onChange={handleLanguageChange} className="px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: arcadeBgLight, border: `2px solid ${arcadeGreen}`, color: arcadeGreen }}>
          <option value="javascript" style={{ backgroundColor: arcadeBg }}>JAVASCRIPT</option>
          <option value="python" style={{ backgroundColor: arcadeBg }}>PYTHON</option>
          <option value="java" style={{ backgroundColor: arcadeBg }}>JAVA</option>
          <option value="cpp" style={{ backgroundColor: arcadeBg }}>C++</option>
          <option value="c" style={{ backgroundColor: arcadeBg }}>C</option>
        </select>
        <button onClick={toggleFullscreen} className="p-2 rounded-xl" style={{ border: `2px solid ${arcadeGreen}`, color: arcadeGreen }} title="Toggle Fullscreen">{isFullscreen ? <FaCompress size={14} /> : <FaExpand size={14} />}</button>
        
        {/* User Avatar in Code Room Header */}
        {firebaseUser && (
          <div 
            className="relative ml-2"
            onMouseEnter={() => setShowLogoutDropdown(true)}
            onMouseLeave={() => setShowLogoutDropdown(false)}
          >
            {userAvatarUrl ? (
              <img 
                src={userAvatarUrl} 
                alt="Profile" 
                className="w-9 h-9 rounded-full object-cover cursor-pointer"
                style={{ border: `2px solid ${arcadeGreen}` }}
              />
            ) : (
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer"
                style={{ backgroundColor: arcadeGreen, color: arcadeBg }}
              >
                {(firebaseUser.displayName || firebaseUser.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Dropdown Menu */}
            {showLogoutDropdown && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-65 rounded-xl overflow-hidden z-50"
                style={{ backgroundColor: arcadeBgLight, border: `2px solid ${arcadeGreen}` }}
                onMouseEnter={() => setShowLogoutDropdown(true)}
                onMouseLeave={() => setShowLogoutDropdown(false)}
              >
                {/* User Name Display */}
                <div className="px-4 py-3 border-b" style={{ borderColor: arcadeGreenDark }}>
                  <p className="text-sm font-bold truncate" style={{ color: arcadeGreen }}>{firebaseUser.displayName || firebaseUser.email}</p>
                </div>
               
              </motion.div>
            )}
          </div>
        )}
      </div>

      <motion.div className="flex-1 flex flex-col overflow-hidden pt-12 md:pt-16" animate={{ marginRight: showVideoCall && videoSidebarOpen ? videoSidebarWidth : 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
<div className="flex-1 overflow-hidden">
            <Editor height="100%" language={language} value={code} onChange={handleCodeChange} theme={pageTheme} options={{ minimap: { enabled: false }, fontSize: 16, fontFamily: '"VT323", monospace', padding: { top: 16 }, scrollBeyondLastLine: false, smoothScrolling: true, cursorBlinking: "smooth", cursorSmoothCaretAnimation: "on", wordWrap: "on" }} />
        </div>
        
        <ResizableIO 
          input={input}
          onInputChange={(e) => setInput(e.target.value)}
          output={output}
          language={language}
          isRunning={isRunning}
        />
        
        <Whiteboard visible={showWhiteboard} roomId={roomId} />
      </motion.div>

      <AnimatePresence>
        {showVideoCall && videoSidebarOpen && (
          <motion.div initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-12 md:top-16 bottom-0 z-20" style={{ width: videoSidebarWidth }}>
            <VideoCallSidebar roomId={videoCallRoomId || roomId} userId={userName} isOpen={videoSidebarOpen} onToggleOpen={setVideoSidebarOpen} socket={socket} width={videoSidebarWidth} onWidthChange={setVideoSidebarWidth} />
          </motion.div>
        )}
      </AnimatePresence>

      {showVideoCall && !videoSidebarOpen && (
        <motion.button initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onClick={() => setVideoSidebarOpen(true)}
          className="absolute top-16 md:top-20 right-4 z-40 p-3 rounded-xl" style={{ backgroundColor: arcadeGreen, color: arcadeBg }} title="Open Video Call"><FaVideo size={16} /></motion.button>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        input::placeholder { color: ${arcadeGreenDark}; }
      `}</style>
    </div>
  );
};

// Main App component with routing
const App = () => {
  const { currentUser: firebaseUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#00ff00', fontFamily: '"Press Start 2P", cursive' }}>Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!firebaseUser ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!firebaseUser ? <Signup /> : <Navigate to="/" />} />
      <Route path="/editor" element={<CodeEditor />} />
      <Route path="/" element={<Welcome />} />
    </Routes>
  );
};

export default App;

