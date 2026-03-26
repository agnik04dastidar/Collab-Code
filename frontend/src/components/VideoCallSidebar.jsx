import React, { useState, useRef, useEffect, useCallback } from 'react';
import VideoCall from './VideoCall';
import './VideoCallSidebar.css';
import { FaVideo, FaMicrophone, FaMicrophoneSlash, FaVideoSlash as FaVideoOff, FaPhoneSlash, FaUsers, FaCompress, FaExpand, FaArrowsAltH, FaPhone } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const VideoCallSidebar = ({ 
  roomId, 
  userId, 
  isOpen, 
  onToggleOpen, 
  socket, 
  width = 320, 
  onWidthChange,
  isCalling = false,
  isInCall = false,
  participants = [],
  onStartCall,
  onJoinCall,
  onLeaveCall,
  onEndCall
}) => {
  const [localParticipants, setLocalParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(width);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);

  // Sync participants from props
  useEffect(() => {
    if (participants && participants.length > 0) {
      setLocalParticipants(participants);
    }
  }, [participants]);

  // Set call active based on isInCall
  useEffect(() => {
    setCallActive(isInCall);
  }, [isInCall]);

  useEffect(() => {
    if (width !== sidebarWidth) {
      setSidebarWidth(width);
    }
  }, [width]);

  useEffect(() => {
    if (!socket) return;

    socket.on("videoCallStarted", ({ roomId: callRoomId, initiator }) => {
      if (callRoomId === roomId) {
        setCallActive(true);
      }
    });

    socket.on("videoCallEnded", ({ roomId: endedRoomId }) => {
      if (endedRoomId === roomId) {
        setCallActive(false);
        setLocalParticipants([]);
      }
    });

    socket.on("videoCallParticipantsUpdated", ({ participants: updatedParticipants }) => {
      setLocalParticipants(updatedParticipants);
    });

    return () => {
      socket.off("videoCallStarted");
      socket.off("videoCallEnded");
      socket.off("videoCallParticipantsUpdated");
    };
  }, [socket, roomId]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 280;
    const maxWidth = 800;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
      if (onWidthChange) {
        onWidthChange(newWidth);
      }
    }
  }, [isResizing, onWidthChange]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Handle starting a call
  const handleStartCall = () => {
    if (onStartCall) {
      onStartCall();
    } else if (socket) {
      socket.emit("startVideoCall", { roomId, userName: userId });
    }
    setCallActive(true);
  };

  // Handle ending a call
  const handleEndCall = () => {
    if (onEndCall) {
      onEndCall();
    } else if (socket) {
      socket.emit("endVideoCall", { roomId, userName: userId });
    }
    setCallActive(false);
    setLocalParticipants([]);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      sidebarRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Handle participants change from VideoCall
  const handleParticipantsChange = (newParticipants) => {
    setLocalParticipants(newParticipants);
  };

  // Arcade theme colors
  const arcadeGreen = "#00ff00";
  const arcadeGreenDark = "#00cc00";
  const arcadeBg = "#0a0a0a";
  const arcadeBgLight = "#1a1a1a";

  return (
    <div 
      ref={sidebarRef}
      className={`video-call-sidebar ${isResizing ? 'resizing' : ''}`}
      style={{
        width: sidebarWidth,
        height: '100%',
        backgroundColor: arcadeBg,
        borderLeft: `3px solid ${arcadeGreen}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Header */}
       <div className="flex items-center gap-2">
          
        </div>
       <AnimatePresence>
        {callActive && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="flex items-center justify-center gap-3 p-1"
            style={{ 
              borderTop: `2px solid ${arcadeGreen}`,
              backgroundColor: arcadeBgLight
            }}
          >
         

            <button onClick={toggleFullscreen} className="p-2 rounded-xl" style={{ border: `2px solid ${arcadeGreen}`, color: arcadeGreen }} title="Toggle Fullscreen">{isFullscreen ? <FaCompress size={14} /> : <FaExpand size={14} />}</button>
            </motion.div>
        )}
      </AnimatePresence>

      
      {/* Video Call Area - Zegocloud renders videos here */}
      <div className="flex-1 overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
        {callActive ? (
          <VideoCall
            roomId={roomId}
            userId={userId}
            socket={socket}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            onParticipantsChange={handleParticipantsChange}
            onJoinCall={onJoinCall}
            onLeaveCall={onLeaveCall}
          />
        ) : (
          // Call not active - show start call button
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div 
              className="rounded-full flex items-center justify-center mb-4 p-6"
              style={{
                backgroundColor: `${arcadeGreen}20`,
                border: `2px solid ${arcadeGreen}`,
              }}
            >
              <FaVideo size={32} color={arcadeGreen} />
            </div>
            <p 
              className="text-center mb-4"
              style={{ 
                color: arcadeGreen, 
                fontFamily: '"Press Start 2P", cursive',
                fontSize: '10px'
              }}
            >
              
            </p>
            <motion.button 
              onClick={handleStartCall}
              className="flex items-center gap-2 px-6 py-3 rounded-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ 
                backgroundColor: arcadeGreen, 
                color: arcadeBg,
                fontFamily: '"Press Start 2P", cursive',
                fontSize: '10px',
                boxShadow: `0 0 20px ${arcadeGreen}50`
              }}
            >
              <FaVideo size={14} />
              ENTER CALL
            </motion.button>
          </div>
        )}
      </div>

      {/* Control Bar */}
     <div 
        className="sidebar-header flex items-center justify-between px-1 py-1"
        style={{ 
          borderBottom: `2px solid ${arcadeGreen}`,
          backgroundColor: arcadeBgLight
        }}
      >
        <div className="flex items-center gap-2">
          
        </div>
        <div className="flex items-center gap-2">
          <div>
            Powered by Zegocloud
          </div>
         
        </div>
      </div>

      {/* Resize Handle */}
      {!isFullscreen && (
        <div 
          className="resize-handle"
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '10px',
            cursor: 'ew-resize',
            backgroundColor: isResizing ? arcadeGreen : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
            zIndex: 10
          }}
          title="Drag to resize"
        >
          <motion.div
            animate={{ opacity: isResizing ? 1 : 0.5 }}
          >
            <FaArrowsAltH 
              size={1} 
              style={{ 
                color: isResizing ? arcadeBg : arcadeGreen
              }} 
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default VideoCallSidebar;
