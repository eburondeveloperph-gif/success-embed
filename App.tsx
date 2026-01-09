
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

/**
 * Main application component that embeds an external URL as the primary interface.
 */
function App() {
  return (
    <div className="App embedded-container">
      <iframe
        src="https://success.eburon.ai"
        className="full-screen-iframe"
        title="Eburon Success"
        allow="microphone; camera; geolocation; autoplay; encrypted-media; fullscreen"
      />
    </div>
  );
}

export default App;
