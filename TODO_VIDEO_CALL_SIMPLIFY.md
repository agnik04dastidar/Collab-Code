# Video Call Simplify TODO - Backend Fixed ✅

1. ✅ Created TODO
2. ✅ Backend: Added activeCalls Map, new events ("start-video-call", "incoming-video-call", "accept-video-call", "decline-video-call", "user-joined-call", "user-declined-call", "end-video-call")
3. App.jsx: 
   - Add isRoomCallActive state
   - Refactor toggleVideoCall → check activeCalls, emit "start-video-call", open ZEGOCLOUD directly
   - Remove sidebar logic/notifications for video
   - IncomingCallModal use for simple popup
   - Socket handlers for new events
4. Remove VideoCallSidebar.jsx completely
5. VideoCall.jsx → direct ZEGOCLOUD, no sidebar
6. IncomingCallModal.jsx → keep simple
7. Update TODO progress
8. Test: start call → popup Accept/Decline → direct ZEGOCLOUD, no sidebar/clutter
9. Complete
