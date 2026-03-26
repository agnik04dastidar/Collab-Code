import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FaEnvelope, FaLock, FaGoogle, FaArrowLeft, FaMoon, FaSun } from 'react-icons/fa';
import { motion } from 'framer-motion';
import logo from "../assets/web-logo.png";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle, error, clearError } = useAuth();
  const { toggleTheme, isDark, colors } = useTheme();
  const navigate = useNavigate();

  // Use theme colors with fallback to defaults
  const arcadeGreen = colors?.arcadeGreen || "#00ff00";
  const arcadeGreenDark = colors?.arcadeGreenDark || "#00cc00";
  const arcadeGreenLight = colors?.arcadeGreenLight || "#66ff66";
  const arcadeBg = colors?.arcadeBg || "#0a0a0a";
  const arcadeBgLight = colors?.arcadeBgLight || "#1a1a1a";
  const sapGreen = colors?.sapGreen || "#00FF7F";
  const blackColor = colors?.blackColor || "#000000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();
    
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    clearError();
    
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      console.error('Google login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: arcadeBg, fontFamily: '"Press Start 2P", cursive', minHeight: '100vh', overflowY: 'auto', paddingTop: '160px' }}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96" style={{ backgroundColor: `${arcadeGreen}10`, borderRadius: '50%', filter: 'blur(60px)' }}></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96" style={{ backgroundColor: `${arcadeGreen}10`, borderRadius: '50%', filter: 'blur(60px)' }}></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full p-4 flex items-center justify-between" style={{ backgroundColor: arcadeBgLight, borderBottom: `3px solid ${arcadeGreen}` }}>
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2" style={{ color: arcadeGreen }}>
            <FaArrowLeft size={20} />
          </Link>
          <img src={logo} alt="Logo" className="w-16 h-16 rounded-xl ml-4" style={{ border: `2px solid ${arcadeGreen}`, boxShadow: `0 0 20px ${arcadeGreen}40` }} />
          <h1 className="ml-4 text-2xl" style={{ color: arcadeGreen, textShadow: `0 0 10px ${arcadeGreen}` }}>Collab Code</h1>
        </div>
        
        {/* Theme Toggle Button */}
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
      </header>

      {/* Login Form */}
      <div className="flex items-center justify-center px-4 py-8" style={{ minHeight: '100vh', paddingTop: '120px' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl mb-2" style={{ color: arcadeGreen, textShadow: `0 0 10px ${arcadeGreen}` }}>WELCOME BACK</h2>
            <p className="text-sm" style={{ color: arcadeGreenDark }}>Sign in to continue coding</p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl"
              style={{ backgroundColor: '#ff000020', border: '2px solid #ff0000' }}
            >
              <p className="text-xs" style={{ color: '#ff0000' }}>{error}</p>
            </motion.div>
          )}

          <div className="p-10 rounded-2xl" style={{ backgroundColor: `${arcadeGreen}10`, border: `2px solid ${arcadeGreen}` }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm mb-3" style={{ color: arcadeGreen }}>EMAIL</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2" style={{ color: arcadeGreenDark }} />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-12 py-5 rounded-xl text-sm"
                    style={{ 
                      backgroundColor: arcadeBg, 
                      border: `2px solid ${arcadeGreenDark}`, 
                      color: arcadeGreen,
                      fontFamily: '"VT323", monospace',
                      fontSize: '24px'
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm mb-3" style={{ color: arcadeGreen }}>PASSWORD</label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2" style={{ color: arcadeGreenDark }} />
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-12 py-5 rounded-xl text-sm"
                    style={{ 
                      backgroundColor: arcadeBg, 
                      border: `2px solid ${arcadeGreenDark}`, 
                      color: arcadeGreen,
                      fontFamily: '"VT323", monospace',
                      fontSize: '24px'
                    }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full py-6 text-sm font-bold rounded-xl"
                style={{ 
                  backgroundColor: arcadeGreen, 
                  color: arcadeBg,
                  boxShadow: `0 0 20px ${arcadeGreen}50`,
                  opacity: isLoading || !email || !password ? 0.5 : 1
                }}
              >
                {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div style={{ flex: 1, height: '2px', backgroundColor: arcadeGreenDark }}></div>
              <span className="text-xs" style={{ color: arcadeGreen }}>OR</span>
              <div style={{ flex: 1, height: '2px', backgroundColor: arcadeGreenDark }}></div>
            </div>

            {/* Google Sign In */}
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-4 text-sm font-bold rounded-xl flex items-center justify-center gap-3"
              style={{ 
                backgroundColor: '#ffffff', 
                color: '#333',
                boxShadow: `0 0 20px ${arcadeGreen}30`
              }}
            >
              <FaGoogle size={20} />
              {isLoading ? 'PLEASE WAIT...' : 'CONTINUE WITH GOOGLE'}
            </button>

            {/* Sign Up Link */}
            <div className="text-center mt-8">
              <p className="text-sm" style={{ color: arcadeGreenDark }}>
                Don't have an account?{' '}
                <Link to="/signup" className="underline" style={{ color: arcadeGreen }}>
                  SIGN UP
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="w-full py-8" style={{ backgroundColor: sapGreen, borderTop: `3px solid ${blackColor}` }}>
        <div className="flex items-center justify-between px-8">
          <div>
            <p className="text-sm" style={{ color: blackColor, fontFamily: '"Press Start 2P", cursive' }}>Engineered By: Agnik Dastidar</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

