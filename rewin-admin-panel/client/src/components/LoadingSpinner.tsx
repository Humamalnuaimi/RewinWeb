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
        {/* Animated Logo */}
        {showAppName && (
          <div style={{ marginBottom: '3rem', position: 'relative' }}>
            {/* Outer rotating ring */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '160px',
              height: '160px',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              borderTop: '3px solid rgba(255, 255, 255, 0.8)',
              borderRadius: '50%',
              animation: 'rotate 3s linear infinite'
            }} />
            
            {/* Middle pulsing ring */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '140px',
              height: '140px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            
            {/* Inner spinning dots */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '50%',
                  transform: `translate(-50%, -50%) rotate(${i * 60}deg) translateY(-50px)`,
                  animation: `spin 4s linear infinite`,
                  animationDelay: `${i * 0.2}s`
                }}
              />
            ))}
            
            {/* Central Logo */}
            <div style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              borderRadius: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 25px 50px rgba(255, 107, 107, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              animation: 'logoFloat 3s ease-in-out infinite',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden'
            }}>
              <img 
                src="/R.png" 
                alt="Rewin Logo" 
                style={{
                  width: '80px',
                  height: '80px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))',
                  animation: 'logoGlow 2s ease-in-out infinite alternate'
                }}
                onError={(e) => {
                  // Fallback to text if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const fallbackText = document.createElement('span');
                    fallbackText.textContent = 'R';
                    fallbackText.style.fontSize = '4rem';
                    fallbackText.style.fontWeight = '900';
                    fallbackText.style.color = 'white';
                    fallbackText.style.textShadow = '0 3px 6px rgba(0,0,0,0.3)';
                    fallbackText.style.animation = 'logoGlow 2s ease-in-out infinite alternate';
                    parent.appendChild(fallbackText);
                  }
                }}
              />
            </div>
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
        @keyframes rotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes spin {
          from { transform: translate(-50%, -50%) rotate(0deg) translateY(-50px); }
          to { transform: translate(-50%, -50%) rotate(360deg) translateY(-50px); }
        }

        @keyframes logoFloat {
          0%, 100% { 
            transform: translateY(0px) scale(1);
            box-shadow: 0 25px 50px rgba(255, 107, 107, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
          50% { 
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 35px 60px rgba(255, 107, 107, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }
        }

        @keyframes logoGlow {
          from { 
            filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3)) drop-shadow(0 0 20px rgba(255, 255, 255, 0.3));
            text-shadow: 0 3px 6px rgba(0,0,0,0.3), 0 0 20px rgba(255, 255, 255, 0.3); 
          }
          to { 
            filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3)) drop-shadow(0 0 30px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 40px rgba(255, 107, 107, 0.4));
            text-shadow: 0 3px 6px rgba(0,0,0,0.3), 0 0 30px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 107, 107, 0.4); 
          }
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
          0%, 100% { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1);
          }
          50% { 
            opacity: 0.6; 
            transform: translate(-50%, -50%) scale(1.05);
          }
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