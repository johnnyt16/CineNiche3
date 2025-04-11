import React, { useState, useEffect } from 'react';
import { debugPosterMatching, forceReloadPosters } from '../services/api';

const PosterDebugPage: React.FC = () => {
  const [movieTitle, setMovieTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  // Sample problematic titles for quick testing
  const sampleTitles = [
    "FriendButMarried",
    "FriendButMarried 2",
    "'79",
    "'86",
    "Selfie",
    "Selfie 69"
  ];

  const handleDebug = async () => {
    if (!movieTitle.trim()) return;
    
    setIsLoading(true);
    setResults([]);
    
    // Capture console.log output
    const originalConsoleLog = console.log;
    const logs: string[] = [];
    
    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');
      logs.push(message);
      originalConsoleLog(...args);
    };
    
    try {
      // Run the debugging function
      await debugPosterMatching(movieTitle);
      setResults(logs);
      setHasRun(true);
    } catch (error: any) {
      console.error("Error during debugging:", error);
      logs.push(`ERROR: ${error?.message || 'Unknown error occurred'}`);
      setResults(logs);
    } finally {
      // Restore original console.log
      console.log = originalConsoleLog;
      setIsLoading(false);
    }
  };

  const handleReloadPosters = async () => {
    setIsLoading(true);
    try {
      const success = await forceReloadPosters();
      if (success) {
        setResults(["✅ Successfully reloaded all poster URLs"]);
      } else {
        setResults(["❌ Failed to reload poster URLs"]);
      }
    } catch (error: any) {
      setResults([`❌ Error: ${error?.message || 'Unknown error occurred'}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const runAllSamples = async () => {
    setIsLoading(true);
    setResults([]);
    
    const allResults: string[] = [];
    
    for (const title of sampleTitles) {
      allResults.push(`\n==== TESTING: "${title}" ====`);
      
      // Capture console.log output for this sample
      const originalConsoleLog = console.log;
      const logs: string[] = [];
      
      console.log = (...args) => {
        const message = args.map(arg => 
          typeof arg === 'string' ? arg : JSON.stringify(arg)
        ).join(' ');
        logs.push(message);
        originalConsoleLog(...args);
      };
      
      try {
        await debugPosterMatching(title);
        allResults.push(...logs);
      } catch (error: any) {
        console.error(`Error debugging "${title}":`, error);
        allResults.push(`ERROR: ${error?.message || 'Unknown error occurred'}`);
      } finally {
        // Restore original console.log
        console.log = originalConsoleLog;
      }
    }
    
    setResults(allResults);
    setHasRun(true);
    setIsLoading(false);
  };

  return (
    <div className="poster-debug-page">
      <h1>Poster Matching Debug Utility</h1>
      
      <div className="debug-controls">
        <div className="input-group">
          <input
            type="text"
            value={movieTitle}
            onChange={e => setMovieTitle(e.target.value)}
            placeholder="Enter movie title to debug"
            disabled={isLoading}
          />
          <button 
            onClick={handleDebug}
            disabled={isLoading || !movieTitle.trim()}
          >
            {isLoading ? 'Debugging...' : 'Debug Title'}
          </button>
        </div>
        
        <div className="sample-buttons">
          <h3>Sample Problematic Titles:</h3>
          <div className="button-group">
            {sampleTitles.map(title => (
              <button 
                key={title}
                onClick={() => setMovieTitle(title)}
                disabled={isLoading}
              >
                {title}
              </button>
            ))}
          </div>
          <button 
            onClick={runAllSamples}
            disabled={isLoading}
            className="run-all-button"
          >
            Run All Samples
          </button>
        </div>
        
        <div className="reload-section">
          <button 
            onClick={handleReloadPosters}
            disabled={isLoading}
            className="reload-button"
          >
            Force Reload All Posters
          </button>
        </div>
      </div>
      
      {hasRun && (
        <div className="results-container">
          <h2>Debug Results:</h2>
          <pre className="results-output">
            {results.length > 0 
              ? results.join('\n') 
              : 'No results yet. Run debug first.'}
          </pre>
        </div>
      )}
      
      <style>{`
        .poster-debug-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .debug-controls {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2rem;
          background-color: var(--card-background);
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: var(--box-shadow);
        }
        
        .input-group {
          display: flex;
          gap: 0.5rem;
        }
        
        .poster-debug-page input {
          flex: 1;
          padding: 0.75rem;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--text-color);
          font-size: 1rem;
        }
        
        .poster-debug-page button {
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          background-color: var(--primary-color);
          color: white;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }
        
        .poster-debug-page button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .sample-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .sample-buttons h3 {
          margin: 0;
          color: var(--accent-color);
          font-size: 1rem;
        }
        
        .button-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .run-all-button {
          margin-top: 1rem;
          background-color: var(--accent-color);
        }
        
        .reload-button {
          background-color: var(--secondary-color);
        }
        
        .results-container {
          background-color: var(--card-background);
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: var(--box-shadow);
        }
        
        .results-output {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 4px;
          white-space: pre-wrap;
          overflow-x: auto;
          max-height: 600px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};

export default PosterDebugPage; 