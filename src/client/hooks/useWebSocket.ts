import { useEffect, useState, useCallback } from "react";
import { wsClient } from "@client/lib/websocket";

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(wsClient.isConnected);

  useEffect(() => {
    const unsubConnect = wsClient.onConnect(() => {
      setIsConnected(true);
    });

    const unsubDisconnect = wsClient.onDisconnect(() => {
      setIsConnected(false);
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, []);

  const connect = useCallback(() => {
    wsClient.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
  };
}
