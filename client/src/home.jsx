import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// SVG Icon Components
const CopyIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
  </svg>
);

const CheckIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const AttachIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 0 18.8-4.3M22 12.5a10 10 0 0 0-18.8 2.2"></path>
  </svg>
);

const MenuIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2"></circle>
    <circle cx="12" cy="12" r="2"></circle>
    <circle cx="12" cy="19" r="2"></circle>
  </svg>
);

const DocumentIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"></path>
  </svg>
);

const ImageIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const VideoIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const AudioIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1a11 11 0 0 0 0 22 11 11 0 0 0 0-22zm0 2a9 9 0 0 1 0 18 9 9 0 0 1 0-18z"></path>
    <path d="M12 6v12"></path>
    <path d="M8 8v8M16 8v8"></path>
  </svg>
);

const ChevronDownIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const InfoIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

function Home() {
  const [stage, setStage] = useState('home');
  const [pin, setPin] = useState('');
  const [localIp, setLocalIp] = useState('Detecting...');
  const [creatorIpInput, setCreatorIpInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [status, setStatus] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [copiedMsg, setCopiedMsg] = useState(null);
  const [copiedIp, setCopiedIp] = useState(false);
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, message: null });
  const [uploadProgress, setUploadProgress] = useState(null);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const iceCandidateQueue = useRef([]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-detect LAN IP
  useEffect(() => {
    const detectIp = async () => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const ipMatch = e.candidate.candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
          if (ipMatch) {
            const ip = ipMatch[1];
            if (
              ip.startsWith('192.168.') ||
              ip.startsWith('10.') ||
              /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
            ) {
              setLocalIp(ip);
              pc.close();
            }
          }
        }
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
      } catch (err) {
        setLocalIp('Could not detect IP');
      }
    };

    detectIp();
  }, []);

  // Copy to clipboard utility
  const copyToClipboard = async (text, setState) => {
    try {
      await navigator.clipboard.writeText(text);
      setState(true);
      setTimeout(() => setState(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Fallback metadata helper
  const getFallbackMetadata = () => ({
    name: 'unknown_file_' + Date.now(),
    size: 0,
    mimeType: 'application/octet-stream'
  });

  // Validate file start data
  const validateFileStart = (data) => {
    if (!data.name || typeof data.name !== 'string') {
      data.name = 'unnamed_file_' + Date.now();
    }
    if (!data.size || typeof data.size !== 'number' || data.size < 0) {
      data.size = 0;
    }
    if (!data.mimeType || typeof data.mimeType !== 'string') {
      data.mimeType = 'application/octet-stream';
    }
    return data;
  };

  // Setup data channel message handler
  const setupDataChannelHandlers = (dc) => {
    // Prevent setting up handlers multiple times
    if (dc._handlersSet) return;
    dc._handlersSet = true;
    
    let fileBuffer = [];
    let fileMetadata = null;
    let receivedSize = 0;

    dc.onmessage = (ev) => {
      try {
        // Try to parse as JSON (for metadata or text messages)
        const data = JSON.parse(ev.data);
        
        if (data && data.type === 'text' && data.content) {
          // Regular text message
          setMessages((prev) => [...prev, { 
            from: 'peer', 
            text: data.content, 
            id: Date.now(),
            type: 'text'
          }]);
        } else if (data && data.type === 'file-start') {
          // File transfer starting - validate and sanitize
          const validatedData = validateFileStart(data);
          fileMetadata = validatedData;
          fileBuffer = [];
          receivedSize = 0;
          setUploadProgress({ 
            name: validatedData.name, 
            progress: 0 
          });
          console.log('File transfer started:', validatedData.name);
        } else if (data && data.type === 'file-end') {
          // File transfer complete - check if we have valid metadata
          if (!fileMetadata || !fileMetadata.name) {
            console.warn('Received file-end but no metadata, skipping');
            fileBuffer = [];
            fileMetadata = null;
            receivedSize = 0;
            setUploadProgress(null);
            return;
          }

          if (fileBuffer.length === 0) {
            console.warn('Received file-end with empty buffer');
            fileBuffer = [];
            fileMetadata = null;
            receivedSize = 0;
            setUploadProgress(null);
            return;
          }
          
          const currentFileName = fileMetadata.name;
          const currentSize = fileMetadata.size;
          const currentMimeType = fileMetadata.mimeType;
          
          try {
            const blob = new Blob(fileBuffer, { type: currentMimeType });
            const url = URL.createObjectURL(blob);
            
            setMessages((prev) => [...prev, {
              from: 'peer',
              type: 'file',
              fileUrl: url,
              fileName: currentFileName,
              fileSize: currentSize,
              mimeType: currentMimeType,
              id: Date.now()
            }]);
            
            console.log('File transfer completed:', currentFileName);
          } catch (blobError) {
            console.error('Error creating blob:', blobError);
          }
          
          // Reset state
          fileBuffer = [];
          fileMetadata = null;
          receivedSize = 0;
          setUploadProgress(null);
        }
      } catch {
        // Binary data (file chunk)
        if (fileMetadata && fileMetadata.size > 0) {
          fileBuffer.push(ev.data);
          receivedSize += (ev.data.byteLength || ev.data.size || 0);
          const progress = Math.min(100, Math.round((receivedSize / fileMetadata.size) * 100));
          setUploadProgress({ 
            name: fileMetadata.name || 'Receiving...', 
            progress 
          });
        }
      }
    };
  };

  // Create Session
  const createSession = async () => {
    setStage('creating');
    const randomPin = String(1000 + Math.floor(Math.random() * 9000));
    setPin(randomPin);
    setStatus('Connecting to signaling server...');

    const socket = io(`http://localhost:9001`, {
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ['websocket']
    });
    socketRef.current = socket;

    socket.on('connect', async () => {
      setStatus('Creating session...');

      const pc = new RTCPeerConnection({ iceServers: [] });
      pcRef.current = pc;

      const dc = pc.createDataChannel('chat', {
        ordered: true
      });
      dcRef.current = dc;

      setupDataChannelHandlers(dc);

      dc.onopen = () => {
        setStage('connected');
        setStatus('Connected! Ready to chat.');
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('candidate', { pin: randomPin, candidate: e.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const offerBase64 = btoa(JSON.stringify(pc.localDescription));
      socket.emit('create-room', { pin: randomPin, offer: offerBase64 });

      setStatus(
        `Session created!\n\n` +
        `Share with joiner:\n` +
        `   IP: ${localIp}\n` +
        `   PIN: ${randomPin}\n\n` +
        `Waiting for joiner...`
      );
    });

    socket.on('answer', async (answerBase64) => {
      if (!pcRef.current) return;
      try {
        const answer = JSON.parse(atob(answerBase64));
        await pcRef.current.setRemoteDescription(answer);
        setStatus('Joiner connected! Finalizing...');
        
        // Process queued ICE candidates
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('Queued candidate add failed:', err);
          }
        }
      } catch (err) {
        setStatus('Answer processing error: ' + err.message);
      }
    });

    socket.on('candidate', async (candidate) => {
      if (pcRef.current) {
        if (pcRef.current.remoteDescription) {
          // Remote description is set, add candidate immediately
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('Candidate add failed:', err);
          }
        } else {
          // Queue candidate until remote description is set
          iceCandidateQueue.current.push(candidate);
        }
      }
    });

    socket.on('room-created', () => {
      console.log('Room successfully created on server');
    });

    socket.on('error', (msg) => setStatus('Signaling error: ' + msg));
    socket.on('connect_error', (err) => {
      setStatus('Cannot reach signaling server. Make sure signaler.js is running!\n' + err.message);
    });
  };

  // Join Session
  const joinSession = () => {
    if (!pinInput || !creatorIpInput) {
      return setStatus('Enter both IP and PIN');
    }

    setStage('joining');
    setStatus('Connecting...');

    const socket = io(`http://${creatorIpInput}:9001`, {
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ['websocket']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('Connected to creator');
      socket.emit('join-room', { pin: pinInput });
    });

    socket.on('offer', async (offerBase64) => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        pcRef.current = pc;

        pc.ondatachannel = (e) => {
          const dc = e.channel;
          dcRef.current = dc;
          
          setupDataChannelHandlers(dc);

          dc.onopen = () => {
            setStage('connected');
            setStatus('Connected! Ready to chat.');
          };
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit('candidate', { pin: pinInput, candidate: e.candidate });
          }
        };

        const offer = JSON.parse(atob(offerBase64));
        await pc.setRemoteDescription(offer);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const answerBase64 = btoa(JSON.stringify(pc.localDescription));
        socket.emit('answer', { pin: pinInput, answer: answerBase64 });

        setStatus('Answer sent — finalizing connection');
        
        // Process queued ICE candidates after setting remote description
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('Queued candidate add failed:', err);
          }
        }
      } catch (err) {
        setStatus('Error joining: ' + err.message);
      }
    });

    socket.on('answer', async (answerBase64) => {
      if (!pcRef.current) return;
      try {
        const answer = JSON.parse(atob(answerBase64));
        await pcRef.current.setRemoteDescription(answer);
        setStatus('Connection established!');
        
        // Process queued ICE candidates
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('Queued candidate add failed:', err);
          }
        }
      } catch (err) {
        setStatus('Answer processing error: ' + err.message);
      }
    });

    socket.on('candidate', async (candidate) => {
      if (pcRef.current) {
        if (pcRef.current.remoteDescription) {
          // Remote description is set, add candidate immediately
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('Candidate add failed:', err);
          }
        } else {
          // Queue candidate until remote description is set
          iceCandidateQueue.current.push(candidate);
        }
      }
    });

    socket.on('error', (msg) => setStatus('Signaling error: ' + msg));
    socket.on('connect_error', (err) => setStatus('Cannot reach creator: ' + err.message));
  };

  const sendMessage = () => {
    const text = chatInput.trim();
    if (text && dcRef.current?.readyState === 'open') {
      const message = JSON.stringify({ type: 'text', content: text });
      dcRef.current.send(message);
      setMessages((prev) => [...prev, { from: 'me', text, id: Date.now(), type: 'text' }]);
      setChatInput('');
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Middleware: Validate file
    const validateFile = (file) => {
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      
      if (file.size > MAX_SIZE) {
        throw new Error(`File size (${formatFileSize(file.size)}) exceeds 5MB limit`);
      }
      
      if (!file.name || file.name.trim() === '') {
        throw new Error('Invalid file name');
      }
      
      if (file.size === 0) {
        throw new Error('Cannot send empty file');
      }
      
      return true;
    };

    // Middleware: Check connection state
    const checkConnection = () => {
      if (!dcRef.current) {
        throw new Error('Data channel not initialized');
      }
      if (dcRef.current.readyState !== 'open') {
        throw new Error('Connection not ready. Please wait.');
      }
      return true;
    };

    try {
      // Run validations
      validateFile(file);
      checkConnection();

      // Sanitize and prepare metadata
      const metadata = {
        type: 'file-start',
        name: file.name || 'unnamed_file_' + Date.now(),
        size: file.size,
        mimeType: file.type || 'application/octet-stream'
      };

      console.log('Sending file:', metadata.name, formatFileSize(metadata.size));
      
      // Send metadata
      dcRef.current.send(JSON.stringify(metadata));

      // Read and send file in chunks
      const CHUNK_SIZE = 16384; // 16KB chunks
      const fileReader = new FileReader();
      let offset = 0;
      let lastProgressUpdate = Date.now();

      setUploadProgress({ name: file.name, progress: 0 });

      const readSlice = () => {
        if (offset >= file.size) return;
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        fileReader.readAsArrayBuffer(slice);
      };

      fileReader.onerror = (error) => {
        console.error('FileReader error:', error);
        setUploadProgress(null);
        alert('Failed to read file. Please try again.');
      };

      fileReader.onload = (e) => {
        if (!e.target?.result) {
          console.error('No file data read');
          return;
        }

        if (dcRef.current?.readyState !== 'open') {
          console.error('Connection lost during file transfer');
          setUploadProgress(null);
          alert('Connection lost. File transfer cancelled.');
          return;
        }

        try {
          dcRef.current.send(e.target.result);
          offset += e.target.result.byteLength;
          
          // Throttle progress updates (max once per 100ms)
          const now = Date.now();
          if (now - lastProgressUpdate > 100 || offset >= file.size) {
            const progress = Math.min(100, Math.round((offset / file.size) * 100));
            setUploadProgress({ name: file.name, progress });
            lastProgressUpdate = now;
          }

          if (offset < file.size) {
            readSlice();
          } else {
            // File transfer complete
            dcRef.current.send(JSON.stringify({ type: 'file-end' }));
            
            // Create local URL for sent file
            const url = URL.createObjectURL(file);
            setMessages((prev) => [...prev, {
              from: 'me',
              type: 'file',
              fileUrl: url,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type || 'application/octet-stream',
              id: Date.now()
            }]);
            
            setUploadProgress(null);
            console.log('File sent successfully:', file.name);
          }
        } catch (sendError) {
          console.error('Error sending file chunk:', sendError);
          setUploadProgress(null);
          alert('Failed to send file. Connection may be unstable.');
        }
      };

      readSlice();
    } catch (err) {
      console.error('File send error:', err);
      alert(err.message || 'Failed to send file. Please try again.');
      setUploadProgress(null);
    }

    // Reset file input
    event.target.value = '';
  };

  const downloadFile = (fileUrl, fileName) => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={24} />;
    if (mimeType.startsWith('video/')) return <VideoIcon size={24} />;
    if (mimeType.startsWith('audio/')) return <AudioIcon size={24} />;
    if (mimeType.includes('pdf')) return <DocumentIcon size={24} />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <DocumentIcon size={24} />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <DocumentIcon size={24} />;
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return <DocumentIcon size={24} />;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return <DocumentIcon size={24} />;
    return <DocumentIcon size={24} />;
  };

  const copyMessage = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsg(id);
      setTimeout(() => setCopiedMsg(null), 2000);
      setMenu({ open: false, x: 0, y: 0, message: null });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openMenu = (event, message) => {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 180;
    const menuHeight = 110;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 12);

    setMenu({ open: true, x, y, message });
  };

  const closeMenu = () => {
    setMenu({ open: false, x: 0, y: 0, message: null });
  };

  // Chat UI
  if (stage === 'connected') {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <div className="flex-center">
            <span className="chat-title">LAN Chat</span>
            <span className="status-dot"></span>
          </div>
          <button className="end-button" onClick={() => location.reload()}>
            End Session
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`message-wrapper ${m.from === 'me' ? 'sent' : 'received'}`}
              onContextMenu={(e) => m.type === 'text' && openMenu(e, m)}
            >
              {m.from === 'me' && (
                <button
                  className={`message-menu-button ${m.from === 'me' ? 'sent' : 'received'}`}
                  onClick={(e) => openMenu(e, m)}
                  aria-label="Message options"
                  title="Message options"
                >
                  <InfoIcon size={16} />
                </button>
              )}
              <div className="message-bubble">
                {m.type === 'text' ? (
                  <div className="message-text">{m.text}</div>
                ) : (
                  <div className="file-message">
                    {m.mimeType.startsWith('image/') ? (
                      <div className="file-preview">
                        <img 
                          src={m.fileUrl} 
                          alt={m.fileName}
                          className="file-image"
                          onClick={() => window.open(m.fileUrl, '_blank')}
                        />
                      </div>
                    ) : (
                      <div className="file-info">
                        <div className="file-icon-large">{getFileIcon(m.mimeType)}</div>
                        <div className="file-details">
                          <div className="file-name">{m.fileName}</div>
                          <div className="file-size">{formatFileSize(m.fileSize)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {m.from !== 'me' && (
                <button
                  className={`message-menu-button ${m.from === 'me' ? 'sent' : 'received'}`}
                  onClick={(e) => openMenu(e, m)}
                  aria-label="Message options"
                  title="Message options"
                >
                  <InfoIcon size={16} />
                </button>
              )}
            </div>
          ))}
          
          {uploadProgress ? (
            <div className="upload-progress">
              <div className="upload-info">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AttachIcon size={18} />
                  {uploadProgress.name || 'File'}
                </span>
                <span>{uploadProgress.progress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${uploadProgress.progress ?? 0}%` }}
                />
              </div>
            </div>
          ) : null}
          
          <div ref={messagesEndRef} />
        </div>

        {menu.open && (
          <>
            <div className="context-menu-backdrop" onClick={closeMenu} />
            <div
              className="context-menu"
              style={{ top: menu.y, left: menu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              {menu.message?.type === 'text' ? (
                <button
                  className={`context-menu-item ${copiedMsg === menu.message?.id ? 'copied' : ''}`}
                  onClick={() => copyMessage(menu.message?.text ?? '', menu.message?.id)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {copiedMsg === menu.message?.id ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                    {copiedMsg === menu.message?.id ? 'Copied' : 'Copy'}
                  </span>
                </button>
              ) : (
                <button
                  className="context-menu-item"
                  onClick={() => {
                    downloadFile(menu.message?.fileUrl ?? '', menu.message?.fileName ?? '');
                    closeMenu();
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Download
                  </span>
                </button>
              )}
              <button className="context-menu-item" onClick={closeMenu}>
                Cancel
              </button>
            </div>
          </>
        )}

        <div className="chat-input-container">
          <div className="input-wrapper">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            />
            <button 
              className="attach-button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file (max 5MB)"
              aria-label="Attach file"
            >
              <AttachIcon size={20} />
            </button>
            <input
              className="chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button className="send-button" onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Setup UI
  return (
    <div className="setup-container">
      <div className="setup-content">
        <div className="logo-section">
          <h1 className="main-title">LAN Share</h1>
          <p className="subtitle">Local Wi-Fi text sharing • No internet required</p>
        </div>

        {stage === 'home' && (
          <div className="card">
            <div className="button-group">
              <button className="primary-button create-button" onClick={createSession}>
                <span>Create Session</span>
              </button>
              <button className="primary-button join-button" onClick={() => setStage('joining')}>
                <span>Join Session</span>
              </button>
            </div>
            <div style={{ 
              marginTop: '2rem', 
              paddingTop: '1.5rem', 
              borderTop: '1px solid rgba(59, 130, 246, 0.1)',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'rgba(226, 232, 240, 0.6)'
            }}>
              Made with <span style={{ color: '#ef4444' }}>❤️</span> by <span style={{ color: '#60a5fa', fontWeight: '600' }}>vishalkumar</span>
            </div>
          </div>
        )}

        {stage === 'creating' && (
          <div className="card">
            <h2 className="section-title">Create Session</h2>

            <div className="pin-display">
              <div className="pin-number">{pin || '----'}</div>
              <p className="pin-label">Your PIN Code</p>
            </div>

            <div className="info-box">
              <div className="info-item">
                <span className="info-label">Your LAN IP</span>
                <button
                  className={`ip-copy-button ${copiedIp ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(localIp, setCopiedIp)}
                  title="Click to copy IP"
                >
                  <span className="ip-text">{localIp}</span>
                  <span className="copy-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    {copiedIp ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
                  </span>
                </button>
              </div>
            </div>

            <div className="status-text">{status}</div>

            <p className="hint-text">Make sure signaler.js is running on this device</p>
          </div>
        )}

        {stage === 'joining' && (
          <div className="card">
            <h2 className="section-title">Join Session</h2>
            
            {status && (
              <div className="status-text status-text-margin">
                {status}
              </div>
            )}

            <input
              className="input-field"
              placeholder="Creator's LAN IP (e.g. 192.168.1.100)"
              value={creatorIpInput}
              onChange={(e) => setCreatorIpInput(e.target.value)}
            />

            <input
              className="input-field"
              placeholder="PIN (4 digits)"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              maxLength={4}
            />

            <button className="primary-button join-button" onClick={joinSession}>
              <span>Join Now</span>
            </button>
          </div>
        )}

        {stage !== 'home' && (
          <button className="secondary-button" onClick={() => location.reload()}>
            ← Start Over
          </button>
        )}
      </div>
    </div>
  );
}

export default Home;