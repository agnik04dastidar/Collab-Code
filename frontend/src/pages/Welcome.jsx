import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FaGoogle, FaArrowRight, FaUser, FaEnvelope, FaLock, FaCheck, FaSignOutAlt, FaHome, FaDoorOpen, FaMoon, FaSun, FaCamera } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import logo from "../assets/web-logo.png";
import ProfilePictureUpload from '../components/ProfilePictureUpload';

const Welcome = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  
  const { login, signup, loginWithGoogle, logout, currentUser, userProfile, error, clearError, uploadProfilePicture, removeProfilePicture } = useAuth();
  const { theme, toggleTheme, isDark, colors } = useTheme();
  const navigate = useNavigate();
  const authFormRef = useRef(null);

  // Use theme colors with fallback to defaults
  const arcadeGreen = colors?.arcadeGreen || "#00ff00";
  const arcadeGreenDark = colors?.arcadeGreenDark || "#00cc00";
  const arcadeGreenLight = colors?.arcadeGreenLight || "#66ff66";
  const arcadeBg = colors?.arcadeBg || "#0a0a0a";
  const arcadeBgLight = colors?.arcadeBgLight || "#1a1a1a";
  const sapGreen = colors?.sapGreen || "#00FF7F";
  const blackColor = colors?.blackColor || "#000000";

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
        if (index === 0) {
          isDeleting = false;
        }
        timeout = setTimeout(typeWriter, 50);
      }
    };
    
    typeWriter();
    return () => clearTimeout(timeout);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutDropdown(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();
    
    if (!isLogin && password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    
    if (!isLogin && password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, displayName);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setLocalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    clearError();
    setLocalError('');
    
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google auth error:', err);
      setLocalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = (url) => {
    setShowProfileUpload(false);
  };

  const displayError = localError || error;

  const features = [
    { 
      title: "Real-Time Collaboration", 
      desc: "Code together with instant synchronization",
      image: "https://plus.unsplash.com/premium_vector-1734421474096-6dad1f7c51f5?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8cmVhbC10aW1lJTIwY29sbGFib3JhdGlvbiUyMGNvZGUlMjB3aXRoJTIwY29tcHV0ZXJ8ZW58MHx8MHx8fDA%3D"
    },
    { 
      title: "Video Calls", 
      desc: "Built-in video conferencing",
      image: "https://plus.unsplash.com/premium_vector-1724124561857-a6eeb061a2b3?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dmlkZW8lMjBjYWxscyUyMHdpdGglMjBjb2xsYWJvcmF0aXZlJTIwY29kZSUyMGVkaXRvcnxlbnwwfHwwfHx8MA%3D%3D"
    },
    { 
      title: "Whiteboard", 
      desc: "Draw and explain ideas visually",
      image: "https://plus.unsplash.com/premium_vector-1771932869202-f47730a982fa?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8d2hpdGVib2FyZCUyMC0lMjB2aXN1YWwlMjBhaWQlMjBpbiUyMGdyZWVufGVufDB8fDB8fHww"
    },
    { 
      title: "Chat", 
      desc: "Communicate while you code",
      image: "https://plus.unsplash.com/premium_vector-1750338927305-bb2840bcb458?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8Y2hhdCUyMGljb258ZW58MHx8MHx8fDA%3D"
    }
  ];

  // Get avatar URL from user profile or Firebase
  const getAvatarUrl = () => {
    if (userProfile?.avatar_url) return userProfile.avatar_url;
    if (currentUser?.photoURL) return currentUser.photoURL;
    return null;
  };

  const avatarUrl = getAvatarUrl();

  return (
    <div style={{ backgroundColor: arcadeBg, fontFamily: '"Press Start 2P", cursive', minHeight: '100vh', overflowY: 'auto' }}>
      {/* Profile Upload Modal */}
      <AnimatePresence>
        {showProfileUpload && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
            onClick={() => setShowProfileUpload(false)}
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ProfilePictureUpload 
                onUploadComplete={handleUploadComplete}
                onCancel={() => setShowProfileUpload(false)}
                showRemove={!!avatarUrl}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96" style={{ backgroundColor: `${arcadeGreen}10`, borderRadius: '50%', filter: 'blur(60px)' }}></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96" style={{ backgroundColor: `${arcadeGreen}10`, borderRadius: '50%', filter: 'blur(60px)' }}></div>
      </div>

      {/* Header - New Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full p-2 md:p-4 flex items-center justify-between" style={{ backgroundColor: arcadeBgLight, borderBottom: `3px solid ${arcadeGreen}` }}>
        <div className="flex items-center">
          <img src={logo} alt="Logo" className="w-10 h-10 md:w-16 md:h-16 rounded-xl" style={{ border: `2px solid ${arcadeGreen}`, boxShadow: `0 0 20px ${arcadeGreen}40` }} />
          <h1 className="ml-2 md:ml-4 text-lg md:text-2xl" style={{ color: arcadeGreen, textShadow: `0 0 10px ${arcadeGreen}` }}>Collab Code</h1>
        </div>
        
        {currentUser ? (
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-all"
              style={{ 
                backgroundColor: 'transparent', 
                color: arcadeGreen,
                border: `2px solid ${arcadeGreen}`
              }}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <FaSun size={14} /> : <FaMoon size={14} />}
            </button>
            
            <button 
              onClick={() => navigate('/editor')}
              className="px-4 py-2 text-xs rounded-xl transition-all flex items-center gap-2"
              style={{ 
                backgroundColor: 'transparent', 
                color: arcadeGreen,
                border: `2px solid ${arcadeGreen}`
              }}
            >
              <FaDoorOpen size={20} />
              JOIN ROOM
            </button>
            
            <div 
              className="relative"
              onMouseEnter={() => setShowLogoutDropdown(true)}
              onMouseLeave={() => setShowLogoutDropdown(false)}
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer overflow-hidden"
                style={{ backgroundColor: arcadeGreen, color: arcadeBg, border: `2px solid ${arcadeGreen}` }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              
              {showLogoutDropdown && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-70 rounded-xl overflow-hidden z-50"
                  style={{ backgroundColor: arcadeBgLight, border: `2px solid ${arcadeGreen}` }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: arcadeGreenDark }}>
                    <p className="text-sm font-bold truncate" style={{ color: arcadeGreen }}>{currentUser.displayName || currentUser.email}</p>
                  </div>
                  
                  <button 
                    onClick={() => setShowProfileUpload(true)}
                    className="w-full px-4 py-3 text-xs flex items-center gap-2 transition-colors hover:bg-green-500/20"
                    style={{ color: arcadeGreen }}
                  >
                    <FaCamera size={14} />
                    CHANGE PICTURE
                  </button>
                  
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
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-all"
              style={{ 
                backgroundColor: 'transparent', 
                color: arcadeGreen,
                border: `2px solid ${arcadeGreen}`
              }}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <FaSun size={14} /> : <FaMoon size={14} />}
            </button>
            
            <button 
              onClick={() => { setIsLogin(true); setLocalError(''); clearError(); }}
              className="px-4 py-2 text-xs rounded-xl transition-all flex items-center gap-2"
              style={{ 
                backgroundColor: 'transparent', 
                color: arcadeGreen,
                border: `2px solid ${arcadeGreen}`
              }}
            >
              <FaDoorOpen size={14} />
              JOIN ROOM
            </button>
            
            <button 
              onClick={() => { setIsLogin(true); setLocalError(''); clearError(); authFormRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
              className="px-4 py-2 text-xs rounded-xl transition-all"
              style={{ 
                backgroundColor: isLogin ? arcadeGreen : 'transparent', 
                color: isLogin ? arcadeBg : arcadeGreen,
                border: `2px solid ${arcadeGreen}`
              }}
            >
              LOGIN
            </button>
            <button 
              onClick={() => { setIsLogin(false); setLocalError(''); clearError(); authFormRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
              className="px-4 py-2 text-xs rounded-xl transition-all"
              style={{ 
                backgroundColor: !isLogin ? arcadeGreen : 'transparent', 
                color: !isLogin ? arcadeBg : arcadeGreen,
                border: `2px solid ${arcadeGreen}`
              }}
            >
              SIGN UP
            </button>
          </div>
        )}
      </header>

      <div className="flex items-center justify-center px-2 md:px-4 py-6 md:py-8" style={{ minHeight: '100vh', paddingTop: '140px' }}>
        <div className={`w-full max-w-6xl gap-12 ${currentUser ? 'grid grid-cols-1' : 'grid grid-cols-1 lg:grid-cols-2'}`}>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex flex-col justify-center ${currentUser ? 'max-w-4xl mx-auto' : ''}`}
          >
            <div className="text-center mb-8 lg:text-left">
              <p className="text-sm h-6 mb-4" style={{ color: arcadeGreenDark }}>
                {displayText}
                <span className="animate-pulse" style={{ color: arcadeGreen }}>|</span>
              </p>
              <h2 className="text-3xl lg:text-4xl mb-4" style={{ color: arcadeGreen, textShadow: `0 0 20px ${arcadeGreen}` }}>
                COLLAB CODE
              </h2>
              <p className="text-sm" style={{ color: arcadeGreenDark, fontFamily: '"VT323", monospace', fontSize: '22px' }}>
                The ultimate collaborative coding platform for teams
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-xl"
                  style={{ backgroundColor: `${arcadeGreen}10`, border: `2px solid ${arcadeGreen}` }}
                >
                  <div className="flex items-center gap-6">
                    {feature.image && (
                      <div className="flex-shrink-0 w-1/4 rounded-lg overflow-hidden">
                        <img 
                          src={feature.image} 
                          alt={feature.title}
                          className="w-full h-40 object-cover"
                          style={{ border: `1px solid ${arcadeGreenDark}` }}
                        />
                      </div>
                    )}
                    <div className="flex-grow">
                      {feature.icon && <div className="text-4xl mb-3">{feature.icon}</div>}
                      <h3 className="text-sm mb-2" style={{ color: arcadeGreen }}>{feature.title}</h3>
                      <p className="text-xs" style={{ color: arcadeGreenDark }}>{feature.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {!currentUser && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col justify-center"
              ref={authFormRef}
            >
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 rounded-2xl"
                style={{ backgroundColor: `${arcadeGreen}10`, border: `2px solid ${arcadeGreen}` }}
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl mb-2" style={{ color: arcadeGreen, textShadow: `0 0 10px ${arcadeGreen}` }}>
                    {isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
                  </h3>
                  <p className="text-xs" style={{ color: arcadeGreenDark }}>
                    {isLogin ? 'Sign in to continue coding' : 'Join the coding revolution'}
                  </p>
                </div>

                {displayError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-xl"
                    style={{ backgroundColor: '#ff000020', border: '2px solid #ff0000' }}
                  >
                    <p className="text-xs" style={{ color: '#ff0000' }}>{displayError}</p>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <label className="block text-xs mb-2" style={{ color: arcadeGreen }}>DISPLAY NAME</label>
                      <div className="relative">
                        <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: arcadeGreenDark }} />
                        <input
                          type="text"
                          placeholder="Your name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          required={!isLogin}
                          className="w-full px-10 py-3 rounded-xl text-sm"
                          style={{ 
                            backgroundColor: arcadeBg, 
                            border: `2px solid ${arcadeGreenDark}`, 
                            color: arcadeGreen,
                            fontFamily: '"VT323", monospace',
                            fontSize: '20px'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs mb-2" style={{ color: arcadeGreen }}>EMAIL</label>
                    <div className="relative">
                      <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: arcadeGreenDark }} />
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-10 py-3 rounded-xl text-sm"
                        style={{ 
                          backgroundColor: arcadeBg, 
                          border: `2px solid ${arcadeGreenDark}`, 
                          color: arcadeGreen,
                          fontFamily: '"VT323", monospace',
                          fontSize: '20px'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs mb-2" style={{ color: arcadeGreen }}>PASSWORD</label>
                    <div className="relative">
                      <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: arcadeGreenDark }} />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-10 py-3 rounded-xl text-sm"
                        style={{ 
                          backgroundColor: arcadeBg, 
                          border: `2px solid ${arcadeGreenDark}`, 
                          color: arcadeGreen,
                          fontFamily: '"VT323", monospace',
                          fontSize: '20px'
                        }}
                      />
                    </div>
                  </div>

                  {!isLogin && (
                    <div>
                      <label className="block text-xs mb-2" style={{ color: arcadeGreen }}>CONFIRM PASSWORD</label>
                      <div className="relative">
                        <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: arcadeGreenDark }} />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required={!isLogin}
                          className="w-full px-10 py-3 rounded-xl text-sm"
                          style={{ 
                            backgroundColor: arcadeBg, 
                            border: `2px solid ${arcadeGreenDark}`, 
                            color: arcadeGreen,
                            fontFamily: '"VT323", monospace',
                            fontSize: '20px'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isLoading || !email || !password || (!isLogin && (!displayName || !confirmPassword))}
                    className="w-full py-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                    style={{ 
                      backgroundColor: arcadeGreen, 
                      color: arcadeBg,
                      boxShadow: `0 0 20px ${arcadeGreen}50`,
                      opacity: isLoading || !email || !password || (!isLogin && (!displayName || !confirmPassword)) ? 0.5 : 1
                    }}
                  >
                    {isLoading ? 'PLEASE WAIT...' : (isLogin ? 'SIGN IN' : 'CREATE ACCOUNT')}
                    {!isLoading && <FaArrowRight size={12} />}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-6">
                  <div style={{ flex: 1, height: '2px', backgroundColor: arcadeGreenDark }}></div>
                  <span className="text-[10px]" style={{ color: arcadeGreen }}>OR</span>
                  <div style={{ flex: 1, height: '2px', backgroundColor: arcadeGreenDark }}></div>
                </div>

                <button 
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-3"
                  style={{ 
                    backgroundColor: '#ffffff', 
                    color: '#333',
                    boxShadow: `0 0 15px ${arcadeGreen}30`
                  }}
                >
                  <FaGoogle size={18} />
                  {isLoading ? 'PLEASE WAIT...' : 'CONTINUE WITH GOOGLE'}
                </button>

                <div className="text-center mt-6">
                  <p className="text-xs" style={{ color: arcadeGreenDark }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button 
                      onClick={() => { setIsLogin(!isLogin); setLocalError(''); clearError(); authFormRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="underline"
                      style={{ color: arcadeGreen }}
                    >
                      {isLogin ? 'SIGN UP' : 'SIGN IN'}
                    </button>
                  </p>
                </div>

                <div className="text-center mt-6 pt-4" style={{ borderTop: `2px solid ${arcadeGreenDark}` }}>
                  <p className="text-xs mb-3" style={{ color: arcadeGreenDark }}>
                    Or continue without an account
                  </p>
                  <button 
                    onClick={() => navigate('/editor')}
                    className="w-full py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                    style={{ 
                      backgroundColor: 'transparent', 
                      color: arcadeGreen,
                      border: `2px solid ${arcadeGreen}`
                    }}
                  >
                    CONTINUE AS GUEST
                    <FaArrowRight size={12} />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      <div className="w-full py-8" style={{ backgroundColor: sapGreen, borderTop: `3px solid ${blackColor}` }}>
        <div className="flex items-center justify-between px-8">
          <div>
            <p className="text-sm" style={{ color: blackColor, fontFamily: '"Press Start 2P", cursive' }}>Engineered By: Agnik Dastidar</p>
            <p className="text-sm mt-2" style={{ color: blackColor, fontFamily: '"Press Start 2P", cursive' }}>Phone No.: (+91) 7980292497</p>
            <p className="text-sm mt-2" style={{ color: blackColor, fontFamily: '"Press Start 2P", cursive' }}>Email: agnikdastidar2004@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;

