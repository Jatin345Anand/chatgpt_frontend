import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import io from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';  // ✅ Correct way


const socket = io('http://localhost:5000');

export default function Chat() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');

    const username = localStorage.getItem('username'); // Get username from local storage
    if (!token) {
      router.push('/');
    } else {
      const decoded = jwtDecode(token);
      setUsername(username || 'User'); // Set username from token
      
      // Check if user just signed up (set a special flag at signup)
      const isNewUser = localStorage.getItem('new_user');
      console.log('isNewUser:', isNewUser); // Debugging line
      if (isNewUser) {
        setMessages([]); // Empty chat for new user
        localStorage.removeItem('new_user'); // Clear flag
      } else {
        fetchMessages(token);
      }
    }

    socket.on('receiveMessage', () => {
      fetchMessages(localStorage.getItem('token'));
    });

    return () => socket.off('receiveMessage');
  }, []);

  const fetchMessages = async (token) => {
    try {
      const res = await axios.get('http://localhost:5000/api/messages/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const sendMessage = async () => {
    const token = localStorage.getItem('token');
    if (!input.trim()) return;
    try {
      setLoading(true);
      await axios.post(
        'http://localhost:5000/api/messages/send',
        { sender: username, content: input },  // Important: send correct sender name
        { headers: { Authorization: `Bearer ${token}` } }
      );
      socket.emit('sendMessage', { text: input, sender: username });
      setInput('');
      await fetchMessages(token);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Welcome, {username} 's CHAT GPT !</h2> {/* Show username */}
      <div style={{ minHeight: '300px', border: '1px solid gray', marginBottom: '10px', padding: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '8px' }}>
            <strong>{msg.sender}:</strong> {msg.content}
          </div>
        ))}
        {loading && <p>Loading AI Response...</p>}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message..." />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}