import { useEffect, useRef, useState, useCallback } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';


// Generate random ID for user
function randomID(len) {
  let result = '';
  if (result) return result;
  var chars = '12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP',
    maxPos = chars.length,
    i;
  len = len || 5;
  for (i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return result;
}

// Get URL params
export function getUrlParams(url = window.location.href) {
  let urlStr = url.split('?')[1];
  return new URLSearchParams(urlStr);
}

// VideoCall Component - Uses Zegocloud's built-in gallery layout
const VideoCall = ({ 
  roomId, 
  userId, 
  socket, 
  onParticipantsChange,
  onMicToggle,
  onCameraToggle,
  isMuted = false,
  isVideoOff = false,
  onJoinCall,
  onLeaveCall
}) => {
  const roomID = roomId || getUrlParams().get('roomID') || randomID(5);
  const meetingContainerRef = useRef(null);
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const zpRef = useRef(null);
  const isInitialized = useRef(false);

  const userName = userId || `User_${randomID(5)}`;

  // Initialize Zegocloud
  const initZego = useCallback(async () => {
    // Prevent multiple initializations
    if (isInitialized.current || !meetingContainerRef.current) {
      if (meetingContainerRef.current && !isInitialized.current) {
        setIsInitializing(false);
      }
      return;
    }

    try {
      // Get credentials from environment variables
      const envAppID = import.meta.env.VITE_ZEGOCLOUD_APP_ID;
      const envSecret = import.meta.env.VITE_ZEGOCLOUD_SERVER_SECRET;
      
      // Use fallback credentials only if env vars are not set
      const appID = envAppID ? parseInt(envAppID) : 1430253810;
      const serverSecret = envSecret || '142fc8588c9d02a4a05f70f97fb9ea36';

      console.log('Initializing Zegocloud - appID:', appID, 'roomID:', roomID);

      if (!appID || appID === 0) {
        setError('Invalid App ID');
        setIsInitializing(false);
        return;
      }

      // Generate Kit Token using ZegoUIKitPrebuilt class
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        serverSecret,
        roomID,
        userName,
        userName
      );

      // Create ZegoUIKitPrebuilt instance
      zpRef.current = ZegoUIKitPrebuilt.create(kitToken);

      // Join room with gallery layout - videos will appear in the container
      zpRef.current.joinRoom({
        container: meetingContainerRef.current,
        scenario: {
          mode: ZegoUIKitPrebuilt.GroupVideoConference,
        },
        showPreJoinView: false,
        showLeaveRoomConfirmDialog: false,
        onJoinRoom: () => {
          console.log('Joined video call room');
          setIsInCall(true);
          if (onJoinCall) onJoinCall();
          
          // Notify participants changed
          if (onParticipantsChange) {
            onParticipantsChange([{ userID: userName, userName: userName, isLocal: true }]);
          }
        },
        onLeaveRoom: () => {
          console.log('Left video call room');
          setIsInCall(false);
          if (onLeaveCall) onLeaveCall();
          
          if (onParticipantsChange) {
            onParticipantsChange([]);
          }
        },
        onUserJoin: (userList) => {
          console.log('User joined:', userList);
          const participants = userList.map(user => ({
            userID: user.userID,
            userName: user.userName || user.userID,
            isLocal: false
          }));
          if (onParticipantsChange) {
            onParticipantsChange(participants);
          }
        },
        onUserLeave: (userList) => {
          console.log('User left:', userList);
          if (onParticipantsChange) {
            onParticipantsChange([]);
          }
        },
        onMicStateChange: (state) => {
          console.log('Mic state changed:', state);
          if (onMicToggle) onMicToggle(state === 'close');
        },
        onCameraStateChange: (state) => {
          console.log('Camera state changed:', state);
          if (onCameraToggle) onCameraToggle(state === 'close');
        }
      });

      isInitialized.current = true;
      
      // Give time for the room to connect
      setTimeout(() => {
        setIsInitializing(false);
      }, 2000);

    } catch (err) {
      console.error('Failed to initialize Zegocloud:', err);
      setError(err.message || 'Failed to initialize video call');
      setIsInitializing(false);
    }
  }, [roomID, userName, onParticipantsChange, onJoinCall, onLeaveCall, onMicToggle, onCameraToggle]);

  // Initialize on mount
  useEffect(() => {
    // Small delay to ensure container is ready
    const timer = setTimeout(() => {
      initZego();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [initZego]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (zpRef.current) {
        try {
          zpRef.current.destroy();
        } catch (e) {
          console.log('Cleanup error:', e);
        }
      }
    };
  }, []);

  // Error state
  if (error) {
    return (
      <div className="video-call-container" style={{ 
        backgroundColor: '#0a0a0a',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ 
          color: '#ff0000', 
          textAlign: 'center',
          fontFamily: '"Press Start 2P", cursive',
          fontSize: '10px',
          maxWidth: '90%'
        }}>
          <p style={{ marginBottom: '10px' }}>VIDEO CALL ERROR</p>
          <p style={{ color: '#00ff00', fontSize: '8px', wordBreak: 'break-word' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-call-container" style={{ 
      backgroundColor: '#0a0a0a',
      width: '100%',
      height: '100%',
      position: 'relative'
    }}>
      {isInitializing && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#00ff00',
          fontFamily: '"Press Start 2P", cursive',
          fontSize: '10px',
          zIndex: 100,
          textAlign: 'center'
        }}>
          <div>CONNECTING...</div>
          <div style={{ fontSize: '8px', marginTop: '10px', color: '#00cc00' }}>
            Please wait
          </div>
        </div>
      )}
      
      {/* Zegocloud Container - Videos will render here in gallery layout */}
      <div
        className="meeting-container zego-gallery-container"
        ref={meetingContainerRef}
        style={{ 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#0a0a0a'
        }}
      />
    </div>
  );
};

export default VideoCall;
