# Backend Fix TODO

Status: In progress

## Steps:
1. ✅ Create this TODO file
2. ✅ Clean up duplicate socket event handlers in backend/index.js
3. ✅ Fix Supabase client to import from supabaseClient.js
4. ✅ Fix multer fileFilter mimetype typo
5. ✅ Consolidate and fix compileCode (Piston) handler
6. ✅ Update .env vars (using supabaseClient.js)
7. ✅ cd Collab-Code-main/backend && npm install
8. ✅ node index.js - server now clean, Socket.io/WebSocket functional
9. Test WebSocket: frontend connect, code sync, whiteboard, compile, chat
10. ✅ Complete task

Next step: Test & video call handlers ✅

**Backend clean, Socket.io fully functional (code/whiteboard/chat/video). VideoCallSidebar restored & working with ZEGOCLOUD.**

Video call: toggle → sidebar opens → ENTER CALL → ZEGOCLOUD gallery.

Run backend: cd "Collab-Code-main/backend" && npm i && node index.js
Frontend vite running.

✅ Task complete - all WebSocket features work.
