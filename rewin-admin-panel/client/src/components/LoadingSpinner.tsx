import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  showAppName?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "Loading...", 
  showAppName = true 
}) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      {/* Animated Background Circles */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none'
      }}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${80 + i * 20}px`,
              height: `${80 + i * 20}px`,
              borderRadius: '50%',
              background: `rgba(255, 255, 255, ${0.03 + i * 0.01})`,
              left: `${10 + i * 15}%`,
              top: `${10 + i * 10}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite alternate`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        animation: 'fadeInUp 0.8s ease-out'
      }}>
        {/* App Logo and Name */}
        {showAppName && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              width: '100px',
              height: '100px',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              borderRadius: '25px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
              boxShadow: '0 20px 40px rgba(255, 107, 107, 0.3)',
              animation: 'bounce 2s infinite'
            }}>
              <span style={{ 
                fontSize: '3rem', 
                fontWeight: '900',
                color: 'white',
                textShadow: '3px 3px 6px rgba(0,0,0,0.3)'
              }}>R</span>
            </div>
            
            <h1 style={{ 
              fontSize: '3.5rem', 
              fontWeight: '900',
              margin: '0',
              color: 'white',
              textShadow: '3px 3px 6px rgba(0,0,0,0.3)',
              letterSpacing: '-2px',
              animation: 'glow 2s ease-in-out infinite alternate'
            }}>
              Rewin Admin
            </h1>
          </div>
        )}

        {/* Loading Animation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {/* Spinning Emoji */}
          <div style={{
            fontSize: '2.5rem',
            animation: 'spin 2s linear infinite'
          }}>
            🔄
          </div>
          
          {/* Bouncing Dots */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '50%',
                  animation: `bounce 1.4s infinite ease-in-out both`,
                  animationDelay: `${i * 0.16}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Loading Message */}
        <p style={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '1.2rem',
          margin: 0,
          fontWeight: '500',
          animation: 'pulse 2s infinite'
        }}>
          {message}
        </p>

        {/* Progress Bar */}
        <div style={{
          width: '300px',
          height: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '2px',
          marginTop: '2rem',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4)',
            borderRadius: '2px',
            animation: 'loading 2s ease-in-out infinite'
          }} />
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes bounce {
          0%, 80%, 100% { 
            transform: scale(0);
            opacity: 0.5;
          } 
          40% { 
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        @keyframes glow {
          from { text-shadow: 0 0 20px rgba(255, 255, 255, 0.5); }
          to { text-shadow: 0 0 30px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.6); }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          from { transform: translateY(0px); }
          to { transform: translateY(-10px); }
        }

        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;