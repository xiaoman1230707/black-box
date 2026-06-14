import { KeepAlive } from 'react-activation';
import Chat from '@/pages/Chat';

const KeepAliveChat = () => {
  return (
    <KeepAlive name="chat" saveScrollPosition="screen">
      <Chat />
    </KeepAlive>
  );
};

export default KeepAliveChat;
