import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessageEvent, ParsedChatMessageData } from '../types';
import { CONNECTION_CONFIG, STATUS_MESSAGES } from '../constants';

export const useKickChat = (
    user: string | null,
    onMessage: (data: ParsedChatMessageData) => void,
    onClear: () => void,
    setStatus: (status: string) => void
) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    
    const ws = useRef<WebSocket | null>(null);
    const pingInterval = useRef<number | null>(null);
    const reconnectTimeout = useRef<number | null>(null);
    const connectionTimeout = useRef<number | null>(null);

    const connect = useCallback((chatroomID: number) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            return;
        }

        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
        if (pingInterval.current) clearInterval(pingInterval.current);

        setIsConnecting(true);
        setError(null);
        
        console.log('Starting connection attempt to chatroom:', chatroomID);

        const wsUrl = `wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false`;
        
        console.log(`Attempting to connect to chatroom ${chatroomID} using endpoint: ${wsUrl}`);
        console.log(`This is retry attempt ${retryCount + 1}/${CONNECTION_CONFIG.MAX_RETRIES}`);
        
        try {
            ws.current = new WebSocket(wsUrl);
            console.log('WebSocket object created successfully');
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            setIsConnecting(false);
            setError('Failed to create WebSocket connection');
            return;
        }

        connectionTimeout.current = window.setTimeout(() => {
            if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
                console.log("Connection timeout");
                ws.current.close();
                handleConnectionTimeout(chatroomID);
            }
        }, CONNECTION_CONFIG.TIMEOUT_MS);

        ws.current.onopen = () => {
            console.log("WebSocket Connected to Pusher");
            
            if (connectionTimeout.current) {
                clearTimeout(connectionTimeout.current);
                connectionTimeout.current = null;
            }
            
            setIsConnected(true);
            setIsConnecting(false);
            setError(null);
            setRetryCount(0);
            setStatus(STATUS_MESSAGES.CONNECTED(user || 'Unknown'));
            
            const subscribeMessage = {
                event: "pusher:subscribe",
                data: { 
                    auth: null,
                    channel: `chatrooms.${chatroomID}.v2` 
                }
            };
            
            console.log(`Subscribing to chatrooms.${chatroomID}.v2`);
            
            try {
                ws.current.send(JSON.stringify(subscribeMessage));
            } catch (error) {
                console.error('Failed to send subscription message:', error);
                setError('Failed to subscribe to chat channel');
                return;
            }

            if (pingInterval.current) clearInterval(pingInterval.current);
            pingInterval.current = window.setInterval(() => {
                if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({ event: "pusher:ping", data: {} }));
                } else {
                    console.log("WebSocket not open during ping interval, clearing interval.");
                    if (pingInterval.current) {
                        clearInterval(pingInterval.current);
                        pingInterval.current = null;
                    }
                }
            }, 60000);
        };

        ws.current.onmessage = (event) => {
            try {
                const msg: ChatMessageEvent = JSON.parse(event.data);
                
                if (msg.event.startsWith("pusher:") && msg.event !== "pusher:pong") {
                    if (msg.event === 'pusher:subscription_succeeded') {
                        console.log(`Successfully subscribed to channel: ${msg.channel}`);
                    } else if (msg.event === 'pusher:error') {
                        console.error(`Pusher Error: ${JSON.stringify(msg.data)}`);
                        setError("Chat subscription error");
                    }
                    return;
                }

                if (msg.data && typeof msg.data === 'string') {
                    const cleanedDataString = msg.data
                        .replace(/\\u00a0/g, " ")
                        .replace(/\\n/g, " ")
                        .replace(/\\t/g, " ")
                        .replace(/\\r/g, " ")
                        .replace(/\\\\/g, "\\");
                    
                    let data: ParsedChatMessageData;
                    try {
                        data = JSON.parse(cleanedDataString);
                    } catch (parseError) {
                        console.error("Failed to parse inner JSON data:", parseError, "Original:", cleanedDataString);
                        return;
                    }

                    switch (msg.event) {
                        case "App\\Events\\ChatMessageEvent":
                            onMessage(data);
                            break;
                        case "App\\Events\\ChatroomClearEvent":
                            console.log("Chat cleared event received.");
                            onClear();
                            break;
                    }
                } else if (msg.event !== "pusher:pong") {
                    // console.log("Received message with unexpected data format:", msg);
                }
            } catch (error) {
                console.error("Failed to parse WebSocket message:", error, "Original message:", event.data);
            }
        };

        ws.current.onerror = (error) => {
            console.error("WebSocket Error:", error);
            
            if (pingInterval.current) {
                clearInterval(pingInterval.current);
                pingInterval.current = null;
            }
            
            setError("WebSocket connection error. Trying to reconnect...");
            setIsConnecting(false);
        };

        ws.current.onclose = (event) => {
            console.log("WebSocket closed:", event.reason, event.code);
            setIsConnected(false);
            setIsConnecting(false);
            
            if (pingInterval.current) {
                clearInterval(pingInterval.current);
                pingInterval.current = null;
            }
            if (connectionTimeout.current) {
                clearTimeout(connectionTimeout.current);
                connectionTimeout.current = null;
            }
            
            if (event.code !== 1000 && retryCount < CONNECTION_CONFIG.MAX_RETRIES) {
                setStatus("WebSocket disconnected. Attempting to reconnect in 5 seconds...");
                
                reconnectTimeout.current = window.setTimeout(() => {
                    if (!ws.current || (ws.current.readyState !== WebSocket.OPEN && ws.current.readyState !== WebSocket.CONNECTING)) {
                        setRetryCount(prev => prev + 1);
                        connect(chatroomID);
                    }
                }, 5000);
            } else if (event.code === 1000) {
                setStatus('Disconnected');
            } else {
                setError(STATUS_MESSAGES.CONNECTION_FAILED);
                setStatus(STATUS_MESSAGES.CONNECTION_FAILED);
            }
        };

    }, [user, onMessage, onClear, setStatus, retryCount]);

    const handleConnectionTimeout = useCallback((chatroomID: number) => {
        console.log(`Connection timeout for chatroom ${chatroomID}`);
        setIsConnecting(false);
        
        if (retryCount < CONNECTION_CONFIG.MAX_RETRIES) {
            setError("Connection timeout. Retrying...");
            setStatus("Connection timeout. Retrying...");
            
            reconnectTimeout.current = window.setTimeout(() => {
                if (!ws.current || (ws.current.readyState !== WebSocket.OPEN && ws.current.readyState !== WebSocket.CONNECTING)) {
                    setRetryCount(prev => prev + 1);
                    connect(chatroomID);
                }
            }, 5000);
        } else {
            console.error(`Failed to connect after ${CONNECTION_CONFIG.MAX_RETRIES} attempts`);
            setError(STATUS_MESSAGES.CONNECTION_FAILED);
            setStatus(STATUS_MESSAGES.CONNECTION_FAILED);
        }
    }, [retryCount, connect]);

    const disconnect = useCallback(() => {
        console.log("Manually disconnecting WebSocket");
        if (ws.current) {
            ws.current.close(1000, 'Manual disconnect');
        }
        if (pingInterval.current) {
            clearInterval(pingInterval.current);
            pingInterval.current = null;
        }
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }
        if (connectionTimeout.current) {
            clearTimeout(connectionTimeout.current);
            connectionTimeout.current = null;
        }
        
        setIsConnected(false);
        setIsConnecting(false);
        setError(null);
        setRetryCount(0);
    }, []);

    const reconnect = useCallback((chatroomID: number) => {
        console.log("Manual reconnect requested");
        
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
        if (pingInterval.current) clearInterval(pingInterval.current);
        
        setRetryCount(0);
        setError(null);
        setIsConnecting(false);
        setIsConnected(false);
        
        disconnect();
        setTimeout(() => connect(chatroomID), 1000);
    }, [disconnect, connect]);

    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return { 
        isConnected, 
        isConnecting, 
        error, 
        retryCount,
        connect,
        disconnect,
        reconnect
    };
};
