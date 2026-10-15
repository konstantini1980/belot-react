import React, { useState } from 'react';
import LocalGame from './LocalGame';
import OnlineGame from './components/OnlineGame';
import { OnlineSetup } from './components/OnlineScreens';
import { SERVER_URL, initialTable, loadSession, newRoomCode, newToken, saveSession } from './online/session';
import './App.css';

// Local play (you and three AI players) or an online table with up to three friends (AI in the free seats).
// Online play is offered only when the build knows a game server (see online/session.js).
// Read once per page load (it also tidies the shared link out of the address)
const startingTable = initialTable();

export default function App() {
  // null: local game; 'setup': choosing to create or join; else the table { code, token, as?, create? }
  const [online, setOnline] = useState(startingTable);

  const createTable = () => setOnline({ code: newRoomCode(), token: newToken(), create: true });
  const joinTable = (code) => {
    const saved = loadSession();
    setOnline({ code, token: saved?.code === code ? saved.token : newToken() }); // Our old seat, if we had one
  };
  const leaveTable = () => {
    saveSession(online.code, online.token, true); // Not rejoined on reload; the link still works
    setOnline(null);
  };

  let screen;
  if (online === null) {
    screen = <LocalGame onPlayOnline={SERVER_URL ? () => setOnline('setup') : null} />;
  } else if (online === 'setup') {
    screen = <OnlineSetup onCreate={createTable} onJoin={joinTable} onBack={() => setOnline(null)} />;
  } else {
    screen = (
      <OnlineGame
        key={online.code}
        table={online}
        onLeave={leaveTable}
        onCodeTaken={createTable} // Another table has this code: pick a new one
      />
    );
  }
  return <div className="app">{screen}</div>;
}
