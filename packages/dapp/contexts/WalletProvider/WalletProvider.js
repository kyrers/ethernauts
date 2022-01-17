import { createContext, useReducer, useCallback, useEffect } from 'react';
import Web3Modal from 'web3modal';
import { providers, utils, BigNumber } from 'ethers';

// import WalletLink from 'walletlink';
// import WalletConnectProvider from '@walletconnect/web3-provider';

let web3Modal;

if (typeof window !== 'undefined') {
  web3Modal = new Web3Modal();
}

const initialState = {
  balance: null,
  provider: null,
  web3Provider: null,
  address: null,
  chainId: null,
};

const reducer = (state, action) => {
  /* eslint-disable indent */
  switch (action.type) {
    case 'SET_PROVIDER':
      return {
        ...state,
        provider: action.provider,
        web3Provider: action.web3Provider,
        address: action.address,
        signer: action.signer,
        chainId: action.chainId,
      };
    case 'SET_ADDRESS':
      return {
        ...state,
        address: action.address,
      };
    case 'SET_CHAIN_ID':
      return {
        ...state,
        chainId: action.chainId,
      };
    case 'RESET_PROVIDER':
      return initialState;
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
  /* eslint-enable indent */
};

const WalletContext = createContext();

const WalletProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const { provider, web3Provider } = state;

  const connect = useCallback(async () => {
    const provider = await web3Modal.connect();

    const web3Provider = new providers.Web3Provider(provider);

    const signer = web3Provider.getSigner();
    const address = await signer.getAddress();
    const balance = await web3Provider.getBalance(address);

    const { chainId } = await web3Provider.getNetwork();

    dispatch({
      type: 'SET_PROVIDER',
      balance,
      provider,
      web3Provider,
      address,
      chainId,
    });
  }, []);

  const disconnect = useCallback(async () => {
    if (web3Provider && web3Provider.close) {
      await web3Provider.close();
    }
    await web3Modal.clearCachedProvider();

    dispatch({
      type: 'RESET_PROVIDER',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  useEffect(() => {
    if (provider && provider.on) {
      const handleAccountsChanged = (accounts) => {
        // eslint-disable-next-line no-console
        dispatch({
          type: 'SET_ADDRESS',
          address: accounts[0],
        });
      };

      const handleChainChanged = (chainId) => {
        // eslint-disable-next-line no-console
        dispatch({
          type: 'SET_CHAIN_ID',
          chainId,
        });
      };

      const handleDisconnect = (error) => {
        // eslint-disable-next-line no-console
        console.log('disconnect', error);
        disconnect();
      };

      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);
      provider.on('disconnect', handleDisconnect);

      // Subscription Cleanup
      return () => {
        if (provider.removeListener) {
          provider.removeListener('accountsChanged', handleAccountsChanged);
          provider.removeListener('chainChanged', handleChainChanged);
          provider.removeListener('disconnect', handleDisconnect);
        }
      };
    }
  }, [provider, disconnect]);

  const value = { state, connect, disconnect };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export { WalletProvider, WalletContext };
