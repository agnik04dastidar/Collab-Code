import React from "react";
import { FaPhone, FaVideoSlash } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const IncomingCallModal = ({ incomingCall, visible, onAccept, onDecline }) => {
  if (!visible || !incomingCall) return null;

  const arcadeGreen = "#00ff00";
  const arcadeGreenDark = "#00cc00";
  const arcadeBg = "#0a0a0a";
  const arcadeBgLight = "#1a1a1a";

  return (
    <AnimatePresence>
      {visible && incomingCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            className="p-8 rounded-3xl text-center"
            style={{
              backgroundColor: arcadeBg,
              border: `3px solid ${arcadeGreen}`,
              boxShadow: `0 0 40px ${arcadeGreen}40`,
              maxWidth: "400px",
              width: "90%",
            }}
          >
            <div className="mb-6">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{
                  backgroundColor: `${arcadeGreen}20`,
                  border: `3px solid ${arcadeGreen}`,
                }}
              >
                <FaPhone
                  size={40}
                  style={{ color: arcadeGreen, transform: "rotate(135deg)" }}
                />
              </motion.div>
              <h2
                className="text-xl mb-2"
                style={{
                  color: arcadeGreen,
                  fontFamily: '"Press Start 2P", cursive',
                }}
              >
                INCOMING CALL
              </h2>
              <p
                className="text-sm mb-4"
                style={{
                  color: arcadeGreenDark,
                  fontFamily: '"VT323", monospace',
                  fontSize: "24px",
                }}
              >
                {incomingCall.callerName} is calling you
              </p>
            </div>

            <div className="flex justify-center gap-6">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onAccept}
                className="p-4 rounded-full"
                style={{
                  backgroundColor: arcadeGreen,
                  color: arcadeBg,
                }}
                title="Accept call"
              >
                <FaPhone size={24} style={{ transform: "rotate(135deg)" }} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onDecline}
                className="p-4 rounded-full"
                style={{
                  backgroundColor: "#ff0000",
                  color: "#fff",
                }}
                title="Decline call"
              >
                <FaVideoSlash size={24} />
              </motion.button>
            </div>

            <p
              className="text-xs mt-6"
              style={{ color: arcadeGreenDark }}
            >
              Tap accept to join the call or decline to ignore
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IncomingCallModal;
