import { useEffect, useState } from 'react';
import { checkBlockchainConnection } from '../lib/ethereumBlockchain';

export default function BlockchainStatus() {
  const [status, setStatus] = useState<{
    connected: boolean;
    blockNumber?: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    checkBlockchainConnection().then(setStatus);
  }, []);

  if (!status) return null;

  return (
    <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full
      ${status.connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
      <span className={`w-2 h-2 rounded-full ${status.connected ? 'bg-green-500' : 'bg-red-500'}`} />
      {status.connected
        ? `Ganache Online · Block #${status.blockNumber}`
        : `Blockchain Offline · ${status.error}`}
    </div>
  );
}