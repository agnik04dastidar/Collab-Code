# Video Call Simplification Progress

1. ✅ Backend activeCalls Map & new events ready
2. App.jsx refactor:
   - [ ] Add isRoomCallActive state
   - [ ] toggleVideoCall: check active, emit start/ direct ZEGO
   - [ ] socket.on incoming-video-call → IncomingCallModal
   - [ ] Accept/Decline emit new events
   - [ ] Remove sidebar/notifications/JOIN CALL logic
3. Button: VIDEO CALL / JOIN CALL based on active
4. Test flow: start → popup → direct ZEGO, no clutter
5. Complete
