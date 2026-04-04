import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const prevBg = document.body.style.backgroundColor;
    const prevOverflow = document.body.style.overflow;
    document.body.style.backgroundColor = '#efe8d8';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.backgroundColor = prevBg;
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#efe8d8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 0 40px 40px',
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── Image Card Container ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 80px)',
          borderRadius: '28px 0 0 28px',
          border: '2px solid #1a1a1a',
          borderRight: 'none',
          overflow: 'hidden',
          boxShadow:
            '-20px 20px 60px rgba(0,0,0,0.35), -8px 8px 30px rgba(0,0,0,0.2), 0 0 80px rgba(0,0,0,0.1)',
        }}
      >
        {/* Background Image */}
        <img
          src="/bg.png"
          alt="Ignition Background"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />

        {/* Dark Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to right, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 50%, rgba(10,10,10,0.88) 75%, rgba(10,10,10,0.95) 100%)',
            zIndex: 1,
          }}
        />

        {/* Bottom Gradient for footer text */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '120px',
            background:
              'linear-gradient(to top, rgba(10,10,10,0.9) 0%, transparent 100%)',
            zIndex: 1,
          }}
        />

        {/* ── Content Layer ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '40px 60px',
          }}
        >
          {/* Top: Logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                fontWeight: 300,
              }}
            >
              ⊖
            </div>
          </motion.div>

          {/* Middle: Hero Text — right-aligned */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.9, ease: 'easeOut' }}
            style={{
              maxWidth: '480px',
              alignSelf: 'flex-end',
              textAlign: 'left',
            }}
          >
            <h1
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(2.4rem, 4vw, 3.5rem)',
                fontWeight: 400,
                color: '#ffffff',
                lineHeight: 1.15,
                marginBottom: '20px',
                letterSpacing: '-0.02em',
              }}
            >
              Premium Intelligence.{' '}
              <br />
              Priced per Prompt.
            </h1>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)',
                fontWeight: 300,
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.65,
                marginBottom: '32px',
                maxWidth: '380px',
              }}
            >
              From zero to extraordinary. Access the world's most powerful AI
              models. Deploy agents, join the community — pay only for what you
              compute.
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <motion.button
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.15)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/home')}
                style={{
                  padding: '12px 28px',
                  borderRadius: '100px',
                  border: '1px solid rgba(255,255,255,0.4)',
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  letterSpacing: '0.02em',
                  transition: 'all 0.2s ease',
                }}
              >
                Enter Playground
                <ArrowRight size={16} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/home?tab=community')}
                style={{
                  padding: '12px 28px',
                  borderRadius: '100px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.85rem',
                  fontWeight: 400,
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'all 0.2s ease',
                }}
              >
                Explore Community
              </motion.button>
            </div>
          </motion.div>

          {/* Bottom: Footer Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            {/* Left tagline */}
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(1.4rem, 2.8vw, 2.2rem)',
                fontWeight: 500,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              Compute fast. Build slow.
            </h2>

            {/* Center branding */}
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.72rem',
                fontWeight: 300,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.08em',
              }}
            >
              ignition.ai
            </span>

            {/* Right keywords */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.72rem',
                fontWeight: 300,
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.06em',
              }}
            >
              <span>ai</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>✦</span>
              <span>agents</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>✦</span>
              <span>algorand</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;