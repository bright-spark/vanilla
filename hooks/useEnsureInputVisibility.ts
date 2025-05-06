import { useEffect } from 'react';

/**
 * Custom hook to ensure the mobile input area remains visible
 * This addresses the issue where the input box disappears after the second message
 */
export function useEnsureInputVisibility() {
  useEffect(() => {
    // Function to check and restore the mobile input visibility
    const ensureInputVisibility = () => {
      const mobileInputArea = document.getElementById('mobile-input-area');
      
      if (mobileInputArea) {
        // Check if the element is hidden (display: none) or has zero opacity
        const styles = window.getComputedStyle(mobileInputArea);
        
        if (styles.display === 'none' || styles.opacity === '0' || styles.visibility === 'hidden') {
          console.log('Mobile input was hidden, restoring visibility');
          
          // Force the element to be visible
          mobileInputArea.style.display = 'block';
          mobileInputArea.style.opacity = '1';
          mobileInputArea.style.visibility = 'visible';
          mobileInputArea.style.zIndex = '9999';
          
          // Remove any classes that might be hiding it
          mobileInputArea.classList.remove('hidden');
          mobileInputArea.classList.add('block');
        }
      }
    };

    // Check visibility immediately
    ensureInputVisibility();
    
    // Set up an interval to periodically check visibility
    const visibilityInterval = setInterval(ensureInputVisibility, 500);
    
    // Also check after DOM changes that might affect visibility
    const observer = new MutationObserver((mutations) => {
      ensureInputVisibility();
    });
    
    // Start observing the document body for DOM changes
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // Clean up
    return () => {
      clearInterval(visibilityInterval);
      observer.disconnect();
    };
  }, []);
}
