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
          <div style={{ marginBottom: '3rem', position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
            {/* Outer rotating ring around logo */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '180px',
              height: '180px',
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
              width: '160px',
              height: '160px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            
            {/* Spinning dots around logo */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '10px',
                  height: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '50%',
                  transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-70px)`,
                  animation: `spin 4s linear infinite`,
                  animationDelay: `${i * 0.1}s`,
                  boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
                }}
              />
            ))}
            
            {/* Central Logo - Direct placement without container box */}
            <img 
              src="/R.png" 
              alt="Rewin Logo" 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120px',
                height: '120px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.3)) drop-shadow(0 0 30px rgba(255, 255, 255, 0.4))',
                animation: 'logoFloat 3s ease-in-out infinite',
                zIndex: 10
              }}
              onError={(e) => {
                // Fallback to text if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallbackText = document.createElement('div');
                  fallbackText.textContent = 'R';
                  fallbackText.style.position = 'absolute';
                  fallbackText.style.top = '50%';
                  fallbackText.style.left = '50%';
                  fallbackText.style.transform = 'translate(-50%, -50%)';
                  fallbackText.style.fontSize = '6rem';
                  fallbackText.style.fontWeight = '900';
                  fallbackText.style.color = 'white';
                  fallbackText.style.textShadow = '0 5px 15px rgba(0,0,0,0.3), 0 0 30px rgba(255, 255, 255, 0.4)';
                  fallbackText.style.animation = 'logoFloat 3s ease-in-out infinite';
                  fallbackText.style.zIndex = '10';
                  parent.appendChild(fallbackText);
                }
              }}
            />
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
          from { transform: translate(-50%, -50%) rotate(0deg) translateY(-70px); }
          to { transform: translate(-50%, -50%) rotate(360deg) translateY(-70px); }
        }

        @keyframes logoFloat {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1);
            filter: drop-shadow(0 5px 15px rgba(0,0,0,0.3)) drop-shadow(0 0 30px rgba(255, 255, 255, 0.4));
          }
          50% { 
            transform: translate(-50%, -50%) translateY(-10px) scale(1.05);
            filter: drop-shadow(0 10px 25px rgba(0,0,0,0.4)) drop-shadow(0 0 40px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 20px rgba(255, 107, 107, 0.3));
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